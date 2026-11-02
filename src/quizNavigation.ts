// Ignore a second tap from the previous render instead of skipping content.
export function nextQuizIndex(current: number, rendered: number, count: number) {
  if (current !== rendered) return current;
  return Math.min(current + 1, Math.max(0, count));
}
