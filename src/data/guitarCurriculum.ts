import type { Lesson, Level, LevelId } from './curriculum'
import { chordFingerings, chordPitches, type FretPosition } from '../lib/guitar'
import { fromDurations, quarters } from '../lib/rhythm'
import type { Pitch } from '../lib/music'

export type GuitarLevelId = 'foundations' | 'chords' | 'repertoire'

export type GuitarLevel = {
  id: GuitarLevelId
  title: string
  subtitle: string
  order: number
}

export const GUITAR_LEVELS: GuitarLevel[] = [
  {
    id: 'foundations',
    title: 'Foundations',
    subtitle: 'Strings, frets, and open notes',
    order: 1,
  },
  {
    id: 'chords',
    title: 'Open chords',
    subtitle: 'Shapes that unlock songs',
    order: 2,
  },
  {
    id: 'repertoire',
    title: 'Repertoire',
    subtitle: 'Simple melodies on the neck',
    order: 3,
  },
]

function fingering(string: FretPosition['string'], fret: number): FretPosition[] {
  return [{ string, fret }]
}

function chordLesson(
  id: string,
  name: 'Em' | 'Am' | 'C' | 'G' | 'D',
  title: string,
  summary: string,
  teach: string,
): Lesson {
  return {
    id,
    levelId: 'chords',
    title,
    summary,
    kind: 'sequence',
    teach,
    targets: [chordPitches(name)],
    fingerings: [chordFingerings(name)],
    passScore: 0.65,
  }
}

