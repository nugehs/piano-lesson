import { LESSONS } from '../data/curriculum'

const STORAGE_KEY = 'keypath-progress-v1'

export type LessonProgress = {
  completed: boolean
  bestScore: number
  attempts: number
  lastPlayedAt: string
}

export type ProgressState = {
  lessons: Record<string, LessonProgress>
  freePlayMinutes: number
}

function empty(): ProgressState {
  return { lessons: {}, freePlayMinutes: 0 }
}

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as ProgressState
    return {
      lessons: parsed.lessons ?? {},
      freePlayMinutes: parsed.freePlayMinutes ?? 0,
    }
  } catch {
    return empty()
  }
}

export function saveProgress(state: ProgressState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function recordAttempt(
  state: ProgressState,
  lessonId: string,
  score: number,
  passed: boolean,
): ProgressState {
  const prev = state.lessons[lessonId]
  const next: LessonProgress = {
    completed: Boolean(prev?.completed) || passed,
    bestScore: Math.max(prev?.bestScore ?? 0, score),
    attempts: (prev?.attempts ?? 0) + 1,
    lastPlayedAt: new Date().toISOString(),
  }
  return {
    ...state,
    lessons: { ...state.lessons, [lessonId]: next },
  }
}

export function completedCount(state: ProgressState): number {
  return Object.values(state.lessons).filter((l) => l.completed).length
}

export function levelCompletion(state: ProgressState, levelId: string): number {
  const lessons = LESSONS.filter((l) => l.levelId === levelId)
  if (lessons.length === 0) return 0
  const done = lessons.filter((l) => state.lessons[l.id]?.completed).length
  return done / lessons.length
}

export function firstIncompleteLessonId(state: ProgressState): string {
  const found = LESSONS.find((l) => !state.lessons[l.id]?.completed)
  return found?.id ?? LESSONS[0].id
}
