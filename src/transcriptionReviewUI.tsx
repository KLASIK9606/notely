import React from 'react';
import { Text, TextInput, View } from 'react-native';
import type { Transcription } from './types';
import { Button, C, s } from './ui';
import { confirmTranscriptionLine, editTranscriptionLine, omitTranscriptionLines, unreadable } from './transcriptionReview';

export function TranscriptionReviewLines({ draft, onChange }: { draft: Transcription; onChange: (draft: Transcription) => void }) {
  return <>{draft.lines.map((line, i) => {
    const warning = draft.uncertainties.find(item => item.line === i + 1);
    const needsReview = !!warning || unreadable(line);
    return <View key={i} style={[s.lineEditor, needsReview && { borderColor: '#ECC49B', backgroundColor: C.peach }]}>
      <Text style={s.lineNumber}>{String(i + 1).padStart(2, '0')}</Text>
      <View style={{ flex: 1, gap: 8 }}>
        {needsReview && <><Text style={{ color: C.orange, fontWeight: '700' }}>Niejasny fragment — sprawdź z oryginałem</Text><Text style={s.small}>Odczytano: {line || '(pusty fragment)'}</Text><Text style={s.small}>{warning?.reason || 'Nie udało się rozpoznać części tekstu.'} Popraw treść poniżej albo pomiń ten fragment. AI nie zgaduje brakujących słów.</Text></>}
        <TextInput accessibilityLabel={`Treść linii ${i + 1}`} multiline value={line} onChangeText={text => onChange(editTranscriptionLine(draft, i, text))} style={s.lineInput} />
        {needsReview && !unreadable(line) && <Button text="Treść jest poprawna" secondary onPress={() => onChange(confirmTranscriptionLine(draft, i))} />}
        <Button text={needsReview ? 'Pomiń ten fragment' : 'Usuń fragment'} secondary icon="trash-outline" onPress={() => onChange(omitTranscriptionLines(draft, [i + 1]))} />
        {needsReview && <Text style={s.small}>Pominięty fragment nie trafi do materiałów. Oryginalny plik pozostanie zapisany.</Text>}
      </View>
    </View>;
  })}
    {!draft.lines.length && <Text style={s.small}>Nie ma jeszcze treści. Dodaj fragment i wpisz czytelny tekst.</Text>}
    <Button text="Dodaj fragment" secondary icon="add-outline" onPress={() => onChange({ ...draft, lines: [...draft.lines, ''] })} />
  </>;
}
