export type Source = { id: string; uri: string; name: string; mime: string; bytes: number; caption?: string };
export type Transcription = { sourceMode?: 'pdf-notes'; title: string; subject: string; lines: string[]; uncertainties: { line: number; reason: string }[] };
export type Evidence = { sourceLines: number[] };
export type MapLayout = 'tree' | 'timeline' | 'process' | 'comparison' | 'concepts' | 'cycle' | 'cause-effect' | 'decision' | 'argument';
export type MapNode = { id: string; parentId: string; label: string; detail: string } & Evidence;
export type Materials = {
  summary: string;
  sections: ({ heading: string; body: string } & Evidence)[];
  flashcards: ({ question: string; answer: string } & Evidence)[];
  quiz: ({ question: string; options: string[]; correctIndex: number; explanation: string } & Evidence)[];
  mindMap: { center: string; branches: ({ label: string; children: string[] } & Evidence)[]; layout?: MapLayout; nodes?: MapNode[]; layoutReason?: string };
};
export type Review = { due: string; interval: number; stage?: 'learning' | 'review' | 'relearning'; step?: number; successes?: number; failures?: number; streak?: number; lapses?: number; lastReviewed?: string; lastGrade?: 'again' | 'good' };
export type Note = Transcription & { id: string; kind?: 'vocabulary'; createdAt: string; sources: Source[]; materials: Materials; lessonId?: string; reviews: Record<string, Review> };
export type Lesson = { id: string; title: string; subject: string; number: number; createdAt: string; sources: Source[]; noteId?: string; transcription?: Transcription; autoTitle?: boolean };
export type CloudProvider = 'openai' | 'gemini' | 'claude';
export type Provider = 'local' | CloudProvider;
export type Settings = { apiUrl: string; token: string; provider: Provider; models: Record<CloudProvider, string>; geminiAccess?: 'key' | 'google'; googleProject?: string };
