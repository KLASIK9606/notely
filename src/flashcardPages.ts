/** Split at native measured line boundaries, retaining every source character. */
export function flashcardPages(text: string, lines: { text: string; height: number }[], height: number): string[] {
  if (!lines.length || height <= 0) return [text];
  const boundaries = [0];
  let cursor = 0;
  let used = 0;
  for (const line of lines) {
    const needle = line.text.trim();
    const found = needle ? text.indexOf(needle, cursor) : cursor;
    const start = found >= cursor ? found : cursor;
    if (used > 0 && used + line.height > height) { boundaries.push(start); used = 0; }
    used += line.height;
    cursor = Math.max(cursor, start + needle.length);
  }
  boundaries.push(text.length);
  return boundaries.slice(0, -1).map((start, i) => text.slice(start, boundaries[i + 1])).filter(part => part.length > 0);
}
