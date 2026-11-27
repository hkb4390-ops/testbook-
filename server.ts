import 'dotenv/config';
import crypto from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const UPSTREAM_BASE = (
  process.env.TESTBOOK_API_BASE_URL || 'https://open-mora-natking151-ea9216fb.koyeb.app'
).replace(/\/+$/, '');
const UPSTREAM_HOST = (() => {
  try {
    return new URL(UPSTREAM_BASE).host;
  } catch {
    return '';
  }
})();

// Allowlisted upstream path prefixes so the proxy cannot be abused for SSRF.
const ALLOWED_PREFIXES = ['/testbook/', '/testbookv2/'];
const HKDF_INFO = Buffer.from('hrrytestbookpro-v1', 'utf8');
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const NONCE_WINDOW_MS = 90 * 1000; // 90 seconds
const MAX_SESSIONS = 4000;

interface CacheEntry {
  status: number;
  contentType: string;
  body: string;
  expiresAt: number;
}

interface SecuritySession {
  key: Buffer;
  createdAt: number;
  lastSeen: number;
  usedNonces: Map<string, number>;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const cache = new Map<string, CacheEntry>();
const sessions = new Map<string, SecuritySession>();
const rateLimits = new Map<string, RateBucket>();

// Periodic cleanup for expired sessions, nonces, cache entries, and rate limits
setInterval(() => {
  const now = Date.now();
  for (const [sid, sess] of sessions.entries()) {
    if (now - sess.lastSeen > SESSION_TTL_MS) {
      sessions.delete(sid);
      continue;
    }
    for (const [nonce, exp] of sess.usedNonces.entries()) {
      if (exp < now) sess.usedNonces.delete(nonce);
    }
  }
  for (const [k, entry] of cache.entries()) {
    if (entry.expiresAt < now) cache.delete(k);
  }
  for (const [ip, bucket] of rateLimits.entries()) {
    if (bucket.resetAt < now) rateLimits.delete(ip);
  }
}, 60_000).unref();

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function rateLimitMiddleware(maxPerMinute: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const now = Date.now();
    const existing = rateLimits.get(ip);
    if (!existing || existing.resetAt < now) {
      rateLimits.set(ip, { count: 1, resetAt: now + 60_000 });
      next();
      return;
    }
    existing.count += 1;
    if (existing.count > maxPerMinute) {
      res.status(429).json({ success: false, error: 'Too many requests. Please wait a moment.' });
      return;
    }
    next();
  };
}

function sameOriginGuard(req: Request, res: Response, next: NextFunction) {
  const fetchSite = req.headers['sec-fetch-site'];
  if (typeof fetchSite === 'string' && fetchSite === 'cross-site') {
    res.status(403).json({ success: false, error: 'Cross-site API requests are blocked.' });
    return;
  }
  const hostHeader = (req.headers['x-forwarded-host'] || req.headers.host || '')
    .toString()
    .split(',')[0]
    .trim()
    .toLowerCase();
  const originHeader = req.headers.origin;
  if (typeof originHeader === 'string' && hostHeader) {
    try {
      const originHost = new URL(originHeader).host.toLowerCase();
      if (originHost !== hostHeader) {
        res.status(403).json({ success: false, error: 'Origin mismatch.' });
        return;
      }
    } catch {
      res.status(403).json({ success: false, error: 'Invalid request origin.' });
      return;
    }
  }
  next();
}

function scrubErrorMessage(raw: string): string {
  let clean = raw || 'Upstream request failed';
  if (UPSTREAM_HOST) {
    clean = clean.split(UPSTREAM_HOST).join('upstream-service');
  }
  clean = clean.replace(/https?:\/\/[^\s/]+/gi, '[protected-upstream]');
  return clean;
}

function isAllowedUpstreamPath(rawPath: string): string | null {
  if (!rawPath || typeof rawPath !== 'string') return null;
  const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const lower = normalizedPath.toLowerCase();
  if (
    normalizedPath.includes('..') ||
    lower.includes('%2e%2e') ||
    normalizedPath.includes('://') ||
    normalizedPath.includes('\\')
  ) {
    return null;
  }
  const pathWithoutQuery = normalizedPath.split('?')[0];
  const isAllowed = ALLOWED_PREFIXES.some(
    (prefix) => pathWithoutQuery === prefix.slice(0, -1) || pathWithoutQuery.startsWith(prefix)
  );
  return isAllowed ? normalizedPath : null;
}

