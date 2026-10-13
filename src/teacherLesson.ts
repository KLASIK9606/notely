/** A lesson advances only after completed speech, and resumes its place after questions. */
export class TeacherLesson {
  index = 0;
  running = false;
  finished = false;
  private resumeAfterQuestion = false;
  private readonly count: number;
  constructor(count: number) { this.count = count; }
  get willResume() { return this.resumeAfterQuestion && !this.finished; }
  start() { this.index = 0; this.finished = false; this.running = true; this.resumeAfterQuestion = false; return this.index; }
  pause() { this.running = false; this.resumeAfterQuestion = false; }
  resume() { if (!this.finished) this.running = true; return this.index; }
  question() { this.resumeAfterQuestion = (this.running || this.resumeAfterQuestion) && !this.finished; this.running = false; }
  answerDone(continueLesson = true) {
    if (!continueLesson) return false;
    const resume = this.resumeAfterQuestion && !this.finished;
    this.resumeAfterQuestion = false; this.running = resume;
    return resume;
  }
  topicDone(): number | null {
    if (!this.running) return null;
    if (this.index + 1 < this.count) return ++this.index;
    this.finished = true; this.running = false; return null;
  }
}

export function teacherAnswer(reply: { reply: string; continueLesson?: boolean }, willResume: boolean) {
  return reply.reply.trim() + (willResume && reply.continueLesson !== false ? '\n\nNo to wracamy do naszej prezentacji.' : '');
}

export function questionSilence(duration: number, metering: number | undefined, lastSound: { value: number | null }) {
  if (metering === undefined || !Number.isFinite(metering)) return false;
  if (metering > -42) lastSound.value = duration;
  return duration >= 2500 && lastSound.value !== null && duration - lastSound.value >= 2200;
}
