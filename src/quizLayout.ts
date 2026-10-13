/** Conservative page budgets: keep readable type and move excess text to another page. */
export type QuizOptionPage = { index: number; text: string; part: number; total: number };
export type QuizPage = { question?: string; options: QuizOptionPage[] };

export function quizTextHeight(text: string, width: number, fontScale = 1): number {
  const columns = Math.max(1, Math.floor(width / (16 * fontScale * .95)));
  return text.split('\n').reduce((lines, line) => lines + Math.max(1, Math.ceil(line.length / columns)), 0) * 23 * fontScale;
}

export function paginateQuizText(text: string, width: number, height: number, fontScale = 1): string[] {
  if (!text) return [''];
  const columns = Math.max(1, Math.floor(width / (16 * fontScale * .95)));
  const lines = Math.max(1, Math.floor(height / (23 * fontScale)));
  const capacity = Math.max(2, columns * lines);
  const result: string[] = [];
  let rest = text;
  while (rest.length) {
    let cut = Math.min(rest.length, capacity);
    // Explicit line breaks consume a line even when the line is short.
    while (cut > 1 && quizTextHeight(rest.slice(0, cut), width, fontScale) > height) cut--;
    if (cut < rest.length) {
      const boundary = rest.slice(0, cut).search(/\s+\S*$/);
      if (boundary > cut / 2) cut = boundary + 1;
      const last = rest.charCodeAt(cut - 1);
      if (last >= 0xD800 && last <= 0xDBFF) cut = cut > 1 ? cut - 1 : 2;
    }
    result.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  return result;
}

export function buildQuizPages(question: string, options: string[], width: number, height: number, fontScale = 1): QuizPage[] {
  const optionWidth = Math.max(1, width - 64 - Math.max(0, 18 * fontScale - 26));
  const optionHeight = (text: string) => Math.max(48, quizTextHeight(text, optionWidth, fontScale) + 22);
  const total = quizTextHeight(question, width, fontScale) + 16 + options.reduce((sum, option) => sum + optionHeight(option) + 8, 0);
  if (total <= height) return [{ question, options: options.map((text, index) => ({ index, text, part: 1, total: 1 })) }];
  const pages: QuizPage[] = paginateQuizText(question, width, height, fontScale).map(text => ({ question: text, options: [] }));
  let current: QuizPage = { options: [] };
  let used = 0;
  options.forEach((option, index) => {
    const chunks = paginateQuizText(option, optionWidth, Math.max(23 * fontScale, height - 34 - 23 * fontScale), fontScale);
    chunks.forEach((text, part) => {
      const needed = optionHeight(text) + (chunks.length > 1 ? 23 * fontScale : 0) + 8;
      if (used + needed > height && current.options.length) { pages.push(current); current = { options: [] }; used = 0; }
      current.options.push({ index, text, part: part + 1, total: chunks.length });
      used += needed;
    });
  });
  if (current.options.length) pages.push(current);
  return pages;
}
