import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MapLayout, MapNode, Note } from './types';
import { automaticMapLayout, mapDescendants, mapLayouts, mapNodes } from './mapLayout';
import { C, Evidence, s } from './ui';

const descriptions: Record<MapLayout, string> = {
  tree: 'Budowa i podtematy — od ogółu do szczegółu.',
  timeline: 'Wydarzenia w kolejności zapisanej w materiale.',
  process: 'Etapy i kroki. Rozwiń je, żeby prześledzić szczegóły.',
  comparison: 'Obiekty i ich cechy obok siebie.',
  concepts: 'Pojęcia pogrupowane według powiązań z materiału.',
  cycle: 'Etapy powtarzającego się cyklu.',
  'cause-effect': 'Przyczyny i następstwa opisane w materiale.',
  decision: 'Warunki, możliwe wybory i ich wyniki.',
  argument: 'Tezy, argumenty i uzasadnienia ze źródła.',
};
const colors = ['#EDF3E0', '#E9EFFA', '#F9ECD9', '#EFE9F8'];

export function MindMap({ note, onEvidence }: { note: Note; onEvidence: (lines: number[]) => void }) {
  const [chosen, setChosen] = useState<MapLayout | null>(null);
  const [showChoices, setShowChoices] = useState(false);
  const [closed, setClosed] = useState<Set<string>>(() => new Set());
  const [availableWidth, setAvailableWidth] = useState(0);
  const { fontScale } = useWindowDimensions();
  const nodes = useMemo(() => mapNodes(note.materials.mindMap), [note.materials.mindMap]);
  const roots = nodes.filter(node => !node.parentId);
  const layout = chosen || automaticMapLayout(note);
  const columns = (layout === 'comparison' || layout === 'concepts') && availableWidth >= 480 && fontScale <= 1.3;
  const sequential = layout === 'timeline' || layout === 'process' || layout === 'cycle' || layout === 'cause-effect';
  const hierarchy = layout === 'tree' || layout === 'decision' || layout === 'argument';
  const toggle = (id: string) => setClosed(old => { const next = new Set(old); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const body = (node: MapNode, depth: number, root: MapNode) => <View key={node.id} style={[m.detail, { marginLeft: Math.min(depth, 4) * 12, borderLeftWidth: hierarchy ? 2 : 0 }]}>
    {!!node.label && <Text selectable style={s.cardTitle}>{node.label}</Text>}
    {!!node.detail && <Text selectable style={s.body}>{node.detail}</Text>}
    {!(node.sourceLines.length === root.sourceLines.length && node.sourceLines.every(line => root.sourceLines.includes(line))) && <Evidence lines={node.sourceLines} onPress={onEvidence} />}
  </View>;
  return <View onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)} style={{ gap: 16 }}>
    <View style={m.center}><Ionicons name={sequential ? 'arrow-down-outline' : 'git-network-outline'} color={C.lime} size={24} /><Text selectable style={m.title}>{note.materials.mindMap.center}</Text></View>
    {!roots.length ? <Text style={s.body}>Dla tego materiału nie powstała osobna mapa. Pełne opracowanie znajdziesz w notatce.</Text> : <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><Text style={[s.small, { flex: 1 }]}>{chosen ? 'Wybrany układ' : note.materials.mindMap.layoutReason ? 'Dobór AI' : 'Układ'}: {mapLayouts.find(item => item.id === layout)?.label}</Text><Pressable accessibilityRole="button" accessibilityState={{ expanded: showChoices }} onPress={() => setShowChoices(old => !old)} style={m.choice}><Text style={s.link}>{showChoices ? 'Zamknij wybór' : 'Zmień układ'}</Text></Pressable></View>
      {!chosen && !!note.materials.mindMap.layoutReason && <Text style={s.body}>{note.materials.mindMap.layoutReason}</Text>}
      {showChoices && <View style={m.choices}>
        {[{ id: null, label: 'Automatycznie' }, ...mapLayouts].map(item => <Pressable key={item.id || 'auto'} accessibilityRole="button" accessibilityState={{ selected: chosen === item.id }} onPress={() => { setChosen(item.id); setShowChoices(false); }} style={[m.choice, chosen === item.id && { backgroundColor: C.green, borderColor: C.green }]}><Text style={{ color: chosen === item.id ? C.white : C.green, fontSize: 14, fontWeight: '600' }}>{item.label}</Text></Pressable>)}
      </View>}
      <Text accessibilityLiveRegion="polite" style={s.small}>{descriptions[layout]}</Text>
      {!!chosen && <Text style={s.small}>Ręczny wybór zmienia prezentację. Relacje i fakty pozostają takie jak w źródle.</Text>}
      <View style={{ flexDirection: columns ? 'row' : 'column', flexWrap: 'wrap', gap: 12 }}>
        {roots.map((root, index) => {
          const descendants = mapDescendants(nodes, root.id);
          const open = !closed.has(root.id);
          return <View key={root.id} style={{ flexBasis: columns ? '47%' : undefined, flexGrow: columns ? 1 : 0, width: columns ? undefined : '100%' }}>
            <View style={{ flexDirection: 'row', gap: sequential ? 10 : 0 }}>
              {sequential && <View style={{ width: 32, alignItems: 'center' }}><View style={[m.marker, (layout === 'timeline' || layout === 'cycle') && { borderRadius: 16, backgroundColor: layout === 'cycle' ? '#EDF3E0' : '#E9EFFA' }]}><Text style={{ color: C.green, fontWeight: '800' }}>{index + 1}</Text></View>{index < roots.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: '#B5C7A7', marginTop: 5 }} />}</View>}
              <View style={[m.card, { flex: 1, backgroundColor: colors[index % colors.length], borderRadius: layout === 'cycle' ? 25 : 16, borderLeftWidth: layout === 'comparison' || layout === 'argument' ? 4 : 1, borderColor: layout === 'comparison' || layout === 'argument' ? C.green : '#D7DFD0' }]}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Wątek: ${root.label}`} accessibilityState={{ expanded: open }} onPress={() => toggle(root.id)} style={m.branchHeader}>{layout === 'decision' && <Ionicons name="help-circle-outline" size={24} color={C.green} />}{layout === 'argument' && <Ionicons name="chatbox-ellipses-outline" size={23} color={C.green} />}<Text selectable style={[s.cardTitle, { flex: 1, flexShrink: 1 }]}>{root.label}</Text><Ionicons name={open ? 'chevron-up' : 'chevron-down'} color={C.green} size={20} /></Pressable>
                {open && <View style={{ gap: 10 }}>
                  {!!root.detail && <Text selectable style={s.body}>{root.detail}</Text>}
                  <Evidence lines={root.sourceLines} onPress={onEvidence} />
                  {descendants.map(item => body(item.node, item.depth, root))}
                </View>}
              </View>
            </View>
            {(layout === 'process' || layout === 'cause-effect' || layout === 'cycle') && index < roots.length - 1 && <View style={{ alignItems: 'center', paddingTop: 8 }}><Ionicons name={layout === 'cycle' ? 'arrow-redo-outline' : 'arrow-down'} size={23} color={C.green} /></View>}
          </View>;
        })}
      </View>
      {layout === 'cycle' && note.materials.mindMap.layout === 'cycle' && <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}><Ionicons name="repeat-outline" size={25} color={C.green} /><Text style={[s.small, { flexShrink: 1 }]}>Cykl wraca do pierwszego etapu.</Text></View>}
    </>}
  </View>;
}

const m = StyleSheet.create({
  center: { backgroundColor: C.green, borderRadius: 18, padding: 18, flexDirection: 'row', gap: 12, alignItems: 'center' },
  title: { color: C.white, fontSize: 21, lineHeight: 29, fontWeight: '700', flex: 1 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#B5C7A7', borderRadius: 12, justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  branchHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  detail: { paddingLeft: 10, borderColor: '#B5C7A7', gap: 6 },
  marker: { minHeight: 32, width: 32, borderRadius: 8, backgroundColor: '#EDF3E0', justifyContent: 'center', alignItems: 'center' },
});
