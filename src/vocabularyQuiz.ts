import type { Materials } from './types';
const normalized = (text: string) => text.normalize('NFC').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
export function vocabularyQuiz(cards: Materials['flashcards']): Materials['quiz'] {
  const meanings = new Map<string, Set<string>>();
  for (const card of cards) {
    const key = normalized(card.question), values = meanings.get(key) || new Set();
    values.add(normalized(card.answer)); meanings.set(key, values);
  }
  const answers = [...new Map(cards.filter(card => card.answer.trim()).map(card => [normalized(card.answer), card.answer])).values()];
  if (answers.length < 2) return [];
  return cards.filter(card => card.question.trim() && card.answer.trim() && meanings.get(normalized(card.question))?.size === 1).map((card, index) => {
    const wrong = answers.filter(answer => normalized(answer) !== normalized(card.answer));
    const rotated = [...wrong.slice(index % wrong.length), ...wrong.slice(0, index % wrong.length)].slice(0, 3);
    const correctIndex = index % (rotated.length + 1);
    rotated.splice(correctIndex, 0, card.answer);
    return { question: `Wybierz tłumaczenie: ${card.question}`, options: rotated, correctIndex, explanation: `${card.question} → ${card.answer}`, sourceLines: card.sourceLines };
  });
}
