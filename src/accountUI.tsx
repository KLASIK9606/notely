import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Session } from '@supabase/supabase-js';
import { authConfigured, authProject, authRedirect, browserAuthActive, expoGo, finishAuth, googleLogin, supabase } from './auth';
import { accountDisplayName, authError, emailAddress } from './accountPolicy';
import { Button, C, s } from './ui';
import { captureGoogleAI, disconnectGoogleAI } from './googleAI';

type Account = { owner: string | null; label: string; onAccount: () => void };
export function AccountBoundary({ children }: { children: (account: Account) => React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [open, setOpen] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [message, setMessage] = useState('');
  const lastUser = useRef<string | undefined>(undefined);
  useEffect(() => {
    const client = supabase; if (!client) return;
    let alive = true;
    const { data: { subscription } } = client.auth.onAuthStateChange((event, value) => {
      if (!alive) return;
      const previous = lastUser.current;
      lastUser.current = value?.user.id;
      if (event === 'SIGNED_OUT') void disconnectGoogleAI(previous).catch(() => {});
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') void captureGoogleAI(value).catch(() => { if (alive) { setMessage('Nie udało się zachować połączenia Gemini. Połącz konto ponownie w Ustawieniach.'); setOpen(true); } });
      setSession(value); setLoading(false);
      if (event === 'PASSWORD_RECOVERY') { setRecovery(true); setOpen(true); }
      else if (event === 'SIGNED_IN') setOpen(false);
    });
    void client.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) { setMessage('Nie udało się odtworzyć sesji. Zaloguj się ponownie.'); setOpen(true); }
      else setSession(data.session);
      setLoading(false);
    }).catch(() => { if (alive) { setLoading(false); setMessage('Nie udało się odtworzyć sesji.'); setOpen(true); } });
    const handleURL = (url: string | null) => {
      if (!url?.startsWith('notely://auth/callback') || browserAuthActive()) return;
      void finishAuth(url).catch(error => { if (alive) { setMessage(authError(error)); setOpen(true); } });
    };
    if (Platform.OS !== 'web') void Linking.getInitialURL().then(handleURL);
    const links = Linking.addEventListener('url', ({ url }) => handleURL(url));
    const state = AppState.addEventListener('change', value => { if (Platform.OS !== 'web') { if (value === 'active') client.auth.startAutoRefresh(); else client.auth.stopAutoRefresh(); } });
    if (Platform.OS !== 'web' && AppState.currentState === 'active') client.auth.startAutoRefresh();
    return () => { alive = false; subscription.unsubscribe(); links.remove(); state.remove(); client.auth.stopAutoRefresh(); };
  }, []);
  if (loading) return <SafeAreaView style={[s.page, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={C.green} /><Text style={s.small}>Otwieram Twoją przestrzeń…</Text></SafeAreaView>;
  const owner = session ? `${authProject}_${session.user.id}` : null;
  return <>
    {children({ owner, label: session?.user.email || 'Tryb gościa', onAccount: () => { setMessage(''); setOpen(true); } })}
    <Modal visible={open} animationType="slide" onRequestClose={() => { setRecovery(false); setOpen(false); }}>
      <AccountScreen session={session} recovery={recovery} initialMessage={message} onClose={() => { setRecovery(false); setOpen(false); }} onRecovered={() => { setRecovery(false); setOpen(false); }} />
    </Modal>
  </>;
}

function AccountScreen({ session, recovery, initialMessage, onClose, onRecovered }: { session: Session | null; recovery: boolean; initialMessage: string; onClose: () => void; onRecovered: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialMessage);
  const [notice, setNotice] = useState('');
  const [setup, setSetup] = useState(false);
  const active = useRef(true); const gate = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function run(action: () => Promise<void>) {
    if (gate.current) return;
    gate.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); }
    catch (e) { if (active.current) setError(authError(e)); }
    finally { gate.current = false; if (active.current) setBusy(false); }
  }
  async function submit() {
    if (!supabase) return;
    let address = '';
    try {
      if (!recovery) address = emailAddress(email);
      if (mode !== 'reset' && (!password || ((mode === 'signup' || recovery) && password.length < 8))) throw new Error(mode === 'signup' || recovery ? 'Hasło musi mieć co najmniej 8 znaków.' : 'Wpisz hasło.');
    } catch (e) { setError((e as Error).message); return; }
    await run(async () => {
      if (recovery) {
        const { error } = await supabase!.auth.updateUser({ password }); if (error) throw error; onRecovered();
      } else if (mode === 'signup') {
        const { data, error } = await supabase!.auth.signUp({ email: address, password, options: { data: { display_name: name.trim().slice(0, 80) }, ...(!expoGo ? { emailRedirectTo: authRedirect() } : {}) } });
        if (error) throw error;
        if (!data.session && active.current) { setPassword(''); setNotice('Sprawdź pocztę i potwierdź adres e-mail. Potem wróć tutaj i zaloguj się.'); setMode('login'); }
      } else if (mode === 'reset') {
        const { error } = await supabase!.auth.resetPasswordForEmail(address, { redirectTo: authRedirect() }); if (error) throw error;
        if (active.current) setNotice('Jeśli konto istnieje, wyślemy link do zmiany hasła. Otwórz go na tym urządzeniu.');
      } else {
        const { error } = await supabase!.auth.signInWithPassword({ email: address, password }); if (error) throw error;
      }
    });
  }
  const field = (label: string, value: string, onChange: (value: string) => void, passwordField = false) => <View style={{ gap: 7 }}><Text style={s.label}>{label}</Text><View style={{ flexDirection: 'row', alignItems: 'center' }}><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!busy} autoCapitalize="none" autoCorrect={false} keyboardType={label === 'E-mail' ? 'email-address' : 'default'} autoComplete={passwordField ? mode === 'signup' || recovery ? 'new-password' : 'current-password' : label === 'E-mail' ? 'email' : 'name'} secureTextEntry={passwordField && !showPassword} maxLength={passwordField ? 128 : 254} style={[s.input, { flex: 1, paddingRight: passwordField ? 50 : 15 }]} />{passwordField && <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'} onPress={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 4, padding: 12 }}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} /></Pressable>}</View></View>;
  return <SafeAreaView style={s.page}><KeyboardAvoidingView style={s.shell} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={s.header}><View style={s.brand}><View style={s.logo}><Ionicons name="leaf" size={22} color={C.lime} /></View><Text style={s.brandText}>notely.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Zamknij konto" disabled={busy} onPress={onClose} style={s.iconButton}><Ionicons name="close" size={24} color={C.ink} /></Pressable></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { gap: 22 }]}>
      <View style={{ alignSelf: 'flex-start', width: 64, height: 64, borderRadius: 22, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center', marginTop: 12 }}><Ionicons name={session ? 'person-outline' : 'sparkles-outline'} size={30} color={C.green} /></View>
      <View style={{ gap: 9 }}><Text style={s.eyebrow}>TWOJA PRZESTRZEŃ</Text><Text style={s.h1}>{recovery ? 'Nowe hasło' : session ? 'Twoje konto' : mode === 'signup' ? 'Zacznij po swojemu.' : mode === 'reset' ? 'Wróć do nauki.' : 'Dobrze Cię widzieć.'}</Text><Text style={s.body}>{recovery ? 'Ustaw nowe hasło do konta.' : session ? session.user.email : 'Twoje materiały i postępy, w jednym miejscu.'}</Text></View>
      {!!error && <Text accessibilityRole="alert" style={[s.body, { color: C.orange }]}>{error}</Text>}
      {!!notice && <View style={[s.sectionCard, { backgroundColor: '#EAF0E4' }]}><Text style={s.body}>{notice}</Text></View>}
      {session && !recovery ? <View style={s.sectionCard}><Text style={s.h2}>{accountDisplayName(session.user.user_metadata || {})}</Text><Text style={s.body}>Materiały i postępy tego konta są zapisane na tym urządzeniu. Synchronizacja między telefonami nie jest jeszcze włączona.</Text><Button text={busy ? 'Wylogowuję…' : 'Wyloguj się'} secondary disabled={busy} onPress={() => void run(async () => { const { error } = await supabase!.auth.signOut({ scope: 'local' }); if (error) throw error; onClose(); })} /></View> : <>
        {!authConfigured && <View style={[s.sectionCard, { backgroundColor: C.peach }]}><Text style={s.h2}>Konta czekają na uruchomienie</Text><Text style={s.body}>Możesz nadal korzystać z aplikacji jako gość. Logowanie będzie dostępne po połączeniu usługi kont.</Text><Pressable accessibilityRole="button" onPress={() => setSetup(!setup)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={s.link}>{setup ? 'Ukryj konfigurację' : 'Jak uruchomić konta?'}</Text></Pressable>{setup && <><Text style={s.small}>1. Utwórz projekt Supabase.{ '\n' }2. Dodaj URL i publiczny klucz projektu do pliku .env aplikacji.{ '\n' }3. Włącz Google w ustawieniach logowania Supabase.{ '\n' }Pełna instrukcja: KONTA.md w projekcie.</Text><Button text="Otwórz Supabase" secondary onPress={() => void Linking.openURL('https://supabase.com/dashboard')} /></>}</View>}
        {!recovery && mode !== 'reset' && <><Button text="Kontynuuj z Google" icon="logo-google" secondary disabled={busy || !authConfigured} onPress={() => { if (expoGo) { setError('Google wymaga wersji deweloperskiej Notely. W Expo Go możesz zalogować się e-mailem.'); return; } void run(googleLogin); }} /><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ height: 1, backgroundColor: C.border, flex: 1 }} /><Text style={s.small}>lub e-mailem</Text><View style={{ height: 1, backgroundColor: C.border, flex: 1 }} /></View></>}
        <View style={{ gap: 16 }}>{!recovery && mode === 'signup' && field('Jak masz na imię?', name, setName)}{!recovery && field('E-mail', email, setEmail)}{(recovery || mode !== 'reset') && field(recovery ? 'Nowe hasło' : 'Hasło', password, setPassword, true)}<Button text={busy ? 'Chwila…' : recovery ? 'Zapisz nowe hasło' : mode === 'signup' ? 'Utwórz konto' : mode === 'reset' ? 'Wyślij link' : 'Zaloguj się'} disabled={busy || !authConfigured} onPress={() => { if (mode === 'reset' && expoGo) { setError('Zmiana hasła przez link wymaga przeglądarki lub wersji deweloperskiej Notely.'); return; } void submit(); }} /></View>
        {!recovery && <View style={{ gap: 4 }}><Pressable accessibilityRole="button" disabled={busy} onPress={() => { setMode(mode === 'signup' || mode === 'reset' ? 'login' : 'signup'); setError(''); setNotice(''); setPassword(''); }} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={s.link}>{mode === 'login' ? 'Nie masz konta? Zarejestruj się' : 'Masz konto? Zaloguj się'}</Text></Pressable>{mode === 'login' && <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setMode('reset'); setPassword(''); setError(''); }} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={s.small}>Nie pamiętam hasła</Text></Pressable>}<Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={s.small}>Na razie kontynuuj jako gość</Text></Pressable></View>}
      </>}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
