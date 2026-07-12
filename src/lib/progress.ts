import { LEVELS, LESSONS, getLesson, type LevelId } from '../data/curriculum'

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
  /** ISO timestamp of first saved activity. */
  startedAt: string | null
  /** ISO timestamp of most recent lesson attempt. */
  updatedAt: string | null
}

export type LevelStats = {
  levelId: LevelId
  title: string
  order: number
  done: number
  total: number
  percent: number
  avgBestScore: number
}

export type ProgressSummary = {
  done: number
  total: number
  percent: number
  attempts: number
  avgBestScore: number
  currentLevelId: LevelId
  currentLevelTitle: string
  nextLessonId: string
  nextLessonTitle: string
  lastPlayedAt: string | null
  startedAt: string | null
  levels: LevelStats[]
}

function empty(): ProgressState {
  return {
    lessons: {},
    freePlayMinutes: 0,
    startedAt: null,
    updatedAt: null,
  }
}

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as Partial<ProgressState>
    return {
      lessons: parsed.lessons ?? {},
      freePlayMinutes: parsed.freePlayMinutes ?? 0,
      startedAt: parsed.startedAt ?? null,
      updatedAt: parsed.updatedAt ?? null,
    }
  } catch {
    return empty()
  }
}

export function saveProgress(state: ProgressState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearProgress(): ProgressState {
  const next = empty()
  saveProgress(next)
  return next
}

export function recordAttempt(
  state: ProgressState,
  lessonId: string,
  score: number,
  passed: boolean,
): ProgressState {
  const now = new Date().toISOString()
  const prev = state.lessons[lessonId]
  const nextLesson: LessonProgress = {
    completed: Boolean(prev?.completed) || passed,
    bestScore: Math.max(prev?.bestScore ?? 0, score),
    attempts: (prev?.attempts ?? 0) + 1,
    lastPlayedAt: now,
  }
  const next: ProgressState = {
    ...state,
    startedAt: state.startedAt ?? now,
    updatedAt: now,
    lessons: { ...state.lessons, [lessonId]: nextLesson },
  }
  saveProgress(next)
  return next
}

export function recordFreePlayMinutes(state: ProgressState, minutes: number): ProgressState {
  if (minutes <= 0) return state
  const next: ProgressState = {
    ...state,
    freePlayMinutes: state.freePlayMinutes + minutes,
    updatedAt: new Date().toISOString(),
    startedAt: state.startedAt ?? new Date().toISOString(),
  }
  saveProgress(next)
  return next
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

export function getProgressSummary(state: ProgressState): ProgressSummary {
  const total = LESSONS.length
  const done = completedCount(state)
  const attempts = Object.values(state.lessons).reduce((sum, l) => sum + l.attempts, 0)
  const scored = Object.values(state.lessons).filter((l) => l.attempts > 0)
  const avgBestScore =
    scored.length === 0
      ? 0
      : scored.reduce((sum, l) => sum + l.bestScore, 0) / scored.length

  const levels: LevelStats[] = LEVELS.map((level) => {
    const lessons = LESSONS.filter((l) => l.levelId === level.id)
    const levelDone = lessons.filter((l) => state.lessons[l.id]?.completed).length
    const levelScored = lessons
      .map((l) => state.lessons[l.id])
      .filter((l): l is LessonProgress => Boolean(l && l.attempts > 0))
    const avg =
      levelScored.length === 0
        ? 0
        : levelScored.reduce((sum, l) => sum + l.bestScore, 0) / levelScored.length
    return {
      levelId: level.id,
      title: level.title,
      order: level.order,
      done: levelDone,
      total: lessons.length,
      percent: lessons.length === 0 ? 0 : Math.round((levelDone / lessons.length) * 100),
      avgBestScore: avg,
    }
  })

  const nextLessonId = firstIncompleteLessonId(state)
  const nextLesson = getLesson(nextLessonId)
  const currentLevel =
    LEVELS.find((l) => l.id === nextLesson?.levelId) ??
    LEVELS.find((l) => levelCompletion(state, l.id) < 1) ??
    LEVELS[LEVELS.length - 1]

  const lastPlayedAt =
    Object.values(state.lessons)
      .map((l) => l.lastPlayedAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? state.updatedAt

  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    attempts,
    avgBestScore,
    currentLevelId: currentLevel.id,
    currentLevelTitle: currentLevel.title,
    nextLessonId,
    nextLessonTitle: nextLesson?.title ?? 'Start',
    lastPlayedAt,
    startedAt: state.startedAt,
    levels,
  }
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'Not started yet'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'Not started yet'
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 14) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}
