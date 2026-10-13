import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Note } from './types';
import { C, Empty } from './ui';
import { buildQuizPages, paginateQuizText } from './quizLayout';

export function Quiz({ note, onEvidence }: { note: Note; onEvidence: (lines: number[]) => void }) {
  const [position, setPosition] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [resultsIndex, setResultsIndex] = useState(0);
  const [bodySize, setBodySize] = useState({ width: 0, height: 0 });
  const { fontScale } = useWindowDimensions();
  const questions = note.materials.quiz;
  const finished = position >= questions.length;
  const question = questions[finished ? resultsIndex : position];
  const selected = answers[position];
  const answered = selected !== undefined;
  const score = answers.filter((answer, i) => answer === questions[i]?.correctIndex).length;
  const width = Math.max(1, bodySize.width - 32);
  const height = Math.max(23 * fontScale, bodySize.height - 24);
  const pages = useMemo(() => question ? buildQuizPages(question.question, question.options, width, height, fontScale) : [], [question, width, height, fontScale]);
  const feedback = question ? `${finished ? question.question + '\n\n' : ''}Poprawna odpowiedź: ${question.options[question.correctIndex]}\n\n${question.explanation}` : '';
  const feedbackPages = useMemo(() => paginateQuizText(feedback, width, Math.max(23 * fontScale, height - Math.max(44, 20 * fontScale) - 8), fontScale), [feedback, width, height, fontScale]);
  const showingFeedback = answered || finished;
  const pageCount = showingFeedback ? feedbackPages.length : pages.length;
  const safePage = Math.min(pageIndex, Math.max(0, pageCount - 1));
  const page = pages[safePage];
  useEffect(() => { setPageIndex(0); }, [position, answered, resultsIndex, bodySize.width, bodySize.height, fontScale]);

  if (!questions.length) return <Empty icon="help-circle-outline" title="Bez dodatkowego quizu" body="Dla tego materiału nie powstał quiz. Możesz uczyć się z pełnej notatki." />;
  const choose = (index: number) => setAnswers(old => old.length === position ? [...old, index] : old);
  const next = () => {
    if (finished) {
      if (resultsIndex < questions.length - 1) { setResultsIndex(old => old + 1); setPageIndex(0); }
      else { setAnswers([]); setPosition(0); setResultsIndex(0); }
    } else if (answered) { setPosition(old => Math.min(old + 1, questions.length)); setPageIndex(0); }
    else setPageIndex(old => Math.min(old + 1, pages.length - 1));
  };
  const action = finished ? resultsIndex < questions.length - 1 ? 'Kolejna odpowiedź' : 'Powtórz quiz' : answered ? position === questions.length - 1 ? 'Zobacz wynik' : 'Następne pytanie' : 'Czytaj dalej';
  return <View style={q.root}>
    <View style={q.header}>
      <Text accessibilityRole="header" style={q.counter}>{finished ? `Wynik: ${score}/${questions.length} · ${resultsIndex + 1}/${questions.length}` : `Pytanie ${position + 1}/${questions.length}`}</Text>
      {showingFeedback && <Text accessibilityLiveRegion="polite" style={[q.status, { color: answers[finished ? resultsIndex : position] === question.correctIndex ? C.green : C.orange }]}>{answers[finished ? resultsIndex : position] === question.correctIndex ? 'Dobrze!' : 'Do powtórki'}</Text>}
      <View style={q.progress}><View style={[q.progressFill, { width: `${answers.length / questions.length * 100}%` }]} /></View>
    </View>
    <View style={q.body} onLayout={event => { const { width: w, height: h } = event.nativeEvent.layout; setBodySize(old => old.width === w && old.height === h ? old : { width: w, height: h }); }}>
      {bodySize.width > 0 && (showingFeedback ? <>
        <Text style={q.text}>{feedbackPages[safePage]}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Sprawdź źródło odpowiedzi" onPress={() => onEvidence(question.sourceLines)} style={q.source}><Ionicons name="link-outline" size={18} color={C.green} /><Text style={q.sourceText}>Sprawdź źródło</Text></Pressable>
      </> : <>
        {page?.question !== undefined && <Text accessibilityRole="header" style={[q.text, q.question]}>{page.question}</Text>}
        {page?.options.map(option => <Pressable key={`${option.index}-${option.part}`} accessibilityRole="button" accessibilityState={{ disabled: option.part < option.total }} disabled={option.part < option.total} accessibilityLabel={`Odpowiedź ${String.fromCharCode(65 + option.index)}: ${option.text}${option.total > 1 ? `. Część ${option.part} z ${option.total}. ${option.part < option.total ? 'Czytaj dalej, aby wybrać odpowiedź' : 'Wybierz tę odpowiedź'}` : ''}`} onPress={() => choose(option.index)} style={({ pressed }) => [q.answer, pressed && q.pressed]}>
          <View style={[q.letter, { width: Math.max(26, 18 * fontScale), height: Math.max(28, 24 * fontScale) }]}><Text style={q.letterText}>{String.fromCharCode(65 + option.index)}</Text></View>
          <View style={{ flex: 1 }}>{option.total > 1 && <Text style={q.part}>{option.part < option.total ? 'Czytaj dalej' : 'Wybierz odpowiedź'} · {option.part}/{option.total}</Text>}<Text style={q.text}>{option.text}</Text></View>
        </Pressable>)}
      </>)}
    </View>
    <View style={q.footer}>
      {pageCount > 1 && <View style={q.pagination}>
        <Pressable accessibilityRole="button" accessibilityLabel="Poprzednia strona treści" disabled={safePage === 0} onPress={() => setPageIndex(old => Math.max(0, old - 1))} style={[q.pageButton, safePage === 0 && q.disabled]}><Ionicons name="chevron-back" size={22} color={C.green} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={showingFeedback ? 'Wróć do początku wyjaśnienia' : 'Wróć do pytania'} onPress={() => setPageIndex(0)} style={q.pageButton}><Text style={q.pageLabel}>{showingFeedback ? 'Treść' : 'Pytanie'} {safePage + 1}/{pageCount}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Następna strona treści" disabled={safePage >= pageCount - 1} onPress={() => setPageIndex(old => Math.min(pageCount - 1, old + 1))} style={[q.pageButton, safePage >= pageCount - 1 && q.disabled]}><Ionicons name="chevron-forward" size={22} color={C.green} /></Pressable>
      </View>}
      {(showingFeedback || !page?.options.length) && <Pressable accessibilityRole="button" onPress={next} style={({ pressed }) => [q.next, pressed && { opacity: .8 }]}><Text style={q.nextText}>{action}</Text><Ionicons name="arrow-forward" size={21} color={C.white} /></Pressable>}
      {!showingFeedback && !!page?.options.length && <Text style={q.hint}>Dotknij wybranej odpowiedzi</Text>}
    </View>
  </View>;
}

