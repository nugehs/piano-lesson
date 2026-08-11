import type { Pitch } from '../lib/music'
import type { FretPosition } from '../lib/guitar'
import { fromDurations, quarters, type RhythmEvent } from '../lib/rhythm'
import type { Clef } from '../lib/staff'

export type LevelId =
  | 'foundations'
  | 'reading'
  | 'technique'
  | 'harmony'
  | 'repertoire'
  | 'advanced'
  | 'chords'

export type LessonKind = 'learn' | 'find' | 'sequence' | 'play-along'

/** One expected step: a single note, or several notes played together as a chord. */
export type LessonStep = Pitch | Pitch[]

export type Lesson = {
  id: string
  levelId: LevelId
  title: string
  summary: string
  kind: LessonKind
  /** Teaching copy shown before/during the exercise. */
  teach: string
  /** Notes to highlight or expect, in order for sequence/play-along. Arrays are chords. */
  targets: LessonStep[]
  /** Optional demo melody (same as targets unless overridden). */
  demo?: LessonStep[]
  /**
   * Preferred fretting for each target step (guitar).
   * Parallel to targets — one FretPosition[] per step.
   */
  fingerings?: FretPosition[][]
  /** Pass threshold for find/sequence (0–1). */
  passScore?: number
  /** Staff clef for notation. */
  clef?: Clef
  /** Practice tempo. */
  bpm?: number
  /** When true, score timing against metronome (play-along / some sequences). */
  gradeRhythm?: boolean
  /** Rhythmic onsets for targets. Defaults to even quarters. */
  rhythm?: RhythmEvent[]
  /** Count-in beats before first note when rhythm is graded. */
  countIn?: number
}

export type Level = {
  id: LevelId
  title: string
  subtitle: string
  order: number
}

export const LEVELS: Level[] = [
  {
    id: 'foundations',
    title: 'Foundations',
    subtitle: 'Keys, names, and middle C',
    order: 1,
  },
  {
    id: 'reading',
    title: 'Reading',
    subtitle: 'See a note, play the note',
    order: 2,
  },
  {
    id: 'technique',
    title: 'Technique',
    subtitle: 'Scales, fingers, and flow',
    order: 3,
  },
  {
    id: 'harmony',
    title: 'Harmony',
    subtitle: 'Chords that move songs',
    order: 4,
  },
  {
    id: 'repertoire',
    title: 'Repertoire',
    subtitle: 'Real melodies with rhythm',
    order: 5,
  },
  {
    id: 'advanced',
    title: 'Advanced',
    subtitle: 'Inversions, sevenths, blues',
    order: 6,
  },
]

