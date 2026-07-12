export type NoteName =
  | 'C'
  | 'C#'
  | 'D'
  | 'D#'
  | 'E'
  | 'F'
  | 'F#'
  | 'G'
  | 'G#'
  | 'A'
  | 'A#'
  | 'B'

export type Pitch = `${NoteName}${number}`

export const NOTE_ORDER: NoteName[] = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
]

export const WHITE_NOTES: NoteName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

export function isBlackKey(note: NoteName): boolean {
  return note.includes('#')
}

export function noteLabel(note: NoteName): string {
  return note.replace('#', '♯')
}

/** MIDI note number → frequency in Hz (A4 = 440). */
export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

export function pitchToMidi(pitch: Pitch): number {
  const match = pitch.match(/^([A-G]#?)(-?\d+)$/)
  if (!match) throw new Error(`Invalid pitch: ${pitch}`)
  const [, note, octaveStr] = match
  const octave = Number(octaveStr)
  const index = NOTE_ORDER.indexOf(note as NoteName)
  return (octave + 1) * 12 + index
}

export function midiToPitch(midi: number): Pitch {
  const note = NOTE_ORDER[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${note}${octave}` as Pitch
}

export function pitchToFreq(pitch: Pitch): number {
  return midiToFreq(pitchToMidi(pitch))
}

export function buildRange(start: Pitch, end: Pitch): Pitch[] {
  const from = pitchToMidi(start)
  const to = pitchToMidi(end)
  const pitches: Pitch[] = []
  for (let midi = from; midi <= to; midi += 1) {
    pitches.push(midiToPitch(midi))
  }
  return pitches
}

export function parsePitch(value: string): Pitch | null {
  const match = value.match(/^([A-G]#?)(\d+)$/)
  if (!match) return null
  const note = match[1] as NoteName
  if (!NOTE_ORDER.includes(note)) return null
  return `${note}${match[2]}` as Pitch
}

/** Computer-keyboard map for one octave starting at C4. */
export const KEYBOARD_MAP: Record<string, Pitch> = {
  a: 'C4',
  w: 'C#4',
  s: 'D4',
  e: 'D#4',
  d: 'E4',
  f: 'F4',
  t: 'F#4',
  g: 'G4',
  y: 'G#4',
  h: 'A4',
  u: 'A#4',
  j: 'B4',
  k: 'C5',
  o: 'C#5',
  l: 'D5',
  p: 'D#5',
  ';': 'E5',
}
