import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { Button, C, s } from './ui';
import { parseVocabulary } from './vocabulary';

export function VocabularyEditor({ text, onText, title, onTitle, onSave, disabled }: { text: string; onText: (v: string) => void; title: string; onTitle: (v: string) => void; onSave: () => void; disabled: boolean }) {
  const parsed = parseVocabulary(text);
  return <View style={s.sectionCard}>
    <Text style={s.h2}>Słówka i zdania na fiszki</Text>
    <Text style={s.body}>Wklej słowa lub całe zdania, każde w osobnym wierszu. AI rozpozna język i automatycznie doda polskie tłumaczenie. Gotowe pary zachowamy.</Text>
    <TextInput accessibilityLabel="Lista słówek" multiline textAlignVertical="top" value={text} onChangeText={onText} style={[s.input, { minHeight: 220 }]} placeholder={'la casa\nMe gustaría un café.\nTengo que estudiar mañana.'} placeholderTextColor={C.muted} />
    <Text accessibilityLiveRegion="polite" style={s.small}>{parsed.entries.length} gotowych fiszek{parsed.missing.length ? ` · ${parsed.missing.length} wierszy do uzupełnienia` : ''}. Cała lista zostanie zachowana.</Text>
    {parsed.missing.length > 0 && <Text style={s.small}>{parsed.missing.length} słów lub zdań przetłumaczymy przy tworzeniu fiszek.</Text>}
    {/\[(?:nieczytelne|niepewne)\]/i.test(text) && <Text style={[s.small, { color: C.orange }]}>Sprawdź ze zdjęciem wiersze oznaczone [niepewne] lub [nieczytelne]. Popraw treść i usuń oznaczenie dopiero po sprawdzeniu.</Text>}
    <Text style={s.label}>Tytuł zestawu (opcjonalnie)</Text>
    <TextInput accessibilityLabel="Tytuł zestawu fiszek" value={title} onChangeText={onTitle} maxLength={200} style={s.input} placeholder="np. Angielski — jedzenie" placeholderTextColor={C.muted} />
    <Button text={parsed.missing.length ? 'Przetłumacz i zrób fiszki' : 'Zrób fiszki'} icon="albums-outline" disabled={disabled || (!parsed.entries.length && !parsed.missing.length) || /\[(?:nieczytelne|niepewne)\]/i.test(text)} onPress={onSave} />
    <Text style={s.small}>Przód: oryginał. Tył: polskie tłumaczenie. Przed nauką sprawdź wynik AI.</Text>
  </View>;
}
