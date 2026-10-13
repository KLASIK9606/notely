export const AUDIO_LIMIT = 20 * 1024 * 1024;
export const SOURCE_TOTAL_LIMIT = 64 * 1024 * 1024;
export const audioMimes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/flac'];
export function sourceLimit(mime: string) { return mime.startsWith('audio/') ? AUDIO_LIMIT : 8 * 1024 * 1024; }
export function importMime(name: string, supplied?: string) {
  const extension = name.split('.').pop()?.toLowerCase() || '';
  const types: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', wav: 'audio/wav', webm: 'audio/webm', ogg: 'audio/ogg', flac: 'audio/flac' };
  const type = types[extension] || supplied?.split(';')[0] || '';
  return [...audioMimes, 'application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(type) ? type : '';
}
export function clock(seconds: number) { const n = Math.max(0, Math.floor(seconds || 0)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`; }
