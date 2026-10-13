import test from 'node:test';
import assert from 'node:assert/strict';
import { readableSourceBlob, uploadFilename } from './sourceRead.ts';

test('Failed, expired, empty and oversized files are rejected before OCR upload', async () => {
  await assert.rejects(readableSourceBlob(new Response('not found', { status: 404 }), 100), /HTTP 404/);
  await assert.rejects(readableSourceBlob(new Response('<html>login</html>', { headers: { 'Content-Type': 'text/html' } }), 100), /stronę błędu/);
  await assert.rejects(readableSourceBlob(new Response(new Uint8Array()), 100), /pusty/);
  await assert.rejects(readableSourceBlob(new Response(new Uint8Array(101)), 100), /limit/);
});
test('Valid binary data remains identical for generic and declared MIME downloads', async () => {
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10]);
  for (const mime of ['application/octet-stream', 'image/png']) {
    const blob = await readableSourceBlob(new Response(bytes, { headers: { 'Content-Type': mime } }), 100);
    assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), bytes);
  }
});
test('Long provider filenames remain within server limit with PDF extension and intact Unicode', () => {
  const name = 'Żółć'.repeat(90) + '.pdf';
  const shortened = uploadFilename(name, 'application/pdf');
  assert.ok(shortened.length <= 180); assert.ok(shortened.endsWith('.pdf'));
  assert.equal(name.length, 364);
  assert.equal(uploadFilename('slajdy', 'application/pdf'), 'slajdy.pdf');
  assert.equal(uploadFilename('x'.repeat(175) + '🥔'.repeat(3) + '.pdf', 'application/pdf').charCodeAt(175), '.'.charCodeAt(0));
});
