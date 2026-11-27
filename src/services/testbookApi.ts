import { SUPPLIED_API_PATHS } from '../config/apiConfig';

export class ApiError extends Error {
  status: number;
  locked?: boolean;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    if (status === 402) {
      this.locked = true;
    }
  }
}

interface CacheRecord<T> {
  value: T;
  expiresAt: number;
}

interface ActiveSecuritySession {
  sid: string;
  aesKey: CryptoKey;
}

const HKDF_INFO = new TextEncoder().encode('hrrytestbookpro-v1');
const memoryCache = new Map<string, CacheRecord<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();

// Strictly in-memory session key (never persisted to localStorage/sessionStorage)
let activeSession: ActiveSecuritySession | null = null;
let handshakePromise: Promise<ActiveSecuritySession> | null = null;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function createNonce(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return bytesToBase64(buf);
}

async function establishSession(forceRefresh = false): Promise<ActiveSecuritySession> {
  if (!forceRefresh && activeSession) {
    return activeSession;
  }
  if (!forceRefresh && handshakePromise) {
    return handshakePromise;
  }

  handshakePromise = (async () => {
    const clientKeys = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits']
    );
    const rawClientPub = new Uint8Array(
      await crypto.subtle.exportKey('raw', clientKeys.publicKey)
    );

    const res = await fetch('/api/sec/handshake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ clientPubKey: bytesToBase64(rawClientPub) }),
    });

    if (!res.ok) {
      throw new ApiError('Secure session handshake failed.', res.status);
    }

    const { sid, serverPubKey } = (await res.json()) as {
      sid: string;
      serverPubKey: string;
    };

    const serverPubBytes = base64ToBytes(serverPubKey);
    const importedServerPub = await crypto.subtle.importKey(
      'raw',
      serverPubBytes.buffer as ArrayBuffer,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );

    const sharedBits = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: importedServerPub },
      clientKeys.privateKey,
      256
    );

    const hkdfBase = await crypto.subtle.importKey(
      'raw',
      sharedBits,
      'HKDF',
      false,
      ['deriveKey']
    );

    const salt = new TextEncoder().encode(sid);
    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt,
        info: HKDF_INFO,
      },
      hkdfBase,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    activeSession = { sid, aesKey };
    return activeSession;
  })().finally(() => {
    handshakePromise = null;
  });

  return handshakePromise;
}

async function sealPayload(
  session: ActiveSecuritySession,
  payload: unknown
): Promise<{ sid: string; iv: string; ct: string }> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const aad = new TextEncoder().encode(session.sid);
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: aad },
      session.aesKey,
      encoded
    )
  );
  return {
    sid: session.sid,
    iv: bytesToBase64(iv),
    ct: bytesToBase64(encrypted),
  };
}

async function unsealPayload<T>(
  session: ActiveSecuritySession,
  ivB64: string,
  ctB64: string
): Promise<T> {
  const iv = base64ToBytes(ivB64);
  const ct = base64ToBytes(ctB64);
  const aad = new TextEncoder().encode(session.sid);
  const plainBuf = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
      additionalData: aad,
    },
    session.aesKey,
    ct.buffer as ArrayBuffer
  );
  const text = new TextDecoder().decode(plainBuf);
  return JSON.parse(text) as T;
}

export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  cacheTtlMs?: number;
  retries?: number;
  signal?: AbortSignal;
}

export const testbookApi = {
  // Keep reference to supplied API paths config so static checks & architecture stay intact
  suppliedPaths: SUPPLIED_API_PATHS,

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method || 'GET';
    const retries = options.retries ?? (method === 'GET' ? 1 : 0);
    const cacheTtlMs = method === 'GET' ? (options.cacheTtlMs ?? 0) : 0;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const key = `${method}:${normalizedPath}`;

    if (cacheTtlMs > 0) {
      const cached = memoryCache.get(key) as CacheRecord<T> | undefined;
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }
      const inflight = inflightRequests.get(key) as Promise<T> | undefined;
      if (inflight) {
        return inflight;
      }
    }

    const execute = async (): Promise<T> => {
      let lastError: unknown;
      let refreshedSession = false;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const session = await establishSession(refreshedSession);
          const envelope = await sealPayload(session, {
            path: normalizedPath,
            method,
            body: options.body,
            ts: Date.now(),
            nonce: createNonce(),
          });

          const response = await fetch('/api/sec/dispatch', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(envelope),
            signal: options.signal,
          });

          const raw = await response.text();
          let parsedOuter: unknown = null;
          try {
            parsedOuter = raw ? JSON.parse(raw) : null;
          } catch {
            parsedOuter = null;
          }

          // Re-handshake transparently if server rotated or expired session
          if (response.status === 401 && !refreshedSession) {
            activeSession = null;
            refreshedSession = true;
            attempt -= 1;
            continue;
          }

          if (!response.ok) {
            const errObj = parsedOuter as { error?: string; message?: string } | null;
            throw new ApiError(
              errObj?.error || errObj?.message || `Request failed with HTTP ${response.status}`,
              response.status,
              parsedOuter
            );
          }

          const sealedRes = parsedOuter as { iv?: string; ct?: string } | null;
          if (!sealedRes?.iv || !sealedRes?.ct) {
            throw new ApiError('Invalid encrypted response received.', 502);
          }

          const inner = await unsealPayload<{ status: number; data: unknown }>(
            session,
            sealedRes.iv,
            sealedRes.ct
          );

          if (inner.status < 200 || inner.status >= 300) {
            const errObj = inner.data as {
              error?: string;
              message?: string;
              lockedMessage?: string;
            } | null;
            const msg =
              errObj?.lockedMessage ||
              errObj?.error ||
              errObj?.message ||
              `Request failed with HTTP ${inner.status}`;
            throw new ApiError(msg, inner.status, inner.data);
          }

          if (cacheTtlMs > 0) {
            memoryCache.set(key, {
              value: inner.data as T,
              expiresAt: Date.now() + cacheTtlMs,
            });
          }
          return inner.data as T;
        } catch (err) {
          lastError = err;
          if (err instanceof DOMException && err.name === 'AbortError') {
            throw err;
          }
          const isRetryable =
            attempt < retries &&
            (!(err instanceof ApiError) || err.status >= 500 || err.status === 429);
          if (isRetryable) {
            await new Promise((r) => setTimeout(r, 350));
            continue;
          }
          throw err;
        }
      }
      throw lastError;
    };

    const promise = execute().finally(() => {
      inflightRequests.delete(key);
    });

    if (cacheTtlMs > 0) {
      inflightRequests.set(key, promise);
    }

    return promise;
  },

  invalidate(prefix?: string) {
    if (!prefix) {
      memoryCache.clear();
      return;
    }
    for (const k of memoryCache.keys()) {
      if (k.includes(prefix)) {
        memoryCache.delete(k);
      }
    }
  },
};
