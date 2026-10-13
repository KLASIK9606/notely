import test from 'node:test';
import assert from 'node:assert/strict';
import { flashcardPages } from './flashcardPages.ts';
import { buildQuizPages, paginateQuizText, quizTextHeight } from './quizLayout.ts';

test('Measured flashcard pages retain every character, including Polish, emoji and whitespace', () => {
  const text = '  Ziemniak 🥔\n\nŁodyga podziemna.  \nBulwa przechowuje skrobię.\n';
  const lines = ['Ziemniak 🥔', '', 'Łodyga podziemna.', 'Bulwa przechowuje skrobię.'].map(text => ({ text, height: 28 }));
  for (const height of [28, 56, 84, 140]) {
    const pages = flashcardPages(text, lines, height);
    assert.equal(pages.join(''), text);
    assert.ok(pages.every(page => page.length > 0));
  }
});

test('Repeated lines are assigned in order without losing or repeating words', () => {
  const text = 'skrobia skrobia skrobia skrobia';
  const lines = Array.from({ length: 4 }, () => ({ text: 'skrobia', height: 25 }));
  const pages = flashcardPages(text, lines, 50);
  assert.equal(pages.length, 2);
  assert.equal(pages.join(''), text);
  assert.equal(pages[0], 'skrobia skrobia ');
});

test('Unmeasured or zero-height layout retains content instead of removing it', () => {
  const text = 'Nie wolno zgubić końca odpowiedzi.';
  assert.deepEqual(flashcardPages(text, [], 150), [text]);
  assert.deepEqual(flashcardPages(text, [{ text, height: 25 }], 0), [text]);
});

test('Long measured text paginates at larger accessible line heights without data loss', () => {
  const lines = Array.from({ length: 120 }, (_, i) => ({ text: `Wiersz ${i}: fotosynteza i chloroplasty.`, height: 44 }));
  const text = lines.map(line => line.text).join('\n');
  for (const height of [88, 132, 264]) {
    const pages = flashcardPages(text, lines, height);
    assert.equal(pages.join(''), text);
    assert.equal(pages.length, Math.ceil(lines.length / Math.floor(height / 44)));
  }
});

test('Quiz text pagination preserves all Unicode text and hard line breaks at accessible scales', () => {
  const text = ('Łodyga 🥔 przechowuje skrobię.\n\nTo nie jest korzeń.\n').repeat(30);
  for (const scale of [1, 1.5, 2]) for (const width of [256, 288, 358]) {
    const pages = paginateQuizText(text, width, 250, scale);
    assert.equal(pages.join(''), text);
    for (const page of pages) {
      assert.ok(quizTextHeight(page, width, scale) <= 250);
      assert.ok(!/^[\uDC00-\uDFFF]/.test(page));
      assert.ok(!/[\uD800-\uDBFF]$/.test(page));
    }
  }
});

test('Long quiz options retain their identity and fit the entire page budget', () => {
  const question = 'Jaką funkcję pełni bulwa ziemniaka? '.repeat(20);
  const options = ['ziemniak '.repeat(100), 'Źródło energii 🥔 '.repeat(60), 'Woda', 'Chlorofil'];
  for (const scale of [1, 1.5, 2]) for (const height of [200, 250, 300, 320, 360]) {
    const width = 288;
    const pages = buildQuizPages(question, options, width, height, scale);
    assert.equal(pages.map(page => page.question ?? '').join(''), question);
    for (let i = 0; i < options.length; i++) {
      const parts = pages.flatMap(page => page.options).filter(option => option.index === i);
      assert.equal(parts.map(part => part.text).join(''), options[i]);
      assert.equal(parts.at(-1).part, parts.at(-1).total);
      assert.deepEqual(parts.map(part => part.part), Array.from({length: parts.length}, (_, index) => index + 1));
    }
    for (const page of pages) {
      const used = (page.question ? quizTextHeight(page.question, width, scale) + 16 : 0) + page.options.reduce((sum, option) => sum + Math.max(48, quizTextHeight(option.text, width - 64, scale) + 20) + (option.total > 1 ? 23 * scale : 0) + 8, 0);
      assert.ok(used <= height + 16 && (!page.options.length || used <= height), `scale=${scale}, height=${height}, used=${used}`);
    }
  }
});
