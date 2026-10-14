const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// Diagnostics contain file names only; never print matching text or credentials.
function findings(name, text, known = []) {
  const reasons = [];
  if (/(^|\/)\.env(?:\..+)?$/.test(name) && !name.endsWith('.example')) reasons.push('prywatny plik środowiska');
  if (/(?:client_secret.*\.json|service-account.*\.json|credentials\.json|\.(?:pem|key|p8|p12|jks|keystore))$/i.test(name)) reasons.push('plik z danymi dostępu');
  const patterns = [
    /AIza[\w-]{35}/,
    /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}/,
    /\b(?:ghp_|github_pat_|sb_secret_)[A-Za-z0-9_]{20,}/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /(?:postgres(?:ql)?|mysql):\/\/[^\s:]+:[^\s@]+@/i,
    /["'](?:private_key|client_secret|password)["']\s*:\s*["'][^"']{12,}["']/i,
  ];
  if (patterns.some(pattern => pattern.test(text)) || known.some(secret => text.includes(secret))) reasons.push('możliwy sekret');
  for (const token of text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || []) {
    try { if (JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).role === 'service_role') reasons.push('uprzywilejowany klucz Supabase'); } catch {}
  }
  return [...new Set(reasons)];
}

function run() {
  const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const root = git(['rev-parse', '--show-toplevel']).trim();
  process.chdir(root);
  const known = [];
  for (const name of ['.env', 'server/.env', '.env.local', 'server/.env.local']) {
    if (!fs.existsSync(name)) continue;
    for (const line of fs.readFileSync(name, 'utf8').split(/\r?\n/)) {
      const match = /^([A-Z_0-9]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (!match || match[1].startsWith('EXPO_PUBLIC_') || !/(?:API_KEY|API_TOKEN|PASSWORD|SECRET|SERVICE_ROLE)/.test(match[1])) continue;
      const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
      if (value.length >= 12 && !/^(?:example|fixture|test|your|replace|<)/i.test(value)) known.push(value);
    }
  }
  const staged = process.argv.includes('--staged');
  const files = git(staged ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'] : ['ls-files', '-z']).split('\0').filter(Boolean);
  let failed = false;
  for (const name of files) {
    let text;
    try { text = staged ? git(['show', `:${name}`]) : fs.readFileSync(path.join(root, name), 'utf8'); }
    catch { console.error(`Nie można sprawdzić pliku: ${name}`); failed = true; continue; }
    const reasons = findings(name, text, known);
    if (reasons.length) { console.error(`${name}: ${reasons.join(', ')}`); failed = true; }
  }
  if (process.argv.includes('--history')) {
    // --name-only deliberately excludes patches, so diagnostics cannot reveal secrets.
    const pattern = 'AIza[A-Za-z0-9_-]{35}|(^|[^[:alnum:]_])sk-(proj-|ant-)?[A-Za-z0-9_-]{20,}|(ghp_|github_pat_|sb_secret_)[A-Za-z0-9_]{20,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----';
    const history = git(['log', '--all', '--format=%h', '--name-only', '-G', pattern]).trim();
    const privateFiles = git(['log', '--all', '--format=%h', '--name-only', '--', '.env', 'server/.env', '.env.local', 'server/.env.local']).trim();
    if (history || privateFiles) {
      console.error('Możliwy sekret w historii Git (tylko identyfikatory i ścieżki):');
      console.error([history, privateFiles].filter(Boolean).join('\n'));
      console.error('Przed wysłaniem sprawdź historię. Ujawniony klucz wymaga unieważnienia u dostawcy.');
      failed = true;
    }
  }
  if (failed) {
    console.error('Zablokowano: usuń sekret z pliku przed commitem. Nie ignoruj tego ostrzeżenia.');
    process.exitCode = 1;
  } else console.log(`Kontrola sekretów: OK (${files.length} plików).`);
}
module.exports = { findings };
if (require.main === module) run();
