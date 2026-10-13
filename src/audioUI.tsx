import React, { useEffect, useRef, useState } from 'react';
import { AppState, Modal, Platform, Text, View } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, setIsAudioActiveAsync, useAudioRecorder, useAudioRecorderState, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Button, C, s } from './ui';
import { clock } from './sourcePolicy';
import type { Source } from './types';
import { playbackMode, recordingMode, startPlayback } from './audioSession';

export function LectureRecorder({ onSave, onError, onImport, onSessionChange, disabled }: { onSave: (uri: string, name: string, mime: string) => Promise<void>; onError: (message: string) => void; onImport: () => void; onSessionChange: (locked: boolean) => void; disabled: boolean }) {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, sampleRate: 44100, numberOfChannels: 1, bitRate: 64000, isMeteringEnabled: true, web: { mimeType: 'audio/webm', bitsPerSecond: 32000 } });
  const state = useAudioRecorderState(recorder, 500);
  const [active, setActive] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [working, setWorking] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [stopFailed, setStopFailed] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const gate = useRef(false);
  const pendingUri = useRef<string | null>(null);
  const started = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function save(uri: string) {
    setSaveError(null);
    const mime = Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4';
    await onSave(uri, `wyklad-${new Date().toISOString().replace(/[:.]/g, '-')}.${Platform.OS === 'web' ? 'webm' : 'm4a'}`, mime);
    setPending(null); pendingUri.current = null; onSessionChange(false);
  }
  async function stop() {
    if (gate.current || !started.current) return;
    gate.current = true; setWorking(true); setStopFailed(false); setSaveError(null);
    try {
      const recordingUri = recorder.uri;
      await recorder.stop();
      started.current = false;
      const uri = recorder.uri || recordingUri;
      if (!uri) throw new Error('Nie udało się zapisać nagrania.');
      setPending(uri); pendingUri.current = uri;
      await setAudioModeAsync(playbackMode);
      setActive(false);
      await save(uri);
    } catch (error) { setStopFailed(started.current); setSaveError(started.current ? 'Nie udało się zatrzymać mikrofonu. Ponów zatrzymanie, aby zapisać nagranie.' : error instanceof Error ? error.message : 'Nie udało się zapisać nagrania.'); }
    finally { if (!started.current) await setAudioModeAsync(playbackMode).catch(() => {}); if (alive.current) { setActive(started.current); setWorking(false); } onSessionChange(started.current || !!pendingUri.current); gate.current = false; }
  }
  useEffect(() => { if (active && !stopFailed && state.durationMillis >= 20 * 60 * 1000) void stop(); }, [active, state.durationMillis, stopFailed]);
  useEffect(() => { const subscription = AppState.addEventListener('change', next => { if (next !== 'active' && started.current) void stop(); }); return () => subscription.remove(); });
  async function start() {
    if (gate.current || started.current || disabled) return;
    gate.current = true; setWorking(true); onSessionChange(true);
    setStopFailed(false); setSaveError(null);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error('Mikrofon potrzebuje uprawnienia. Możesz też zaimportować gotowe nagranie.');
      await setIsAudioActiveAsync(true);
      await setAudioModeAsync(recordingMode);
      await recorder.prepareToRecordAsync(); recorder.record();
      if (!recorder.isRecording) throw new Error('Mikrofon nie rozpoczął nagrywania. Sprawdź dostęp do mikrofonu w ustawieniach Expo Go.');
      started.current = true; setActive(true);
    } catch (error) { await setAudioModeAsync(playbackMode).catch(() => {}); onSessionChange(false); onError(error instanceof Error ? error.message : 'Nie udało się uruchomić mikrofonu.'); }
    finally { setWorking(false); gate.current = false; }
  }
  return <View style={{ gap: 12 }}>
    {!expanded ? <Button text="Nagraj wykład" secondary icon="mic-outline" disabled={disabled} onPress={() => setExpanded(true)} /> : <>
      <View style={s.row}><View style={{ flex: 1 }}><Button text="Dodaj audio" secondary icon="folder-open-outline" disabled={disabled || active || working || !!pending} onPress={onImport} /></View><View style={{ flex: 1 }}><Button text={working ? 'Przygotowuję…' : 'Chcę nagrać'} icon="mic-outline" disabled={disabled || active || working || !!pending} onPress={() => void start()} /></View></View>
      <Text style={s.small}>Nagranie do 20 minut. Pozostaw aplikację otwartą; po zatrzymaniu zapisujemy je automatycznie. Gotowy plik audio może mieć do 20 MB.</Text>
    </>}
    {pending && <><Text style={s.small}>Nagranie oczekuje na dodanie do lekcji. Spróbuj ponownie, zanim opuścisz ten ekran.</Text><Button text="Ponów zapis nagrania" disabled={working} onPress={() => { setWorking(true); save(pending).catch(e => setSaveError(e.message)).finally(() => setWorking(false)); }} /></>}
    {saveError && <Text accessibilityLiveRegion="polite" style={{ color: C.orange, fontSize: 13, lineHeight: 20 }}>{saveError}</Text>}
    <Modal visible={active} transparent animationType="fade" onRequestClose={() => void stop()}><View style={s.overlay}><View style={s.modal}><Text style={s.h2}>Nagrywam wykład</Text><Text style={{ fontSize: 42, fontWeight: '800', color: C.green, textAlign: 'center' }}>{clock(state.durationMillis / 1000)}</Text><Text style={s.body}>Pozostaw aplikację otwartą. Zatrzymanie lub przejście do tła zapisze ten fragment w lekcji.</Text><Button text={working ? 'Zapisuję nagranie…' : stopFailed ? 'Ponów zatrzymanie i zapis' : 'Zatrzymaj i dodaj nagranie'} icon="stop-circle-outline" disabled={working} onPress={() => void stop()} />{stopFailed && <Text accessibilityLiveRegion="polite" style={{ color: C.orange }}>{saveError}</Text>}</View></View></Modal>

  </View>;
}
export function AudioPlayerControls({ source }: { source: Source }) {
  const player = useAudioPlayer(source.uri);
  const status = useAudioPlayerStatus(player);
  const [error, setError] = useState('');
  const [preparing, setPreparing] = useState(false);
  const playGate = useRef(false);
  useEffect(() => { if (status.error) setError('Nie udało się otworzyć nagrania. Plik może być uszkodzony lub niedostępny.'); }, [status.error]);
  async function play() {
    if (playGate.current) return;
    playGate.current = true; setPreparing(true); setError('');
    try {
      if (status.playing) player.pause();
      else await startPlayback(player, { activate: () => setIsAudioActiveAsync(true), setMode: () => setAudioModeAsync(playbackMode) }, status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration));
    } catch { setError('Nie można uruchomić odsłuchu. Sprawdź plik i głośność multimediów telefonu.'); }
    finally { setPreparing(false); playGate.current = false; }
  }
  return <View style={{ gap: 10 }}><View style={s.sectionRow}><Text style={s.small}>{clock(status.currentTime)} / {clock(status.duration)}</Text><Text style={s.small}>{status.isLoaded ? 'AUDIO' : 'ŁADOWANIE AUDIO'}</Text></View><View style={s.progress}><View style={[s.progressFill, { width: `${status.duration ? Math.min(100, status.currentTime / status.duration * 100) : 0}%` }]} /></View><Button text={preparing ? 'Przygotowuję odsłuch…' : status.playing ? 'Wstrzymaj nagranie' : 'Odtwórz nagranie'} disabled={preparing || !status.isLoaded} icon={status.playing ? 'pause' : 'play'} secondary onPress={() => void play()} /><View style={s.row}><View style={{ flex: 1 }}><Button text="−10 sekund" secondary onPress={() => void player.seekTo(Math.max(0, status.currentTime - 10)).catch(() => setError('Nie można przewinąć nagrania.'))} /></View><View style={{ flex: 1 }}><Button text="+10 sekund" secondary onPress={() => void player.seekTo(Math.min(status.duration, status.currentTime + 10)).catch(() => setError('Nie można przewinąć nagrania.'))} /></View></View>{!!error && <Text style={{ color: C.orange }}>{error}</Text>}</View>;
}

