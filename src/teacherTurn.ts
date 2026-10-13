export class TeacherTurn {
  private controller: AbortController | null = null;
  private epoch = 0;
  cancel() { this.epoch++; this.controller?.abort(); this.controller = null; }
  begin() {
    this.cancel();
    const epoch = this.epoch;
    const controller = this.controller = new AbortController();
    return { signal: controller.signal, current: () => epoch === this.epoch && !controller.signal.aborted };
  }
}
