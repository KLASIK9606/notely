const test = require('node:test');
const assert = require('node:assert/strict');
const { findings } = require('./check-secrets.cjs');
test('Blocks private files and credentials without confusing public config with secrets', () => {
  assert.ok(findings('server/.env', '').length);
  assert.ok(findings('client_secret_google.json', '').length);
  assert.ok(findings('app.ts', 'AIza' + 'A'.repeat(35)).length);
  assert.ok(findings('app.ts', 'sk-proj-' + 'A'.repeat(30)).length);
  assert.ok(findings('config.ts', 'owner-access-value', ['owner-access-value']).length);
  assert.deepEqual(findings('.env.example', 'GEMINI_API_KEY=\nAPI_TOKEN=\n'), []);
  assert.deepEqual(findings('src/auth.ts', 'sb_publishable_publicconfiguration'), []);
  const token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from('{"role":"service_role"}').toString('base64url'), 'signature'].join('.');
  assert.ok(findings('app.ts', token).length);
});
