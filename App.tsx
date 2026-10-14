import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Directory, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { PickerFlow } from './src/pickerFlow';
import { demo } from './src/demo';
import { generate, transcribe, validateOcr, checkConnection, ConnectionResult, generateVocabulary } from './src/api';
import { Note, Settings, Source, Transcription, Lesson, Materials } from './src/types';
import { nextLessonNumber } from './src/lessons';
import { migrateSettings, providerNames } from './src/settings';
import { managedAI } from './src/betaConfig';
import { readKeys, saveKeys, ApiKeys } from './src/vault';
import { downloadLocal, localReady, localAvailable, releaseLocal, cancelDownload } from './src/local';
import { LessonForm, SourceEditor } from './src/lessonUI';
import { LectureRecorder, AudioPlayerControls } from './src/audioUI';
import { sourceLimit, SOURCE_TOTAL_LIMIT, importMime } from './src/sourcePolicy';
import { AISettings } from './src/aiSettingsUI';
import { googleAIAccess } from './src/googleAI';
import { restoreSources, saveWebSource, deleteWebSource } from './src/sourceStorage';
import { Flashcards, MindMap, Quiz } from './src/study';
import { StudyNote } from './src/studyNote';
import { TranscriptionReviewLines } from './src/transcriptionReviewUI';
import { omitTranscriptionLines, unresolvedLines } from './src/transcriptionReview';
import { deletionPlan, DeleteTarget } from './src/deletion';
import { materialLibrary, LibraryItem } from './src/materialLibrary';
import { IncompleteMaterial } from './src/incompleteMaterial';
import { MaterialCard } from './src/materialCard';
import { copyStoredFile } from './src/sourceCopy';
import { Teacher } from './src/teacherUI';
import { AccountBoundary } from './src/accountUI';
import { accountStorageKey } from './src/accountPolicy';
import { VocabularyEditor } from './src/vocabularyUI';
import { parseVocabulary, vocabularyNote } from './src/vocabulary';
import { C, s, Button, Chip, Empty, Evidence, Icon, countLabel } from './src/ui';

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
type Screen = 'home' | 'import' | 'review' | 'study' | 'settings' | 'lesson' | 'teacher' | 'vocabulary';
type StudyTab = 'Notatka' | 'Fiszki' | 'Mapa' | 'Quiz';

