import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Note } from './types';
import { C, s, Button, Empty } from './ui';
import { selectedCardIndices, StudyFilter, toggleCardStar } from './studySelection';

export function StudyHub({ note, filter, onFilter, reverse, onReverse, onStart, onUpdate, readOnly }: {
  note: Note; filter: StudyFilter; onFilter: (filter: StudyFilter) => void; reverse: boolean; onReverse: (value: boolean) => void;
  onStart: (mode: 'Fiszki' | 'Pisanie' | 'Pary') => void; onUpdate: (note: Note) => void; readOnly: boolean;
}) {
  const selected = selectedCardIndices(note, filter);
  const [visibleCount, setVisibleCount] = useState(20);
  const stars = new Set(selectedCardIndices(note, 'starred'));
  if (!note.materials.flashcards.length) return <Empty icon="albums-outline" title="Tu pojawią się ćwiczenia" body="Dodaj zestaw słówek lub przygotuj fiszki ze swoich materiałów." />;
  return <View style={{ gap: 18 }}>
    <View style={{ gap: 7 }}><Text style={s.h2}>Jak chcesz się uczyć?</Text><Text style={s.body}>Ten sam materiał, różne sposoby zapamiętywania. Ćwiczenia działają bez internetu.</Text></View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([['all', 'Cały zestaw'], ['starred', 'Z gwiazdką'], ['difficult', 'Trudne']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: filter === value }} onPress={() => onFilter(value)} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: filter === value ? C.green : C.border, justifyContent: 'center', backgroundColor: filter === value ? C.lime : C.white }}><Text style={{ color: C.ink, fontWeight: '600' }}>{label} · {selectedCardIndices(note, value).length}</Text></Pressable>)}</View>
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: reverse }} onPress={() => onReverse(!reverse)} style={[s.sectionCard, { flexDirection: 'row', alignItems: 'center', gap: 14 }]}><Ionicons name="swap-horizontal-outline" size={24} color={C.green} /><View style={{ flex: 1 }}><Text style={s.cardTitle}>{reverse ? 'Odpowiedź → pytanie' : 'Pytanie → odpowiedź'}</Text><Text style={s.small}>Dotknij, aby odwrócić kierunek ćwiczeń.</Text></View></Pressable>
    {!selected.length ? <View style={s.sectionCard}><Text style={s.body}>{filter === 'starred' ? 'Zaznacz gwiazdką słowa poniżej, które chcesz przećwiczyć.' : 'Nie masz teraz trudnych fiszek. Pojawią się tu po odpowiedziach „Nie umiem”.'}</Text></View> : <>
      <Button text={`Fiszki · ${selected.length}`} icon="albums-outline" onPress={() => onStart('Fiszki')} />
      <Button text="Napisz odpowiedź" icon="create-outline" secondary onPress={() => onStart('Pisanie')} />
      <Button text="Połącz pary" icon="grid-outline" secondary onPress={() => onStart('Pary')} />
      <Text style={s.small}>Fiszki całego zestawu w zwykłym kierunku korzystają z terminów powtórek. Filtry i odwrócony kierunek służą do ćwiczeń.</Text>
    </>}
    <View style={{ gap: 8 }}><Text style={s.h2}>Wybierz słowa do powtórki</Text><Text style={s.small}>Gwiazdki zapisują się w zestawie. Nie zmieniają Twoich ocen.</Text>{note.materials.flashcards.slice(0, visibleCount).map((card, index) => <Pressable key={index} accessibilityRole="checkbox" accessibilityLabel={`${stars.has(index) ? 'Usuń gwiazdkę' : 'Dodaj gwiazdkę'}: ${card.question}`} accessibilityState={{ checked: stars.has(index), disabled: readOnly }} disabled={readOnly} onPress={() => onUpdate(toggleCardStar(note, index))} style={[s.sectionCard, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}><Ionicons name={stars.has(index) ? 'star' : 'star-outline'} size={24} color={stars.has(index) ? C.orange : C.muted} /><View style={{ flex: 1, gap: 4 }}><Text style={s.cardTitle}>{card.question}</Text><Text style={s.small}>{card.answer}</Text></View></Pressable>)}{visibleCount < note.materials.flashcards.length && <Button text="Pokaż kolejne słowa" secondary onPress={() => setVisibleCount(count => count + 20)} />}</View>
  </View>;
}
