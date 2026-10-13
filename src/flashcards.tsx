import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Note } from './types';
import { advanceSession, buildNextSession, buildSession, intervalLabel, nextSessionItem, schedule, SessionItem } from './review';
import { Button, Chip, Empty, C, s } from './ui';

import { flashcardPages } from './flashcardPages';

type Snapshot = { note: Note; queue: SessionItem[]; answered: number; correct: number; revealed: boolean };
export function Flashcards({ note, onUpdate, onEvidence, labels, readOnly = false }: { note: Note; onUpdate: (note: Note) => void; onEvidence: (lines: number[]) => void; labels?: string[]; readOnly?: boolean }) {
  const [practice, setPractice] = useState(false);
  const [queue, setQueue] = useState(() => buildSession(note));
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [undo, setUndo] = useState<Snapshot | null>(null);
  const [now, setNow] = useState(Date.now);
  const locked = useRef(false);
  const item = nextSessionItem(queue, answered, now);
  const card = item ? note.materials.flashcards[item.index] : undefined;
  const review = item ? note.reviews[String(item.index)] : undefined;
  const { height: screenHeight, fontScale } = useWindowDimensions();
  const compact = screenHeight < 740 || fontScale > 1.2;
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { locked.current = false; }, [item?.index, answered]);
  function reset(nextPractice: boolean, nextSession = false) { const time = Date.now(); const next = nextSession ? buildNextSession(note, time) : { practice: nextPractice, queue: buildSession(note, time, 10, nextPractice) }; setNow(time); setPractice(next.practice); setQueue(next.queue); setAnswered(0); setCorrect(0); setRevealed(false); setUndo(null); locked.current = false; }
  function grade(known: boolean) {
    if (!item || !revealed || locked.current || readOnly) return;
    locked.current = true;
    const time = Date.now(); const nextReview = schedule(review, known, time);
    setUndo({ note, queue, answered, correct, revealed });
    if (!practice) onUpdate({ ...note, reviews: { ...note.reviews, [String(item.index)]: nextReview } });
    setQueue(advanceSession(queue, item, known, nextReview, answered + 1, practice, time));
    setAnswered(answered + 1); setCorrect(correct + (known ? 1 : 0)); setRevealed(false); setNow(time);
  }
  function undoGrade() { if (!undo || readOnly) return; if (!practice) onUpdate(undo.note); setQueue(undo.queue); setAnswered(undo.answered); setCorrect(undo.correct); setRevealed(undo.revealed); setNow(Date.now()); setUndo(null); locked.current = false; }
  const waiting = queue.length && !item ? Math.max(1, Math.ceil((Math.min(...queue.map(q => q.availableAt)) - now) / 1000)) : 0;
  const future = note.materials.flashcards.map((_, i) => note.reviews[String(i)]).filter(r => r && Date.parse(r.due) > now).sort((a, b) => Date.parse(a.due) - Date.parse(b.due))[0];
  if (!note.materials.flashcards.length) return <Empty icon="albums-outline" title="Bez dodatkowych fiszek" body="Dla tego materiału nie powstały fiszki. Pełną treść znajdziesz w notatce." />;
  const nextIsPractice = !buildSession(note, now).length;
  return <View style={{ flex: 1, minHeight: 0 }}>
    <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 16, paddingTop: 6, gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><Text style={s.small}>{practice ? 'Ćwiczenie' : 'Powtórki'} · {answered} odpowiedzi</Text><Text style={s.small}>{queue.length} w kolejce</Text></View>
      {readOnly && <Text style={{ color: C.orange, fontSize: 12 }}>Nie można teraz zapisywać ocen.</Text>}
      {practice && <Text style={s.small}>Ćwiczysz bez zmiany terminów powtórek.</Text>}
      {card && item ? <>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><Text style={s.small}>FISZKA {item.index + 1} / {note.materials.flashcards.length}</Text><Chip color={review ? C.peach : C.lime}>{!review ? 'NOWA' : review.stage === 'review' ? 'POWTÓRKA' : 'UTRWALAMY'}</Chip></View>
        <CardFace key={`${item.index}-${answered}-${revealed}`} text={revealed ? card.answer : card.question} revealed={revealed} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {revealed ? <Pressable accessibilityRole="button" onPress={() => setRevealed(false)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={s.link}>Pytanie</Text></Pressable> : <Text style={s.small}>Przypomnij sobie odpowiedź.</Text>}
          {revealed && <Pressable accessibilityRole="button" accessibilityLabel="Sprawdź źródło fiszki" onPress={() => onEvidence(card.sourceLines)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={s.link}>Źródło</Text></Pressable>}
        </View>
      </> : <View style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
        <Empty icon={waiting ? 'time-outline' : 'checkmark-circle-outline'} title={waiting ? 'Chwila odstępu pomaga zapamiętać' : answered ? 'Sesja zakończona' : 'Na teraz wszystko'} body={waiting ? `Trudna fiszka wróci za ${waiting >= 60 ? `${Math.ceil(waiting / 60)} min` : `${waiting} s`}.` : `${correct} z ${answered} odpowiedzi „Umiem”.${future ? ` Najbliższa powtórka za ${intervalLabel(future, now)}.` : ''}`} />
        {!waiting && note.materials.flashcards.length > 0 && <Button text={nextIsPractice ? 'Ćwicz ponownie' : 'Kolejna sesja'} onPress={() => reset(false, true)} />}
        {!waiting && (practice || !nextIsPractice) && <Button text={practice ? 'Wróć do powtórek' : 'Ćwicz cały zestaw'} secondary onPress={() => reset(!practice)} />}
      </View>}
    </View>
    <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8, gap: 6, borderTopWidth: 1, borderColor: C.border, backgroundColor: C.paper }}>
      {card && !revealed && <Button text="Pokaż odpowiedź" icon="eye-outline" onPress={() => setRevealed(true)} />}
      {card && revealed && <><Text style={[s.small, { textAlign: 'center' }]}>Czy znałeś(-aś) odpowiedź przed odkryciem?</Text><View style={{ flexDirection: 'row', gap: 12 }}>{([false, true] as const).map(known => <Pressable key={String(known)} accessibilityRole="button" accessibilityLabel={known ? 'Umiem' : 'Nie umiem'} disabled={readOnly} onPress={() => grade(known)} style={({ pressed }) => ({ flex: 1, minHeight: compact ? 58 : 72, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 3, padding: compact ? 8 : 12, backgroundColor: known ? C.green : C.peach, borderWidth: 1, borderColor: known ? C.green : '#E7BC97', opacity: pressed ? .75 : 1 })}><Text style={{ fontSize: 19, fontWeight: '800', color: known ? C.white : C.ink }}>{known ? 'Umiem' : 'Nie umiem'}</Text><Text style={{ fontSize: 12, color: known ? '#E5F2DE' : C.orange }}>{practice ? 'Ćwiczenie' : `Wróci za ${intervalLabel(schedule(review, known, now), now)}`}</Text></Pressable>)}</View></>}
      {undo && <Pressable accessibilityRole="button" disabled={readOnly} onPress={undoGrade} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={s.link}>Cofnij ostatnią ocenę</Text></Pressable>}
    </View>
  </View>;
}



