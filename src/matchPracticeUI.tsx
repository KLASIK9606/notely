import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Note } from './types';
import { Button, C, Chip, Empty, s } from './ui';
import { matchCards, matchRounds, matchingAnswer, shuffledMatches, type MatchCard } from './matchPractice';

export function MatchPractice({ note, cardIndices, reverse = false, onBack, onEvidence }: { note: Note; cardIndices?: number[]; reverse?: boolean; onBack?: () => void; onEvidence?: (lines: number[]) => void }) {
  const initial = useMemo(() => matchCards(note, cardIndices, reverse), [note, cardIndices, reverse]);
  const [deck, setDeck] = useState(initial);
  const rounds = useMemo(() => matchRounds(deck), [deck]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [removedAnswers, setRemovedAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const [missed, setMissed] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lock = useRef(false);
  const round = rounds[roundIndex] || [];
  const answers = useMemo(() => shuffledMatches(round), [round]);
  const long = round.some(card => card.question.length > 85 || card.answer.length > 85);
  const pending = round.filter(card => !completed.includes(card.index));
  const active = long ? pending[0] : round.find(card => card.index === selected);
  const finished = roundIndex >= rounds.length;
  const roundDone = round.length > 0 && pending.length === 0;
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { lock.current = false; }, [completed]);
  function reset(cards: MatchCard[]) {
    if (timer.current) clearTimeout(timer.current);
    lock.current = false; setDeck(cards); setRoundIndex(0); setCompleted([]); setRemovedAnswers([]); setSelected(null); setWrong(null); setMissed([]); setMistakes(0); setFeedback('');
  }
  function chooseAnswer(answer: MatchCard) {
    if (!active || lock.current || roundDone || removedAnswers.includes(answer.index)) return;
    lock.current = true;
    if (matchingAnswer(active, answer)) {
      setCompleted(old => [...old, active.index]); setRemovedAnswers(old => [...old, answer.index]); setSelected(null); setWrong(null); setFeedback('Dobrze! Para dopasowana.');
    } else {
      lock.current = true; setWrong(answer.index); setMistakes(old => old + 1); setMissed(old => old.includes(active.index) ? old : [...old, active.index]); setFeedback('To inna odpowiedź. Spróbuj ponownie — bez pośpiechu.');
      timer.current = setTimeout(() => { lock.current = false; setWrong(null); }, 850);
    }
  }
  const answerButton = (card: MatchCard) => <Pressable key={card.index} accessibilityRole="button" accessibilityLabel={`Odpowiedź: ${card.answer}`} disabled={removedAnswers.includes(card.index)} onPress={() => chooseAnswer(card)} style={({ pressed }) => [m.tile, removedAnswers.includes(card.index) && m.done, wrong === card.index && m.wrong, pressed && { opacity: .8 }]}><Text style={[m.tileText, removedAnswers.includes(card.index) && m.doneText]}>{card.answer}</Text></Pressable>;
  if (!initial.length) return <View style={m.root}>{onBack && <Button text="Wróć do trybów nauki" secondary onPress={onBack} />}<Empty icon="git-compare-outline" title="Brak fiszek do dopasowania" body="W tym wyborze nie ma jeszcze gotowych par. Wybierz inny filtr lub dodaj fiszki." /></View>;
  return <View style={m.root}>
    {onBack && <Button text="Tryby nauki" secondary icon="arrow-back" onPress={onBack} />}
    <View style={m.heading}><Chip>POŁĄCZ PARY</Chip><Text style={s.h2}>{finished ? 'Cały zestaw połączony' : `Runda ${roundIndex + 1}/${rounds.length}`}</Text><Text style={s.small}>{finished ? `${deck.length} par · pomyłki: ${mistakes}` : 'Bez limitu czasu. Dopasuj treść do odpowiedzi.'}</Text></View>
    {finished ? <ScrollView contentContainerStyle={m.scroll}><Text style={s.body}>{missed.length ? `${missed.length} par sprawiło trudność. Możesz powtórzyć tylko je.` : 'Wszystkie pary dopasowane. To ćwiczenie rozpoznawania — sprawdź też, czy potrafisz samodzielnie podać odpowiedź.'}</Text>{missed.length > 0 && <Button text="Powtórz pomylone pary" icon="refresh-outline" onPress={() => reset(deck.filter(card => missed.includes(card.index)))} />}<Button text="Jeszcze raz cały wybór" secondary onPress={() => reset(initial)} /></ScrollView> : <>
      <Text accessibilityLiveRegion="polite" style={[s.body, { minHeight: 44, color: wrong === null ? C.green : C.orange }]}>{roundDone ? 'Runda gotowa!' : feedback || (long ? 'Wybierz odpowiedź do poniższego hasła.' : 'Dotknij hasła po lewej, potem odpowiedzi po prawej.')}</Text>
      <ScrollView contentContainerStyle={m.scroll} keyboardShouldPersistTaps="handled">
        {long ? <View style={{ gap: 12 }}>{active && <View style={m.prompt}><Text style={s.small}>HASŁO</Text><Text style={s.h2}>{active.question}</Text></View>}{answers.map(answerButton)}</View> : <View style={m.columns}><View style={m.column}>{round.map(card => <Pressable key={card.index} accessibilityRole="button" accessibilityState={{ selected: selected === card.index }} disabled={completed.includes(card.index)} onPress={() => { if (!lock.current) { setSelected(card.index); setFeedback('Teraz wybierz odpowiedź po prawej.'); } }} style={({ pressed }) => [m.tile, selected === card.index && m.selected, completed.includes(card.index) && m.done, pressed && { opacity: .8 }]}><Text style={[m.tileText, completed.includes(card.index) && m.doneText]}>{card.question}</Text></Pressable>)}</View><View style={m.column}>{answers.map(answerButton)}</View></View>}
        {active && onEvidence && <Button text="Sprawdź w notatce" secondary icon="document-text-outline" onPress={() => onEvidence(active.sourceLines)} />}
      </ScrollView>
      {roundDone && <Button text={roundIndex === rounds.length - 1 ? 'Zobacz podsumowanie' : 'Kolejna runda'} icon="arrow-forward" onPress={() => { if (lock.current) return; lock.current = true; setRoundIndex(old => old + 1); setCompleted([]); setRemovedAnswers([]); setSelected(null); setWrong(null); setFeedback(''); }} />}
    </>}
  </View>;
}

const m = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 12 }, heading: { gap: 8 }, scroll: { gap: 16, paddingBottom: 16 }, columns: { flexDirection: 'row', gap: 12 }, column: { flex: 1, gap: 12 },
  tile: { minHeight: 76, borderRadius: 16, padding: 14, backgroundColor: C.white, borderWidth: 2, borderColor: C.border, justifyContent: 'center' }, tileText: { color: C.ink, fontSize: 16, lineHeight: 23 },
  selected: { borderColor: C.green, backgroundColor: '#EEF5E6' }, wrong: { borderColor: C.orange, backgroundColor: C.peach }, done: { opacity: .38, backgroundColor: '#EAF0E4' }, doneText: { textDecorationLine: 'line-through' }, prompt: { gap: 8, padding: 18, borderRadius: 18, backgroundColor: C.lime },
});
