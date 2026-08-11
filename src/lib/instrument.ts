export type Instrument = 'piano' | 'guitar'

export const INSTRUMENTS: Instrument[] = ['piano', 'guitar']

export function instrumentLabel(instrument: Instrument): string {
  return instrument === 'piano' ? 'Piano' : 'Guitar'
}

export function instrumentTagline(instrument: Instrument): string {
  if (instrument === 'guitar') {
    return 'Learn on your guitar with the mic — fretboard guides, open chords, and a path from first strings to songs.'
  }
  return 'Learn on your Yamaha over USB MIDI — staff notation, metronome rhythm scoring, and a path from first notes to fluent playing.'
}
