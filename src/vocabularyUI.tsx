import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button, C, s } from './ui';
import { parseVocabulary, vocabularyBlockReason, VocabularyFormat } from './vocabulary';
import { translationLanguages, TranslationLanguage } from './translationOptions';

export function VocabularyEditor({ text, onText, title, onTitle, onSave, disabled, consent = true, error, targetLanguage = 'pl', onLanguage, context = '', onContext, format = 'auto', onFormat }: { text: string; onText: (v: string) => void; title: string; onTitle: (v: string) => void; onSave: () => void; disabled: boolean; consent?: boolean; error?: string | null; targetLanguage?: TranslationLanguage; onLanguage?: (v: TranslationLanguage) => void; context?: string; onContext?: (v: string) => void; format?: VocabularyFormat; onFormat?: (v: VocabularyFormat) => void }) {
  const parsed = parseVocabulary(text, format);
  const [showIssue, setShowIssue] = useState(false);
  const issue = vocabularyBlockReason(text, !disabled, consent, format);
  return <View style={s.sectionCard}>
    <Text style={s.h2}>Słówka i zdania na fiszki</Text>
    <Text style={s.body}>Wklej słowa lub całe zdania, każde w osobnym wierszu. AI samo rozpozna ich język. Gotowe pary zachowamy.</Text>
    <Text style={s.label}>Tłumacz na</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{Object.entries(translationLanguages).map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: targetLanguage === value }} onPress={() => onLanguage?.(value as TranslationLanguage)} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: targetLanguage === value ? C.green : C.border, backgroundColor: targetLanguage === value ? C.lime : C.white, justifyContent: 'center' }}><Text style={s.small}>{label}</Text></Pressable>)}</ScrollView>
    <TextInput accessibilityLabel="Lista słówek" multiline textAlignVertical="top" value={text} onChangeText={onText} style={[s.input, { minHeight: 220 }]} placeholder={'la casa\nMe gustaría un café.\nTengo que estudiar mañana.'} placeholderTextColor={C.muted} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([['auto', 'Rozpoznaj pary'], ['terms', 'Same słowa / zdania'], ['pairs', 'Mam tłumaczenia']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: format === value }} onPress={() => onFormat?.(value)} style={{ minHeight: 44, padding: 10, borderRadius: 12, backgroundColor: value === format ? C.lime : C.paper }}><Text style={s.small}>{label}</Text></Pressable>)}</View>
    <Text style={s.small}>{format === 'terms' ? 'Każdy wiersz to całe wyrażenie. Własne pary oddziel tabulatorem.' : format === 'pairs' ? 'Pary mogą być oddzielone myślnikiem, tabulatorem, dwukropkiem lub średnikiem.' : 'Pary oddzielaj myślnikiem lub tabulatorem. Dwukropki w zdaniach pozostają częścią tekstu.'}</Text>
    <TextInput accessibilityLabel="Kontekst tłumaczenia" value={context} onChangeText={onContext} maxLength={500} style={s.input} placeholder="Kontekst (opcjonalnie), np. podróże lub budowa roślin" placeholderTextColor={C.muted} />
    <Text accessibilityLiveRegion="polite" style={s.small}>{parsed.entries.length} gotowych fiszek{parsed.missing.length ? ` · ${parsed.missing.length} wierszy do uzupełnienia` : ''}. Cała lista zostanie zachowana.</Text>
    {parsed.missing.length > 0 && <Text style={s.small}>{parsed.missing.length} słów lub zdań przetłumaczymy przy tworzeniu fiszek.</Text>}
    {/\[(?:nieczytelne|niepewne)\]/i.test(text) && <Text style={[s.small, { color: C.orange }]}>Sprawdź ze zdjęciem wiersze oznaczone [niepewne] lub [nieczytelne]. Popraw treść i usuń oznaczenie dopiero po sprawdzeniu.</Text>}
    <Text style={s.label}>Tytuł zestawu (opcjonalnie)</Text>
    <TextInput accessibilityLabel="Tytuł zestawu fiszek" value={title} onChangeText={onTitle} maxLength={200} style={s.input} placeholder="np. Angielski — jedzenie" placeholderTextColor={C.muted} />
    <Button text={parsed.missing.length ? 'Przetłumacz i zrób fiszki' : 'Zrób fiszki'} icon="albums-outline" onPress={() => { setShowIssue(true); if (!issue) onSave(); }} />
    {((showIssue && issue) || error) && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[s.body, { color: C.orange }]}>{showIssue && issue ? issue : error}</Text>}
    <Text style={s.small}>Przód: oryginał. Tył: tłumaczenie ({translationLanguages[targetLanguage]}). Zmiana języka dotyczy tylko brakujących tłumaczeń. Przed nauką sprawdź wynik AI.</Text>
  </View>;
}
