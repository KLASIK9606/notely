import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Linking, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { AudioModule, RecordingPresets, setAudioModeAsync, setIsAudioActiveAsync, useAudioRecorder, useAudioRecorderState, useAudioPlayer } from 'expo-audio';
import { File } from 'expo-file-system';
import { ApiError, askTeacher, askTeacherAudio, TeacherMessage, TeacherReply, transcribe } from './api';
import { storeTeacherAudio, VoiceFile } from './teacherAudio';
import { VoiceCompletion, waitForVoice } from './voicePlayback';
import { TeacherLesson, questionSilence, teacherAnswer } from './teacherLesson';
import { SearchSuggestions } from './searchSuggestions';
import { TeacherTurn } from './teacherTurn';
import { TeacherBuffer } from './teacherBuffer';
import { assertNotCancelled } from './cancellation';
import { playbackMode, recordingMode } from './audioSession';
import { clock } from './sourcePolicy';
import type { Note, Settings } from './types';
import type { ApiKeys } from './vault';
import { Button, C, Evidence, s } from './ui';

type Phase = 'idle' | 'thinking' | 'speaking' | 'recording';
export function Teacher({ note, settings, keys, onBack, onSettings, onEvidence, onSessionChange }: { note: Note; settings: Settings; keys: ApiKeys; onBack: () => void; onSettings: () => void; onEvidence: (lines: number[]) => void; onSessionChange: (locked: boolean) => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [consent, setConsent] = useState(false);
  const [topicIndex, setTopicIndex] = useState(0);
  const [reply, setReply] = useState<TeacherReply | null>(null);
  const [lastAnswer, setLastAnswer] = useState<TeacherReply | null>(null);
  const [question, setQuestion] = useState('');
  const [answering, setAnswering] = useState(false);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [options, setOptions] = useState(false);
  const [showText, setShowText] = useState(false);
  const agreed = useRef(false);
  const nextTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSound = useRef<{ value: number | null }>({ value: null });
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const life = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [error, setError] = useState('');
  const [searchLimit, setSearchLimit] = useState(false);
  const [webSearch, setWebSearch] = useState(true);
  const webSearchEnabled = useRef(true);
  const [rate, setRate] = useState(.95);
  const [naturalVoice, setNaturalVoice] = useState(['gemini', 'openai'].includes(settings.provider));
  const player = useAudioPlayer(null);
  const audioCache = useRef(new Map<string, VoiceFile>());
  const playingText = useRef<string | null>(null);
  const lectureCache = useRef(new Map<number, TeacherReply>());
  const pendingReply = useRef<AbortSignal | null>(null);
  const upcoming = useRef(new TeacherBuffer<TeacherReply>()).current;
  const activeAudio = useRef<{ current: () => boolean; track: boolean; completion: VoiceCompletion; onComplete: () => void } | null>(null);
  const history = useRef<TeacherMessage[]>([]);
  const resumePoint = useRef<(TeacherReply & { offset: number; audioTime?: number; done?: boolean }) | null>(null);
  const turns = useRef(new TeacherTurn()).current;
  const gate = useRef(false);
  const gateOwner = useRef(0);
  const recording = useRef(false);
  const alive = useRef(true);
  const topics = note.materials.sections.length ? note.materials.sections : [{ heading: note.title, body: note.materials.summary, sourceLines: [] }];
  const topic = topics[topicIndex];
  const lesson = useRef(new TeacherLesson(topics.length)).current;
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true, sampleRate: 44100, numberOfChannels: 1, bitRate: 64000, web: { mimeType: 'audio/webm', bitsPerSecond: 32000 } });
  const recordState = useAudioRecorderState(recorder, 500);
  const cloud = settings.provider !== 'local';
  const voice = ['openai', 'gemini'].includes(settings.provider);
  const ready = consent && cloud;

  useEffect(() => { alive.current = true; return () => {
    alive.current = false; lesson.pause(); if (nextTimer.current) clearTimeout(nextTimer.current); if (playbackTimer.current) clearTimeout(playbackTimer.current); turns.cancel(); upcoming.cancel(); try { player.pause(); } catch {} void Speech.stop(); onSessionChange(false);
    for (const file of audioCache.current.values()) { try { file.dispose(); } catch {} } audioCache.current.clear();
    lectureCache.current.clear();
    if (recording.current) { recording.current = false; void recorder.stop().finally(() => setAudioModeAsync(playbackMode)); }
  }; }, [recorder, turns, upcoming]);
  async function stopVoice() {
    if (playbackTimer.current) clearTimeout(playbackTimer.current); playbackTimer.current = null;
    if (activeAudio.current?.track && resumePoint.current) resumePoint.current.audioTime = player.currentTime;
    activeAudio.current = null; player.pause(); playingText.current = null; await Speech.stop();
  }
  function cancelPending() { if (nextTimer.current) clearTimeout(nextTimer.current); nextTimer.current = null; turns.cancel(); upcoming.cancel(); }
  function interrupt() { lesson.pause(); cancelPending(); void stopVoice().catch(() => {}); setPhase('idle'); }
  function schedule(run: () => void, current: () => boolean) {
    if (nextTimer.current) clearTimeout(nextTimer.current);
    nextTimer.current = setTimeout(() => { nextTimer.current = null; if (alive.current && current() && lesson.running) run(); }, 150);
  }
  function speechDone(track: boolean, current: () => boolean, continueLesson = true) {
    if (!current()) return; setPhase('idle');
    if (playbackTimer.current) clearTimeout(playbackTimer.current); playbackTimer.current = null;
    if (track) {
      if (resumePoint.current) { resumePoint.current.done = true; resumePoint.current.audioTime = 0; }
      const next = lesson.topicDone();
      if (next !== null) { resumePoint.current = null; setTopicIndex(next); schedule(() => void explain('', next), current); }
      else if (lesson.finished) setCompleted(true);
    } else if (lesson.answerDone(continueLesson)) schedule(() => void resumeTopic(), current);
  }
  async function resumeTopic() {
    if (recording.current || gate.current) return;
    setAnswering(false); lesson.resume(); const point = resumePoint.current;
    if (!point) { await explain('', lesson.index); return; }
    const turn = turns.begin(); setError(''); setReply(point);
    try { await speak(point.reply, turn.current, true, point.offset, turn.signal, true); } catch (e) { if (turn.current()) fail(e); }
  }
  function beginLesson() {
    if (!cloud || gate.current || recording.current || lesson.running) return;
    setAnswering(false); setLastAnswer(null); agreed.current = true; setConsent(true); setStarted(true); setCompleted(false);
    setQuestion(''); resumePoint.current = null; setTopicIndex(lesson.start());
    void explain('', 0);
  }
  useEffect(() => { const sub = player.addListener('playbackStatusUpdate', status => {
    const active = activeAudio.current; if (!active?.current()) return;
    if (status.error) { activeAudio.current = null; fail(new Error('Nie można odtworzyć głosu AI. Możesz wybrać głos telefonu.')); }
    else if (active.completion.update(status)) { if (active.track && resumePoint.current) resumePoint.current.audioTime = 0; activeAudio.current = null; active.onComplete(); }
  }); return () => sub.remove(); }, [player]);
  function fail(e: unknown) { if (alive.current) { lesson.pause(); turns.cancel(); upcoming.cancel(); void stopVoice().catch(() => {}); if (nextTimer.current) clearTimeout(nextTimer.current); setPhase('idle'); setSearchLimit(e instanceof ApiError && e.searchRequested); setError(e instanceof Error ? e.message : 'Nie udało się połączyć z wykładowcą.'); } }
  function cacheAudio(text: string, file: VoiceFile) {
    audioCache.current.get(text)?.dispose();
    audioCache.current.set(text, file);
    if (audioCache.current.size > 8) { const first = [...audioCache.current.keys()].find(key => key !== text && key !== playingText.current && key !== resumePoint.current?.reply); if (first) { audioCache.current.get(first)?.dispose(); audioCache.current.delete(first); } }
  }
  async function prepareTopic(index: number, signal: AbortSignal) {
    assertNotCancelled(signal);
    const answer = lectureCache.current.get(index) || await askTeacher(settings, keys, note, topics[index].heading, '', [], signal, false);
    assertNotCancelled(signal);
    if (!alive.current) throw new Error('Rozmowa zakończona.');
    lectureCache.current.set(index, answer);
    if (naturalVoice && voice && !audioCache.current.has(answer.reply)) {
      const audio = await askTeacherAudio(settings, keys, answer.reply, signal);
      assertNotCancelled(signal);
      if (!alive.current) throw new Error('Rozmowa zakończona.');
      cacheAudio(answer.reply, storeTeacherAudio(audio));
    }
    return answer;
  }
  function prepareNext(current: () => boolean) {
    const next = lesson.index + 1;
    if (current() && alive.current && lesson.running && next < topics.length) void upcoming.warm(next, signal => prepareTopic(next, signal));
  }
  async function speak(text: string, current: () => boolean, track = false, startOffset = 0, signal?: AbortSignal, resume = false, continueLesson = true) {
    await stopVoice();
    if (!current()) return;
    if (naturalVoice && voice) {
      setPhase('thinking');
      let cached = audioCache.current.get(text);
      if (!cached) {
        const audio = await askTeacherAudio(settings, keys, text, signal!);
        if (!current()) return;
        cached = storeTeacherAudio(audio); cacheAudio(text, cached);
      }
      await setIsAudioActiveAsync(true); await setAudioModeAsync(playbackMode);
      if (!current()) return;
      playingText.current = text; player.replace(cached.uri); await waitForVoice(player, signal);
      if (!current()) return;
      const time = resume ? resumePoint.current?.audioTime || 0 : 0;
      await player.seekTo(Math.min(time, Math.max(0, player.duration - .1)));
      if (!current()) return;
      player.muted = false; player.volume = 1; player.setPlaybackRate(rate, 'high');
      activeAudio.current = { current, track, completion: new VoiceCompletion(player.duration), onComplete: () => speechDone(track, current, continueLesson) }; setPhase('speaking'); player.play();
      // Missing end notifications must not leave the conversation permanently speaking.
      playbackTimer.current = setTimeout(() => {
        playbackTimer.current = null;
        if (current() && activeAudio.current) fail(new Error('Odsłuch nie potwierdził końca wypowiedzi. Wznów rozmowę albo wybierz głos telefonu w opcjach.'));
      }, Math.max(15000, (player.duration / rate + 10) * 1000));
      if (track) prepareNext(current); return;
    }
    await setIsAudioActiveAsync(true);
    await setAudioModeAsync(playbackMode);
    if (!current()) return;
    setPhase('speaking');
    Speech.speak(resume ? text.slice(startOffset) : text, { language: 'pl-PL', rate, volume: 1, useApplicationAudioSession: true,
      onBoundary: (event: { charIndex: number }) => { if (track && current() && resumePoint.current) resumePoint.current.offset = startOffset + event.charIndex; },
      onDone: () => { if (current()) { if (track && resumePoint.current) resumePoint.current.offset = 0; speechDone(track, current, continueLesson); } }, onStopped: () => { if (current()) setPhase('idle'); },
      onError: () => { if (current()) { fail(new Error('Nie udało się uruchomić głosu. Na iPhonie wyłącz tryb cichy lub wybierz inny głos w opcjach.')); } },
    });
    if (track) prepareNext(current);
  }
  async function explain(text = '', index = topicIndex, useSearch = webSearchEnabled.current) {
    if (!agreed.current || !cloud || recording.current || gate.current) return;
    if (pendingReply.current && !pendingReply.current.aborted) return;
    if (text) upcoming.cancel();
    const turn = turns.begin(); setError(''); setSearchLimit(false); setAnswering(!!text); setPhase('thinking');
    pendingReply.current = turn.signal;
    try {
      await stopVoice();
      const answer = text ? await askTeacher(settings, keys, note, topics[index].heading, text, history.current, turn.signal, useSearch) : await upcoming.take(index, signal => prepareTopic(index, signal), turn.signal);
      if (!turn.current()) return;
      if (!text) lectureCache.current.set(index, answer);
      if (!text || answer.questionAllowed !== false) history.current = [...history.current, { role: 'user', text: text || `Wyjaśnij: ${topics[index].heading}` }, { role: 'assistant', text: answer.reply }].slice(-8) as TeacherMessage[];
      if (!text) resumePoint.current = { ...answer, offset: 0 };
      const spoken = text ? { ...answer, reply: teacherAnswer(answer, lesson.willResume) } : answer;
      if (text) setLastAnswer(spoken);
      setReply(spoken); await speak(spoken.reply, turn.current, !text, 0, turn.signal, false, answer.continueLesson !== false);
    } catch (e) { if (turn.current()) fail(e); }
    finally { if (pendingReply.current === turn.signal) pendingReply.current = null; }
  }
  async function startQuestion() {
    if (!ready || !voice || gate.current || recording.current) return;
    gate.current = true; const owner = ++gateOwner.current;
    upcoming.cancel();
    const turn = turns.begin(); setError(''); setPhase('thinking'); onSessionChange(true);
    if (nextTimer.current) clearTimeout(nextTimer.current); nextTimer.current = null;
    lesson.question(); lastSound.current.value = null;
    try {
      await stopVoice();
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!turn.current()) return;
      if (!permission.granted) throw new Error('Pozwól Expo Go korzystać z mikrofonu albo wpisz pytanie.');
      await setIsAudioActiveAsync(true); await setAudioModeAsync(recordingMode);
      if (!turn.current()) return;
      await recorder.prepareToRecordAsync();
      if (!turn.current()) { await recorder.stop().catch(() => {}); return; }
      recorder.record();
      if (!recorder.isRecording) throw new Error('Mikrofon nie rozpoczął nagrywania. Możesz wpisać pytanie.');
      recording.current = true; setPhase('recording');
    } catch (e) { if (turn.current()) fail(e); await setAudioModeAsync(playbackMode).catch(() => {}); }
    finally { if (owner === gateOwner.current) { if (!recording.current) { await setAudioModeAsync(playbackMode).catch(() => {}); onSessionChange(false); } gate.current = false; } }
  }
  async function finishQuestion(send: boolean) {
    if (!recording.current || gate.current) return;
    gate.current = true; const owner = ++gateOwner.current; recording.current = false;
    const turn = turns.begin(); setPhase('thinking'); let uri: string | null = null;
    try {
      await recorder.stop(); uri = recorder.uri;
      await setAudioModeAsync(playbackMode); onSessionChange(false); gate.current = false;
      if (!send) { setPhase('idle'); if (lesson.answerDone()) schedule(() => void resumeTopic(), turn.current); return; }
      if (!uri) throw new Error('Nie udało się odczytać pytania. Spróbuj je wpisać.');
      const mime = Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4';
      const bytes = Platform.OS === 'web' ? (await (await fetch(uri)).blob()).size : new File(uri).size;
      const transcript = await transcribe(settings, [{ id: 'teacher-question', uri, name: Platform.OS === 'web' ? 'pytanie.webm' : 'pytanie.m4a', mime, bytes }], keys, { signal: turn.signal });
      if (!turn.current()) return;
      const text = transcript.lines.join(' ').trim();
      if (!text || text.length > 4000 || /\[nieczytelne\]/i.test(text)) throw new Error('Nie udało się dobrze rozpoznać pytania. Wpisz je lub nagraj ponownie.');
      setQuestion(text); await explain(text);
    } catch (e) { if (turn.current()) fail(e); }
    finally {
      if (owner === gateOwner.current) { onSessionChange(false); gate.current = false; }
      if (uri && Platform.OS === 'web') URL.revokeObjectURL(uri);
      if (uri && Platform.OS !== 'web') { try { const file = new File(uri); if (file.exists) file.delete(); } catch {} }
    }
  }
  useEffect(() => { if (phase === 'recording' && (recordState.durationMillis >= 60000 || questionSilence(recordState.durationMillis, recordState.metering, lastSound.current))) void finishQuestion(true); }, [phase, recordState.durationMillis, recordState.metering]);
  useEffect(() => { const subscription = AppState.addEventListener('change', next => { if (next === 'background' || (next === 'inactive' && !gate.current)) { lesson.pause(); if (nextTimer.current) clearTimeout(nextTimer.current); if (recording.current) void finishQuestion(false); else interrupt(); } }); return () => subscription.remove(); });
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (reduceMotion) { life.setValue(.5); return; }
    const breathe = Animated.loop(Animated.sequence([
      Animated.timing(life, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web', isInteraction: false }),
      Animated.timing(life, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web', isInteraction: false }),
    ]));
    breathe.start(); return () => breathe.stop();
  }, [life, reduceMotion]);
  useEffect(() => {
    spin.setValue(0); pulse.setValue(0);
    const animation = phase === 'thinking' ? Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' })) : (phase === 'speaking' || phase === 'recording') ? Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }), Animated.timing(pulse, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' })])) : null;
    animation?.start(); return () => animation?.stop();
  }, [phase, spin, pulse]);
  const visibleReply = lastAnswer || reply;
  const waiting = phase === 'thinking';
  const status = error ? 'Zatrzymajmy się na chwilę' : phase === 'thinking' ? 'Zastanawiam się…' : phase === 'speaking' ? answering ? 'Odpowiadam na Twoje pytanie…' : 'Posłuchaj…' : phase === 'recording' ? `Słucham · ${clock(recordState.durationMillis / 1000)}` : completed ? 'To cała lekcja. Masz pytanie?' : started ? 'Gotowy, gdy zechcesz wrócić' : 'Odkryjmy ten temat razem';
  const orbAction = () => { if (gate.current || recording.current || !cloud) return; if (!started || completed) beginLesson(); else if (phase === 'speaking' || waiting || lesson.running) interrupt(); else void resumeTopic(); };
  return <View style={{ flex: 1 }}>
    <View style={{ paddingHorizontal: 22, paddingTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable accessibilityRole="button" onPress={onBack} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={s.link}>← Notatka</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Opcje rozmowy" disabled={phase === 'recording' || gate.current} onPress={() => setOptions(true)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="ellipsis-horizontal" size={24} color={C.green} /></Pressable>
    </View>
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <View style={{ alignItems: 'center', gap: 7 }}><Text style={[s.small, { letterSpacing: 2 }]}>TWÓJ WYKŁADOWCA</Text><Text style={[s.h2, { textAlign: 'center' }]} numberOfLines={2}>{note.title}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={!started ? 'Rozpocznij rozmowę' : completed ? 'Powtórz rozmowę' : phase === 'speaking' || waiting || lesson.running ? 'Wstrzymaj rozmowę' : 'Wznów rozmowę'} accessibilityState={{ disabled: !cloud || phase === 'recording' || gate.current }} disabled={!cloud || phase === 'recording' || gate.current} onPress={orbAction} style={{ width: 240, height: 240, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View pointerEvents="none" style={{ position: 'absolute', width: 222, height: 222, borderRadius: 111, backgroundColor: phase === 'recording' ? '#E7EFCE' : '#E3EBE4', opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [.45, .9] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) }] }} />
        <Animated.View pointerEvents="none" style={{ position: 'absolute', width: 218, height: 218, borderRadius: 109, borderWidth: 3, borderColor: waiting ? '#DCE5D3' : 'transparent', borderTopColor: waiting ? C.green : 'transparent', borderRightColor: waiting ? C.lime : 'transparent', transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }} />
        <Animated.View pointerEvents="none" style={{ width: 184, height: 184, borderRadius: 92, backgroundColor: error ? '#EDE4D9' : C.green, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', transform: [
          { translateY: life.interpolate({ inputRange: [0, 1], outputRange: [3, -4] }) },
          { scaleX: life.interpolate({ inputRange: [0, 1], outputRange: [.98, 1.025] }) },
          { scaleY: life.interpolate({ inputRange: [0, 1], outputRange: [1.015, .985] }) },
          { rotate: life.interpolate({ inputRange: [0, 1], outputRange: ['-1.5deg', '1.5deg'] }) },
          { scale: phase === 'speaking' && !reduceMotion ? pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) : 1 },
        ] }}>
          <Animated.View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#46785A', top: -88, right: -55, opacity: .65, transform: [{ translateX: life.interpolate({ inputRange: [0, 1], outputRange: [-9, 9] }) }, { translateY: life.interpolate({ inputRange: [0, 1], outputRange: [4, -10] }) }] }} />
          <Animated.View style={{ position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: '#193E35', bottom: -72, left: -36, opacity: .5, transform: [{ translateX: life.interpolate({ inputRange: [0, 1], outputRange: [8, -8] }) }, { translateY: life.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] }) }] }} />
          {waiting || error ? <Text style={{ fontSize: 48 }}>{error ? '😕' : '🤔'}</Text> : phase === 'recording' ? <Ionicons name="mic-outline" size={48} color={C.lime} /> : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{[24, 44, 60, 44, 24].map((height, index) => <Animated.View key={index} style={{ width: 8, height, borderRadius: 6, backgroundColor: C.lime, transform: [{ scaleY: phase === 'speaking' ? pulse.interpolate({ inputRange: [0, 1], outputRange: [index % 2 ? 1 : .45, index % 2 ? .45 : 1] }) : .7 }] }} />)}</View>}
        </Animated.View>
      </Pressable>
      <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: 8 }}><Text style={[s.h2, { textAlign: 'center' }]}>{status}</Text><Text style={[s.small, { textAlign: 'center' }]}>{started && !completed ? topic.heading : 'Opowieść, którą możesz przerwać pytaniem.'}</Text></View>
      {visibleReply?.grounding && <View style={{ width: '100%', gap: 8 }}><Text style={[s.small, { textAlign: 'center' }]}>Źródła z internetu · Google</Text><SearchSuggestions grounding={visibleReply.grounding} /><Pressable accessibilityRole="button" onPress={() => { setShowText(true); setOptions(true); }} style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}><Text style={s.link}>Zobacz odpowiedź i źródła</Text></Pressable></View>}
      {!!error && <View style={{ width: '100%', gap: 8 }}><Text style={[s.small, { color: C.orange, textAlign: 'center' }]}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setOptions(true)} style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}><Text style={s.link}>Otwórz opcje rozmowy</Text></Pressable>{searchLimit && !!question.trim() && <Button text="Odpowiedz bez internetu" secondary onPress={() => { webSearchEnabled.current = false; setWebSearch(false); void explain(question, lesson.index, false); }} />}</View>}
      {!cloud && <Button text="Ustaw AI" secondary onPress={onSettings} />}
    </ScrollView>
    <View style={{ paddingHorizontal: 24, paddingBottom: 18, paddingTop: 8, gap: 9 }}>
      <Button text={!started ? 'Rozpocznij rozmowę' : phase === 'recording' ? 'Gotowe — odpowiedz' : 'Zadaj pytanie'} icon={!started ? 'play' : phase === 'recording' ? 'send-outline' : 'mic-outline'} disabled={!cloud || (!!started && !voice && !ready)} onPress={() => { if (!started) beginLesson(); else if (phase === 'recording') void finishQuestion(true); else if (voice) void startQuestion(); else { interrupt(); setOptions(true); } }} />
      <Text style={[s.small, { textAlign: 'center', fontSize: 11 }]}>{!started ? 'Rozpoczęcie oznacza zgodę na przetwarzanie notatki i pytań przez wybrane AI. Głos AI korzysta z limitu API. Gemini może sprawdzać odpowiedzi w Google.' : phase === 'recording' ? 'Po chwili ciszy odpowiem automatycznie. Maksymalnie 60 sekund.' : completed ? 'Dotknij kółka, jeśli chcesz posłuchać jeszcze raz.' : `Dotknij kółka, aby wstrzymać lub wznowić. ${naturalVoice && voice ? 'Głos jest generowany przez AI.' : 'Głos telefonu.'}`}</Text>
    </View>
    <Modal visible={options} transparent animationType="fade" onRequestClose={() => setOptions(false)}><View style={s.overlay}><View style={[s.modal, { maxHeight: '85%' }]}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16 }}>
        <View style={s.sectionRow}><Text style={s.h2}>Opcje rozmowy</Text><Pressable accessibilityRole="button" accessibilityLabel="Zamknij opcje" onPress={() => setOptions(false)} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}><Ionicons name="close" size={24} color={C.green} /></Pressable></View>
        {voice && <View style={s.row}>{[true, false].map(value => <View key={String(value)} style={{ flex: 1 }}><Button text={value ? 'Głos AI' : 'Głos telefonu'} secondary={naturalVoice !== value} onPress={() => { interrupt(); setNaturalVoice(value); setError(''); }} /></View>)}</View>}
        {settings.provider === 'gemini' && <View style={{ gap: 5 }}><View style={s.sectionRow}><Text style={s.body}>Internet w pytaniach</Text><Switch accessibilityLabel="Internet w pytaniach" value={webSearch} onValueChange={value => { webSearchEnabled.current = value; setWebSearch(value); }} trackColor={{ false: '#CED6CC', true: C.green }} /></View><Text style={s.small}>Google Search w Flash Lite wymaga płatnego planu API. Wyłączenie pozostawia odpowiedzi na podstawie notatki.</Text></View>}
        <View style={s.row}>{[.8, .95, 1.15].map(speed => <Pressable key={speed} accessibilityRole="button" onPress={() => { setRate(speed); if (activeAudio.current) player.setPlaybackRate(speed, 'high'); }} style={{ flex: 1, minHeight: 44, backgroundColor: rate === speed ? C.green : '#EDF1E7', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: rate === speed ? C.white : C.green }}>{speed === .8 ? 'Wolniej' : speed === .95 ? 'Normalnie' : 'Szybciej'}</Text></Pressable>)}</View>
        <TextInput accessibilityLabel="Pytanie do wykładowcy" multiline maxLength={4000} placeholder="Możesz też wpisać pytanie…" value={question} onChangeText={setQuestion} style={[s.input, { minHeight: 80 }]} editable={phase !== 'recording'} />
        <Button text="Zapytaj" disabled={!ready || !question.trim() || phase === 'recording' || phase === 'thinking'} onPress={() => { lesson.question(); cancelPending(); setOptions(false); void explain(question); }} />
        {visibleReply && <><Pressable accessibilityRole="button" onPress={() => setShowText(!showText)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={s.link}>{showText ? 'Ukryj odpowiedź' : 'Pokaż tekst odpowiedzi'}</Text></Pressable>{showText && <Text style={s.body}>{visibleReply.reply}</Text>}{visibleReply.sourceLines.length > 0 && <Evidence lines={visibleReply.sourceLines} onPress={lines => { setOptions(false); onEvidence(lines); }} />}</>}
        {visibleReply?.grounding && <View style={{ gap: 10 }}><Text style={s.h2}>Źródła z internetu</Text><SearchSuggestions grounding={visibleReply.grounding} />{visibleReply.grounding.sources.map(source => <Pressable key={source.url} accessibilityRole="link" onPress={() => { if (source.url.startsWith('https://')) void Linking.openURL(source.url); }} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={s.link}>{source.title}</Text></Pressable>)}</View>}
        <Text style={s.small}>Głos AI używa osobnego limitu API. Jeśli nie działa, wybierz głos telefonu. Gemini może korzystać z wyszukiwania Google przy pytaniach. Źródła pojawią się po wyszukiwaniu; samo obracanie kółka oznacza przygotowywanie odpowiedzi.</Text>
      </ScrollView>
    </View></View></Modal>
  </View>;
}
