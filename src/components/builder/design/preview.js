import { useSyncExternalStore } from 'react';

/**
 * Editor-only: which state (hover, active ...) of which block the canvas should currently show.
 * The inspector sets it; the canvas wrapper of that block reads it. The public site never sets it.
 */
let current = null;
const subs = new Set();
const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export function setStatePreview(id, state) {
  const next = id && state && state !== 'default' ? { id, state } : null;
  if (current?.id === next?.id && current?.state === next?.state) return;
  current = next;
  subs.forEach((f) => f());
}
export const useStatePreview = (id, enabled) => useSyncExternalStore(subscribe, () => (enabled && current?.id === id ? current.state : null), () => null);
