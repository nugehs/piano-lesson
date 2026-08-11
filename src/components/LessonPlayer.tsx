import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Lesson } from '../data/curriculum'
import { nextLesson } from '../data/curriculum'
import { nextGuitarLesson } from '../data/guitarCurriculum'
import { usePitchDetect } from '../hooks/usePitchDetect'
import type { Instrument } from '../lib/instrument'
import {
  preferredFret,
  type FretPosition,
} from '../lib/guitar'
import type { MidiConnection } from '../lib/midi'
import { metronome } from '../lib/metronome'
import { noteLabel, pitchToMidi, type NoteName, type Pitch } from '../lib/music'
import {
  combineScores,
  DEFAULT_BPM,
  expectedOnsets,
  gradeTiming,
  type TimingGrade,
  type TimingResult,
} from '../lib/rhythm'
import { synth } from '../lib/synth'
import { Fretboard } from './Fretboard'
import { Piano } from './Piano'
import { Staff, type StaffNote } from './Staff'
import { TabStrip, type TabStep } from './TabStrip'

/** All chord notes must land within this window of the first one. */
const CHORD_WINDOW_MS = 400
/** Guitar chords / strums are often arpeggiated into the mic — allow more time. */
const GUITAR_CHORD_WINDOW_MS = 1400
const MIN_TEMPO_SCALE = 0.5
const MAX_TEMPO_SCALE = 1.2
const TEMPO_STEP = 0.1

function formatPitch(pitch: Pitch): string {
  const note = pitch.replace(/\d+$/, '') as NoteName
  const octave = pitch.match(/\d+$/)?.[0] ?? ''
  return `${noteLabel(note)}${octave}`
}

function formatStep(step: Pitch[]): string {
  return step.map(formatPitch).join(' + ')
}

function pitchesToFrets(pitches: Pitch[], fallback?: FretPosition[]): FretPosition[] {
  if (fallback && fallback.length > 0) return fallback
  return pitches
    .map((p) => preferredFret(p))
    .filter((p): p is FretPosition => Boolean(p))
}

/** Coaching line for a wrong pitch: direction and distance to the expected note. */
function describeWrongPitch(played: Pitch, expected: Pitch): string {
  const diff = pitchToMidi(played) - pitchToMidi(expected)
  if (diff !== 0 && diff % 12 === 0) {
    const octaves = Math.abs(diff / 12)
    return `Right note, wrong octave — go ${diff > 0 ? 'down' : 'up'} ${
      octaves === 1 ? 'an octave' : `${octaves} octaves`
    }.`
  }
  const half = Math.abs(diff)
  const dir = diff > 0 ? 'lower' : 'higher'
  return `You played ${formatPitch(played)} — ${formatPitch(expected)} is ${half} half-step${
    half === 1 ? '' : 's'
  } ${dir}.`
}

function describeTiming(result: TimingResult): string {
  const ms = Math.round(Math.abs(result.errorMs))
  switch (result.grade) {
    case 'perfect':
      return 'Perfect timing.'
    case 'early':
      return `Early by ${ms} ms — let the click come to you.`
    case 'late':
      return `Late by ${ms} ms — strike right on the click.`
    default:
      return `Right note, but ${result.errorMs < 0 ? 'early' : 'late'} by ${ms} ms — way off the beat.`
  }
}

type LessonPlayerProps = {
  lesson: Lesson
  instrument?: Instrument
  onComplete: (score: number, passed: boolean) => void
  onExit: () => void
  onContinue: (nextId: string) => void
}

type Phase = 'teach' | 'countdown' | 'practice' | 'result'

type LessonState = {
  phase: Phase
  index: number
  hits: number
  misses: number
  timingScores: number[]
  /** Chord notes collected so far for the current step. */
  collected: Pitch[]
  /** Coaching line shown under the practice status. */
  feedback: string | null
  feedbackKind: 'ok' | 'warn'
  /** Miss counts per expected step label, for result-screen tips. */
  missCounts: Record<string, number>
  earlyHits: number
  lateHits: number
}

