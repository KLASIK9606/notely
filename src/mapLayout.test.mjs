import test from 'node:test';
import assert from 'node:assert/strict';
import { mapNodes, mapDescendants, automaticMapLayout, mapLayouts } from './mapLayout.ts';
import { validMaterials } from '../server/schema.mjs';
import { generateMaterialBatches } from './materialPipeline.ts';

const node = (id, parentId = '', sourceLines = [1]) => ({ id, parentId, label: `Pojęcie ${id}`, detail: `Opis ${id}`, sourceLines });
const materials = map => ({ summary: 'Temat', sections: [{ heading: 'Temat', body: 'Treść', sourceLines: [1] }], flashcards: [], quiz: [], mindMap: map });
const map = (nodes, layout = 'tree') => ({ center: 'Temat', branches: [], layout, nodes });

test('All nine thematic layouts and uneven hierarchies deeper than two levels are supported', () => {
  const nodes = [node('a'), node('b', 'a'), node('c', 'b'), node('d', 'c'), node('e')];
  assert.equal(mapLayouts.length, 9);
  for (const { id: layout } of mapLayouts) {
    const result = materials(map(nodes, layout));
    assert.equal(validMaterials(result, ['Treść']), true);
    assert.equal(automaticMapLayout({ subject: 'Historia', title: 'Temat', materials: result }), layout);
  }
  assert.deepEqual(mapDescendants(nodes, 'a').map(item => [item.node.id, item.depth]), [['b', 0], ['c', 1], ['d', 2]]);
});
test('LLM-selected layout and explanation survive generation without application heuristics overriding them', async () => {
  const source = { title: 'Temat', subject: 'Biologia', lines: ['Powtarzające się etapy.'], uncertainties: [] };
  const selected = { ...map([node('a')], 'cycle'), layoutReason: 'Materiał opisuje powtarzające się etapy, więc pasuje układ cyklu.' };
  assert.equal(validMaterials(materials(selected), source.lines), true);
  const generated = await generateMaterialBatches(source, async () => materials(selected));
  assert.equal(automaticMapLayout({ ...source, materials: generated }), 'cycle');
  assert.equal(generated.mindMap.layoutReason, selected.layoutReason);
  assert.equal(validMaterials(materials({ ...selected, layoutReason: '' }), source.lines), false);
  assert.equal(validMaterials(materials({ ...selected, layoutReason: 'x'.repeat(601) }), source.lines), false);
});
test('Map permits more than thirty nodes but rejects cycles, missing parents and false evidence', () => {
  assert.equal(validMaterials(materials(map(Array.from({ length: 60 }, (_, i) => node(`n${i}`)))), ['Treść']), true);
  for (const nodes of [[node('a', 'b'), node('b', 'a')], [node('a', 'missing')], [node('a'), node('a')], [node('a', '', [99])]]) assert.equal(validMaterials(materials(map(nodes)), ['Treść']), false);
  assert.equal(validMaterials(materials(map([node('a')], 'invalid')), ['Treść']), false);
});
test('Old saved branches preserve all text and sources without regenerating', () => {
  const old = { center: 'Biologia', branches: [{ label: 'Budowa', children: ['Pierwszy pełny opis.', 'Drugi pełny opis.'], sourceLines: [2] }] };
  const nodes = mapNodes(old);
  assert.equal(nodes.length, 3);
  assert.deepEqual(nodes.slice(1).map(item => item.detail), old.branches[0].children);
  assert.ok(nodes.every(item => item.sourceLines[0] === 2));
  assert.equal(validMaterials(materials(old), ['Treść', 'Budowa']), true);
});
test('Flattening tolerates corrupt stored cycles without hanging', () => {
  assert.deepEqual(mapDescendants([node('a', 'b'), node('b', 'a')], 'a').map(item => item.node.id), ['b']);
});
test('Multi-part notes retain every node with unique IDs, parent links and global evidence', async () => {
  const note = { title: 'Historia', subject: 'Historia', lines: Array(201).fill('Treść'), uncertainties: [] };
  const result = await generateMaterialBatches(note, async part => materials(map([node('root'), node('child', 'root', [part.lines.length])], 'timeline')));
  assert.equal(result.mindMap.nodes.length, 4);
  assert.equal(new Set(result.mindMap.nodes.map(item => item.id)).size, 4);
  assert.deepEqual(result.mindMap.nodes.map(item => item.sourceLines[0]), [1, 200, 201, 201]);
  const ids = new Set(result.mindMap.nodes.map(item => item.id));
  assert.ok(result.mindMap.nodes.every(item => !item.parentId || ids.has(item.parentId)));
  assert.equal(result.mindMap.layout, 'timeline');
});
