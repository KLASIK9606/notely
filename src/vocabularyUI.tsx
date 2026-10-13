import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { Button, C, s } from './ui';
import { parseVocabulary } from './vocabulary';

export function VocabularyEditor({ text, onText, title, onTitle, onSave, disabled }: { text: string; onText: (v: string) => void; title: string; onTitle: (v: string) => void; onSave: () => void; disabled: boolean }) {
  const parsed = parseVocabulary(text);
  return <View style={s.sectionCard}>
    <Text style={s.h2}>Twoja lista słówek</Text>
    <Text style={s.body}>Wklej całą listę lub sprawdź odczyt ze zdjęcia. Jedna para w każdym wierszu: słowo — tłumaczenie lub znaczenie.</Text>
    <TextInput accessibilityLabel="Lista słówek" multiline textAlignVertical="top" value={text} onChangeText={onText} style={[s.input, { minHeight: 220 }]} placeholder={'apple — jabłko\ncut — ciąć\na potato — ziemniak'} placeholderTextColor={C.muted} />
    <Text accessibilityLiveRegion="polite" style={s.small}>{parsed.entries.length} gotowych fiszek{parsed.missing.length ? ` · ${parsed.missing.length} wierszy do uzupełnienia` : ''}. Cała lista zostanie zachowana.</Text>
    {parsed.missing.length > 0 && <Text style={[s.small, { color: C.orange }]}>Brakuje par w wierszach: {parsed.missing.slice(0, 12).map(row => row.line).join(', ')}{parsed.missing.length > 12 ? '…' : ''}. Dopisz znaczenie po myślniku.</Text>}
    {/\[(?:nieczytelne|niepewne)\]/i.test(text) && <Text style={[s.small, { color: C.orange }]}>Sprawdź ze zdjęciem wiersze oznaczone [niepewne] lub [nieczytelne]. Popraw treść i usuń oznaczenie dopiero po sprawdzeniu.</Text>}
    <Text style={s.label}>Tytuł zestawu (opcjonalnie)</Text>
    <TextInput accessibilityLabel="Tytuł zestawu fiszek" value={title} onChangeText={onTitle} maxLength={200} style={s.input} placeholder="np. Angielski — jedzenie" placeholderTextColor={C.muted} />
    <Button text="Zrób fiszki" icon="albums-outline" disabled={disabled || !parsed.entries.length || !!parsed.missing.length} onPress={onSave} />
    <Text style={s.small}>Pary z listy zapisujemy bez AI. Przed nauką sprawdź ich poprawność.</Text>
  </View>;
}
