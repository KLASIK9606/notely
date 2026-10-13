import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LibraryItem } from './materialLibrary';
import { IncompleteMaterial } from './incompleteMaterial';
import { isDue } from './review';
import { C, countLabel } from './ui';

export function MaterialCard({ item, example = false, disabled = false, onOpen, onDelete }: { item: LibraryItem; example?: boolean; disabled?: boolean; onOpen: () => void; onDelete: () => void }) {
  const incomplete = !item.note;
  const photos = item.lesson?.sources.filter(source => source.mime.startsWith('image/')).slice(0, 3) || [];
  return <View style={style.card}>
    <View style={style.header}><Text style={style.subject}>{item.subject || 'Notatki'}</Text>
      {example && <Text style={style.example}>Przykład</Text>}
      <Pressable accessibilityRole="button" accessibilityLabel={`Usuń materiały: ${item.title}`} disabled={disabled} onPress={onDelete} style={({ pressed }) => [style.delete, { opacity: disabled ? .35 : pressed ? .5 : 1 }]}><Ionicons name="trash-outline" color={C.muted} size={19} /></Pressable>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Otwórz materiały: ${item.title}${incomplete ? '. Niedokończone — brak opracowania AI' : ''}`} onPress={onOpen} style={({ pressed }) => ({ opacity: pressed ? .75 : 1 })}>
      <View style={style.content}>
        <Text style={style.title}>{item.title}</Text>
        {incomplete ? <>
          <View style={style.badge}><View style={style.dot} /><Text style={style.badgeText}>Do dokończenia</Text></View>
          <IncompleteMaterial />
          <View style={style.files}>{photos.map(source => <Image key={source.id} source={{ uri: source.uri }} style={style.photo} />)}<Ionicons name="documents-outline" color={C.muted} size={16} /><Text style={style.meta}>{countLabel(item.lesson?.sources.length || 0, 'zapisany plik', 'zapisane pliki', 'zapisanych plików')}</Text></View>
        </> : <>
          <View style={style.files}><Ionicons name="albums-outline" size={16} color={C.green} /><Text style={style.meta}>{countLabel(item.note!.materials.flashcards.length, 'fiszka', 'fiszki', 'fiszek')}<Text style={{ color: '#B5BEB7' }}>  ·  </Text>{item.note!.kind === 'vocabulary' ? 'Słówka' : countLabel(item.note!.materials.quiz.length, 'pytanie', 'pytania', 'pytań')}</Text></View>
          <Text style={style.meta}>Nowe: {item.note!.materials.flashcards.filter((_, i) => !item.note!.reviews[String(i)]).length} · Do powtórki: {item.note!.materials.flashcards.filter((_, i) => !!item.note!.reviews[String(i)] && isDue(item.note!, i)).length}</Text>
        </>}
      </View>
      <View style={[style.footer, incomplete && { backgroundColor: '#FCF8EF' }]}><Text style={[style.action, incomplete && { color: '#8A5A25' }]}>{incomplete ? 'Dokończ opracowanie AI' : item.note?.kind === 'vocabulary' ? 'Ucz się słówek' : 'Otwórz notatkę'}</Text><View style={[style.arrow, incomplete && { backgroundColor: '#F4E9D1' }]}><Ionicons name="arrow-forward" size={18} color={incomplete ? '#8A5A25' : C.green} /></View></View>
    </Pressable>
  </View>;
}

const style = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: 23, borderWidth: 1, borderColor: '#E4E9DE', overflow: 'hidden' },
  header: { paddingLeft: 20, paddingRight: 10, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  subject: { color: C.green, fontSize: 12, lineHeight: 18, fontWeight: '700', backgroundColor: '#EDF3E9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, flexShrink: 1 },
  example: { color: C.muted, fontSize: 11 },
  delete: { marginLeft: 'auto', minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 3, paddingBottom: 20, gap: 13 },
  title: { color: C.ink, fontSize: 20, lineHeight: 28, fontWeight: '600', letterSpacing: -.35 },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#F7EDDA', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#A87836' },
  badgeText: { color: '#87602F', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  files: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  photo: { width: 30, height: 38, borderRadius: 6, backgroundColor: C.border },
  meta: { color: '#78877C', fontSize: 12, lineHeight: 19 },
  footer: { paddingVertical: 12, paddingHorizontal: 20, minHeight: 56, backgroundColor: '#F4F7EF', borderTopWidth: 1, borderColor: '#EDF0E8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  action: { color: C.green, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  arrow: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#E7EDDD', alignItems: 'center', justifyContent: 'center' },
});
