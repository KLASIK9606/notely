export function accountStorageKey(base: string, owner: string | null = null) {
  if (!owner) return base; // Existing materials remain in the guest library.
  if (!/^[a-zA-Z0-9._-]{1,160}$/.test(owner)) throw new Error('Nieprawidłowe konto.');
  return `${base}.account.${owner}`;
}

export function publicAuthConfig(url: string, key: string) {
  if (!/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/?$/.test(url)) return false;
  if (/^sb_publishable_[a-zA-Z0-9_-]{12,}$/.test(key)) return true;
  try { return JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon' && key.split('.').length === 3; }
  catch { return false; }
}

export function accountDisplayName(metadata: Record<string, unknown>) {
  for (const value of [metadata.display_name, metadata.full_name]) if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 80);
  return 'Uczymy się dalej';
}

export function emailAddress(value: string) {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Podaj poprawny adres e-mail.');
  return email;
}

export function authCallbackCode(value: string, expected: string) {
  const url = new URL(value); const target = new URL(expected);
  if (url.protocol !== target.protocol || url.host !== target.host || url.pathname !== target.pathname || url.username || url.password) throw new Error('Nieprawidłowy powrót do aplikacji.');
  if (url.searchParams.has('error')) throw new Error('Logowanie nie zostało ukończone. Spróbuj ponownie.');
  const code = url.searchParams.get('code');
  if (!code || code.length > 2048) throw new Error('Brakuje kodu logowania. Spróbuj ponownie.');
  return code;
}

export function authError(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === 'invalid_credentials') return 'Nieprawidłowy e-mail lub hasło.';
  if (code === 'email_not_confirmed') return 'Potwierdź adres e-mail przez link w wiadomości.';
  if (code === 'user_already_exists') return 'Ten adres ma już konto. Zaloguj się.';
  if (code === 'weak_password') return 'Wybierz mocniejsze hasło — co najmniej 8 znaków.';
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || (error as { status?: number })?.status === 429) return 'Za dużo prób. Odczekaj chwilę i spróbuj ponownie.';
  if (code === 'provider_disabled' || code === 'validation_failed') return 'Ta metoda logowania nie jest jeszcze włączona. Sprawdź konfigurację kont.';
  return 'Nie udało się połączyć z kontem. Sprawdź internet i spróbuj ponownie.';
}
