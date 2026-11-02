import React, { useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import type { Note } from './types';
import { advanceWrittenQueue, buildWrittenQueue, writtenAnswerMatches, writtenPrompt, writtenTracksReview } from './writtenPractice';
import { schedule } from './review';
import { Button, Chip, Empty, Evidence, C, s } from './ui';

export function WrittenPractice({ note, onUpdate, onEvidence, readOnly = false, onBack, cardIndices, reverse = false, practiceOnly = false }: {
  note: Note; onUpdate: (note: Note) => void; onEvidence: (lines: number[]) => void;
  readOnly?: boolean; onBack?: () => void; cardIndices?: number[]; reverse?: boolean; practiceOnly?: boolean;
}) {
  const [queue, setQueue] = useState(() => buildWrittenQueue(note, cardIndices, practiceOnly || reverse ? note.materials.flashcards.length : 10));
  const [total, setTotal] = useState(queue.length);
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [answered, setAnswered] = useState(0);
  const [firstCorrect, setFirstCorrect] = useState(0);
  const tracked = useRef(new Set(queue.filter(item => writtenTracksReview(note.reviews[String(item.index)], practiceOnly, reverse)).map(item => item.index)));
  const locked = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const item = queue[0];
  const card = item ? writtenPrompt(note, item.index, reverse) : null;
  const matches = card ? writtenAnswerMatches(answer, card.answer) : false;

  function reveal() { if (revealed) return; Keyboard.dismiss(); setRevealed(true); }
  function grade(known: boolean) {
    if (!item || !revealed || locked.current || readOnly) return;
    locked.current = true;
    if (tracked.current.has(item.index)) onUpdate({ ...note, reviews: { ...note.reviews, [String(item.index)]: schedule(note.reviews[String(item.index)], known) } });
    if (known && item.attempt === 0) setFirstCorrect(value => value + 1);
    setQueue(value => advanceWrittenQueue(value, known));
    setAnswered(value => value + 1); setAnswer(''); setRevealed(false);
    scroll.current?.scrollTo({ y: 0, animated: false });
    // The lock is released only once React has replaced the question.
  }
  React.useEffect(() => { locked.current = false; }, [answered]);
  function restart() {
    const next = buildWrittenQueue(note, cardIndices);
    tracked.current = new Set(next.filter(item => writtenTracksReview(note.reviews[String(item.index)], practiceOnly, reverse)).map(item => item.index));
    setQueue(next); setTotal(next.length); setAnswer(''); setRevealed(false); setAnswered(0); setFirstCorrect(0); locked.current = false;
    scroll.current?.scrollTo({ y: 0, animated: false });
  }

  if (!total) return <View style={{ padding: 20, gap: 16 }}><Empty icon="create-outline" title="Brak fiszek do pisania" body="Wybierz inny filtr albo dodaj fiszki do materiału." />{onBack && <Button text="Wróć do trybów nauki" secondary onPress={onBack} />}</View>;

  return <KeyboardAvoidingView style={{ flex: 1, minHeight: 0 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 16 }}>
      <Chip>NAPISZ ODPOWIEDŹ · BEZ AI</Chip>
      <Text style={s.small}>Sesja: {total} fiszek · {answered} prób · {queue.length} w kolejce{reverse ? ' · odwrócony kierunek' : ''}</Text>
      {readOnly && <Text accessibilityRole="alert" style={[s.body, { color: C.orange }]}>Nie można teraz zapisywać ocen. Sprawdź pamięć urządzenia przed dalszą nauką.</Text>}
      {card && item ? <>
        <View style={[s.sectionCard, { gap: 12 }]}><Text style={s.small}>{item.attempt ? 'WRACAMY DO TRUDNEJ FISZKI' : 'PRZYPOMNIJ SOBIE'}</Text><Text selectable style={s.h2}>{card.question}</Text></View>
        <Text style={s.label}>Twoja odpowiedź</Text>
        <TextInput accessibilityLabel="Twoja odpowiedź do fiszki" value={answer} onChangeText={setAnswer} editable={!revealed} multiline textAlignVertical="top" autoCorrect={false} autoCapitalize="none" placeholder="Napisz z pamięci…" placeholderTextColor={C.muted} style={[s.input, { minHeight: 110 }]} />
        {!revealed ? <>
          <Button text={answer.trim() ? 'Sprawdź odpowiedź' : 'Nie wiem — pokaż odpowiedź'} icon="eye-outline" onPress={reveal} />
          <Text style={s.small}>Długie odpowiedzi porównasz samodzielnie. Bez automatycznego oceniania sensu przez AI.</Text>
        </> : <>
          <View accessibilityLiveRegion="polite" style={[s.sectionCard, { backgroundColor: matches ? '#EAF1DE' : C.peach, gap: 10 }]}>
            <Text style={s.label}>{matches ? 'Odpowiedź pasuje do wzorca' : answer.trim() ? 'Porównaj znaczenie odpowiedzi' : 'Przeczytaj i spróbuj zapamiętać'}</Text>
            <Text selectable style={s.body}>{card.answer}</Text>
            <Text style={s.small}>Inne poprawne sformułowanie też możesz ocenić jako „Umiem”. Zachowujemy polskie i obce znaki, liczby oraz przeczenia.</Text>
          </View>
          {card.sourceLines.length > 0 && <Evidence lines={card.sourceLines} onPress={() => onEvidence(card.sourceLines)} />}
          <View style={{ flexDirection: 'row', gap: 12 }}><View style={{ flex: 1 }}><Button text="Nie umiem" secondary disabled={readOnly} onPress={() => grade(false)} /></View><View style={{ flex: 1 }}><Button text="Umiem" disabled={readOnly} onPress={() => grade(true)} /></View></View>
          <Text style={s.small}>{tracked.current.has(item.index) ? 'Twoja ocena zapisuje postęp tej konkretnej fiszki.' : 'To dodatkowe ćwiczenie — nie zmieniamy zapisanej daty powtórki.'} Trudna odpowiedź wróci do dwóch razy w tej sesji.</Text>
        </>}
      </> : <View style={[s.sectionCard, { gap: 16 }]}>
        <Text style={s.h2}>Sesja ukończona</Text><Text style={s.body}>{firstCorrect} z {total} fiszek oceniono jako „Umiem” przy pierwszej próbie. Łącznie: {answered} prób.</Text>
        <Button text="Ćwicz ponownie" icon="refresh-outline" onPress={restart} />
        {onBack && <Button text="Wróć do trybów nauki" secondary onPress={onBack} />}
      </View>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
