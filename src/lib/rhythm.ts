/** Duration in quarter-note units. 1 = quarter, 0.5 = eighth, 2 = half. */
export type BeatDuration = number

export type RhythmEvent = {
  /** Beat index from phrase start (0-based quarters). */
  beat: number
  duration: BeatDuration
}

export type TimingGrade = 'perfect' | 'early' | 'late' | 'miss'

export type TimingResult = {
  grade: TimingGrade
  /** Signed error in ms (negative = early). */
  errorMs: number
  /** 0–1 timing quality for this hit. */
  score: number
}

/** Default practice tempo. */
export const DEFAULT_BPM = 72

/** How far from the expected beat still counts (ms). */
export const TIMING_WINDOW_MS = 220

export function beatToMs(beat: number, bpm: number): number {
  return (beat * 60_000) / bpm
}

export function msToBeat(ms: number, bpm: number): number {
  return (ms * bpm) / 60_000
}

export function gradeTiming(expectedMs: number, actualMs: number, windowMs = TIMING_WINDOW_MS): TimingResult {
  const errorMs = actualMs - expectedMs
  const abs = Math.abs(errorMs)

  if (abs > windowMs) {
    return { grade: 'miss', errorMs, score: 0 }
  }

  // Cosine falloff inside the window — center is 1, edges approach 0.
  const score = Math.cos((abs / windowMs) * (Math.PI / 2))

  if (abs <= 45) return { grade: 'perfect', errorMs, score }
  if (errorMs < 0) return { grade: 'early', errorMs, score }
  return { grade: 'late', errorMs, score }
}

/**
 * Build expected onset times (ms from practice start) for a list of beat positions.
 * If durations are omitted, assumes equal spacing of 1 beat each.
 */
export function expectedOnsets(
  count: number,
  bpm: number,
  rhythm?: RhythmEvent[],
): number[] {
  if (rhythm && rhythm.length >= count) {
    return rhythm.slice(0, count).map((event) => beatToMs(event.beat, bpm))
  }
  return Array.from({ length: count }, (_, i) => beatToMs(i, bpm))
}

/** Even quarter notes starting at beat 0. */
export function quarters(count: number): RhythmEvent[] {
  return Array.from({ length: count }, (_, i) => ({ beat: i, duration: 1 }))
}

/** Pattern helper: list of durations in beats, sequential. */
export function fromDurations(durations: BeatDuration[]): RhythmEvent[] {
  let beat = 0
  return durations.map((duration) => {
    const event = { beat, duration }
    beat += duration
    return event
  })
}

export function combineScores(pitchScore: number, timingScore: number, weightTiming = 0.4): number {
  return pitchScore * (1 - weightTiming) + timingScore * weightTiming
}
