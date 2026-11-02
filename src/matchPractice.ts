import type { Note } from './types';

export type MatchCard = { index: number; question: string; answer: string; sourceLines: number[] };
export const matchText = (text: string) => text.normalize('NFC').replace(/\s+/g, ' ').trim();

export function matchCards(note: Note, indices?: number[], reverse = false): MatchCard[] {
  const selected = indices === undefined ? note.materials.flashcards.map((_, index) => index) : [...new Set(indices)];
  return selected.filter(index => Number.isInteger(index) && index >= 0 && index < note.materials.flashcards.length).flatMap(index => {
    const card = note.materials.flashcards[index];
    if (!card.question.trim() || !card.answer.trim()) return [];
    return [{ index, question: reverse ? card.answer : card.question, answer: reverse ? card.question : card.answer, sourceLines: card.sourceLines }];
  });
}

// Identical visible questions cannot be distinguished by the learner: separate them.
export function matchRounds(cards: MatchCard[], size = 3): MatchCard[][] {
  const pending = [...cards], rounds: MatchCard[][] = [];
  const limit = Math.max(1, Math.min(3, Math.floor(size) || 3));
  while (pending.length) {
    const round: MatchCard[] = [];
    for (let i = 0; i < pending.length && round.length < limit;) {
      if (round.some(card => matchText(card.question) === matchText(pending[i].question))) { i++; continue; }
      round.push(...pending.splice(i, 1));
    }
    rounds.push(round);
  }
  return rounds;
}

export function matchingAnswer(question: MatchCard, answer: MatchCard): boolean {
  // Repeated definitions are equivalent; never mark a visually identical answer wrong.
  return matchText(question.answer) === matchText(answer.answer);
}

export function shuffledMatches(cards: MatchCard[], random: () => number = Math.random) {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