const q = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 4 },
  counter: { color: C.ink, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  status: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  progress: { height: 4, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: C.green },
  body: { flex: 1, minHeight: 0, paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  text: { color: C.ink, fontSize: 16, lineHeight: 23 },
  question: { fontWeight: '600', marginBottom: 8 },
  answer: { minHeight: 48, paddingVertical: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border, borderRadius: 14, backgroundColor: C.white },
  letter: { width: 26, height: 28, borderRadius: 8, backgroundColor: '#EDF1E7', justifyContent: 'center', alignItems: 'center' },
  letterText: { fontSize: 15, color: C.green, fontWeight: '700' },
  part: { color: C.muted, fontSize: 13, lineHeight: 23 },
  pressed: { backgroundColor: '#EDF3E0', borderColor: C.green },
  source: { minHeight: 44, flexDirection: 'row', gap: 7, alignItems: 'center' },
  sourceText: { color: C.green, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  footer: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, gap: 6, borderTopWidth: 1, borderColor: C.border },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageButton: { minHeight: 44, minWidth: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#EDF1E7' },
  disabled: { opacity: .35 },
  pageLabel: { color: C.muted, fontSize: 13, lineHeight: 18 },
  next: { minHeight: 48, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: C.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextText: { color: C.white, fontSize: 16, lineHeight: 23, fontWeight: '700', flexShrink: 1 },
  hint: { color: C.muted, fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
