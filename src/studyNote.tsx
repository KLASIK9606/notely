import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Note, Source } from './types';
import { Button, C, Chip, Evidence, s } from './ui';
import { MindMap } from './mindMapUI';

export function StudyNote({ note, onEvidence, onOriginal }: { note: Note; onEvidence: (lines: number[]) => void; onOriginal: (source: Source) => void }) {
  const [showText, setShowText] = useState(false);
  const map = note.materials.mindMap;
  const images = note.sources.filter(source => source.mime.startsWith('image/'));
  return <View style={{ gap: 18 }}>
    <View style={s.summary}><View style={s.row}><Ionicons name="sparkles-outline" size={23} color={C.green} /><Chip>W PIGUŁCE</Chip></View><Text style={s.summaryText}>{note.materials.summary}</Text></View>
    <View style={[s.sectionCard, { gap: 22 }]}>
      <Text style={s.h2}>Notatka do nauki</Text>
      {note.materials.sections.map((section, i) => <View key={i} style={{ gap: 10 }}>
        <Text style={[s.cardTitle, { fontSize: 20, lineHeight: 28 }]}>{section.heading}</Text>
        <Text selectable style={[s.body, { fontSize: 17, lineHeight: 28 }]}>{section.body}</Text>
        <Evidence lines={section.sourceLines} onPress={onEvidence} />
      </View>)}
    </View>
    {!!(map.nodes?.length || map.branches.length) && <View style={s.sectionCard}><Text style={s.h2}>Mapa myśli</Text><MindMap note={note} onEvidence={onEvidence} /></View>}
    {!!images.length && <><Text style={s.h2}>Zdjęcia z tej lekcji</Text><Text style={s.small}>Dotknij zdjęcia, aby obejrzeć je w pełnym rozmiarze.</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>{images.map(source => <Pressable key={source.id} accessibilityRole="button" accessibilityLabel={`Pokaż zdjęcie: ${source.caption || source.name}`} onPress={() => onOriginal(source)} style={{ width: 154, gap: 8 }}><Image source={{ uri: source.uri }} resizeMode="cover" style={{ width: 154, height: 180, borderRadius: 16, backgroundColor: C.border }} /><Text style={s.small} numberOfLines={2}>{source.caption || source.name}</Text></Pressable>)}</ScrollView></>}
    <Button text={note.sourceMode === 'pdf-notes' ? (showText ? 'Ukryj opracowanie PDF' : 'Pokaż opracowanie PDF ze stronami') : (showText ? 'Ukryj odczyt materiału' : 'Pokaż odczyt materiału')} secondary icon="document-text-outline" onPress={() => setShowText(!showText)} />
    {showText && <View>{note.lines.map((line, i) => <View key={i} style={s.rawLine}><Text style={s.lineNumber}>{i + 1}</Text><Text style={[s.body, { flex: 1 }]}>{line}</Text></View>)}</View>}
    {note.sources.some(source => !source.mime.startsWith('image/')) && <><Text style={s.h2}>Nagrania i pliki</Text>{note.sources.filter(source => !source.mime.startsWith('image/')).map(source => <Button key={source.id} text={source.caption || source.name} secondary icon={source.mime.startsWith('audio/') ? 'headset-outline' : 'document-outline'} onPress={() => onOriginal(source)} />)}</>}
  </View>;
}
