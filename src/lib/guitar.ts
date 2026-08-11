import { midiToPitch, pitchToMidi, type Pitch } from './music'

/** Standard tab numbering: 1 = high e, 6 = low E. */
export type GuitarString = 1 | 2 | 3 | 4 | 5 | 6

export type FretPosition = {
  string: GuitarString
  fret: number
}

/** Open-string pitches in standard tuning, indexed by tab string number. */
export const OPEN_STRING_PITCHES: Record<GuitarString, Pitch> = {
  6: 'E2',
  5: 'A2',
  4: 'D3',
  3: 'G3',
  2: 'B3',
  1: 'E4',
}

export const OPEN_STRING_LABELS: Record<GuitarString, string> = {
  6: 'E (low)',
  5: 'A',
  4: 'D',
  3: 'G',
  2: 'B',
  1: 'e (high)',
}

export const GUITAR_STRINGS: GuitarString[] = [6, 5, 4, 3, 2, 1]

export const DEFAULT_FRET_COUNT = 5

export function fretPositionKey(pos: FretPosition): string {
  return `${pos.string}:${pos.fret}`
}

export function pitchAtFret(string: GuitarString, fret: number): Pitch {
  const openMidi = pitchToMidi(OPEN_STRING_PITCHES[string])
  return midiToPitch(openMidi + fret)
}

export function positionsForPitch(pitch: Pitch, maxFret = DEFAULT_FRET_COUNT): FretPosition[] {
  const target = pitchToMidi(pitch)
  const found: FretPosition[] = []
  for (const string of GUITAR_STRINGS) {
    const open = pitchToMidi(OPEN_STRING_PITCHES[string])
    const fret = target - open
    if (fret >= 0 && fret <= maxFret) {
      found.push({ string, fret })
    }
  }
  return found
}

/** Preferred fretting: lowest string number that can play the pitch within maxFret, else first match. */
export function preferredFret(pitch: Pitch, maxFret = DEFAULT_FRET_COUNT): FretPosition | null {
  const options = positionsForPitch(pitch, maxFret)
  if (options.length === 0) return null
  // Prefer lower frets, then thicker strings for stability in beginners.
  return [...options].sort((a, b) => a.fret - b.fret || b.string - a.string)[0]
}

export function flattenFingerings(fingerings: FretPosition[] | undefined): FretPosition[] {
  return fingerings ?? []
}

/** Common open chord shapes (string → fret). -1 = muted. */
export const OPEN_CHORDS: Record<string, Record<GuitarString, number>> = {
  Em: { 6: 0, 5: 2, 4: 2, 3: 0, 2: 0, 1: 0 },
  Am: { 6: -1, 5: 0, 4: 2, 3: 2, 2: 1, 1: 0 },
  C: { 6: -1, 5: 3, 4: 2, 3: 0, 2: 1, 1: 0 },
  G: { 6: 3, 5: 2, 4: 0, 3: 0, 2: 0, 1: 3 },
  D: { 6: -1, 5: -1, 4: 0, 3: 2, 2: 3, 1: 2 },
}

export function chordFingerings(name: keyof typeof OPEN_CHORDS): FretPosition[] {
  const shape = OPEN_CHORDS[name]
  const positions: FretPosition[] = []
  for (const string of GUITAR_STRINGS) {
    const fret = shape[string]
    if (fret >= 0) positions.push({ string, fret })
  }
  return positions
}

export function chordPitches(name: keyof typeof OPEN_CHORDS): Pitch[] {
  return chordFingerings(name).map((pos) => pitchAtFret(pos.string, pos.fret))
}

/** Cents off from nearest equal-tempered pitch. Negative = flat. */
export function centsFromPitch(freqHz: number, pitch: Pitch): number {
  const target = pitchToMidi(pitch)
  const midi = 69 + 12 * Math.log2(freqHz / 440)
  return (midi - target) * 100
}
