/** System pickers must open without a competing React Native modal. */
type PickerHooks = {
    waiting: (label: string) => void;
    processing: (label: string) => void;
    error: (error: unknown) => void;
    idle: () => void;
};
export class PickerFlow {
  private current: object | null = null;
  private hooks: PickerHooks;
  constructor(hooks: PickerHooks) { this.hooks = hooks; }
  get busy() { return this.current !== null; }
  cancel() {
    if (!this.current) return;
    this.current = null;
    this.hooks.idle();
  }
  async start<T extends { canceled: boolean }>(
    launch: (isCurrent: () => boolean) => Promise<T>,
    accept: (result: T, isCurrent: () => boolean) => Promise<void>,
    labels: { waiting: string; processing: string },
  ) {
    if (this.busy) return;
    const token = {};
    this.current = token;
    const isCurrent = () => this.current === token;
    this.hooks.waiting(labels.waiting);
    try {
      // No asynchronous work before launch: web pickers need the user gesture.
      const result = await launch(isCurrent);
      if (!isCurrent() || result.canceled) return;
      this.hooks.processing(labels.processing);
      await accept(result, isCurrent);
    } catch (error) {
      if (isCurrent()) this.hooks.error(error);
    } finally {
      if (isCurrent()) { this.current = null; this.hooks.idle(); }
    }
  }
}