type LessonAction =
  | { type: 'SET_PHASE'; phase: Phase }
  | { type: 'ADVANCE'; index: number }
  | { type: 'COLLECT'; pitch: Pitch }
  | { type: 'RECORD_HIT'; timingScore?: number; grade?: TimingGrade; feedback?: string | null }
  | { type: 'RECORD_MISS'; targetLabel: string; feedback: string; clearCollected?: boolean }
  | { type: 'RESET' }

const initialLessonState: LessonState = {
  phase: 'teach',
  index: 0,
  hits: 0,
  misses: 0,
  timingScores: [],
  collected: [],
  feedback: null,
  feedbackKind: 'ok',
  missCounts: {},
  earlyHits: 0,
  lateHits: 0,
}

function lessonReducer(state: LessonState, action: LessonAction): LessonState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.phase }
    case 'ADVANCE':
      return { ...state, index: action.index, collected: [] }
    case 'COLLECT':
      return { ...state, collected: [...state.collected, action.pitch] }
    case 'RECORD_HIT':
      return {
        ...state,
        hits: state.hits + 1,
        collected: [],
        timingScores:
          action.timingScore !== undefined
            ? [...state.timingScores, action.timingScore]
            : state.timingScores,
        feedback: action.feedback ?? null,
        feedbackKind: action.grade === 'miss' ? 'warn' : 'ok',
        earlyHits: action.grade === 'early' ? state.earlyHits + 1 : state.earlyHits,
        lateHits: action.grade === 'late' ? state.lateHits + 1 : state.lateHits,
      }
    case 'RECORD_MISS':
      return {
        ...state,
        misses: state.misses + 1,
        collected: action.clearCollected ? [] : state.collected,
        feedback: action.feedback,
        feedbackKind: 'warn',
        missCounts: {
          ...state.missCounts,
          [action.targetLabel]: (state.missCounts[action.targetLabel] ?? 0) + 1,
        },
      }
    case 'RESET':
      return initialLessonState
    default:
      return state
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function LessonPlayer({
  lesson,
  instrument = 'piano',
  onComplete,
  onExit,
  onContinue,
}: LessonPlayerProps) {
  const isGuitar = instrument === 'guitar'
  const chordWindowMs = isGuitar ? GUITAR_CHORD_WINDOW_MS : CHORD_WINDOW_MS
  const [lessonState, dispatch] = useReducer(lessonReducer, initialLessonState)
  const [lastGrade, setLastGrade] = useState<TimingGrade | null>(null)
  const [flashOk, setFlashOk] = useState<Pitch[]>([])
  const [flashBad, setFlashBad] = useState<Pitch[]>([])
  const [demoPlaying, setDemoPlaying] = useState(false)
  const [countLeft, setCountLeft] = useState(0)
  const [midi, setMidi] = useState<MidiConnection | null>(null)
  const [tempoScale, setTempoScale] = useState(1)

  const completedRef = useRef(false)
  const practiceStartedAt = useRef(0)
  const chordTimer = useRef<number | null>(null)
  const chordStartElapsed = useRef(0)
  // Source of truth for chord collection: MIDI chords deliver several noteOns in
  // the same tick, before React re-renders, so state alone would be stale.
  const collectedRef = useRef<Pitch[]>([])
  const handleNoteRef = useRef<(pitch: Pitch) => void>(() => {})

  const {
    phase,
    index,
    hits,
    misses,
    timingScores,
    collected,
    feedback,
    feedbackKind,
    missCounts,
    earlyHits,
    lateHits,
  } = lessonState

  /** Each step is one or more pitches; multi-pitch steps are chords. */
  const steps = useMemo<Pitch[][]>(
    () => lesson.targets.map((t) => (Array.isArray(t) ? t : [t])),
    [lesson.targets],
  )
  const stepFingerings = useMemo(
    () => lesson.fingerings ?? steps.map(() => [] as FretPosition[]),
    [lesson.fingerings, steps],
  )
  const bpm = lesson.bpm ?? DEFAULT_BPM
  const effectiveBpm = Math.max(30, Math.round(bpm * tempoScale))
  const gradeRhythm = Boolean(lesson.gradeRhythm)
  const countIn = lesson.countIn ?? 4
  const currentStep = steps[index] ?? []
  const currentFingering = stepFingerings[index] ?? []
  const onsets = useMemo(
    () => expectedOnsets(steps.length, effectiveBpm, lesson.rhythm),
    [steps.length, effectiveBpm, lesson.rhythm],
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
  const passed = score >= passScore && (lesson.kind === 'learn' || hits >= steps.length)

  const staffNotes: StaffNote[] = useMemo(
    () =>
      steps.map((pitches, i) => ({
        pitches,
        duration: lesson.rhythm?.[i]?.duration ?? 1,
        state: i < index ? 'done' : i === index && phase === 'practice' ? 'current' : 'idle',
      })),
    [steps, lesson.rhythm, index, phase],
  )

  const tabSteps: TabStep[] = useMemo(
    () =>
      steps.map((pitches, i) => ({
        positions: pitchesToFrets(pitches, stepFingerings[i]),
        state: i < index ? 'done' : i === index && phase === 'practice' ? 'current' : 'idle',
      })),
    [steps, stepFingerings, index, phase],
  )

  const flashOkFrets = useMemo(
    () => pitchesToFrets(flashOk, flashOk.length ? currentFingering : undefined),
    [flashOk, currentFingering],
  )
  const flashBadFrets = useMemo(() => pitchesToFrets(flashBad), [flashBad])
  const guideFrets = useMemo(() => {
    if (phase === 'result') return []
    if (lesson.kind === 'learn') {
      return stepFingerings.flat()
    }
    if (phase === 'practice' || phase === 'countdown' || phase === 'teach') {
      return currentFingering.length > 0 ? currentFingering : pitchesToFrets(currentStep)
    }
    return []
  }, [phase, lesson.kind, stepFingerings, currentFingering, currentStep])

  const clearChordTimer = useCallback(() => {
    if (chordTimer.current !== null) {
      window.clearTimeout(chordTimer.current)
      chordTimer.current = null
    }
  }, [])

  const resetChordCollection = useCallback(() => {
    clearChordTimer()
    collectedRef.current = []
  }, [clearChordTimer])

  const mic = usePitchDetect({
    enabled: isGuitar,
    onNoteOn: (pitch) => {
      if (phase === 'practice') handleNoteRef.current(pitch)
    },
  })

  useEffect(() => {
    dispatch({ type: 'RESET' })
    setLastGrade(null)
    setFlashOk([])
    setFlashBad([])
    setCountLeft(0)
    setTempoScale(1)
    completedRef.current = false
    resetChordCollection()
    metronome.stop()
  }, [lesson.id, resetChordCollection])

  useEffect(
    () => () => {
      resetChordCollection()
      metronome.stop()
    },
    [resetChordCollection],
  )

  async function playDemo() {
    if (demoPlaying) return
    setDemoPlaying(true)
    await synth.unlock()
    const demoSteps = (lesson.demo ?? lesson.targets).map((t) => (Array.isArray(t) ? t : [t]))
    const rhythm = lesson.rhythm
    for (let i = 0; i < demoSteps.length; i += 1) {
      const pitches = demoSteps[i]
      const durationBeats = rhythm?.[i]?.duration ?? 1
      const ms = (durationBeats * 60_000) / effectiveBpm
      for (const pitch of pitches) synth.noteOn(pitch)
      await sleep(Math.max(180, ms * 0.85))
      for (const pitch of pitches) synth.noteOff(pitch)
      await sleep(Math.max(40, ms * 0.15))
    }
    setDemoPlaying(false)
  }

  function finish(finalHits: number, finalMisses: number, finalTiming: number[]) {
    if (completedRef.current) return
    completedRef.current = true
    resetChordCollection()
    metronome.stop()
    const total = finalHits + finalMisses
    const finalPitch = total === 0 ? 1 : finalHits / total
    const finalTimingAvg =
      gradeRhythm && finalTiming.length > 0
        ? finalTiming.reduce((a, b) => a + b, 0) / finalTiming.length
        : 1
    const finalScore = gradeRhythm ? combineScores(finalPitch, finalTimingAvg) : finalPitch
    const ok = lesson.kind === 'learn' || finalScore >= passScore
    dispatch({ type: 'SET_PHASE', phase: 'result' })
    onComplete(finalScore, ok)
  }

  const handleNote = useCallback(
    (pitch: Pitch) => {
      if (phase !== 'practice' || lesson.kind === 'learn') return

      if (lesson.kind === 'find') {
        const expected = steps[0]?.[0]
        if (!expected) return
        if (pitch === expected) {
          setFlashOk([pitch])
          dispatch({ type: 'RECORD_HIT', feedback: 'Found it.' })
          finish(1, misses, timingScores)
        } else {
          setFlashBad([pitch])
          dispatch({
            type: 'RECORD_MISS',
            targetLabel: formatPitch(expected),
            feedback: describeWrongPitch(pitch, expected),
          })
          window.setTimeout(() => setFlashBad([]), 280)
        }
        return
      }

      const step = steps[index]
      if (!step) return
      const isChord = step.length > 1

      if (!step.includes(pitch)) {
        setFlashBad([pitch])
        setLastGrade('miss')
        const remaining = step.filter((p) => !collectedRef.current.includes(p))
        dispatch({
          type: 'RECORD_MISS',
          targetLabel: formatStep(step),
          feedback: isChord
            ? `${formatPitch(pitch)} isn’t in this chord — you need ${formatStep(remaining)}.`
            : describeWrongPitch(pitch, step[0]),
        })
        window.setTimeout(() => setFlashBad([]), 280)
        return
      }

      if (isChord && collectedRef.current.includes(pitch)) return

      const elapsed = performance.now() - practiceStartedAt.current

      const completeStep = (onsetElapsed: number) => {
        resetChordCollection()
        let timingHit = 1
        let grade: TimingGrade | undefined
        let stepFeedback: string | null = null
        if (gradeRhythm) {
          const expectedMs = onsets[index] ?? onsetElapsed
          const result = gradeTiming(expectedMs, onsetElapsed)
          timingHit = result.score
          grade = result.grade
          stepFeedback = describeTiming(result)
          setLastGrade(result.grade)
        } else if (isChord) {
          stepFeedback = 'Chord landed — nice and together.'
        }
        setFlashOk(step)
        dispatch({
          type: 'RECORD_HIT',
          timingScore: gradeRhythm ? timingHit : undefined,
          grade,
          feedback: stepFeedback,
        })
        const nextIndex = index + 1
        if (nextIndex >= steps.length) {
          finish(hits + 1, misses, gradeRhythm ? [...timingScores, timingHit] : timingScores)
        } else {
          dispatch({ type: 'ADVANCE', index: nextIndex })
          window.setTimeout(() => setFlashOk([]), 180)
        }
      }

      if (!isChord) {
        completeStep(elapsed)
        return
      }

      const wasEmpty = collectedRef.current.length === 0
      const nextCollected = [...collectedRef.current, pitch]
      if (nextCollected.length === step.length) {
        completeStep(wasEmpty ? elapsed : chordStartElapsed.current)
        return
      }

      collectedRef.current = nextCollected
      dispatch({ type: 'COLLECT', pitch })
      setFlashOk(nextCollected)

      if (wasEmpty) {
        chordStartElapsed.current = elapsed
        chordTimer.current = window.setTimeout(() => {
          chordTimer.current = null
          collectedRef.current = []
          dispatch({
            type: 'RECORD_MISS',
            targetLabel: formatStep(step),
            feedback: `Too spread out — press ${formatStep(step)} together, like one key.`,
            clearCollected: true,
          })
          setFlashOk([])
          setFlashBad(step)
          window.setTimeout(() => setFlashBad([]), 280)
        }, chordWindowMs)
      }
    },
    [
      phase,
      lesson.kind,
      steps,
      index,
      hits,
      misses,
      timingScores,
      gradeRhythm,
      onsets,
      resetChordCollection,
      chordWindowMs,
    ],
  )

  useEffect(() => {
    handleNoteRef.current = handleNote
  }, [handleNote])

  async function startPractice(scale = tempoScale) {
    await synth.unlock()
    await metronome.unlock()
    completedRef.current = false
    resetChordCollection()
    dispatch({ type: 'RESET' })
    setLastGrade(null)
    setFlashOk([])
    setFlashBad([])

    const startBpm = Math.max(30, Math.round(bpm * scale))
    if (gradeRhythm) {
      dispatch({ type: 'SET_PHASE', phase: 'countdown' })
      setCountLeft(countIn)
      let heard = 0
      metronome.onBeat = () => {
        heard += 1
        const left = Math.max(0, countIn - heard)
        setCountLeft(left)
        if (heard >= countIn) {
          metronome.onBeat = null
          // First note is due on the next click after the count-in.
          const beatMs = 60_000 / startBpm
          practiceStartedAt.current = performance.now() + beatMs
          dispatch({ type: 'SET_PHASE', phase: 'practice' })
        }
      }
      metronome.start(startBpm, 4)
    } else {
      metronome.onBeat = null
      practiceStartedAt.current = performance.now()
      dispatch({ type: 'SET_PHASE', phase: 'practice' })
    }
  }

  function resetAttempt() {
    metronome.stop()
    resetChordCollection()
    completedRef.current = false
    dispatch({ type: 'RESET' })
    setLastGrade(null)
    setFlashOk([])
    setFlashBad([])
    if (lesson.kind === 'learn') {
      dispatch({ type: 'SET_PHASE', phase: 'teach' })
    } else {
      void startPractice()
    }
  }

  function retrySlower() {
    const next = Math.max(MIN_TEMPO_SCALE, Number((tempoScale - TEMPO_STEP).toFixed(2)))
    setTempoScale(next)
    void startPractice(next)
  }

  function retryFullSpeed() {
    setTempoScale(1)
    void startPractice(1)
  }

  const tips = useMemo(() => {
    if (phase !== 'result') return []
    const list: string[] = []
    const worst = Object.entries(missCounts).sort((a, b) => b[1] - a[1])[0]
    if (worst && worst[1] >= 2) {
      list.push(
        `${worst[0]} caused ${worst[1]} misses — find it on the ${
          isGuitar ? 'neck' : 'keys'
        } before you restart.`,
      )
    }
    const timedHits = earlyHits + lateHits
    if (gradeRhythm && timedHits >= 3) {
      if (earlyHits >= lateHits * 2) list.push('You tend to rush — let the click come to you.')
      else if (lateHits >= earlyHits * 2)
        list.push('You tend to drag — strike right as the click sounds.')
    }
    if (!passed && gradeRhythm && timingScore < 0.75 && tempoScale > MIN_TEMPO_SCALE) {
      list.push('Slow the tempo, nail every note, then build speed back up.')
    }
    return list
  }, [phase, missCounts, earlyHits, lateHits, gradeRhythm, passed, timingScore, tempoScale, isGuitar])

  const guide =
    phase === 'practice' &&
    (lesson.kind === 'find' || lesson.kind === 'sequence' || lesson.kind === 'play-along')
      ? currentStep
      : lesson.kind === 'learn'
        ? steps.flat()
        : []

  const nxt = isGuitar ? nextGuitarLesson(lesson.id) : nextLesson(lesson.id)
  const midiLabel =
    midi?.status === 'ready'
      ? midi.message
      : midi?.message ?? 'MIDI: connect your Yamaha via USB'

  const currentIsChord = currentStep.length > 1
  const slowerBpm = Math.max(
    30,
    Math.round(bpm * Math.max(MIN_TEMPO_SCALE, Number((tempoScale - TEMPO_STEP).toFixed(2)))),
  )

  return (
    <section className="lesson">
      <header className="lesson__header">
        <button
          type="button"
          className="text-btn"
          onClick={() => {
            metronome.stop()
            mic.stop()
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

      {isGuitar ? (
        <div className="lesson__staff">
          <TabStrip steps={tabSteps} label={`${lesson.title} tablature`} />
        </div>
      ) : (
        <div className="lesson__staff">
          <Staff
            notes={staffNotes}
            clef={lesson.clef ?? 'treble'}
            cursor={
              phase === 'practice' || phase === 'countdown'
                ? index
                : phase === 'result'
                  ? steps.length
                  : 0
            }
            label={`${lesson.title} notation`}
          />
        </div>
      )}

      {isGuitar && (
        <div className="lesson__mic">
          {mic.isActive ? (
            <button type="button" className="btn btn--ghost btn--compact" onClick={mic.stop}>
              Mute mic
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--compact"
              onClick={() => void mic.start()}
            >
              Enable mic
            </button>
          )}
          <p
            className={`hint midi-status is-${
              mic.status === 'listening' || mic.status === 'quiet'
                ? 'ready'
                : mic.status === 'denied' || mic.status === 'error'
                  ? 'error'
                  : 'idle'
            }`}
          >
            {mic.message}
          </p>
        </div>
      )}

      {phase === 'teach' && (
        <>
          {gradeRhythm && (
            <div className="lesson__tempo" role="group" aria-label="Practice tempo">
              <button
                type="button"
                className="btn btn--ghost btn--compact"
                onClick={() =>
                  setTempoScale((s) => Math.max(MIN_TEMPO_SCALE, Number((s - TEMPO_STEP).toFixed(2))))
                }
                disabled={tempoScale <= MIN_TEMPO_SCALE}
              >
                Slower
              </button>
              <span className="lesson__tempo-value">
                {effectiveBpm} BPM
                {tempoScale !== 1 && <em> · {Math.round(tempoScale * 100)}%</em>}
              </span>
              <button
                type="button"
                className="btn btn--ghost btn--compact"
                onClick={() =>
                  setTempoScale((s) => Math.min(MAX_TEMPO_SCALE, Number((s + TEMPO_STEP).toFixed(2))))
                }
                disabled={tempoScale >= MAX_TEMPO_SCALE}
              >
                Faster
              </button>
            </div>
          )}
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
        </>
      )}

      {phase === 'countdown' && (
        <div className="lesson__countdown" aria-live="assertive">
          <span className="lesson__countdown-beat">{countLeft}</span>
          <p className="muted">Get ready · {effectiveBpm} BPM</p>
        </div>
      )}

      {phase === 'practice' && (
        <>
          <div className="lesson__status" aria-live="polite">
            <div>
              <span className="muted">{currentIsChord ? 'Next chord' : 'Next'}</span>
              <strong>
                {formatStep(currentStep)}
                {currentIsChord && collected.length > 0 && ` · ${collected.length}/${currentStep.length} held`}
              </strong>
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
                <strong>
                  {effectiveBpm} BPM
                  {tempoScale !== 1 && ` · ${Math.round(tempoScale * 100)}%`}
                </strong>
              </div>
            )}
          </div>
          {feedback && (
            <p className={`lesson__coach is-${feedbackKind}`} aria-live="polite">
              {feedback}
            </p>
          )}
        </>
      )}

      {phase === 'result' && (
        <div className={`lesson__result ${passed ? 'is-pass' : 'is-retry'}`}>
          <h2>{passed ? 'Nice work' : 'Almost — try again'}</h2>
          <p>
            Score {Math.round(score * 100)}%
            {gradeRhythm
              ? ` · pitch ${Math.round(pitchScore * 100)}% · timing ${Math.round(timingScore * 100)}%`
              : ''}
            {gradeRhythm && tempoScale !== 1 ? ` · at ${effectiveBpm} BPM` : ''}
            {passed ? ' · Lesson complete' : ` · Need ${Math.round(passScore * 100)}% to pass`}
          </p>
          {tips.length > 0 && (
            <ul className="lesson__tips">
              {tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          )}
          <div className="lesson__actions">
            <button type="button" className="btn btn--ghost" onClick={resetAttempt}>
              Practice again
            </button>
            {!passed && gradeRhythm && tempoScale > MIN_TEMPO_SCALE && (
              <button type="button" className="btn btn--primary" onClick={retrySlower}>
                Retry slower · {slowerBpm} BPM
              </button>
            )}
            {passed && gradeRhythm && tempoScale < 1 && (
              <button type="button" className="btn btn--ghost" onClick={retryFullSpeed}>
                Try full speed · {bpm} BPM
              </button>
            )}
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
        {isGuitar ? (
          <>
            <Fretboard
              guide={phase === 'result' ? [] : guideFrets}
              success={flashOkFrets}
              error={flashBadFrets}
              onNoteOn={(pitch) => handleNote(pitch)}
            />
            <p className="hint">
              Play on your guitar into the mic, or tap frets to practice shapes silently
            </p>
          </>
        ) : (
          <>
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
              Play on your Yamaha (USB MIDI), click keys, or use A S D F G H J K · W E T Y U for black
              keys
            </p>
          </>
        )}
      </div>
    </section>
  )
}