/** Native line measurements adapt the card to its actual available space. */
function CardFace({ text, revealed }: { text: string; revealed: boolean }) {
  const { fontScale } = useWindowDimensions();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fontSize, setFontSize] = useState(24);
  const [pages, setPages] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const lineHeight = Math.ceil(fontSize * 1.38);
  const textHeight = Math.max(1, size.height - 112);
  useEffect(() => { setFontSize(24); setPages([]); setPage(0); }, [text, size.width, size.height, fontScale]);
  useEffect(() => {
    if (Platform.OS !== 'web' || !size.width || !size.height) return;
    // React Native Web does not expose native onTextLayout. Measure real DOM wrapping.
    const node = document.createElement('div');
    Object.assign(node.style, { position: 'fixed', visibility: 'hidden', width: `${size.width - 34}px`, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', fontWeight: revealed ? '400' : '600' });
    document.body.appendChild(node);
    const fits = (value: string) => { node.textContent = value; return node.getBoundingClientRect().height <= textHeight; };
    let fittedFont = 24;
    for (; fittedFont > 18; fittedFont -= 2) {
      node.style.fontSize = `${fittedFont * fontScale}px`; node.style.lineHeight = `${Math.ceil(fittedFont * 1.38) * fontScale}px`;
      if (fits(text)) break;
    }
    node.style.fontSize = `${fittedFont * fontScale}px`; node.style.lineHeight = `${Math.ceil(fittedFont * 1.38) * fontScale}px`;
    const result: string[] = [];
    let remaining = text;
    while (remaining.length) {
      let low = 1; let high = remaining.length;
      while (low < high) { const mid = Math.ceil((low + high) / 2); if (fits(remaining.slice(0, mid))) low = mid; else high = mid - 1; }
      let end = low;
      if (end < remaining.length) { const space = remaining.slice(0, end).search(/\s+\S*$/); if (space > end / 2) end = space + 1; }
      if (end < remaining.length && /[\uD800-\uDBFF]/.test(remaining[end - 1]) && /[\uDC00-\uDFFF]/.test(remaining[end])) end = end > 1 ? end - 1 : end + 1;
      result.push(remaining.slice(0, end)); remaining = remaining.slice(end);
    }
    node.remove(); setFontSize(fittedFont); setPages(result.length ? result : ['']); setPage(0);
  }, [text, revealed, size.width, size.height, textHeight, fontScale]);
  const textStyle = { fontSize: Platform.OS === 'web' ? fontSize * fontScale : fontSize, lineHeight: Platform.OS === 'web' ? lineHeight * fontScale : lineHeight, ...(Platform.OS === 'web' ? { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' } : {}), color: C.ink, fontWeight: (revealed ? '400' : '600') as '400' | '600', textAlign: 'center' as const };
  return <View onLayout={event => { const { width, height } = event.nativeEvent.layout; setSize(old => old.width === width && old.height === height ? old : { width, height }); }} style={{ flex: 1, minHeight: 0, backgroundColor: revealed ? '#EAF2DF' : C.white, borderRadius: 22, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 10, overflow: 'hidden' }}>
    <View style={{ height: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Ionicons name={revealed ? 'bulb-outline' : 'albums-outline'} size={20} color={C.green} /><Text style={s.label}>{revealed ? 'Odpowiedź' : 'Pytanie'}</Text></View>
    <View style={{ flex: 1, minHeight: 0, justifyContent: 'center' }}>
      {Platform.OS !== 'web' && size.width > 0 && <Text key={`${fontSize}-${size.width}-${size.height}-${fontScale}`} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[textStyle, { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0 }]} onTextLayout={event => {
        const lines = event.nativeEvent.lines;
        const measured = lines.reduce((sum, line) => sum + line.height, 0);
        if (measured > textHeight && fontSize > 18) { setFontSize(fontSize - 2); return; }
        setPages(flashcardPages(text, lines, textHeight));
        setPage(0);
      }}>{text}</Text>}
      {pages.length > 0 && <Text accessibilityLiveRegion="polite" style={textStyle}>{pages[Math.min(page, pages.length - 1)].trim()}</Text>}
    </View>
    <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
      {pages.length > 1 ? <><Pressable accessibilityRole="button" accessibilityLabel="Poprzednia strona fiszki" disabled={page === 0} onPress={() => setPage(page - 1)} style={{ minWidth: 64, minHeight: 44, justifyContent: 'center', opacity: page === 0 ? .3 : 1 }}><Text style={s.link}>← Wstecz</Text></Pressable><Text style={s.small}>{page + 1} / {pages.length}</Text><Pressable accessibilityRole="button" accessibilityLabel="Następna strona fiszki" disabled={page >= pages.length - 1} onPress={() => setPage(page + 1)} style={{ minWidth: 64, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end', opacity: page >= pages.length - 1 ? .3 : 1 }}><Text style={s.link}>Dalej →</Text></Pressable></> : <Text style={[s.small, { flex: 1, textAlign: 'center' }]}>{revealed ? 'Oceń, czy pamiętasz tę odpowiedź.' : 'Odpowiedź odkryjesz przyciskiem poniżej.'}</Text>}
    </View>
  </View>;
}
