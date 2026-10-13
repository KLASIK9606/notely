import React, { useEffect, useState } from 'react';
import { AppState, Text, TextInput, View } from 'react-native';
import type { Settings } from './types';
import { connectGoogleAI, disconnectCurrentGoogleAI, googleAIAccess } from './googleAI';
import { expoGo } from './auth';
import { Button, C, Chip, s } from './ui';

export function GoogleAIConnection({ settings, onChange, onSave }: { settings: Settings; onChange: (value: Settings) => void; onSave: () => Promise<void> }) {
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let alive = true;
    const update = () => { void googleAIAccess().then(value => { if (alive) setConnected(!!value); }).catch(() => { if (alive) setConnected(false); }); };
    update(); const timer = setInterval(update, 30000);
    const subscription = AppState.addEventListener('change', value => { if (value === 'active') update(); });
    return () => { alive = false; clearInterval(timer); subscription.remove(); };
  }, []);
  async function connect() {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await onSave(); await connectGoogleAI(settings.googleProject?.trim() || ''); setConnected(!!await googleAIAccess()); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Nie udało się połączyć konta Google.'); }
    finally { setBusy(false); }
  }
  async function disconnect() {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await disconnectCurrentGoogleAI(); setConnected(false); setMessage('Połączenie Gemini usunięte z tego urządzenia.'); }
    catch { setMessage('Nie udało się usunąć połączenia. Spróbuj ponownie.'); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: 12 }}>
    <Chip>{connected ? 'KONTO GOOGLE POŁĄCZONE' : 'POŁĄCZ SWOJE KONTO'}</Chip>
    <Text style={s.body}>Korzystaj z Gemini bez wklejania klucza. Potrzebujesz własnego projektu Google Cloud z włączonym Generative Language API. Obowiązują limity i ewentualne opłaty tego projektu; abonament Gemini ich nie zastępuje.</Text>
    <Text style={s.label}>Identyfikator Twojego projektu Google Cloud</Text>
    <TextInput accessibilityLabel="Identyfikator projektu Google Cloud" style={s.input} value={settings.googleProject || ''} onChangeText={googleProject => onChange({ ...settings, googleProject })} autoCapitalize="none" autoCorrect={false} maxLength={30} placeholder="np. moj-projekt-123456" placeholderTextColor={C.muted} />
    <Text style={s.small}>Wybrane konto Google będzie też Twoim kontem Notely. Połącz je ponownie po wygaśnięciu dostępu (około 55 minut). Token i wybrane materiały przechodzą przez Twój zaufany serwer do Google.</Text>
    {expoGo && <View style={s.notice}><Text style={s.body}>Połączenie Google na telefonie wymaga osobnej wersji Notely. W Expo Go wybierz klucz API. Możesz też sprawdzić logowanie w podglądzie webowym.</Text></View>}
    <Button text={busy ? 'Łączę…' : 'Połącz Gemini z Google'} icon="logo-google" disabled={busy || expoGo} onPress={connect} />
    {connected && <><Text style={s.small}>Użyj „Sprawdź połączenie” poniżej, aby sprawdzić dostęp do modeli w wybranym projekcie.</Text><Button text="Odłącz Gemini" secondary disabled={busy} onPress={disconnect} /></>}
    {!!message && <View accessibilityLiveRegion="polite" style={s.notice}><Text style={s.body}>{message}</Text></View>}
  </View>;
}
