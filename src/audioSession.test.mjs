import test from 'node:test';
import assert from 'node:assert/strict';
import { playbackMode, recordingMode, startPlayback, microphoneLevel } from './audioSession.ts';

test('playback waits for session switch, unmutes player and awaits rewind', async () => {
  const events = [];
  const player = { muted: true, volume: 0, seekTo: async time => events.push(`seek:${time}`), play: () => { assert.equal(player.muted, false); assert.equal(player.volume, 1); events.push('play'); } };
  await startPlayback(player, { activate: async () => events.push('activate'), setMode: async () => events.push('playback-mode') }, true);
  assert.deepEqual(events, ['activate', 'playback-mode', 'seek:0', 'play']);
  assert.equal(playbackMode.allowsRecording, false);
  assert.equal(playbackMode.playsInSilentMode, true);
  assert.equal(playbackMode.shouldRouteThroughEarpiece, false);
  assert.equal(recordingMode.allowsRecording, true);
});
test('failed session setup does not start playback; resume does not rewind', async () => {
  let plays = 0, seeks = 0;
  const player = { muted: false, volume: 1, seekTo: async () => { seeks++; }, play: () => { plays++; } };
  await assert.rejects(startPlayback(player, { activate: async () => {}, setMode: async () => { throw Error('session failed'); } }, false));
  assert.equal(plays, 0);
  await startPlayback(player, { activate: async () => {}, setMode: async () => {} }, false);
  assert.equal(plays, 1); assert.equal(seeks, 0);
});
test('unavailable metering is not represented as captured silence', () => {
  assert.equal(microphoneLevel(undefined), null);
  assert.equal(microphoneLevel(NaN), null);
  assert.equal(microphoneLevel(-160), 0);
  assert.ok(microphoneLevel(-20) > .5);
  assert.equal(microphoneLevel(10), 1);
});