function getCacheTtlMs(upstreamPath: string): number {
  if (upstreamPath.startsWith('/testbook/series') || upstreamPath.startsWith('/testbookv2/home')) {
    return 60_000;
  }
  if (upstreamPath.startsWith('/testbookv2/trending') || upstreamPath.startsWith('/testbookv2/series/')) {
    return 45_000;
  }
  if (upstreamPath.includes('/instructions')) {
    return 60_000;
  }
  return 0;
}

function encryptEnvelope(key: Buffer, sid: string, payload: unknown): { iv: string; ct: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(sid, 'utf8'));
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    ct: Buffer.concat([encrypted, tag]).toString('base64'),
  };
}

function decryptEnvelope<T>(key: Buffer, sid: string, ivB64: string, ctB64: string): T {
  const iv = Buffer.from(ivB64, 'base64');
  const combined = Buffer.from(ctB64, 'base64');
  if (iv.length !== 12 || combined.length < 17) {
    throw new Error('Malformed encrypted envelope');
  }
  const ciphertext = combined.subarray(0, combined.length - 16);
  const tag = combined.subarray(combined.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(Buffer.from(sid, 'utf8'));
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8')) as T;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 1
): Promise<globalThis.Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (
        init.method === 'GET' &&
        (response.status === 502 || response.status === 503 || response.status === 504) &&
        attempt < retries
      ) {
        await new Promise((r) => setTimeout(r, 350));
        continue;
      }
      return response;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (init.method === 'GET' && attempt < retries) {
        await new Promise((r) => setTimeout(r, 350));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

async function executeUpstreamProxy(
  normalizedPath: string,
  method: 'GET' | 'POST',
  body?: unknown
): Promise<{ status: number; data: unknown }> {
  const ttlMs = method === 'GET' ? getCacheTtlMs(normalizedPath) : 0;
  const cacheKey = `${method}:${normalizedPath}`;
  if (ttlMs > 0) {
    const hit = cache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) {
      try {
        return { status: hit.status, data: JSON.parse(hit.body) };
      } catch {
        return { status: hit.status, data: hit.body };
      }
    }
  }

  const targetUrl = `${UPSTREAM_BASE}${normalizedPath}`;
  try {
    const upstreamRes = await fetchWithRetry(
      targetUrl,
      {
        method,
        headers: {
          Accept: 'application/json',
          ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
        },
        body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
      },
      method === 'GET' ? 1 : 0
    );

    const contentType = upstreamRes.headers.get('content-type') || 'application/json';
    const textBody = await upstreamRes.text();

    if (!contentType.includes('application/json') && textBody.trim().startsWith('<')) {
      return {
        status: upstreamRes.status >= 400 ? upstreamRes.status : 502,
        data: {
          success: false,
          error: `Upstream service returned HTTP ${upstreamRes.status}`,
          status: upstreamRes.status,
        },
      };
    }

    if (ttlMs > 0 && upstreamRes.ok) {
      cache.set(cacheKey, {
        status: upstreamRes.status,
        contentType,
        body: textBody,
        expiresAt: Date.now() + ttlMs,
      });
    }

    try {
      return { status: upstreamRes.status, data: textBody ? JSON.parse(textBody) : null };
    } catch {
      return { status: upstreamRes.status, data: { error: scrubErrorMessage(textBody) } };
    }
  } catch (err) {
    const message = err instanceof Error ? scrubErrorMessage(err.message) : 'Upstream connection failed';
    return {
      status: 502,
      data: {
        success: false,
        error: `Could not reach Testbook service: ${message}`,
      },
    };
  }
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '4mb' }));

  // Baseline response security headers (iframe-compatible)
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    next();
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // Step 1: Ephemeral ECDH P-256 + HKDF-SHA256 session handshake
  app.post(
    '/api/sec/handshake',
    sameOriginGuard,
    rateLimitMiddleware(60),
    (req: Request, res: Response) => {
      try {
        const clientPubB64 = req.body?.clientPubKey;
        if (typeof clientPubB64 !== 'string' || !clientPubB64) {
          res.status(400).json({ success: false, error: 'Missing client key' });
          return;
        }
        const clientPubBytes = Buffer.from(clientPubB64, 'base64');
        if (clientPubBytes.length !== 65 || clientPubBytes[0] !== 0x04) {
          res.status(400).json({ success: false, error: 'Invalid key format' });
          return;
        }

        const serverEcdh = crypto.createECDH('prime256v1');
        serverEcdh.generateKeys();
        const sharedSecret = serverEcdh.computeSecret(clientPubBytes);
        const sid = crypto.randomBytes(18).toString('base64url');
        const aesKey = Buffer.from(
          crypto.hkdfSync(
            'sha256',
            sharedSecret,
            Buffer.from(sid, 'utf8'),
            HKDF_INFO,
            32
          )
        );

        if (sessions.size >= MAX_SESSIONS) {
          const oldestKey = sessions.keys().next().value;
          if (oldestKey) sessions.delete(oldestKey);
        }

        const now = Date.now();
        sessions.set(sid, {
          key: aesKey,
          createdAt: now,
          lastSeen: now,
          usedNonces: new Map(),
        });

        res.setHeader('Cache-Control', 'no-store');
        res.json({
          sid,
          serverPubKey: serverEcdh.getPublicKey().toString('base64'),
        });
      } catch {
        res.status(400).json({ success: false, error: 'Handshake rejected' });
      }
    }
  );

  // Step 2: Sealed AES-256-GCM + anti-replay dispatch endpoint
  app.post(
    '/api/sec/dispatch',
    sameOriginGuard,
    rateLimitMiddleware(240),
    async (req: Request, res: Response) => {
      const { sid, iv, ct } = (req.body || {}) as {
        sid?: string;
        iv?: string;
        ct?: string;
      };

      if (!sid || !iv || !ct || typeof sid !== 'string' || typeof iv !== 'string' || typeof ct !== 'string') {
        res.status(400).json({ success: false, error: 'Invalid sealed request' });
        return;
      }

      const session = sessions.get(sid);
      const now = Date.now();
      if (!session || now - session.lastSeen > SESSION_TTL_MS) {
        if (session) sessions.delete(sid);
        res.status(401).json({ success: false, code: 'SESSION_EXPIRED', error: 'Session expired' });
        return;
      }

      let inner: {
        path?: string;
        method?: string;
        body?: unknown;
        ts?: number;
        nonce?: string;
      };
      try {
        inner = decryptEnvelope(session.key, sid, iv, ct);
      } catch {
        res.status(401).json({ success: false, code: 'SESSION_INVALID', error: 'Invalid payload signature' });
        return;
      }

      // Replay & freshness validation
      if (
        typeof inner.ts !== 'number' ||
        Math.abs(now - inner.ts) > NONCE_WINDOW_MS ||
        typeof inner.nonce !== 'string' ||
        inner.nonce.length < 12
      ) {
        res.status(403).json({ success: false, error: 'Request expired or invalid nonce' });
        return;
      }

      if (session.usedNonces.has(inner.nonce)) {
        res.status(403).json({ success: false, error: 'Replay detected' });
        return;
      }
      session.usedNonces.set(inner.nonce, now + NONCE_WINDOW_MS);
      session.lastSeen = now;

      const method = (inner.method || 'GET').toUpperCase();
      if (method !== 'GET' && method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
      }

      const safePath = isAllowedUpstreamPath(inner.path || '');
      if (!safePath) {
        res.status(403).json({ success: false, error: 'Disallowed upstream API path' });
        return;
      }

      const result = await executeUpstreamProxy(safePath, method, inner.body);
      const sealed = encryptEnvelope(session.key, sid, {
        status: result.status,
        data: result.data,
      });

      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json(sealed);
    }
  );

  // Direct /api/tb/* calls are blocked from unsealed external scraping/inspection
  app.use('/api/tb', (_req: Request, res: Response) => {
    res.status(401).json({
      success: false,
      error: 'Direct unsealed proxy access is disabled.',
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TestBook Prep server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
