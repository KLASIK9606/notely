import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import type { TeacherAudio } from './api';

export type VoiceFile = { uri: string; dispose: () => void };
export function storeTeacherAudio(audio: TeacherAudio): VoiceFile {
  if (!['audio/wav', 'audio/mpeg'].includes(audio.mime) || !audio.data || audio.data.length > 8500000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio.data)) throw new Error('Nieprawidłowy plik głosu AI.');
  if (Platform.OS === 'web') {
    const bytes = Uint8Array.from(atob(audio.data), c => c.charCodeAt(0));
    const uri = URL.createObjectURL(new Blob([bytes], { type: audio.mime }));
    return { uri, dispose: () => URL.revokeObjectURL(uri) };
  }
  const file = new File(Paths.cache, `teacher-${Date.now()}-${Math.random().toString(36).slice(2)}.${audio.mime === 'audio/wav' ? 'wav' : 'mp3'}`);
  file.create();
  try { file.write(audio.data, { encoding: 'base64' }); }
  catch (e) { if (file.exists) file.delete(); throw e; }
  return { uri: file.uri, dispose: () => { if (file.exists) file.delete(); } };
}
