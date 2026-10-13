/** React Native's abort-controller shim has no AbortSignal.throwIfAborted(). */
export function assertNotCancelled(signal: AbortSignal): void {
  if (!signal.aborted) return;
  if (signal.reason instanceof Error) throw signal.reason;
  const error = new Error('Operacja anulowana.');
  error.name = 'AbortError';
  throw error;
}
