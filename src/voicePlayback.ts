export function waitForVoice(player: { isLoaded: boolean; addListener: (event: 'playbackStatusUpdate', callback: (status: { isLoaded: boolean; error?: string | null }) => void) => { remove: () => void } }, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(new Error('Odsłuch anulowany.'));
  if (player.isLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let settled = false;
    let subscription: { remove: () => void } | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true; subscription?.remove(); clearTimeout(timer); signal?.removeEventListener('abort', cancel); error ? reject(error) : resolve();
    };
    const cancel = () => finish(new Error('Odsłuch anulowany.'));
    subscription = player.addListener('playbackStatusUpdate', status => { if (status.error) finish(new Error('Nie można otworzyć głosu AI.')); else if (status.isLoaded) finish(); });
    // Some players immediately emit their current status while adding a listener.
    if (settled) { subscription.remove(); return; }
    timer = setTimeout(() => finish(new Error('Ładowanie głosu trwa zbyt długo. Spróbuj ponownie.')), 10000);
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    else if (player.isLoaded) finish();
  });
}
/** A late end event from the previous source must not finish a newly started answer. */
export class VoiceCompletion {
  private heardPlaying = false;
  private completed = false;
  private duration: number;
  constructor(duration: number) { this.duration = duration; }
  update(status: { playing: boolean; didJustFinish: boolean; currentTime: number; duration: number }) {
    if (this.completed || !Number.isFinite(status.duration) || status.duration <= 0 || !Number.isFinite(status.currentTime) || status.currentTime < 0) return false;
    if (status.playing && !status.didJustFinish) { this.heardPlaying = true; this.duration = status.duration; }
    if (this.duration > 0 && Math.abs(status.duration - this.duration) > .3) return false;
    if (!this.heardPlaying || !status.didJustFinish || status.currentTime < status.duration - .35) return false;
    this.completed = true; return true;
  }
}

