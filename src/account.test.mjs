import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { accountStorageKey, authCallbackCode, authError, emailAddress, publicAuthConfig, accountDisplayName } from './accountPolicy.ts';
import { chunkedAuthStorage } from './authStorage.ts';

function memory() {
  const values = new Map();
  return { values, getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); }, removeItem: async key => { values.delete(key); } };
}
test('guest, two users and two auth projects keep separate materials, drafts, progress and AI settings', async () => {
  const storage = memory();
  for (const base of ['notely.notes.v1', 'notely.lessons.v1', 'notely.draft.v1', 'notely.settings.v1', 'notely.key.gemini']) {
    const owners = [null, 'project1_user1', 'project1_user2', 'project2_user1'];
    for (const owner of owners) await storage.setItem(accountStorageKey(base, owner), owner || 'old-guest-material');
    assert.equal(accountStorageKey(base), base);
    await storage.removeItem(accountStorageKey(base, owners[1]));
    assert.equal(await storage.getItem(base), 'old-guest-material');
    assert.equal(await storage.getItem(accountStorageKey(base, owners[2])), owners[2]);
    assert.equal(await storage.getItem(accountStorageKey(base, owners[3])), owners[3]);
  }
  assert.throws(() => accountStorageKey('data', '../other-user'));
});
test('public configuration accepts publishable or anon keys and rejects backend secrets and insecure endpoints', () => {
  const jwt = role => ['header', Buffer.from(JSON.stringify({ role })).toString('base64url'), 'signature'].join('.');
  assert.equal(publicAuthConfig('https://project.supabase.co', 'sb_publishable_test_public_key'), true);
  assert.equal(publicAuthConfig('https://project.supabase.co', jwt('anon')), true);
  for (const key of ['sb_secret_backend_secret', jwt('service_role'), '', 'placeholder']) assert.equal(publicAuthConfig('https://project.supabase.co', key), false);
  assert.equal(publicAuthConfig('http://project.supabase.co', jwt('anon')), false);
  assert.equal(publicAuthConfig('https://project.supabase.co.evil.test', jwt('anon')), false);
});
test('OAuth callback accepts only the configured destination and a PKCE code, never raw tokens or redirects', () => {
  const expected = 'notely://auth/callback';
  assert.equal(authCallbackCode(expected + '?code=one-time-code', expected), 'one-time-code');
  for (const url of ['notely://evil/callback?code=secret', 'notely://auth/callback-extra?code=secret', 'https://auth/callback?code=secret', expected + '#access_token=secret', expected + '?error=access_denied']) assert.throws(() => authCallbackCode(url, expected));
  assert.equal(authCallbackCode('http://localhost:8081/?code=web-code', 'http://localhost:8081/'), 'web-code');
});
test('session storage handles large Unicode sessions without truncation and deletes all old chunks', async () => {
  const store = memory(); const adapter = chunkedAuthStorage(store);
  const session = JSON.stringify({ token: 'x'.repeat(7000), name: '😀ż'.repeat(500) });
  await adapter.setItem('sb-project-auth-token', session);
  assert.equal(await adapter.getItem('sb-project-auth-token'), session);
  assert.ok([...store.values.values()].every(value => Buffer.byteLength(value) < 2048));
  await adapter.setItem('sb-project-auth-token', 'short');
  assert.equal(store.values.size, 2);
  await adapter.removeItem('sb-project-auth-token'); assert.equal(store.values.size, 0);
});
test('an interrupted session write preserves the previous session and removes partial chunks', async () => {
  const store = memory(); const adapter = chunkedAuthStorage(store);
  await adapter.setItem('token', 'previous'); const before = new Map(store.values);
  const original = store.setItem; let writes = 0;
  store.setItem = async (...args) => { if (++writes === 2) throw new Error('disk'); await original(...args); };
  await assert.rejects(adapter.setItem('token', 'x'.repeat(1000)), /disk/);
  assert.equal(await adapter.getItem('token'), 'previous'); assert.deepEqual(store.values, before);
});
test('missing session chunks are rejected instead of silently constructing a corrupted login', async () => {
  const store = memory(); const adapter = chunkedAuthStorage(store);
  await adapter.setItem('token', 'x'.repeat(1000));
  store.values.delete([...store.values.keys()].find(key => key.endsWith('.1')));
  await assert.rejects(adapter.getItem('token'), /Niepełny/);
});
test('email and profile validation and error translation never display raw upstream errors', () => {
  assert.equal(emailAddress('  UCZEN@example.org '), 'uczen@example.org');
  assert.throws(() => emailAddress('bad@'));
  assert.equal(accountDisplayName({ full_name: { invalid: true } }), 'Uczymy się dalej');
  assert.match(authError({ code: 'invalid_credentials' }), /hasło/);
  assert.doesNotMatch(authError({ message: 'internal secret detail' }), /secret/);
});
test('Supabase SDK email sign-in persists a session, refreshes it and local sign-out removes it', async () => {
  const store = memory(); const calls = [];
  const client = createClient('https://fixture.supabase.co', 'sb_publishable_fixture_public_key', { auth: { storage: chunkedAuthStorage(store), autoRefreshToken: false, persistSession: true, detectSessionInUrl: false, flowType: 'pkce' }, global: { fetch: async (url, options) => {
    calls.push(String(url));
    if (String(url).includes('/logout')) return new Response(null, { status: 204 });
    if (String(url).includes('grant_type=password')) assert.equal(JSON.parse(options.body).email, 'student@example.org');
    return Response.json({ access_token: 'fixture-access', refresh_token: 'fixture-refresh', expires_in: 3600, token_type: 'bearer', user: { id: '00000000-0000-0000-0000-000000000001', email: 'student@example.org', app_metadata: {}, user_metadata: {} } });
  } } });
  const login = await client.auth.signInWithPassword({ email: 'student@example.org', password: 'fixture-password' });
  assert.equal(login.error, null); assert.equal((await client.auth.getSession()).data.session.user.email, 'student@example.org');
  assert.ok(store.values.size > 0);
  assert.equal((await client.auth.refreshSession()).error, null); assert.ok(calls.some(url => url.includes('grant_type=refresh_token')));
  assert.equal((await client.auth.signOut({ scope: 'local' })).error, null);
  assert.equal((await client.auth.getSession()).data.session, null); assert.equal(store.values.size, 0);
});

