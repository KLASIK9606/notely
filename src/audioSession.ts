export const playbackMode = { allowsRecording: false, playsInSilentMode: true, shouldRouteThroughEarpiece: false, interruptionMode: 'doNotMix' as const };
export const recordingMode = { ...playbackMode, allowsRecording: true };

export async function startPlayback(player: { muted: boolean; volume: number; seekTo: (time: number) => Promise<void>; play: () => void }, audio: { activate: () => Promise<void>; setMode: () => Promise<void> }, rewind: boolean) {
  await audio.activate();
  await audio.setMode();
  player.muted = false;
  player.volume = 1;
  if (rewind) await player.seekTo(0);
  player.play();
}

export function microphoneLevel(decibels?: number) {
  if (decibels === undefined || !Number.isFinite(decibels)) return null;
  return Math.max(0, Math.min(1, (decibels + 60) / 60));
}
