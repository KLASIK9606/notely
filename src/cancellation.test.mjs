import test from 'node:test';
import assert from 'node:assert/strict';
import AbortControllerShim from 'abort-controller';
import { assertNotCancelled } from './cancellation.ts';
import { TeacherBuffer } from './teacherBuffer.ts';

test('Teacher cancellation check supports the actual React Native AbortSignal without throwIfAborted', () => {
  const controller = new AbortControllerShim();
  assert.equal(controller.signal.throwIfAborted, undefined);
  assert.doesNotThrow(() => assertNotCancelled(controller.signal));
  controller.abort();
  assert.throws(() => assertNotCancelled(controller.signal), { name: 'AbortError' });
});

test('Teacher preload and foreground playback work with React Native abort-controller', async () => {
  const original = globalThis.AbortController;
  globalThis.AbortController = AbortControllerShim;
  try {
    const buffer = new TeacherBuffer();
    const foreground = new AbortControllerShim();
    let calls = 0;
    await buffer.warm(0, async signal => { calls++; assertNotCancelled(signal); return 'Wykład'; });
    assert.equal(await buffer.take(0, async () => assert.fail('Use prepared topic'), foreground.signal), 'Wykład');
    assert.equal(calls, 1);
    const cancelled = new AbortControllerShim(); cancelled.abort();
    await assert.rejects(buffer.take(1, async () => assert.fail('No work after cancel'), cancelled.signal), { name: 'AbortError' });
  } finally { globalThis.AbortController = original; }
});

test('Interrupting a stalled teacher load still releases the foreground on React Native', async () => {
  const original = globalThis.AbortController;
  globalThis.AbortController = AbortControllerShim;
  try {
    const buffer = new TeacherBuffer();
    const foreground = new AbortControllerShim();
    const pending = buffer.take(0, async () => new Promise(() => {}), foreground.signal);
    foreground.abort();
    await assert.rejects(pending, /anulowany|anulowana/);
    buffer.cancel();
  } finally { globalThis.AbortController = original; }
});