export const GUITAR_LESSONS: Lesson[] = [
  {
    id: 'g-string-names',
    levelId: 'foundations',
    title: 'Name the Six Strings',
    summary: 'Low E to high e — the guitar’s open tuning.',
    kind: 'sequence',
    teach:
      'Standard tuning from thickest to thinnest: E A D G B e. Pluck each open string on your guitar. Enable the mic so Keypath can hear you, or tap frets to practice silently.',
    targets: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    fingerings: [
      fingering(6, 0),
      fingering(5, 0),
      fingering(4, 0),
      fingering(3, 0),
      fingering(2, 0),
      fingering(1, 0),
    ],
  },
  {
    id: 'g-find-low-e',
    levelId: 'foundations',
    title: 'Find Low E',
    summary: 'The thickest string — your bass home.',
    kind: 'find',
    teach:
      'Pluck the open 6th string (thickest). Watch the fretboard highlight, then play until the mic (or a fret click) matches E2.',
    targets: ['E2'],
    fingerings: [fingering(6, 0)],
  },
  {
    id: 'g-open-a-d',
    levelId: 'foundations',
    title: 'Open A and D',
    summary: 'Two more open strings, thick side.',
    kind: 'sequence',
    teach: 'Play open A (5th string), then open D (4th). Steady pluck — no fretting yet.',
    targets: ['A2', 'D3'],
    fingerings: [fingering(5, 0), fingering(4, 0)],
  },
  {
    id: 'g-first-fret-e',
    levelId: 'foundations',
    title: 'First Fret on High e',
    summary: 'Press behind the fret, then pluck.',
    kind: 'sequence',
    teach:
      'On the thinnest string, press just behind the 1st fret (F4), then play open e (E4). Firm fingertip, thumb behind the neck.',
    targets: ['F4', 'E4'],
    fingerings: [fingering(1, 1), fingering(1, 0)],
  },
  {
    id: 'g-g-string-climb',
    levelId: 'foundations',
    title: 'Climb Across Strings',
    summary: 'Open G, fretted A, then open B.',
    kind: 'sequence',
    teach:
      'Play open G (3rd string), then A on the 2nd fret of G, then open B (2nd string). Feel how neighboring strings sit under your fingers.',
    targets: ['G3', 'A3', 'B3'],
    fingerings: [fingering(3, 0), fingering(3, 2), fingering(2, 0)],
  },
  chordLesson(
    'g-em',
    'Em',
    'E Minor Shape',
    'Two fingers, big sound.',
    'Form Em: 2nd fret on A and D strings, other strings open. Strum all six. The mic listens for chord tones; click frets to rehearse the shape silently.',
  ),
  chordLesson(
    'g-am',
    'Am',
    'A Minor Shape',
    'The relative of C.',
    'Form Am: skip low E, open A, then 2–2–1–0 on D G B e. Strum from the A string down.',
  ),
  chordLesson(
    'g-c',
    'C',
    'C Major Shape',
    'The classic open C.',
    'Form C: 3rd fret on A, 2nd on D, open G, 1st on B, open e. Mute the low E. Strum five strings.',
  ),
  chordLesson(
    'g-g',
    'G',
    'G Major Shape',
    'Full six-string ring.',
    'Form G: 3rd fret low E, 2nd on A, open D G B, 3rd on high e. Stretch gently — thumb stays behind the neck.',
  ),
  chordLesson(
    'g-d',
    'D',
    'D Major Shape',
    'Triangle on the top four.',
    'Form D: mute E and A, open D, then 2–3–2 on G B e. Strum from the D string.',
  ),
  {
    id: 'g-em-am',
    levelId: 'chords',
    title: 'Em → Am Change',
    summary: 'Two chords, one song move.',
    kind: 'sequence',
    teach: 'Play Em, then Am. Lift and plant cleanly — no rush. The mic grades chord pitches.',
    targets: [chordPitches('Em'), chordPitches('Am')],
    fingerings: [chordFingerings('Em'), chordFingerings('Am')],
    passScore: 0.65,
  },
  {
    id: 'g-twinkle',
    levelId: 'repertoire',
    title: 'Twinkle on High Strings',
    summary: 'A melody you know, on frets.',
    kind: 'play-along',
    teach:
      'Play with the metronome on the top strings: open e, e, open B, B, C♯ (2nd fret on B), C♯, B. Follow the highlighted frets.',
    targets: ['E4', 'E4', 'B3', 'B3', 'C#4', 'C#4', 'B3'] as Pitch[],
    fingerings: [
      fingering(1, 0),
      fingering(1, 0),
      fingering(2, 0),
      fingering(2, 0),
      fingering(2, 2),
      fingering(2, 2),
      fingering(2, 0),
    ],
    bpm: 72,
    gradeRhythm: true,
    rhythm: quarters(7),
    countIn: 4,
    passScore: 0.7,
  },
  {
    id: 'g-ode-phrase',
    levelId: 'repertoire',
    title: 'Ode Phrase on B & G',
    summary: 'A short classical hook on two strings.',
    kind: 'play-along',
    teach:
      'Mostly on the B string: open B, B, 1st fret (C), 3rd fret (D), D, C, B, then A on the 2nd fret of G. Follow the guides with the click.',
    targets: ['B3', 'B3', 'C4', 'D4', 'D4', 'C4', 'B3', 'A3'],
    fingerings: [
      fingering(2, 0),
      fingering(2, 0),
      fingering(2, 1),
      fingering(2, 3),
      fingering(2, 3),
      fingering(2, 1),
      fingering(2, 0),
      fingering(3, 2),
    ],
    bpm: 70,
    gradeRhythm: true,
    rhythm: fromDurations([1, 1, 1, 1, 1, 1, 1, 2]),
    countIn: 4,
    passScore: 0.7,
  },
]

export function guitarLessonsForLevel(levelId: GuitarLevelId | LevelId): Lesson[] {
  return GUITAR_LESSONS.filter((l) => l.levelId === levelId)
}

export function getGuitarLesson(id: string): Lesson | undefined {
  return GUITAR_LESSONS.find((l) => l.id === id)
}

export function nextGuitarLesson(id: string): Lesson | undefined {
  const index = GUITAR_LESSONS.findIndex((l) => l.id === id)
  if (index < 0 || index >= GUITAR_LESSONS.length - 1) return undefined
  return GUITAR_LESSONS[index + 1]
}

export function guitarLevelsAsShared(): Level[] {
  return GUITAR_LEVELS.map((level) => ({
    id: level.id,
    title: level.title,
    subtitle: level.subtitle,
    order: level.order,
  }))
}