export const LESSONS: Lesson[] = [
  // Foundations
  {
    id: 'f-middle-c',
    levelId: 'foundations',
    title: 'Find Middle C',
    summary: 'The home base of the keyboard.',
    kind: 'find',
    teach:
      'Middle C sits near the center of the piano — look for the white key just left of a group of two black keys. Play C4 on your Yamaha or the on-screen keys.',
    targets: ['C4'],
    clef: 'treble',
  },
  {
    id: 'f-white-keys',
    levelId: 'foundations',
    title: 'Name the White Keys',
    summary: 'C D E F G A B — then it repeats.',
    kind: 'sequence',
    teach: 'Play each white key from C4 up to B4. Say the letter name as you play.',
    targets: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'],
    clef: 'treble',
  },
  {
    id: 'f-black-keys',
    levelId: 'foundations',
    title: 'Black Keys & Sharps',
    summary: 'Sharps raise a note by a half step.',
    kind: 'sequence',
    teach: 'Black keys are the sharps between whites. Play C♯, D♯, F♯, G♯, A♯ in the fourth octave.',
    targets: ['C#4', 'D#4', 'F#4', 'G#4', 'A#4'],
    clef: 'treble',
  },
  {
    id: 'f-octaves',
    levelId: 'foundations',
    title: 'Same Note, Higher Octave',
    summary: 'C4 and C5 share a name, different height.',
    kind: 'sequence',
    teach: 'Play middle C, then the C one octave above. Hear how the color stays, the pitch rises.',
    targets: ['C4', 'C5'],
    clef: 'treble',
  },

  // Reading
  {
    id: 'r-treble-cde',
    levelId: 'reading',
    title: 'Treble Landmarks: C D E',
    summary: 'Three notes you will see constantly.',
    kind: 'sequence',
    teach: 'Read the staff, then play. Middle C is on a ledger line; D is the space below the staff; E is the bottom line.',
    targets: ['C4', 'D4', 'E4'],
    clef: 'treble',
  },
  {
    id: 'r-find-g',
    levelId: 'reading',
    title: 'Spot G',
    summary: 'G sits on the second line of the treble staff.',
    kind: 'find',
    teach: 'Find G4 on the staff — second line up — then play it on your piano.',
    targets: ['G4'],
    clef: 'treble',
  },
  {
    id: 'r-step-skip',
    levelId: 'reading',
    title: 'Steps and Skips',
    summary: 'Move by neighbor, then jump a third.',
    kind: 'sequence',
    teach: 'Play C–D (a step), then C–E (a skip/third). Watch the staff jump with your hand.',
    targets: ['C4', 'D4', 'C4', 'E4'],
    clef: 'treble',
  },
  {
    id: 'r-five-note',
    levelId: 'reading',
    title: 'Five-Finger Position',
    summary: 'One finger per key: C through G.',
    kind: 'sequence',
    teach: 'Rest fingers 1–5 on C D E F G. Play up and back down. Follow the notes on the staff.',
    targets: ['C4', 'D4', 'E4', 'F4', 'G4', 'F4', 'E4', 'D4', 'C4'],
    clef: 'treble',
    bpm: 80,
    gradeRhythm: true,
    rhythm: quarters(9),
    countIn: 4,
  },

  // Technique
  {
    id: 't-c-scale',
    levelId: 'technique',
    title: 'C Major Scale',
    summary: 'The white-key highway.',
    kind: 'sequence',
    teach: 'Play C major ascending with the metronome. Aim for even quarters.',
    targets: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
    clef: 'treble',
    bpm: 72,
    gradeRhythm: true,
    rhythm: quarters(8),
    countIn: 4,
    passScore: 0.8,
  },
  {
    id: 't-c-scale-down',
    levelId: 'technique',
    title: 'C Major Descending',
    summary: 'Control on the way down.',
    kind: 'sequence',
    teach: 'Descend the C major scale in time with the click.',
    targets: ['C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4'],
    clef: 'treble',
    bpm: 72,
    gradeRhythm: true,
    rhythm: quarters(8),
    countIn: 4,
    passScore: 0.8,
  },
  {
    id: 't-g-scale',
    levelId: 'technique',
    title: 'G Major Scale',
    summary: 'One sharp: F♯.',
    kind: 'sequence',
    teach: 'G major uses F♯. Play in time — watch the sharp on the staff.',
    targets: ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5'],
    clef: 'treble',
    bpm: 70,
    gradeRhythm: true,
    rhythm: quarters(8),
    countIn: 4,
    passScore: 0.8,
  },
  {
    id: 't-arpeggio-c',
    levelId: 'technique',
    title: 'C Major Arpeggio',
    summary: 'Broken chord, open hand.',
    kind: 'sequence',
    teach: 'Play C–E–G–C as even quarters. Stretch gently.',
    targets: ['C4', 'E4', 'G4', 'C5'],
    clef: 'treble',
    bpm: 66,
    gradeRhythm: true,
    rhythm: quarters(4),
    countIn: 4,
  },

  // Harmony
  {
    id: 'h-c-major',
    levelId: 'harmony',
    title: 'C Major Triad',
    summary: 'C + E + G together.',
    kind: 'sequence',
    teach: 'Build C major: root C, major third E, perfect fifth G. Press all three keys together as one chord.',
    targets: [['C4', 'E4', 'G4']],
    clef: 'treble',
  },
  {
    id: 'h-a-minor',
    levelId: 'harmony',
    title: 'A Minor Triad',
    summary: 'The relative minor of C.',
    kind: 'sequence',
    teach: 'A minor is A–C–E. Same white keys as C major’s world, different home. Play the three notes together.',
    targets: [['A4', 'C5', 'E5']],
    clef: 'treble',
  },
  {
    id: 'h-cadence',
    levelId: 'harmony',
    title: 'I–V–I Cadence',
    summary: 'Home → away → home.',
    kind: 'sequence',
    teach: 'Play C major (C–E–G), then G major (G–B–D), then back to C. Each chord sounds as one press.',
    targets: [
      ['C4', 'E4', 'G4'],
      ['G4', 'B4', 'D5'],
      ['C4', 'E4', 'G4'],
    ],
    clef: 'treble',
  },
  {
    id: 'h-iv-v-i',
    levelId: 'harmony',
    title: 'I–IV–V–I',
    summary: 'The backbone of countless songs.',
    kind: 'sequence',
    teach: 'Roots only: C → F → G → C. Feel how IV opens and V wants to resolve.',
    targets: ['C4', 'F4', 'G4', 'C4'],
    clef: 'treble',
    bpm: 70,
    gradeRhythm: true,
    rhythm: quarters(4),
    countIn: 4,
  },

  // Repertoire
  {
    id: 'rep-twinkle',
    levelId: 'repertoire',
    title: 'Twinkle Opening',
    summary: 'A melody you already know.',
    kind: 'play-along',
    teach: 'Play with the metronome: C C G G A A G. Steady quarters.',
    targets: ['C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4'],
    clef: 'treble',
    bpm: 80,
    gradeRhythm: true,
    rhythm: quarters(7),
    countIn: 4,
    passScore: 0.75,
  },
  {
    id: 'rep-ode',
    levelId: 'repertoire',
    title: 'Ode to Joy Phrase',
    summary: 'Beethoven’s most famous tune.',
    kind: 'play-along',
    teach: 'E E F G | G F E D | C C D E | E D D — all quarters. Stay with the click.',
    targets: ['E4', 'E4', 'F4', 'G4', 'G4', 'F4', 'E4', 'D4', 'C4', 'C4', 'D4', 'E4', 'E4', 'D4', 'D4'],
    clef: 'treble',
    bpm: 76,
    gradeRhythm: true,
    rhythm: quarters(15),
    countIn: 4,
    passScore: 0.75,
  },
  {
    id: 'rep-mary',
    levelId: 'repertoire',
    title: 'Mary Had a Little Lamb',
    summary: 'Steps, neighbors, and a held note.',
    kind: 'play-along',
    teach: 'Mixed rhythm: mostly quarters, with a longer G at the end of the phrase.',
    targets: ['E4', 'D4', 'C4', 'D4', 'E4', 'E4', 'E4', 'D4', 'D4', 'D4', 'E4', 'G4', 'G4'],
    clef: 'treble',
    bpm: 84,
    gradeRhythm: true,
    rhythm: fromDurations([1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 2]),
    countIn: 4,
    passScore: 0.75,
  },

  // Advanced
  {
    id: 'a-inversions',
    levelId: 'advanced',
    title: 'C Major Inversions',
    summary: 'Same chord, different bass.',
    kind: 'sequence',
    teach: 'Root: C–E–G. First inversion: E–G–C. Second: G–C–E. Play each shape as one chord.',
    targets: [
      ['C4', 'E4', 'G4'],
      ['E4', 'G4', 'C5'],
      ['G4', 'C5', 'E5'],
    ],
    clef: 'treble',
  },
  {
    id: 'a-c7',
    levelId: 'advanced',
    title: 'Dominant Seventh',
    summary: 'C7 pulls hard toward F.',
    kind: 'sequence',
    teach: 'C7 is C–E–G–B♭. Play the four notes together, then resolve to F major (F–A–C).',
    targets: [
      ['C4', 'E4', 'G4', 'A#4'],
      ['F4', 'A4', 'C5'],
    ],
    clef: 'treble',
  },
  {
    id: 'a-blues',
    levelId: 'advanced',
    title: 'C Blues Scale',
    summary: 'Color tones for improvisation.',
    kind: 'sequence',
    teach: 'C blues in time: C E♭ F F♯ G B♭ C.',
    targets: ['C4', 'D#4', 'F4', 'F#4', 'G4', 'A#4', 'C5'],
    clef: 'treble',
    bpm: 70,
    gradeRhythm: true,
    rhythm: quarters(7),
    countIn: 4,
    passScore: 0.8,
  },
  {
    id: 'a-improv',
    levelId: 'advanced',
    title: 'Free Improv Lab',
    summary: 'Explore with intention.',
    kind: 'learn',
    teach:
      'Improvise for one minute using only C blues notes on your Yamaha. Start sparse, leave space, end on C.',
    targets: ['C4', 'D#4', 'F4', 'F#4', 'G4', 'A#4', 'C5'],
    clef: 'treble',
  },
]

export function lessonsForLevel(levelId: LevelId): Lesson[] {
  return LESSONS.filter((l) => l.levelId === levelId)
}

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id)
}

export function nextLesson(id: string): Lesson | undefined {
  const index = LESSONS.findIndex((l) => l.id === id)
  if (index < 0 || index >= LESSONS.length - 1) return undefined
  return LESSONS[index + 1]
}
