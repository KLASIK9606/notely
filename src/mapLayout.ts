import type { MapLayout, MapNode, Note } from './types';
export const mapLayouts: { id: MapLayout; label: string }[] = [
  { id: 'tree', label: 'Drzewo' }, { id: 'timeline', label: 'Oś czasu' }, { id: 'process', label: 'Proces' }, { id: 'comparison', label: 'Porównanie' }, { id: 'concepts', label: 'Pojęcia' },
  { id: 'cycle', label: 'Cykl' }, { id: 'cause-effect', label: 'Przyczyny i skutki' }, { id: 'decision', label: 'Decyzje' }, { id: 'argument', label: 'Argumenty' },
];

export function mapNodes(map: Note['materials']['mindMap']): MapNode[] {
  const nodes = [...(map.nodes || [])];
  // Older saved notes retain every label, detail and source reference.
  map.branches.forEach((branch, index) => {
    let id = `legacy-${index}`;
    while (nodes.some(node => node.id === id || node.id.startsWith(id + '-'))) id = '_' + id;
    nodes.push({ id, parentId: '', label: branch.label, detail: '', sourceLines: branch.sourceLines });
    branch.children.forEach((text, child) => nodes.push({ id: `${id}-${child}`, parentId: id, label: '', detail: text, sourceLines: branch.sourceLines }));
  });
  return nodes;
}

export function automaticMapLayout(note: Note): MapLayout {
  if (mapLayouts.some(layout => layout.id === note.materials.mindMap.layout)) return note.materials.mindMap.layout!;
  const text = `${note.subject} ${note.title} ${note.materials.mindMap.branches.map(branch => branch.label).join(' ')}`.toLowerCase();
  if (/porówn|różnice|podobieństwa|versus/.test(text)) return 'comparison';
  if (note.materials.mindMap.branches.length > 1 && note.materials.mindMap.branches.every(branch => /^(?:etap|krok|faza|stadium)\b/i.test(branch.label))) return 'process';
  if (/chronolog|wydarzenia|przebieg wojny/.test(text)) return 'timeline';
  return 'tree';
}

/** Flatten any depth for readable phone layouts; corrupt legacy cycles cannot hang rendering. */
export function mapDescendants(nodes: MapNode[], parentId: string): { node: MapNode; depth: number }[] {
  const result: { node: MapNode; depth: number }[] = [];
  const children = new Map<string, MapNode[]>();
  nodes.forEach(node => children.set(node.parentId, [...(children.get(node.parentId) || []), node]));
  const stack = [...(children.get(parentId) || [])].reverse().map(node => ({ node, depth: 0 }));
  const visited = new Set<string>([parentId]);
  while (stack.length) {
    const item = stack.pop()!;
    if (visited.has(item.node.id)) continue;
    visited.add(item.node.id); result.push(item);
    stack.push(...[...(children.get(item.node.id) || [])].reverse().map(node => ({ node, depth: item.depth + 1 })));
  }
  return result;
}
