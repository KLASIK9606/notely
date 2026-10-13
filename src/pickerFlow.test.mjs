import test from 'node:test';
import assert from 'node:assert/strict';
import { PickerFlow } from './pickerFlow.ts';
const labels = { waiting: 'gallery', processing: 'saving' };
function setup() {
  const events = [];
  const flow = new PickerFlow({ waiting: x => events.push(x), processing: x => events.push(x), error: e => events.push(e.message), idle: () => events.push('idle') });
  return { flow, events };
}
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
test('Launch runs in the user event, processing begins only after selection', async () => {
  const { flow, events } = setup(); const pending = deferred();
  const run = flow.start(() => { events.push('launch'); return pending.promise; }, async () => events.push('save'), labels);
  assert.deepEqual(events, ['gallery', 'launch']);
  pending.resolve({ canceled: false }); await run;
  assert.deepEqual(events, ['gallery', 'launch', 'saving', 'save', 'idle']);
  assert.equal(flow.busy, false);
});
test('Cancel returned by the system never enters processing', async () => {
  const { flow, events } = setup();
  await flow.start(async () => ({ canceled: true }), async () => assert.fail('Must not save'), labels);
  assert.deepEqual(events, ['gallery', 'idle']);
});
test('Manual cancel frees a stuck picker and ignores late results without unlocking the new picker', async () => {
  const { flow, events } = setup(); const old = deferred(); const next = deferred();
  const first = flow.start(() => old.promise, async () => assert.fail('Stale import'), labels);
  flow.cancel();
  const second = flow.start(() => next.promise, async () => events.push('new-save'), labels);
  old.resolve({ canceled: false }); await first;
  assert.equal(flow.busy, true);
  assert.deepEqual(events, ['gallery', 'idle', 'gallery']);
  next.resolve({ canceled: false }); await second;
  assert.deepEqual(events.slice(-3), ['saving', 'new-save', 'idle']);
});
test('Late errors after cancel cannot overwrite a new operation', async () => {
  const { flow, events } = setup(); const old = deferred(); const next = deferred();
  const first = flow.start(() => old.promise, async () => {}, labels); flow.cancel();
  const second = flow.start(() => next.promise, async () => {}, labels);
  old.reject(new Error('obsolete')); await first;
  assert.equal(events.includes('obsolete'), false); assert.equal(flow.busy, true);
  next.resolve({ canceled: true }); await second;
});
test('Duplicate openings are ignored and processing failure releases the lock', async () => {
  const { flow, events } = setup(); const pending = deferred();
  const run = flow.start(() => pending.promise, async () => { throw new Error('disk full'); }, labels);
  await flow.start(async () => { assert.fail('Duplicate opening'); }, async () => {}, labels);
  pending.resolve({ canceled: false }); await run;
  assert.deepEqual(events, ['gallery', 'saving', 'disk full', 'idle']); assert.equal(flow.busy, false);
});
test('Cancel invalidates processing so it cannot commit to a different lesson', async () => {
  const { flow } = setup(); const pending = deferred(); let committed = false;
  const run = flow.start(async () => ({ canceled: false }), async (_, active) => { await pending.promise; if (active()) committed = true; }, labels);
  await Promise.resolve(); flow.cancel(); pending.resolve(); await run;
  assert.equal(committed, false);
});
