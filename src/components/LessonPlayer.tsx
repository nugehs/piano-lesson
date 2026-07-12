import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Lesson } from '../data/curriculum'
import { nextLesson } from '../data/curriculum'
import type { MidiConnection } from '../lib/midi'
import { metronome } from '../lib/metronome'
import { noteLabel, type NoteName, type Pitch } from '../lib/music'
import {
  combineScores,
  DEFAULT_BPM,
  expectedOnsets,
  gradeTiming,
  type TimingGrade,
} from '../lib/rhythm'
import { synth } from '../lib/synth'
import { Piano } from './Piano'
import { Staff, type StaffNote } from './Staff'

function formatPitch(pitch: Pitch): string {
  const note = pitch.replace(/\d+$/, '') as NoteName
  const octave = pitch.match(/\d+$/)?.[0] ?? ''
  return `${noteLabel(note)}${octave}`
}

type LessonPlayerProps = {
  lesson: Lesson
  onComplete: (score: number, passed: boolean) => void
  onExit: () => void
  onContinue: (nextId: string) => void
}

type Phase = 'teach' | 'countdown' | 'practice' | 'result'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function LessonPlayer({ lesson, onComplete, onExit, onContinue }: LessonPlayerProps) {
  const [phase, setPhase] = useState<Phase>('teach')
  const [index, setIndex] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [timingScores, setTimingScores] = useState<number[]>([])
  const [lastGrade, setLastGrade] = useState<TimingGrade | null>(null)
  const [flashOk, setFlashOk] = useState<Pitch[]>([])
  const [flashBad, setFlashBad] = useState<Pitch[]>([])
  const [demoPlaying, setDemoPlaying] = useState(false)
  const [countLeft, setCountLeft] = useState(0)
  const [midi, setMidi] = useState<MidiConnection | null>(null)
  const completedRef = useRef(false)
  const practiceStartedAt = useRef(0)
  const indexRef = useRef(0)
  const hitsRef = useRef(0)
  const missesRef = useRef(0)
  const timingRef = useRef<number[]>([])
  const phaseRef = useRef<Phase>('teach')

  const targets = lesson.targets
  const bpm = lesson.bpm ?? DEFAULT_BPM
  const gradeRhythm = Boolean(lesson.gradeRhythm)
  const countIn = lesson.countIn ?? 4
  const currentTarget = targets[index]
  const onsets = useMemo(
    () => expectedOnsets(targets.length, bpm, lesson.rhythm),
    [targets.length, bpm, lesson.rhythm],
  )

  const pitchScore = useMemo(() => {
    const total = hits + misses
    if (total === 0) return 1
    return hits / total
  }, [hits, misses])

  const timingScore = useMemo(() => {
    if (!gradeRhythm || timingScores.length === 0) return 1
    return timingScores.reduce((a, b) => a + b, 0) / timingScores.length
  }, [gradeRhythm, timingScores])

  const score = useMemo(
    () => (gradeRhythm ? combineScores(pitchScore, timingScore) : pitchScore),
    [gradeRhythm, pitchScore, timingScore],
  )

  const passScore = lesson.passScore ?? 0.7
  const passed = score >= passScore && (lesson.kind === 'learn' || hits >= targets.length)

  const staffNotes: StaffNote[] = useMemo(
    () =>
      targets.map((pitch, i) => ({
        pitch,
        duration: lesson.rhythm?.[i]?.duration ?? 1,
        state: i < index ? 'done' : i === index && phase === 'practice' ? 'current' : 'idle',
      })),
    [targets, lesson.rhythm, index, phase],
  )

  useEffect(() => {
    indexRef.current = index
  }, [index])
  useEffect(() => {
    hitsRef.current = hits
  }, [hits])
  useEffect(() => {
    missesRef.current = misses
  }, [misses])
  useEffect(() => {
    timingRef.current = timingScores
  }, [timingScores])
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    setPhase('teach')
    setIndex(0)
    setHits(0)
    setMisses(0)
    setTimingScores([])
    setLastGrade(null)
    setFlashOk([])
    setFlashBad([])
    setCountLeft(0)
    completedRef.current = false
    metronome.stop()
  }, [lesson.id])

  useEffect(() => () => metronome.stop(), [])

  async function playDemo() {
    if (demoPlaying) return
    setDemoPlaying(true)
    await synth.unlock()
    const notes = lesson.demo ?? lesson.targets
    const rhythm = lesson.rhythm
    for (let i = 0; i < notes.length; i += 1) {
      const pitch = notes[i]
      const durationBeats = rhythm?.[i]?.duration ?? 1
      const ms = (durationBeats * 60_000) / bpm
      synth.noteOn(pitch)
      await sleep(Math.max(180, ms * 0.85))
      synth.noteOff(pitch)
      await sleep(Math.max(40, ms * 0.15))
    }
    setDemoPlaying(false)
  }

  function finish(finalHits: number, finalMisses: number, finalTiming: number[]) {
    if (completedRef.current) return
    completedRef.current = true
    metronome.stop()
    const total = finalHits + finalMisses
    const finalPitch = total === 0 ? 1 : finalHits / total
    const finalTimingAvg =
      gradeRhythm && finalTiming.length > 0
        ? finalTiming.reduce((a, b) => a + b, 0) / finalTiming.length
        : 1
    const finalScore = gradeRhythm ? combineScores(finalPitch, finalTimingAvg) : finalPitch
    const ok = lesson.kind === 'learn' || finalScore >= passScore
    setPhase('result')
    onComplete(finalScore, ok)
  }

  const handleNote = useCallback(
    (pitch: Pitch) => {
      if (phaseRef.current !== 'practice' || lesson.kind === 'learn') return

      if (lesson.kind === 'find') {
        if (pitch === targets[0]) {
          setFlashOk([pitch])
          setHits(1)
          hitsRef.current = 1
          finish(1, missesRef.current, timingRef.current)
        } else {
          setFlashBad([pitch])
          setMisses((m) => {
            missesRef.current = m + 1
            return m + 1
          })
          window.setTimeout(() => setFlashBad([]), 280)
        }
        return
      }

      const expected = targets[indexRef.current]
      if (pitch === expected) {
        let timingHit = 1
        if (gradeRhythm) {
          const elapsed = performance.now() - practiceStartedAt.current
          const expectedMs = onsets[indexRef.current] ?? elapsed
          const result = gradeTiming(expectedMs, elapsed)
          timingHit = result.score
          setLastGrade(result.grade)
          setTimingScores((prev) => {
            const next = [...prev, timingHit]
            timingRef.current = next
            return next
          })
        }

        setFlashOk([pitch])
        const nextHits = hitsRef.current + 1
        hitsRef.current = nextHits
        setHits(nextHits)
        const nextIndex = indexRef.current + 1
        if (nextIndex >= targets.length) {
          finish(nextHits, missesRef.current, timingRef.current)
        } else {
          indexRef.current = nextIndex
          setIndex(nextIndex)
          window.setTimeout(() => setFlashOk([]), 180)
        }
      } else {
        setFlashBad([pitch])
        setLastGrade('miss')
        setMisses((m) => {
          missesRef.current = m + 1
          return m + 1
        })
        window.setTimeout(() => setFlashBad([]), 280)
      }
    },
    [lesson.kind, targets, gradeRhythm, onsets],
  )

  async function startPractice() {
    await synth.unlock()
    await metronome.unlock()
    completedRef.current = false
    setIndex(0)
    indexRef.current = 0
    setHits(0)
    hitsRef.current = 0
    setMisses(0)
    missesRef.current = 0
    setTimingScores([])
    timingRef.current = []
    setLastGrade(null)
    setFlashOk([])
    setFlashBad([])

    if (gradeRhythm) {
      setPhase('countdown')
      phaseRef.current = 'countdown'
      setCountLeft(countIn)
      let heard = 0
      metronome.onBeat = () => {
        heard += 1
        const left = Math.max(0, countIn - heard)
        setCountLeft(left)
        if (heard >= countIn) {
          metronome.onBeat = null
          // First note is due on the next click after the count-in.
          const beatMs = 60_000 / bpm
          practiceStartedAt.current = performance.now() + beatMs
          setPhase('practice')
          phaseRef.current = 'practice'
        }
      }
      metronome.start(bpm, 4)
    } else {
      metronome.onBeat = null
      practiceStartedAt.current = performance.now()
      setPhase('practice')
      phaseRef.current = 'practice'
    }
  }

  function resetAttempt() {
    metronome.stop()
    completedRef.current = false
    setIndex(0)
    setHits(0)
    setMisses(0)
    setTimingScores([])
    setLastGrade(null)
    setFlashOk([])
    setFlashBad([])
    if (lesson.kind === 'learn') {
      setPhase('teach')
    } else {
      void startPractice()
    }
  }

  const guide =
    phase === 'practice' && (lesson.kind === 'find' || lesson.kind === 'sequence' || lesson.kind === 'play-along')
      ? currentTarget
        ? [currentTarget]
        : []
      : lesson.kind === 'learn'
        ? lesson.targets
        : []

  const nxt = nextLesson(lesson.id)
  const midiLabel =
    midi?.status === 'ready'
      ? midi.message
      : midi?.message ?? 'MIDI: connect your Yamaha via USB'

  return (
    <section className="lesson">
      <header className="lesson__header">
        <button
          type="button"
          className="text-btn"
          onClick={() => {
            metronome.stop()
            onExit()
          }}
        >
          ← Path
        </button>
        <div>
          <p className="eyebrow">{lesson.kind.replace('-', ' ')}</p>
          <h1>{lesson.title}</h1>
        </div>
      </header>

      <p className="lesson__teach">{lesson.teach}</p>

      <div className="lesson__staff">
        <Staff
          notes={staffNotes}
          clef={lesson.clef ?? 'treble'}
          cursor={phase === 'practice' || phase === 'countdown' ? index : phase === 'result' ? targets.length : 0}
          label={`${lesson.title} notation`}
        />
      </div>

      {phase === 'teach' && (
        <div className="lesson__actions">
          <button type="button" className="btn btn--ghost" onClick={() => void playDemo()} disabled={demoPlaying}>
            {demoPlaying ? 'Playing…' : 'Hear it'}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              if (lesson.kind === 'learn') {
                finish(1, 0, [])
              } else {
                void startPractice()
              }
            }}
          >
            {lesson.kind === 'learn' ? 'Mark complete' : gradeRhythm ? 'Start with metronome' : 'Start practice'}
          </button>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="lesson__countdown" aria-live="assertive">
          <span className="lesson__countdown-beat">{countLeft}</span>
          <p className="muted">Get ready · {bpm} BPM</p>
        </div>
      )}

      {phase === 'practice' && (
        <div className="lesson__status" aria-live="polite">
          <div>
            <span className="muted">Next</span>
            <strong>{formatPitch(currentTarget)}</strong>
          </div>
          <div>
            <span className="muted">Pitch</span>
            <strong>{Math.round(pitchScore * 100)}%</strong>
          </div>
          {gradeRhythm && (
            <div>
              <span className="muted">Timing</span>
              <strong>
                {Math.round(timingScore * 100)}%
                {lastGrade ? ` · ${lastGrade}` : ''}
              </strong>
            </div>
          )}
          {gradeRhythm && (
            <div>
              <span className="muted">Tempo</span>
              <strong>{bpm} BPM</strong>
            </div>
          )}
        </div>
      )}

      {phase === 'result' && (
        <div className={`lesson__result ${passed ? 'is-pass' : 'is-retry'}`}>
          <h2>{passed ? 'Nice work' : 'Almost — try again'}</h2>
          <p>
            Score {Math.round(score * 100)}%
            {gradeRhythm
              ? ` · pitch ${Math.round(pitchScore * 100)}% · timing ${Math.round(timingScore * 100)}%`
              : ''}
            {passed ? ' · Lesson complete' : ` · Need ${Math.round(passScore * 100)}% to pass`}
          </p>
          <div className="lesson__actions">
            <button type="button" className="btn btn--ghost" onClick={resetAttempt}>
              Practice again
            </button>
            {passed && nxt && (
              <button type="button" className="btn btn--primary" onClick={() => onContinue(nxt.id)}>
                Next lesson
              </button>
            )}
            {passed && !nxt && (
              <button type="button" className="btn btn--primary" onClick={onExit}>
                Back to path
              </button>
            )}
          </div>
        </div>
      )}

      <div className="lesson__piano">
        <Piano
          start="C3"
          end="G5"
          guidePitches={phase === 'result' ? [] : guide}
          successPitches={flashOk}
          errorPitches={flashBad}
          onNoteOn={handleNote}
          onMidiConnection={setMidi}
        />
        <p className={`hint midi-status is-${midi?.status ?? 'idle'}`}>{midiLabel}</p>
        <p className="hint">
          Play on your Yamaha (USB MIDI), click keys, or use A S D F G H J K · W E T Y U for black keys
        </p>
      </div>
    </section>
  )
}
