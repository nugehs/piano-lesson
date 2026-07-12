import type { NoteName, Pitch } from '../lib/music'
import { isBlackKey, noteLabel } from '../lib/music'

export type Clef = 'treble' | 'bass'

/** Diatonic letter index C=0 … B=6 */
const LETTER_INDEX: Record<string, number> = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
}

/** Natural note name ignoring sharp (C# → C). */
export function naturalLetter(pitch: Pitch): NoteName {
  const note = pitch.replace(/\d+$/, '') as NoteName
  return note.replace('#', '') as NoteName
}

export function pitchOctave(pitch: Pitch): number {
  return Number(pitch.match(/\d+$/)?.[0] ?? 4)
}

/** Staff steps relative to middle C (C4 = 0). One step = one line/space. */
export function pitchToStaffStep(pitch: Pitch): number {
  const letter = naturalLetter(pitch)
  const octave = pitchOctave(pitch)
  return LETTER_INDEX[letter] + (octave - 4) * 7
}

/**
 * Y offset in staff-spaces from the bottom staff line.
 * Treble bottom line = E4 (step 2). Bass bottom line = G2 (step -11).
 */
export function stepToStaffY(step: number, clef: Clef, lineGap: number): number {
  const bottomStep = clef === 'treble' ? 2 : -11
  // Higher musical pitch → lower Y
  return (bottomStep - step) * (lineGap / 2)
}

export function needsAccidental(pitch: Pitch): boolean {
  return isBlackKey(pitch.replace(/\d+$/, '') as NoteName)
}

export function accidentalLabel(pitch: Pitch): string {
  return needsAccidental(pitch) ? '♯' : ''
}

export function displayNoteName(pitch: Pitch): string {
  const letter = naturalLetter(pitch)
  const acc = needsAccidental(pitch) ? '♯' : ''
  return `${noteLabel(letter.replace('#', '') as NoteName).replace('♯', '')}${acc}`
}
