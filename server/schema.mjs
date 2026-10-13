const string = { type: 'string' };
const strings = { type: 'array', items: string };
const integer = { type: 'integer' };
const refs = { type: 'array', items: integer };
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const array = items => ({ type: 'array', items });
export const transcriptionSchema = object({ title: string, subject: string, lines: strings, uncertainties: array(object({ line: integer, reason: string })) });
const materialFields = {
  summary: string,
  sections: array(object({ heading: string, body: string, sourceLines: refs })),
  flashcards: array(object({ question: string, answer: string, sourceLines: refs })),
  quiz: array(object({ question: string, options: strings, correctIndex: integer, explanation: string, sourceLines: refs })),
  mindMap: object({ center: string, branches: array(object({ label: string, children: strings, sourceLines: refs })) }),
};
const legacyMaterialsSchema = object(materialFields);
export const mapLayoutChoices = ['tree', 'timeline', 'process', 'comparison', 'concepts', 'cycle', 'cause-effect', 'decision', 'argument'];
const graphMapFields = { center: string, layout: { type: 'string', enum: mapLayoutChoices }, nodes: array(object({ id: string, parentId: string, label: string, detail: string, sourceLines: refs })), branches: array(object({ label: string, children: strings, sourceLines: refs })) };
const previousGraphSchema = object({ ...materialFields, mindMap: object(graphMapFields) });
export const materialsSchema = object({ ...materialFields, mindMap: object({ ...graphMapFields, layoutReason: string }) });

export function validMapGraph(map, lines) {
  if (!Array.isArray(map.nodes) || map.nodes.length > 300 || !mapLayoutChoices.includes(map.layout)) return false;
  if (map.layoutReason !== undefined && (!map.layoutReason.trim() || map.layoutReason.length > 600)) return false;
  const byId = new Map(map.nodes.map(node => [node.id, node]));
  if (byId.size !== map.nodes.length) return false;
  for (const node of map.nodes) {
    if (!node.id.trim() || !node.label.trim() || node.id.length > 100 || node.parentId.length > 100 || !node.sourceLines.length || !node.sourceLines.every(line => Number.isInteger(line) && line >= 1 && line <= lines.length && lines[line - 1].trim())) return false;
    const visited = new Set([node.id]); let parent = node.parentId;
    while (parent) {
      if (!byId.has(parent) || visited.has(parent)) return false;
      visited.add(parent); parent = byId.get(parent).parentId;
    }
  }
  return true;
}

export function validateSchema(value, schema) {
  if (schema.type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(k => k in schema.properties) && schema.required.every(k => validateSchema(value[k], schema.properties[k]));
  if (schema.type === 'array') return Array.isArray(value) && value.length <= 300 && value.every(v => validateSchema(v, schema.items));
  if (schema.type === 'integer') return Number.isSafeInteger(value);
  return typeof value === 'string' && value.length <= 30000;
}
export function validTranscription(value) {
  return validateSchema(value, transcriptionSchema) && value.title.trim() && value.lines.length > 0 && value.lines.length <= 200 && value.lines.some(l => l.trim()) && value.uncertainties.every(u => u.line >= 1 && u.line <= value.lines.length);
}
export function validMaterials(value, lines) {
  const extended = value?.mindMap?.nodes !== undefined || value?.mindMap?.layout !== undefined;
  const schema = extended ? (value.mindMap.layoutReason === undefined ? previousGraphSchema : materialsSchema) : legacyMaterialsSchema;
  if (!validateSchema(value, schema) || !value.summary.trim()) return false;
  if (extended && !validMapGraph(value.mindMap, lines)) return false;
  const groups = [value.sections, value.flashcards, value.quiz, value.mindMap.branches];
  if (!value.sections.length || groups.some(g => g.length > 30)) return false;
  if (!groups.flat().every(v => v.sourceLines.length > 0 && v.sourceLines.every(i => i >= 1 && i <= lines.length && lines[i - 1].trim()))) return false;
  if (!value.sections.every(s => s.heading.trim() && s.body.trim()) || !value.flashcards.every(c => c.question.trim() && c.answer.trim()) || !value.mindMap.center.trim() || !value.mindMap.branches.every(b => b.label.trim() && b.children.length && b.children.every(c => c.trim()))) return false;
  return value.quiz.every(q => q.question.trim() && q.explanation.trim() && q.options.length === 4 && q.options.every(o => o.trim()) && new Set(q.options).size === 4 && q.correctIndex >= 0 && q.correctIndex < 4);
}