function AppContent({ owner, accountLabel, onAccount }: { owner: string | null; accountLabel: string; onAccount: () => void }) {
  const STORE = accountStorageKey('notely.notes.v1', owner);
  const VOCABULARY = accountStorageKey('notely.vocabulary-draft.v1', owner);
  const DRAFT = accountStorageKey('notely.draft.v1', owner);
  const LESSONS = accountStorageKey('notely.lessons.v1', owner);
  const SETTINGS = accountStorageKey('notely.settings.v1', owner);
  const [screen, updateScreen] = useState<Screen>('home');
  const [notes, setNotes] = useState<Note[]>([demo]);
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => migrateSettings(null, Platform.OS === 'web' ? 'http://localhost:3001' : ''));
  const [keys, setKeys] = useState<ApiKeys>({ openai: '', gemini: '', claude: '' });
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonSubject, setLessonSubject] = useState('Notatki');
  const [lessonNumber, setLessonNumber] = useState('1');
  const [downloaded, setDownloaded] = useState(localReady);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [vocabularyText, setVocabularyText] = useState('');
  const [vocabularySources, setVocabularySources] = useState<Source[]>([]);
  const [vocabularyTitle, setVocabularyTitle] = useState('');
  const [vocabularyReadIds, setVocabularyReadIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<Transcription | null>(null);
  const [checked, setChecked] = useState(false);
  const [consent, setConsent] = useState(false);
  const [selected, setSelected] = useState<string>(demo.id);
  const [tab, setTab] = useState<StudyTab>('Notatka');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionResult, setConnectionResult] = useState<(Partial<ConnectionResult> & { message: string }) | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sourceLines, setSourceLines] = useState<number[] | null>(null);
  const [original, setOriginal] = useState<Source | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [storageWritable, setStorageWritable] = useState(true);
  const gate = useRef(false);
  const recordingLock = useRef(false);
  const ocrAbort = useRef<AbortController | null>(null);
  const [pickerStatus, setPickerStatus] = useState<string | null>(null);
  const pickerRef = useRef<PickerFlow | null>(null);
  if (!pickerRef.current) pickerRef.current = new PickerFlow({
    waiting: label => { setError(null); setPickerStatus(label); },
    processing: label => { setPickerStatus(null); setBusy(label); },
    error: e => setError(e instanceof Error ? e.message : 'Nie udało się dodać pliku. Spróbuj ponownie.'),
    idle: () => { setPickerStatus(null); setBusy(null); },
  });
  const picker = pickerRef.current;
  function openAccount() { if (recordingLock.current || busy || pickerStatus) { setToast('Najpierw zakończ bieżącą operację'); return; } onAccount(); }
  function setScreen(next: Screen) { if (recordingLock.current) { setToast('Najpierw zatrzymaj i zapisz nagranie'); return; } ocrAbort.current?.abort(); picker.cancel(); updateScreen(next); }
  useEffect(() => () => { ocrAbort.current?.abort(); picker.cancel(); }, [picker]);
  const recordingCopies = useRef(new Map<string, Source>());
  const note = notes.find(n => n.id === selected);
  const evidenceNote = note;

  useEffect(() => {
    (async () => {
      try {
        const [saved, savedSettings, savedDraft, savedLessons, savedKeys] = await Promise.all([AsyncStorage.getItem(STORE), AsyncStorage.getItem(SETTINGS), AsyncStorage.getItem(DRAFT), AsyncStorage.getItem(LESSONS), readKeys(owner)]);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (!Array.isArray(parsed) || !parsed.every(n => n && Array.isArray(n.lines) && n.materials && Array.isArray(n.materials.sections) && Array.isArray(n.materials.flashcards) && Array.isArray(n.materials.quiz) && n.materials.mindMap && Array.isArray(n.materials.mindMap.branches) && n.reviews)) throw new Error('Invalid storage');
          setNotes(await Promise.all(parsed.map(async (n: Note) => ({ ...n, sources: await restoreSources(n.sources) }))));
        }
        if (savedSettings) setSettings(migrateSettings(JSON.parse(savedSettings), Platform.OS === 'web' ? 'http://localhost:3001' : ''));
        const googleConnection = await googleAIAccess();
        if (!managedAI && !savedSettings && googleConnection) {
          const value = { ...migrateSettings(null, Platform.OS === 'web' ? 'http://localhost:3001' : ''), provider: 'gemini' as const, geminiAccess: 'google' as const, googleProject: googleConnection.project };
          setSettings(value); await AsyncStorage.setItem(SETTINGS, JSON.stringify(value));
        }
        setKeys(savedKeys);
        if (savedLessons) { const savedItems = JSON.parse(savedLessons); if (!Array.isArray(savedItems) || !savedItems.every(l => l && typeof l.title === 'string' && typeof l.subject === 'string' && Array.isArray(l.sources))) throw new Error('Invalid lessons'); setLessons(await Promise.all(savedItems.map(async (l: Lesson) => ({ ...l, sources: await restoreSources(l.sources) })))); }
        const savedVocabulary = await AsyncStorage.getItem(VOCABULARY);
        if (savedVocabulary) { const v = JSON.parse(savedVocabulary); setVocabularyText(typeof v.text === 'string' ? v.text : ''); setVocabularyTitle(typeof v.title === 'string' ? v.title : ''); setVocabularySources(await restoreSources(Array.isArray(v.sources) ? v.sources : [])); setVocabularyReadIds(Array.isArray(v.readIds) ? v.readIds : []); }
        if (savedDraft) { const value = JSON.parse(savedDraft); if (Array.isArray(value.sources)) { setDraft(value.draft || null); setSources(await restoreSources(value.sources)); setLessonId(value.lessonId || null);  if (value.meta) { setLessonTitle(value.meta.title || ''); setLessonSubject(value.meta.subject || 'Notatki'); setLessonNumber(value.meta.number || '1'); } } }
      } catch { setStorageWritable(false); setError('Nie udało się odczytać zapisanych danych. Nie nadpisujemy ich. Sprawdź pamięć urządzenia przed dalszą pracą.'); }
      finally { setReady(true); }
    })();
  }, []);
  useEffect(() => { if (ready && storageWritable) AsyncStorage.setItem(STORE, JSON.stringify(notes)).catch(() => setStorageError(true)); }, [notes, ready, storageWritable]);
  useEffect(() => { if (ready && storageWritable) AsyncStorage.setItem(DRAFT, JSON.stringify({ draft, sources, lessonId, meta: { title: lessonTitle, subject: lessonSubject, number: lessonNumber } })).catch(() => setStorageError(true)); }, [draft, sources, lessonId, lessonTitle, lessonSubject, lessonNumber, ready, storageWritable]);
  useEffect(() => {
    if (!ready || !storageWritable || !draft || !lessonId) return;
    const existing = lessons.find(l => l.id === lessonId);
    if (!existing || JSON.stringify(existing.transcription) === JSON.stringify(draft)) return;
    if (existing.sources.map(source => source.id).join(',') !== sources.map(source => source.id).join(',')) return;
    const next = lessons.map(l => l.id === lessonId ? { ...l, transcription: draft } : l);
    setLessons(next); AsyncStorage.setItem(LESSONS, JSON.stringify(next)).catch(() => setStorageError(true));
  }, [draft, sources, lessonId, lessons, ready, storageWritable]);
  useEffect(() => { if (ready && storageWritable) AsyncStorage.setItem(VOCABULARY, JSON.stringify({ text: vocabularyText, title: vocabularyTitle, sources: vocabularySources, readIds: vocabularyReadIds })).catch(() => setStorageError(true)); }, [vocabularyText, vocabularyTitle, vocabularySources, vocabularyReadIds, ready, storageWritable]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 4000); return () => clearTimeout(timer); }, [toast]);

  async function task(label: string, action: () => Promise<void>) {
    if (recordingLock.current) { setToast('Najpierw zatrzymaj i zapisz nagranie'); return; }
    if (gate.current || picker.busy) return;
    gate.current = true; setBusy(label); setError(null);
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Operacja nie powiodła się. Spróbuj ponownie.'); }
    finally { setBusy(null); gate.current = false; }
  }
  function updateNote(updated: Note) { setNotes(old => old.map(n => n.id === updated.id ? updated : n)); }
  function openMaterial(item: LibraryItem) { if (item.note) openNote(item.note); else if (item.lesson) openLesson(item.lesson); }
  function openNote(n: Note) { setSelected(n.id); setTab(n.kind === 'vocabulary' ? 'Fiszki' : 'Notatka'); setScreen('study'); }
  function openLesson(lesson: Lesson) { setLessonId(lesson.id); setLessonTitle(lesson.autoTitle ? '' : lesson.title); setLessonSubject(lesson.subject); setLessonNumber(String(lesson.number)); setSources(lesson.sources); setDraft(lesson.transcription || null); setChecked(false); setConsent(false); setScreen('lesson'); }
  async function ensureLesson(lessonSources = sources, lessonDraft = draft): Promise<Lesson> {
    if (!storageWritable) throw new Error('Nie można zapisać danych w pamięci urządzenia.');
    if (!lessonSources.length) throw new Error('Najpierw dodaj zdjęcia lub pliki do lekcji.');
    const previous = lessons.find(l => l.id === lessonId);
    const changed = previous && previous.sources.map(s => s.id).join(',') !== lessonSources.map(s => s.id).join(',');
    const lesson: Lesson = { id: lessonId || uid(), title: lessonTitle.trim() || previous?.title || 'Materiały bez tytułu', autoTitle: !lessonTitle.trim(), subject: lessonDraft?.subject || previous?.subject || 'Notatki', number: previous?.number || Math.max(1, Number(lessonNumber) || 1), createdAt: previous?.createdAt || new Date().toISOString(), sources: lessonSources, noteId: changed ? undefined : previous?.noteId, transcription: lessonDraft || (changed ? undefined : previous?.transcription) };
    const next = [lesson, ...lessons.filter(l => l.id !== lesson.id)];
    await AsyncStorage.setItem(LESSONS, JSON.stringify(next)); setLessons(next); setLessonId(lesson.id); return lesson;
  }
  function saveLessonOnly() { return task('Zapisuję lekcję i podpisy…', async () => { await ensureLesson(); setScreen('lesson'); setToast('Lekcja zapisana na urządzeniu'); }); }
  function startLesson() { return task('Przygotowuję nową lekcję…', async () => { const previous = sources.length ? await ensureLesson() : null; const all = previous ? [previous, ...lessons.filter(l => l.id !== previous.id)] : lessons; setLessonId(null); setLessonTitle(''); setLessonSubject('Notatki'); setLessonNumber(String(nextLessonNumber(all, 'Notatki'))); setSources([]); setDraft(null); setChecked(false); setConsent(false); setScreen('import'); }); }
  function startVocabulary() { setConsent(false); setScreen('vocabulary'); }
  async function readVocabulary() {
    try { validateOcr(settings, vocabularySources, keys); } catch (e) { setError(e instanceof Error ? e.message : 'Sprawdź ustawienia AI.'); return; }
    await task('Odczytuję listę słówek…', async () => {
      const controller = new AbortController(); ocrAbort.current = controller;
      try {
        const pending = vocabularySources.filter(source => !vocabularyReadIds.includes(source.id));
        if (!pending.length) { setToast('Te zdjęcia są już odczytane. Dodaj kolejne lub popraw listę.'); return; }
        const result = await transcribe(settings, pending, keys, { signal: controller.signal, onProgress: setBusy });
        if (controller.signal.aborted) return;
        const uncertain = new Set(result.uncertainties.map(item => item.line));
        const lines = result.lines.map((line, i) => uncertain.has(i + 1) ? `${line} [niepewne]` : line);
        setVocabularyText(old => [old.trim(), lines.join('\n')].filter(Boolean).join('\n'));
        setVocabularyReadIds(old => [...new Set([...old, ...pending.map(source => source.id)])]);
        setToast('Lista odczytana. Sprawdź wszystkie pary przed zapisaniem.');
      } finally { if (ocrAbort.current === controller) ocrAbort.current = null; }
    });
  }
  async function completeVocabulary() {
    await task('Uzupełniam znaczenia słówek…', async () => {
      const parsed = parseVocabulary(vocabularyText);
      if (/\[(?:nieczytelne|niepewne)\]/i.test(vocabularyText)) throw new Error('Najpierw sprawdź oznaczone wiersze ze zdjęciem. AI nie będzie zgadywać nieczytelnych słówek.');
      if (!parsed.missing.length) return;
      const controller = new AbortController(); ocrAbort.current = controller;
      try {
        const applyAnswers = (answers: { term: string; answer: string }[]) => {
          const lines = [...parsed.lines];
          answers.forEach((answer, i) => { if (answer.answer.trim()) lines[parsed.missing[i].line - 1] = `${parsed.missing[i].text} — ${answer.answer}`; });
          setVocabularyText(lines.join('\n'));
        };
        const answers = await generateVocabulary(parsed.missing.map(row => row.text), settings, keys, controller.signal, (label, partial) => { setBusy(label); if (!controller.signal.aborted) applyAnswers(partial); });
        if (controller.signal.aborted) return;
        applyAnswers(answers); setToast('Sprawdź znaczenia przed zapisaniem. Nierozpoznane słowa uzupełnij ręcznie.');
      } finally { if (ocrAbort.current === controller) ocrAbort.current = null; }
    });
  }
  async function saveVocabulary() {
    await task('Zapisuję cały zestaw fiszek…', async () => {
      const newNote = vocabularyNote(vocabularyText, vocabularyTitle, vocabularySources, uid());
      const next = [newNote, ...notes];
      await AsyncStorage.setItem(STORE, JSON.stringify(next));
      await AsyncStorage.removeItem(VOCABULARY);
      setNotes(next); setVocabularySources([]); setVocabularyReadIds([]); setVocabularyTitle(''); setVocabularyText(''); setConsent(false); openNote(newNote);
    });
  }
  async function readLesson() {
    if (gate.current || picker.busy) return;
    // Fail before opening any loading screen or saving a lesson when AI is unavailable.
    try { validateOcr(settings, sources, keys); }
    catch (e) { setError(e instanceof Error ? e.message : 'Sprawdź ustawienia odczytu.'); return; }
    await task('Przygotowuję odczyt…', async () => {
      const controller = new AbortController(); ocrAbort.current = controller;
      try {
        await new Promise(resolve => setTimeout(resolve, 32));
        if (controller.signal.aborted) return;
        const readSettings = settings;
        const lesson = await ensureLesson();
        if (controller.signal.aborted) return;
        const result = await transcribe(readSettings, sources, keys, { signal: controller.signal, onProgress: setBusy });
        if (controller.signal.aborted) return;
        setBusy('Zapisuję odczytaną treść…');
        const corrected = { ...result, title: lessonTitle.trim() || result.title || lesson.title, subject: result.subject || lesson.subject };
        const updated = { ...lesson, title: corrected.title, subject: corrected.subject, transcription: corrected };
        const next = [updated, ...lessons.filter(l => l.id !== updated.id)];
        await AsyncStorage.setItem(LESSONS, JSON.stringify(next));
        setLessons(next);
        if (controller.signal.aborted) return;
        setDraft(corrected); setLessonSubject(corrected.subject); setChecked(false); setScreen('review');
      } catch (e) {
        if (!controller.signal.aborted) throw e;
      } finally { if (ocrAbort.current === controller) ocrAbort.current = null; }
    });
  }
  function downloadModel() { return task('Pobieram model na telefon…', async () => { setDownloadProgress(0); try { await downloadLocal(setDownloadProgress); setDownloaded(localReady()); setToast('Model gotowy. Możesz odłączyć internet.'); } finally { setDownloadProgress(null); } }); }
  async function persistSource(uri: string, name: string, mime: string, size?: number): Promise<Source> {
    const id = uid();
    const limit = sourceLimit(mime);
    if (size && size > limit) throw new Error(`Limit tego pliku to ${limit / 1024 / 1024} MB.`);
    if (Platform.OS === 'web') { const stored = await saveWebSource(uri, id, mime); return { id, ...stored, name, mime }; }
    const file = new File(uri); const bytes = file.size;
    if (bytes > limit) throw new Error(`Limit tego pliku to ${limit / 1024 / 1024} MB.`);
    if (!bytes) throw new Error('Nagranie lub plik jest pusty. Spróbuj ponownie.');
    const dir = new Directory(Paths.document, 'notely-sources'); dir.create({ idempotent: true, intermediates: true });
    const extension = mime === 'audio/mp4' ? 'm4a' : mime === 'audio/mpeg' ? 'mp3' : mime.split('/')[1];
    const target = new File(dir, `${id}.${extension}`);
    await copyStoredFile(file, target, bytes);
    return { id, uri: target.uri, name, mime, bytes };
  }
  function appendSources(incoming: Source[]) {
    if (screen === 'vocabulary') {
      if (vocabularySources.length + incoming.length > 8 || [...vocabularySources, ...incoming].reduce((sum, f) => sum + f.bytes, 0) > SOURCE_TOTAL_LIMIT) throw new Error('Zestaw może zawierać maksymalnie 8 zdjęć i 64 MB.');
      setVocabularySources(old => [...old, ...incoming]); setConsent(false); return;
    }
    if (sources.length + incoming.length > 8) throw new Error('Możesz dodać maksymalnie 8 stron lub plików.');
    if ([...sources, ...incoming].reduce((sum, f) => sum + f.bytes, 0) > SOURCE_TOTAL_LIMIT || incoming.some(f => f.bytes > sourceLimit(f.mime))) throw new Error('Limit lekcji to 64 MB; zdjęcie lub PDF — 8 MB, audio — 20 MB.');
    setSources(old => [...old, ...incoming]); setDraft(null); setChecked(false); setConsent(false);
  }
  async function discardImports(added: Source[]) {
    for (const source of added) {
      try {
        if (Platform.OS === 'web') await deleteWebSource(source.id);
        else { const file = new File(source.uri); if (file.exists) file.delete(); }
      } catch { /* A failed temporary-file cleanup must not hide the import error. */ }
    }
  }
  async function pickImages(camera: boolean) {
    if (recordingLock.current || gate.current || !storageWritable) return;
    const photoSources = screen === 'vocabulary' ? vocabularySources : sources;
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: .85, allowsMultipleSelection: !camera, selectionLimit: Math.max(1, 8 - photoSources.length) };
    await picker.start(async isCurrent => {
      if (camera && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!isCurrent()) return { canceled: true, assets: null } as ImagePicker.ImagePickerResult;
        if (!permission.granted) throw new Error('Aparat potrzebuje uprawnienia. Włącz dostęp w ustawieniach telefonu lub wybierz zdjęcie z galerii.');
      }
      return camera ? ImagePicker.launchCameraAsync(options) : ImagePicker.launchImageLibraryAsync(options);
    }, async (result, isCurrent) => {
      if (result.canceled) return;
      if (photoSources.length + result.assets.length > 8) throw new Error('Możesz dodać maksymalnie 8 plików.');
      const added: Source[] = [];
      let committed = false;
      try {
        for (const asset of result.assets) {
          if (!isCurrent()) return;
          const context = ImageManipulator.manipulate(asset.uri);
          let image: Awaited<ReturnType<typeof context.renderAsync>> | undefined;
          try {
            if (asset.width > 2400) context.resize({ width: 2400 });
            image = await context.renderAsync();
            if (!isCurrent()) return;
            const jpeg = await image.saveAsync({ format: SaveFormat.JPEG, compress: .85 });
            if (!isCurrent()) return;
            added.push(await persistSource(jpeg.uri, `zdjecie-${photoSources.length + added.length + 1}.jpg`, 'image/jpeg'));
          } finally { image?.release(); context.release(); }
        }
        if (!isCurrent()) return;
        appendSources(added); committed = true;
      } finally { if (!committed) await discardImports(added); }
    }, { waiting: camera ? 'Wybierz zdjęcie w aparacie' : 'Wybierz zdjęcia w galerii', processing: 'Przygotowuję i zapisuję zdjęcia…' });
  }
  async function pickFiles(audioOnly = false) {
    if (recordingLock.current || gate.current || !storageWritable) return;
    await picker.start(() => DocumentPicker.getDocumentAsync({ type: audioOnly ? ['audio/*'] : ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'audio/*'], multiple: true, copyToCacheDirectory: true, base64: false }), async (result, isCurrent) => {
      if (result.canceled) return;
      if (sources.length + result.assets.length > 8) throw new Error('Możesz dodać maksymalnie 8 plików.');
      const added: Source[] = [];
      let committed = false;
      try {
        for (const a of result.assets) {
          if (!isCurrent()) return;
          const mime = importMime(a.name, a.mimeType);
          if (audioOnly && !mime?.startsWith('audio/')) throw new Error('Wybierz gotowe nagranie audio: MP3, M4A, WAV, WEBM, OGG lub FLAC.');
          if (!mime) throw new Error('Wybierz JPG, PNG, WEBP, PDF albo audio: MP3, M4A, WAV, WEBM, OGG lub FLAC.');
          added.push(await persistSource(a.uri, a.name, mime, a.size));
        }
        if (!isCurrent()) return;
        appendSources(added); committed = true;
      } finally { if (!committed) await discardImports(added); }
    }, { waiting: 'Wybierz pliki', processing: 'Zapisuję wybrane pliki…' });
  }
  async function addRecording(uri: string, name: string, mime: string) {
    if (!storageWritable) throw new Error('Nie można zapisać danych na urządzeniu.');
    let added = recordingCopies.current.get(uri);
    if (!added) { added = await persistSource(uri, name, mime); recordingCopies.current.set(uri, added); }
    const combined = [...sources.filter(source => source.id !== added!.id), added];
    if (combined.length > 8 || combined.reduce((total, source) => total + source.bytes, 0) > SOURCE_TOTAL_LIMIT) throw new Error('Lekcja mieści do 8 plików i 64 MB. Zwolnij miejsce w tej lekcji i ponów zapis nagrania.');
    await ensureLesson(combined, null);
    setSources(combined); setDraft(null); setChecked(false); setConsent(false);
    recordingCopies.current.delete(uri);
    setToast('Nagranie i lekcja zapisane na urządzeniu');
  }
  function testConnection() {
    return task('Sprawdzam połączenie i dostęp do modeli…', async () => {
      setConnectionResult(null);
      try {
        const result = await checkConnection(settings, keys);
        if (settings.provider === 'gemini') {
          const next = { ...settings, models: { ...settings.models, gemini: result.model } };
          await AsyncStorage.setItem(SETTINGS, JSON.stringify(next)); setSettings(next);
        }
        setConnectionResult(result);
      }
      catch (e) { setConnectionResult({ message: e instanceof Error ? e.message : 'Nie udało się sprawdzić połączenia.' }); }
    });
  }
  async function saveSettings() {
    await task('Zapisuję ustawienia…', async () => {
      const value = { ...settings, apiUrl: settings.apiUrl.trim().replace(/\/$/, ''), token: settings.token.trim() };
      if (value.apiUrl && !/^https?:\/\/[^\s]+$/.test(value.apiUrl)) throw new Error('Podaj pełny adres serwera, zaczynający się od https:// lub http://.');
      await saveKeys(keys, owner);
      await AsyncStorage.setItem(SETTINGS, JSON.stringify(value)); setSettings(value); setConnectionResult(null); setConsent(false); setToast('Ustawienia zapisane');
    });
  }
  async function buildMaterials(prepared?: Transcription) {
    const reviewed = prepared || draft;
    if (!reviewed || (!prepared && !checked) || !storageWritable) return;
    if (settings.provider !== 'local' && !consent) { setError('Zaznacz zgodę na przetworzenie treści przez usługę AI.'); return; }
    if (unresolvedLines(reviewed).length) { setError('Popraw lub pomiń oznaczone fragmenty.'); return; }
    if (!reviewed.lines.some(line => line.trim())) { setError('Po pominięciu fragmentów nie zostało treści do nauki. Dodaj czytelny tekst.'); return; }
    await task('Tworzę materiały do nauki…', async () => {
      const lesson = await ensureLesson();
      const controller = new AbortController(); ocrAbort.current = controller;
      let materials: Materials;
      try { materials = await generate(settings, reviewed, keys, { signal: controller.signal, onProgress: setBusy }); }
      finally { if (ocrAbort.current === controller) ocrAbort.current = null; }
      if (controller.signal.aborted) return;
      const finalTitle = lesson.autoTitle ? materials.mindMap.center.trim().slice(0, 200) || reviewed.title : reviewed.title;
      const newNote: Note = { ...reviewed, title: finalTitle, uncertainties: [], id: uid(), createdAt: new Date().toISOString(), sources, materials, reviews: {}, lessonId: lesson.id };
      const next = [newNote, ...notes]; await AsyncStorage.setItem(STORE, JSON.stringify(next));
      const nextLessons = [{ ...lesson, title: finalTitle, subject: reviewed.subject, noteId: newNote.id, transcription: { ...reviewed, title: finalTitle } }, ...lessons.filter(l => l.id !== lesson.id)];
      await AsyncStorage.setItem(LESSONS, JSON.stringify(nextLessons)); setLessons(nextLessons);
      await AsyncStorage.removeItem(DRAFT); setNotes(next); setDraft(null); setSources([]); setChecked(false); setConsent(false); openNote(newNote);
    });
  }
  async function removeMaterial(target: DeleteTarget) {
    if (!storageWritable || storageError || gate.current || picker.busy) return;
    setDeleteTarget(null);
    await task('Usuwam materiały…', async () => {
      const plan = deletionPlan(notes, lessons, target, lessonId, sources);
      const entries: [string, string][] = [[STORE, JSON.stringify(plan.notes)], [LESSONS, JSON.stringify(plan.lessons)]];
      if (plan.clearDraft) entries.push([DRAFT, JSON.stringify({ draft: null, sources: [], lessonId: null, meta: { title: '', subject: lessonSubject, number: '1' } })]);
      // Save references before deleting files; shared files stay available to other lessons.
      await AsyncStorage.multiSet(entries);
      setNotes(plan.notes); setLessons(plan.lessons);
      if (plan.clearDraft) { setLessonId(null); setLessonTitle(''); setLessonNumber('1'); setSources([]); setDraft(null); setChecked(false); setConsent(false); }
      if (plan.removedIds.has(selected) || plan.clearDraft) { setSourceLines(null); setOriginal(null); setScreen('home'); }
      let cleanupFailed = false;
      for (const source of plan.unusedSources.filter(source => !vocabularySources.some(retained => retained.id === source.id || retained.uri === source.uri))) {
        try {
          if (Platform.OS === 'web') await deleteWebSource(source.id);
          else {
            const directory = new Directory(Paths.document, 'notely-sources');
            const file = new File(source.uri);
            if (file.uri.startsWith(directory.uri.replace(/\/$/, '') + '/') && file.exists) file.delete();
          }
        } catch { cleanupFailed = true; }
      }
      setToast(target.kind === 'lesson' ? 'Lekcja i materiały usunięte' : 'Notatka i postępy usunięte');
      if (cleanupFailed) setError('Materiały usunięte z biblioteki, ale nie udało się zwolnić miejsca po części plików.');
    });
  }
  const title = screen === 'home' ? 'Twoja przestrzeń do nauki' : screen === 'vocabulary' ? 'Zrób fiszki ze słówek' : screen === 'import' ? 'Dodaj materiały' : screen === 'lesson' ? lessons.find(l => l.id === lessonId)?.title || 'Dodaj materiały' : screen === 'review' ? 'Sprawdź odczyt' : screen === 'settings' ? 'Ustawienia' : note?.subject || 'Nauka';
  const activeLesson = lessons.find(l => l.id === lessonId);
  const library = materialLibrary(notes, lessons);
  const filtered = materialLibrary(notes, lessons, search);
  const noteLesson = note && lessons.find(l => l.id === note.lessonId || l.noteId === note.id);
  const focusedStudy = screen === 'study' && !!note && (tab === 'Fiszki' || tab === 'Quiz');
  if (!ready) return <SafeAreaView style={s.page}><ActivityIndicator color={C.green} style={{ marginTop: 100 }} /></SafeAreaView>;
  return <SafeAreaView style={s.page} edges={['top', 'bottom']}><StatusBar style="dark" /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={s.shell}>
    {!focusedStudy && <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel={screen === 'home' ? 'Strona główna' : 'Wróć do materiałów'} onPress={() => setScreen('home')} style={s.brand}><View style={s.logo}><Ionicons name={screen === 'home' ? 'leaf' : 'arrow-back'} size={22} color={C.lime} /></View><Text style={s.brandText}>notely.</Text></Pressable><View style={{ flexDirection: 'row', gap: 3 }}><Pressable accessibilityRole="button" accessibilityLabel="Twoje konto" onPress={openAccount} style={s.iconButton}><Ionicons name={owner ? 'person-circle' : 'person-circle-outline'} size={27} color={C.ink} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Ustawienia" onPress={() => setScreen('settings')} style={s.iconButton}><Ionicons name="settings-outline" size={22} color={C.ink} /></Pressable></View></View>}
    {pickerStatus && <View style={s.errorBar}><Text style={s.body}>{pickerStatus}. Jeśli okno wyboru się nie pojawiło, anuluj i spróbuj ponownie.</Text><Button text="Anuluj dodawanie" secondary onPress={() => picker.cancel()} /></View>}
    {storageError && <View style={s.errorBar}><Text style={s.errorText}>Brak zapisu w pamięci urządzenia. Ostatnie zmiany mogą zniknąć po zamknięciu.</Text><Button text="Ponów zapis" secondary onPress={() => task('Ponawiam zapis…', async () => { await AsyncStorage.setItem(STORE, JSON.stringify(notes)); await AsyncStorage.setItem(LESSONS, JSON.stringify(lessons)); await AsyncStorage.setItem(VOCABULARY, JSON.stringify({ text: vocabularyText, title: vocabularyTitle, sources: vocabularySources, readIds: vocabularyReadIds })); await AsyncStorage.setItem(DRAFT, JSON.stringify({ draft, sources, lessonId, meta: { title: lessonTitle, subject: lessonSubject, number: lessonNumber } })); setStorageError(false); setToast('Dane zapisane'); })} /></View>}
    {screen === 'teacher' && note ? <Teacher key={note.id} note={note} settings={settings} keys={keys} onBack={() => setScreen('study')} onSettings={() => setScreen('settings')} onEvidence={setSourceLines} onSessionChange={locked => { recordingLock.current = locked; }} /> : screen === 'study' && note && tab === 'Fiszki' ? <View style={{ flex: 1 }}><View style={{ paddingHorizontal: 16, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Pressable accessibilityRole="button" accessibilityLabel="Wróć do notatki" onPress={() => setTab('Notatka')} style={{ minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' }}><Ionicons name="arrow-back" size={24} color={C.green} /></Pressable><Text style={[s.small, { flex: 1 }]} numberOfLines={1}>{note.title}</Text></View><Flashcards key={note.id} note={note} readOnly={!storageWritable || storageError} onUpdate={updateNote} onEvidence={setSourceLines} /></View> : screen === 'study' && note && tab === 'Quiz' ? <View style={{ flex: 1 }}><View style={{ paddingHorizontal: 16, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Pressable accessibilityRole="button" accessibilityLabel="Wróć do notatki" onPress={() => setTab('Notatka')} style={{ minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' }}><Ionicons name="arrow-back" size={24} color={C.green} /></Pressable><Text style={[s.small, { flex: 1 }]} numberOfLines={1}>{note.title}</Text></View><Quiz key={note.id} note={note} onEvidence={setSourceLines} /></View> : <ScrollView key={`${screen}-${selected}-${tab}`} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <Text style={s.eyebrow}>{screen === 'home' ? 'MNIEJ PRZEPISYWANIA. WIĘCEJ ROZUMIENIA.' : 'TWOJE NOTATKI, TWÓJ SPOSÓB NAUKI'}</Text><Text style={s.h1}>{title}</Text>
      {screen === 'home' && <>
        <View style={s.hero}><View style={s.heroDecoration}><Ionicons name="documents-outline" size={58} color={C.green} /></View><Chip>OD KARTKI DO WIEDZY</Chip><Text style={s.heroTitle}>Dobre notatki.{ '\n' }Jeszcze lepsza nauka.</Text><Text style={[s.body, { marginBottom: 20 }]}>Dodaj materiały i podpisz zdjęcia. Ucz się lokalnie lub z wybranym AI.</Text><Button text="Dodaj materiały" icon="add" onPress={startLesson} /></View>
        <View style={s.sectionRow}><Text style={s.h2}>Moje materiały</Text><Text style={s.small}>{library.length} zapisanych</Text></View>
        <View style={s.search}><Ionicons name="search-outline" size={20} color={C.muted} /><TextInput accessibilityLabel="Szukaj materiałów" placeholder="Szukaj tematu lub przedmiotu…" placeholderTextColor={C.muted} value={search} onChangeText={setSearch} style={{ flex: 1, color: C.ink, fontSize: 15 }} /></View>
        {filtered.map(item => <MaterialCard key={item.id} item={item} example={item.note?.id === demo.id} disabled={!storageWritable || storageError} onOpen={() => openMaterial(item)} onDelete={() => setDeleteTarget(item.lesson ? { kind: 'lesson', id: item.lesson.id } : { kind: 'note', id: item.note!.id })} />)}
        {library.length === 0 && <Empty icon="book-outline" title="Tutaj zaczyna się nauka" body="Dodaj zdjęcia, pliki lub nagranie, aby przygotować pierwszą notatkę." />}
        {library.length > 0 && !filtered.length && <Empty icon="search-outline" title="Brak wyników" body="Spróbuj innego tematu lub przedmiotu." />}
        {!notes.some(n => n.id === demo.id) && <Button text="Dodaj przykładową notatkę" disabled={!storageWritable} secondary onPress={() => setNotes(old => [...old, { ...demo, reviews: {} }])} />}
      </>}
      {(screen === 'import' || screen === 'lesson') && <>
        {screen === 'import' && <View style={s.sectionCard}><Text style={s.h2}>Słówka do nauki?</Text><Text style={s.body}>Osobny zestaw fiszek ze zdjęcia albo całej listy.</Text><Button text="Fiszki ze słówek" icon="albums-outline" onPress={startVocabulary} /></View>}
        {screen === 'lesson' && activeLesson && !notes.some(n => n.id === activeLesson.noteId) && <IncompleteMaterial />}
        {screen === 'lesson' && activeLesson && <Button text="Usuń materiały" secondary icon="trash-outline" disabled={!storageWritable || storageError} onPress={() => setDeleteTarget({ kind: 'lesson', id: activeLesson.id })} />}
        {screen === 'lesson' && activeLesson?.noteId && notes.some(n => n.id === activeLesson.noteId) && <Button text="Otwórz materiały do nauki" icon="book-outline" onPress={() => { const material = notes.find(n => n.id === activeLesson.noteId); if (material) openNote(material); }} />}
        <View style={s.captureBox}><View style={s.captureIcon}><Ionicons name="scan-outline" size={46} color={C.green} /></View><Text style={s.h2}>Twoje pismo. Nowe możliwości.</Text><Text style={[s.body, { textAlign: 'center' }]}>Fotografuj z góry, przy dobrym świetle.{ '\n' }Cała strona powinna mieścić się w kadrze.</Text><Button text="Zrób zdjęcie" icon="camera-outline" disabled={!!pickerStatus} onPress={() => pickImages(true)} /><View style={s.row}><View style={{ flex: 1 }}><Button text="Galeria" secondary icon="images-outline" disabled={!!pickerStatus} onPress={() => pickImages(false)} /></View><View style={{ flex: 1 }}><Button text="Pliki" secondary icon="folder-outline" disabled={!!pickerStatus} onPress={() => pickFiles()} /></View></View><LectureRecorder onSave={addRecording} onError={setError} onImport={() => pickFiles(true)} onSessionChange={locked => { recordingLock.current = locked; }} disabled={!!pickerStatus || sources.length >= 8 || !storageWritable} /></View>
        <LessonForm title={lessonTitle} onTitle={setLessonTitle} />
        <View style={s.sectionRow}><Text style={s.h2}>Dodane materiały</Text><Text style={s.small}>{sources.length}/8 plików</Text></View>
        <SourceEditor sources={sources} onOpen={setOriginal} onChange={next => { if (next.map(s => s.id).join(',') !== sources.map(s => s.id).join(',')) setDraft(null); setSources(next); }} />
        <Text style={s.small}>Zdjęcia / PDF do 8 MB · audio do 20 MB · lekcja do 64 MB</Text>
        <Button text="Zapisz lekcję i pliki bez AI" secondary icon="save-outline" disabled={!sources.length || !storageWritable} onPress={saveLessonOnly} />
        <View style={s.sectionRow}><Chip>{providerNames[settings.provider]}</Chip><Pressable accessibilityRole="button" onPress={() => setScreen('settings')}><Text style={s.link}>Zmień sposób odczytu →</Text></Pressable></View>
        {settings.provider !== 'local' ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consent }} onPress={() => setConsent(!consent)} style={s.checkboxRow}><Ionicons name={consent ? 'checkbox' : 'square-outline'} size={25} color={C.green} /><Text style={[s.small, { flex: 1 }]}>Zgadzam się na wysłanie tych plików do serwera Notely i {providerNames[settings.provider]} w celu odczytu.</Text></Pressable> : <Text style={s.small}>Lokalny model odczytuje zdjęcia. Nagrania możesz zapisać i odsłuchać bez AI; transkrypcja wymaga wybrania OpenAI albo Gemini.</Text>}
        {settings.provider === 'local' && !localAvailable() && <View style={s.sectionCard}><Text style={s.body}>Model lokalny wymaga osobnej aplikacji Notely. W Expo Go możesz zapisać zdjęcia, wpisać treść ręcznie lub skonfigurować odczyt przez GPT, Gemini albo Claude.</Text><Button text="Ustaw odczyt AI" secondary icon="settings-outline" onPress={() => setScreen('settings')} /></View>}
        <Button text="Odczytaj moje notatki" icon="sparkles-outline" disabled={!sources.length || (settings.provider !== 'local' && !consent) || !storageWritable} onPress={readLesson} />
        {draft && <Button text="Wróć do sprawdzania odczytu" secondary icon="create-outline" onPress={() => { setChecked(false); setScreen('review'); }} />}
        <Button text="Wpisz treść ręcznie" secondary icon="text-outline" disabled={!sources.length || !storageWritable} onPress={() => task('Otwieram edytor notatek…', async () => { const lesson = await ensureLesson(); setDraft({ title: lesson.title, subject: lesson.subject, lines: [''], uncertainties: [] }); setChecked(false); setScreen('review'); })} />
        {settings.provider !== 'local' && !settings.apiUrl && <Pressable onPress={() => setScreen('settings')}><Text style={s.link}>Najpierw połącz serwer w Ustawieniach →</Text></Pressable>}
      </>}
      {screen === 'vocabulary' && <>
        <Button text="Wróć do dodawania materiałów" secondary icon="arrow-back" onPress={() => setScreen('import')} />
        <View style={s.captureBox}><Text style={s.h2}>Zdjęcie listy albo własne słówka</Text><Text style={s.body}>Dodaj zdjęcia słówek z tłumaczeniami lub wklej listę poniżej.</Text><Button text="Zrób zdjęcie" icon="camera-outline" disabled={!!pickerStatus} onPress={() => pickImages(true)} /><Button text="Wybierz zdjęcia" secondary icon="images-outline" disabled={!!pickerStatus} onPress={() => pickImages(false)} /></View>
        <SourceEditor sources={vocabularySources} onOpen={setOriginal} onChange={setVocabularySources} />
        <View style={s.sectionRow}><Chip>{providerNames[settings.provider]}</Chip><Pressable accessibilityRole="button" onPress={() => setScreen('settings')}><Text style={s.link}>Ustawienia AI →</Text></Pressable></View>
        {settings.provider !== 'local' && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consent }} onPress={() => setConsent(!consent)} style={s.checkboxRow}><Ionicons name={consent ? 'checkbox' : 'square-outline'} size={25} color={C.green} /><Text style={[s.small, { flex: 1 }]}>Zgadzam się na przetworzenie zdjęć lub słówek przez serwer Notely i {providerNames[settings.provider]}.</Text></Pressable>}
        <Button text="Odczytaj listę ze zdjęć" secondary icon="scan-outline" disabled={!vocabularySources.length || (settings.provider !== 'local' && !consent) || !storageWritable} onPress={readVocabulary} />
        <VocabularyEditor text={vocabularyText} onText={setVocabularyText} title={vocabularyTitle} onTitle={setVocabularyTitle} onSave={saveVocabulary} disabled={!storageWritable || storageError} />
        {!!parseVocabulary(vocabularyText).missing.length && <><Button text="Uzupełnij znaczenia z AI" secondary icon="sparkles-outline" disabled={/\[(?:nieczytelne|niepewne)\]/i.test(vocabularyText) || (settings.provider !== 'local' && !consent) || !storageWritable} onPress={completeVocabulary} /><Text style={s.small}>AI uzupełni tylko wiersze bez znaczenia. Gotowych par nie zmieni. Możesz też dopisać znaczenia ręcznie.</Text></>}
      </>}
      {screen === 'review' && draft && <>
        <Chip>ODCZYT → SPRAWDZENIE → NAUKA</Chip><Text style={s.body}>Porównaj tekst z oryginałem. Popraw błędy i oznaczone fragmenty, zanim przygotujemy materiały do nauki.</Text>
        {draft.sourceMode === 'pdf-notes' && <View style={s.sectionCard}><Text style={s.cardTitle}>Notatka z prezentacji</Text><Text style={s.body}>PDF opracowaliśmy własnymi słowami. To nie jest dosłowny odczyt. Sprawdź fakty, liczby i numery stron z oryginałem.</Text></View>}
        <Text style={s.label}>Tytuł</Text><TextInput accessibilityLabel="Tytuł notatki" value={draft.title} onChangeText={title => { setDraft({ ...draft, title }); setLessonTitle(title); setChecked(false); }} maxLength={200} style={s.input} />
        <Text style={s.label}>Przedmiot / temat</Text><TextInput accessibilityLabel="Przedmiot" value={draft.subject} onChangeText={subject => { setDraft({ ...draft, subject }); setChecked(false); }} maxLength={100} style={s.input} />
        <ScrollView horizontal contentContainerStyle={{ gap: 10 }} showsHorizontalScrollIndicator={false}>{sources.map(source => <Pressable key={source.id} onPress={() => setOriginal(source)} style={s.sourcePreview}>{source.mime.startsWith('image/') ? <Image source={{ uri: source.uri }} style={{ width: 90, height: 110, borderRadius: 10 }} /> : <Ionicons name="document-text-outline" size={38} color={C.green} />}<Text style={s.small} numberOfLines={1}>{source.name}</Text></Pressable>)}</ScrollView>
        {draft.uncertainties.length > 0 && <View style={s.notice}><Ionicons name="alert-circle-outline" size={22} color={C.orange} /><Text style={[s.body, { flex: 1 }]}>Sprawdź oznaczone fragmenty. Po poprawie podświetlenie zniknie. Możesz też je pominąć. Odczyt AI może zawierać błędy także w pozostałych liniach.</Text></View>}
        <TranscriptionReviewLines draft={draft} onChange={value => { setDraft(value); setChecked(false); }} />
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => setChecked(!checked)} style={s.checkboxRow}><Ionicons name={checked ? 'checkbox' : 'square-outline'} size={26} color={C.green} /><Text style={[s.body, { flex: 1 }]}>Sprawdziłem(-am) treść. Można przygotować materiały do nauki.</Text></Pressable>
        <Chip>{providerNames[settings.provider]}</Chip>
        {settings.provider !== 'local' && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consent }} onPress={() => setConsent(!consent)} style={s.checkboxRow}><Ionicons name={consent ? 'checkbox' : 'square-outline'} size={25} color={C.green} /><Text style={[s.small, { flex: 1 }]}>Zgadzam się na przetworzenie zatwierdzonej treści przez serwer Notely i {providerNames[settings.provider]} w celu tworzenia materiałów.</Text></Pressable>}
        <Text style={s.small}>Przygotujemy spójną notatkę z kontekstem i wyjaśnieniami. Fiszki, mapa i quiz będą dodatkami do wyboru.</Text>
        <Button text="Przygotuj notatkę do nauki" icon="sparkles-outline" disabled={!checked || (settings.provider !== 'local' && !consent) || !draft.title.trim() || !draft.lines.some(l => l.trim()) || unresolvedLines(draft).length > 0 || !storageWritable} onPress={() => buildMaterials()} />
        {unresolvedLines(draft).length > 0 && <>
          <Text style={s.small}>Możesz przejść dalej bez sprawdzania niejasnych fragmentów. Wszystkie oznaczone wiersze ({unresolvedLines(draft).length}) zostaną pominięte w notatce i materiałach do nauki. Oryginalne pliki zostają.</Text>
          <Button text="Pomiń niejasne i przygotuj notatkę" secondary disabled={(settings.provider !== 'local' && !consent) || !draft.title.trim() || !storageWritable || !omitTranscriptionLines(draft, unresolvedLines(draft)).lines.some(line => line.trim())} onPress={() => {
            const clean = omitTranscriptionLines(draft, unresolvedLines(draft));
            setDraft(clean); setChecked(true); setToast('Niejasne fragmenty pominięte. Oryginalne pliki zostały zachowane.'); buildMaterials(clean);
          }} />
          {!omitTranscriptionLines(draft, unresolvedLines(draft)).lines.some(line => line.trim()) && <Text style={s.small}>Wszystkie fragmenty są niejasne. Popraw przynajmniej jeden lub dodaj czytelny tekst.</Text>}
        </>}
      </>}
      {screen === 'study' && note && <>
        <Text style={s.studyTitle}>{note.title}</Text>{note.id === demo.id && <Text style={s.small}>Przykładowe materiały — wypróbuj naukę bez serwera AI.</Text>}
        <View style={s.tabs}>{((note.kind === 'vocabulary' ? ['Notatka', 'Fiszki'] : ['Notatka', 'Fiszki', 'Mapa', 'Quiz']) as StudyTab[]).map(t => <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} onPress={() => setTab(t)} style={[s.tab, t === tab && s.activeTab]}><Text style={[s.tabText, t === tab && { color: C.white }]}>{t}</Text></Pressable>)}</View>
        {tab === 'Notatka' && note.sourceMode === 'pdf-notes' && <Text style={s.small}>Opracowanie PDF własnymi słowami · numery stron w odczycie materiału</Text>}
        {tab === 'Notatka' && note.kind !== 'vocabulary' && <Button text="Wykładowca AI" icon="headset-outline" onPress={() => setScreen('teacher')} />}
        {tab === 'Notatka' && noteLesson && <Button text="Zdjęcia, nagrania i edycja materiałów" secondary icon="folder-open-outline" onPress={() => openLesson(noteLesson)} />}
        {tab === 'Notatka' && note.kind === 'vocabulary' && <View style={s.sectionCard}><Text style={s.h2}>Lista słówek</Text>{note.lines.filter(line => line.trim()).map((line, i) => <Text key={i} style={s.body}>{line}</Text>)}{note.sources.map(source => <Button key={source.id} text={source.caption || source.name} secondary icon="image-outline" onPress={() => setOriginal(source)} />)}</View>}
        {tab === 'Notatka' && note.kind !== 'vocabulary' && <StudyNote key={note.id} note={note} onEvidence={setSourceLines} onOriginal={setOriginal} />}
        {tab === 'Fiszki' && <Flashcards key={note.id} note={note} onUpdate={updateNote} onEvidence={setSourceLines} />}{tab === 'Mapa' && <MindMap note={note} onEvidence={setSourceLines} />}
      </>}
      {screen === 'settings' && <>
        <Pressable accessibilityRole="button" onPress={openAccount} style={[s.sectionCard, { flexDirection: 'row', alignItems: 'center', gap: 14 }]}><Ionicons name="person-circle-outline" size={36} color={C.green} /><View style={{ flex: 1, gap: 3 }}><Text style={s.h2}>{owner ? 'Twoje konto' : 'Zaloguj się do Notely'}</Text><Text style={s.small}>{accountLabel}</Text></View><Ionicons name="chevron-forward" size={20} color={C.muted} /></Pressable>
        {!managedAI && <AISettings onSave={() => AsyncStorage.setItem(SETTINGS, JSON.stringify(settings))} settings={settings} keys={keys} onChange={value => { setSettings(value); setConnectionResult(null); setConsent(false); }} onKeys={value => { setKeys(value); setConnectionResult(null); }} downloaded={downloaded} onDownload={downloadModel} onRelease={() => task('Zwalniam pamięć modelu…', async () => { await releaseLocal(); setToast('Pamięć modelu zwolniona'); })} />}
        {!managedAI && settings.provider !== 'local' && <View style={s.sectionCard}><Text style={s.h2}>Twój serwer dla usług chmurowych</Text><Text style={s.label}>Adres API</Text><TextInput accessibilityLabel="Adres API" autoCapitalize="none" autoCorrect={false} placeholder="https://twoj-serwer.pl" placeholderTextColor={C.muted} keyboardType="url" value={settings.apiUrl} onChangeText={apiUrl => { setSettings({ ...settings, apiUrl }); setConnectionResult(null); }} style={s.input} /><Text style={s.label}>Token dostępu serwera</Text><TextInput accessibilityLabel="Token dostępu serwera" secureTextEntry autoCapitalize="none" autoCorrect={false} value={settings.token} onChangeText={token => { setSettings({ ...settings, token }); setConnectionResult(null); }} placeholder="API_TOKEN z konfiguracji serwera" placeholderTextColor={C.muted} style={s.input} /><Text style={s.small}>Serwer pośredniczy w połączeniu z wybranym dostawcą. Nie zapisuje kluczy przekazanych przez aplikację.</Text><Button text="Sprawdź połączenie" secondary icon="wifi-outline" onPress={testConnection} />
          {connectionResult && <View accessibilityLiveRegion="polite" style={{ gap: 10 }}><Text style={s.cardTitle}>{connectionResult.message}</Text>{connectionResult.modelAvailable && <Text style={s.small}>Test sprawdza dostęp do modelu. Odczyt zdjęć jest osobną operacją i może podlegać limitom lub opłatom API.</Text>}</View>}
        </View>}
        {managedAI ? <View style={s.sectionCard}><Chip>NOTELY AI</Chip><Text style={s.h2}>Gotowe do nauki</Text><Text style={s.body}>Zaloguj się do Notely i dodaj materiały. AI jest połączone automatycznie — bez kluczy i pobierania modeli.</Text><Button text="Sprawdź połączenie" secondary icon="wifi-outline" onPress={testConnection} />{connectionResult && <Text accessibilityLiveRegion="polite" style={s.body}>{connectionResult.message}</Text>}</View> : <Button text="Zapisz ustawienia" icon="save-outline" onPress={saveSettings} />}
        <View style={s.sectionCard}><Text style={s.h2}>Twoje materiały</Text><Text style={s.body}>Lekcje, zdjęcia, podpisy i terminy powtórek zapisujemy na tym urządzeniu, osobno dla każdego konta. Możesz przechowywać lekcje bez AI. Synchronizacja między urządzeniami nie jest jeszcze dostępna.</Text><Text style={s.body}>AI przetwarza materiały po Twojej zgodzie na ekranie dodawania. Wynik zawsze sprawdź ze źródłem.</Text><Text style={s.small}>Notely · wersja testowa z lekcjami i wyborem AI</Text></View>
      </>}
    </ScrollView>}
    {!focusedStudy && <View style={s.bottomNav}>{([{ screen: 'home', icon: 'library-outline', label: 'Materiały' }, { screen: 'import', icon: 'add-circle-outline', label: 'Dodaj' }, { screen: 'settings', icon: 'options-outline', label: 'Ustawienia' }] as { screen: Screen; icon: Icon; label: string }[]).map(item => <Pressable key={item.screen} accessibilityRole="button" onPress={() => setScreen(item.screen)} style={s.navItem}><Ionicons name={item.icon} size={23} color={screen === item.screen ? C.green : C.muted} /><Text style={[s.navLabel, screen === item.screen && { color: C.green, fontWeight: '700' }]}>{item.label}</Text></Pressable>)}</View>}
  </View></KeyboardAvoidingView>
  {!!toast && <View style={s.toast}><Text style={{ color: C.white }}>{toast}</Text></View>}
  {busy && <View accessibilityViewIsModal style={[s.overlay, { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 1000 }]}><View style={s.modal}><ActivityIndicator size="large" color={C.green} /><Text style={s.h2}>{busy}</Text>{downloadProgress !== null ? <><Text style={s.body}>{Math.round(downloadProgress * 100)}% · pobieranie modelu</Text><View style={s.progress}><View style={[s.progressFill, { width: `${downloadProgress * 100}%` }]} /></View><Button text="Anuluj pobieranie" secondary onPress={() => cancelDownload().catch(() => {})} /></> : <><Text style={s.body}>To może potrwać chwilę.</Text>{picker.busy && <Button text="Anuluj dodawanie" secondary onPress={() => picker.cancel()} />}{ocrAbort.current && settings.provider !== 'local' && <Button text="Anuluj odczyt" secondary onPress={() => ocrAbort.current?.abort()} />}</>}</View></View>}
  <Modal transparent visible={!!error} animationType="fade" onRequestClose={() => setError(null)}><View style={s.overlay}><View style={s.modal}><Ionicons name="alert-circle-outline" size={38} color={C.orange} /><Text style={s.h2}>Potrzebna mała poprawka</Text><Text style={s.body}>{error}</Text><Button text="Rozumiem" onPress={() => setError(null)} /></View></View></Modal>
  <Modal transparent visible={!!deleteTarget} animationType="fade" onRequestClose={() => setDeleteTarget(null)}><View style={s.overlay}><View style={s.modal}><Ionicons name="trash-outline" size={36} color={C.orange} /><Text style={s.h2}>{deleteTarget?.kind === 'lesson' ? 'Usunąć te materiały?' : 'Usunąć tę notatkę?'}</Text><Text style={s.cardTitle}>{deleteTarget?.kind === 'lesson' ? lessons.find(l => l.id === deleteTarget.id)?.title : notes.find(n => n.id === deleteTarget?.id)?.title}</Text><Text style={s.body}>{deleteTarget?.kind === 'lesson' ? 'Usuniesz lekcję, jej zdjęcia i nagrania oraz wszystkie powiązane notatki, fiszki, quizy i postępy nauki. Pliki używane w innych lekcjach pozostaną.' : 'Usuniesz notatkę, fiszki, quiz i ich postępy. Zapisana lekcja i jej oryginalne pliki pozostaną.'} Tej operacji nie można cofnąć.</Text><Button text={deleteTarget?.kind === 'lesson' ? 'Usuń materiały' : 'Usuń notatkę'} icon="trash-outline" disabled={!storageWritable || storageError} onPress={() => deleteTarget && removeMaterial(deleteTarget)} /><Button secondary text="Zachowaj" onPress={() => setDeleteTarget(null)} /></View></View></Modal>
  <Modal transparent visible={!!sourceLines} animationType="slide" onRequestClose={() => setSourceLines(null)}><View style={s.overlay}><View style={s.modal}><Text style={s.h2}>Sprawdź w źródle</Text><ScrollView style={{ maxHeight: 360 }}>{sourceLines?.map(line => <View key={line} style={s.rawLine}><Text style={s.lineNumber}>{line}</Text><Text style={[s.body, { flex: 1 }]}>{evidenceNote?.lines[line - 1]}</Text></View>)}</ScrollView><Button text="Wróć do nauki" onPress={() => setSourceLines(null)} /></View></View></Modal>
  <Modal visible={!!original} animationType="slide" onRequestClose={() => setOriginal(null)}><SafeAreaView style={s.page}><View style={[s.content, { flex: 1 }]}><Text style={s.h2}>{original?.name}</Text>{original?.mime.startsWith('audio/') ? <AudioPlayerControls key={original.id} source={original} /> : original?.mime.startsWith('image/') ? <Image source={{ uri: original.uri }} resizeMode="contain" style={{ flex: 1, width: '100%' }} /> : <><Text style={s.body}>Otwórz oryginalny PDF w wybranej aplikacji, aby porównać go z odczytem.</Text><Button text="Otwórz / udostępnij PDF" secondary onPress={() => task('Otwieram PDF…', async () => { if (!original) return; if (Platform.OS === 'web') { window.open(original.uri, '_blank', 'noopener'); return; } if (!await Sharing.isAvailableAsync()) throw new Error('Udostępnianie plików jest niedostępne na tym urządzeniu.'); await Sharing.shareAsync(original.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Otwórz notatki PDF' }); })} /></>}<Button text="Zamknij oryginał" onPress={() => setOriginal(null)} /></View></SafeAreaView></Modal>
  </SafeAreaView>;
}
export default function App() { return <SafeAreaProvider><AccountBoundary>{account => <AppContent key={account.owner || 'guest'} owner={account.owner} accountLabel={account.label} onAccount={account.onAccount} />}</AccountBoundary></SafeAreaProvider>; }





