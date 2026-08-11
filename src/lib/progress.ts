import { LEVELS, LESSONS, getLesson, type Level, type LevelId, type Lesson } from '../data/curriculum'
import {
  GUITAR_LESSONS,
  getGuitarLesson,
  guitarLevelsAsShared,
} from '../data/guitarCurriculum'
import type { Instrument } from './instrument'

const STORAGE_KEY_V1 = 'keypath-progress-v1'
const STORAGE_KEY = 'keypath-progress-v2'
const INSTRUMENT_KEY = 'keypath-instrument-v1'

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

export type CatalogProgressBundle = {
  piano: ProgressState
  guitar: ProgressState
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

function emptyBundle(): CatalogProgressBundle {
  return { piano: empty(), guitar: empty() }
}

function lessonsFor(instrument: Instrument): Lesson[] {
  return instrument === 'guitar' ? GUITAR_LESSONS : LESSONS
}

function levelsFor(instrument: Instrument): Level[] {
  return instrument === 'guitar' ? guitarLevelsAsShared() : LEVELS
}

function getLessonFor(instrument: Instrument, id: string): Lesson | undefined {
  return instrument === 'guitar' ? getGuitarLesson(id) : getLesson(id)
}

function parseState(raw: Partial<ProgressState> | undefined): ProgressState {
  if (!raw) return empty()
  return {
    lessons: raw.lessons ?? {},
    freePlayMinutes: raw.freePlayMinutes ?? 0,
    startedAt: raw.startedAt ?? null,
    updatedAt: raw.updatedAt ?? null,
  }
}

export function loadInstrument(): Instrument {
  try {
    const raw = localStorage.getItem(INSTRUMENT_KEY)
    if (raw === 'guitar' || raw === 'piano') return raw
  } catch {
    /* ignore */
  }
  return 'piano'
}

export function saveInstrument(instrument: Instrument): void {
  localStorage.setItem(INSTRUMENT_KEY, instrument)
}

export function loadProgressBundle(): CatalogProgressBundle {
  try {
    const v2 = localStorage.getItem(STORAGE_KEY)
    if (v2) {
      const parsed = JSON.parse(v2) as Partial<CatalogProgressBundle>
      return {
        piano: parseState(parsed.piano),
        guitar: parseState(parsed.guitar),
      }
    }
    // Migrate piano-only v1 into the piano bucket.
    const v1 = localStorage.getItem(STORAGE_KEY_V1)
    if (v1) {
      const piano = parseState(JSON.parse(v1) as Partial<ProgressState>)
      const bundle = { piano, guitar: empty() }
      saveProgressBundle(bundle)
      return bundle
    }
  } catch {
    /* ignore */
  }
  return emptyBundle()
}

export function saveProgressBundle(bundle: CatalogProgressBundle): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle))
}

export function loadProgress(instrument: Instrument = loadInstrument()): ProgressState {
  return loadProgressBundle()[instrument]
}

export function saveProgress(instrument: Instrument, state: ProgressState): void {
  const bundle = loadProgressBundle()
  bundle[instrument] = state
  saveProgressBundle(bundle)
}

export function clearProgress(instrument: Instrument): ProgressState {
  const next = empty()
  saveProgress(instrument, next)
  return next
}

export function recordAttempt(
  instrument: Instrument,
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
  saveProgress(instrument, next)
  return next
}

export function recordFreePlayMinutes(
  instrument: Instrument,
  state: ProgressState,
  minutes: number,
): ProgressState {
  if (minutes <= 0) return state
  const next: ProgressState = {
    ...state,
    freePlayMinutes: state.freePlayMinutes + minutes,
    updatedAt: new Date().toISOString(),
    startedAt: state.startedAt ?? new Date().toISOString(),
  }
  saveProgress(instrument, next)
  return next
}

export function completedCount(state: ProgressState, instrument: Instrument = 'piano'): number {
  const ids = new Set(lessonsFor(instrument).map((l) => l.id))
  return Object.entries(state.lessons).filter(([id, l]) => ids.has(id) && l.completed).length
}

export function levelCompletion(
  state: ProgressState,
  levelId: string,
  instrument: Instrument = 'piano',
): number {
  const lessons = lessonsFor(instrument).filter((l) => l.levelId === levelId)
  if (lessons.length === 0) return 0
  const done = lessons.filter((l) => state.lessons[l.id]?.completed).length
  return done / lessons.length
}

export function firstIncompleteLessonId(
  state: ProgressState,
  instrument: Instrument = 'piano',
): string {
  const catalog = lessonsFor(instrument)
  const found = catalog.find((l) => !state.lessons[l.id]?.completed)
  return found?.id ?? catalog[0]?.id ?? ''
}

export function getProgressSummary(
  state: ProgressState,
  instrument: Instrument = 'piano',
): ProgressSummary {
  const catalog = lessonsFor(instrument)
  const levels = levelsFor(instrument)
  const total = catalog.length
  const done = completedCount(state, instrument)
  const attempts = Object.values(state.lessons).reduce((sum, l) => sum + l.attempts, 0)
  const scored = Object.values(state.lessons).filter((l) => l.attempts > 0)
  const avgBestScore =
    scored.length === 0
      ? 0
      : scored.reduce((sum, l) => sum + l.bestScore, 0) / scored.length

  const levelStats: LevelStats[] = levels.map((level) => {
    const lessons = catalog.filter((l) => l.levelId === level.id)
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

  const nextLessonId = firstIncompleteLessonId(state, instrument)
  const nextLesson = getLessonFor(instrument, nextLessonId)
  const currentLevel =
    levels.find((l) => l.id === nextLesson?.levelId) ??
    levels.find((l) => levelCompletion(state, l.id, instrument) < 1) ??
    levels[levels.length - 1]

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
    levels: levelStats,
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
