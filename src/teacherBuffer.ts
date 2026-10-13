import { assertNotCancelled } from './cancellation.ts';
/** One upcoming topic, shared by background preparation and foreground playback. */
export class TeacherBuffer<T> {
  private entry: { index: number; controller: AbortController; promise: Promise<T> } | null = null;

  warm(index: number, load: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (this.entry?.index === index) return this.entry.promise;
    this.cancel();
    const controller = new AbortController();
    const promise = Promise.resolve().then(() => {
      assertNotCancelled(controller.signal);
      return load(controller.signal);
    });
    this.entry = { index, controller, promise };
    // A background failure is shown only if playback later needs this topic.
    void promise.catch(() => {});
    return promise;
  }

  async take(index: number, load: (signal: AbortSignal) => Promise<T>, signal: AbortSignal): Promise<T> {
    assertNotCancelled(signal);
    const promise = this.warm(index, load);
    const entry = this.entry!;
    let cancel: () => void = () => {};
    const cancelled = new Promise<never>((_, reject) => {
      cancel = () => { entry.controller.abort(); reject(signal.reason ?? new Error('Odsłuch anulowany.')); };
      signal.addEventListener('abort', cancel, { once: true });
      if (signal.aborted) cancel();
    });
    try {
      // A stalled loader must not hold the foreground turn after an interruption.
      const result = await Promise.race([promise, cancelled]);
      assertNotCancelled(signal);
      assertNotCancelled(entry.controller.signal);
      return result;
    } finally {
      signal.removeEventListener('abort', cancel);
      if (this.entry === entry) this.entry = null;
    }
  }

  cancel() {
    const entry = this.entry;
    this.entry = null;
    entry?.controller.abort();
  }
}
