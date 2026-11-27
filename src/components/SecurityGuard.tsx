import { useEffect } from 'react';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

export function SecurityGuard() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      // Block F12 DevTools
      if (e.key === 'F12') {
        e.preventDefault();
        return;
      }

      // Block DevTools inspection panels (Ctrl/Cmd + Shift + I / J / C / K)
      if (ctrlOrMeta && e.shiftKey && ['I', 'J', 'C', 'K'].includes(key)) {
        e.preventDefault();
        return;
      }

      // Block View Source (Ctrl/Cmd + U), Save Page (Ctrl/Cmd + S), Print (Ctrl/Cmd + P)
      if (ctrlOrMeta && ['U', 'S', 'P'].includes(key)) {
        e.preventDefault();
        return;
      }

      // Block Copy (Ctrl/Cmd + C) & Cut (Ctrl/Cmd + X) outside form inputs
      if (ctrlOrMeta && ['C', 'X'].includes(key) && !isEditableTarget(e.target)) {
        e.preventDefault();
      }
    };

    const handleCopyOrCut = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    };

    const handleDragStart = (e: DragEvent) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopyOrCut);
    document.addEventListener('cut', handleCopyOrCut);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopyOrCut);
      document.removeEventListener('cut', handleCopyOrCut);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  return null;
}