test('Google OAuth uses PKCE and exchanges a one-time code with its stored verifier', async () => {
  const store = memory(); let exchange;
  const client = createClient('https://fixture.supabase.co', 'sb_publishable_fixture_public_key', { auth: { storage: chunkedAuthStorage(store), autoRefreshToken: false, persistSession: true, detectSessionInUrl: false, flowType: 'pkce' }, global: { fetch: async (url, options) => {
    assert.match(String(url), /grant_type=pkce/); exchange = JSON.parse(options.body);
    return Response.json({ access_token: 'fixture-access', refresh_token: 'fixture-refresh', expires_in: 3600, token_type: 'bearer', user: { id: '00000000-0000-0000-0000-000000000001', app_metadata: {}, user_metadata: {} } });
  } } });
  const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'notely://auth/callback', skipBrowserRedirect: true } });
  assert.equal(error, null);
  const url = new URL(data.url);
  assert.equal(url.searchParams.get('provider'), 'google'); assert.equal(url.searchParams.get('redirect_to'), 'notely://auth/callback');
  assert.equal(url.searchParams.get('code_challenge_method'), 's256'); assert.ok(url.searchParams.get('code_challenge'));
  assert.equal((await client.auth.exchangeCodeForSession(authCallbackCode('notely://auth/callback?code=fixture-code', 'notely://auth/callback'))).error, null);
  assert.equal(exchange.auth_code, 'fixture-code'); assert.ok(exchange.code_verifier.length >= 43);
  assert.ok((await client.auth.getSession()).data.session);
});
