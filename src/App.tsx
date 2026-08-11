import { useMemo, useState } from 'react'
import { getLesson } from './data/curriculum'
import { getGuitarLesson } from './data/guitarCurriculum'
import { LessonPlayer } from './components/LessonPlayer'
import { FreePlay, PathView } from './components/PathView'
import { Fretboard } from './components/Fretboard'
import { Piano } from './components/Piano'
import { TuningCheck } from './components/TuningCheck'
import { usePitchDetect } from './hooks/usePitchDetect'
import type { MidiConnection } from './lib/midi'
import {
  instrumentLabel,
  type Instrument,
} from './lib/instrument'
import {
  firstIncompleteLessonId,
  loadInstrument,
  loadProgress,
  recordAttempt,
  saveInstrument,
  type ProgressState,
} from './lib/progress'
import { synth } from './lib/synth'
import './App.css'

type Screen =
  | { name: 'path' }
  | { name: 'lesson'; id: string }
  | { name: 'free' }
  | { name: 'tune' }

export default function App() {
  const [instrument, setInstrument] = useState<Instrument>(() => loadInstrument())
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress(loadInstrument()))
  const [screen, setScreen] = useState<Screen>({ name: 'path' })
  const [midi, setMidi] = useState<MidiConnection | null>(null)

  const continueId = useMemo(
    () => firstIncompleteLessonId(progress, instrument),
    [progress, instrument],
  )
  const lesson =
    screen.name === 'lesson'
      ? instrument === 'guitar'
        ? getGuitarLesson(screen.id)
        : getLesson(screen.id)
      : undefined

  function switchInstrument(next: Instrument) {
    setInstrument(next)
    saveInstrument(next)
    setProgress(loadProgress(next))
    setScreen({ name: 'path' })
  }

  function updateProgress(next: ProgressState) {
    setProgress(next)
  }

  return (
    <div className="app">
      <div className="app__glow" aria-hidden />
      <div className="app__grain" aria-hidden />

      <main className="app__main">
        {screen.name === 'path' && (
          <PathView
            instrument={instrument}
            progress={progress}
            continueId={continueId}
            onResetProgress={updateProgress}
            onInstrumentChange={switchInstrument}
            onOpenLesson={(id) => {
              void synth.unlock()
              setScreen({ name: 'lesson', id })
            }}
            onFreePlay={() => {
              void synth.unlock()
              setScreen({ name: 'free' })
            }}
            onTune={() => setScreen({ name: 'tune' })}
          />
        )}

        {screen.name === 'lesson' && lesson && (
          <LessonPlayer
            lesson={lesson}
            instrument={instrument}
            onExit={() => setScreen({ name: 'path' })}
            onContinue={(id) => setScreen({ name: 'lesson', id })}
            onComplete={(score, passed) => {
              updateProgress(recordAttempt(instrument, progress, lesson.id, score, passed))
            }}
          />
        )}

        {screen.name === 'lesson' && !lesson && (
          <section className="lesson">
            <p>Lesson not found.</p>
            <button type="button" className="btn btn--primary" onClick={() => setScreen({ name: 'path' })}>
              Back
            </button>
          </section>
        )}

        {screen.name === 'tune' && <TuningCheck onExit={() => setScreen({ name: 'path' })} />}

        {screen.name === 'free' && (
          <FreePlaySurface
            instrument={instrument}
            midi={midi}
            onMidi={setMidi}
            onExit={() => setScreen({ name: 'path' })}
          />
        )}
      </main>
    </div>
  )
}

function FreePlaySurface({
  instrument,
  midi,
  onMidi,
  onExit,
}: {
  instrument: Instrument
  midi: MidiConnection | null
  onMidi: (connection: MidiConnection) => void
  onExit: () => void
}) {
  const mic = usePitchDetect({
    enabled: instrument === 'guitar',
  })

  return (
    <>
      <FreePlay instrument={instrument} onExit={onExit} />
      <div className="lesson__piano">
        {instrument === 'guitar' ? (
          <>
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
              <p className="hint">{mic.message}</p>
            </div>
            <Fretboard />
            <p className="hint">
              {instrumentLabel('guitar')} free play · mic shows {mic.lastPitch ?? '—'}
            </p>
          </>
        ) : (
          <>
            <Piano start="C3" end="C6" onMidiConnection={onMidi} />
            <p className={`hint midi-status is-${midi?.status ?? 'idle'}`}>
              {midi?.message ?? 'Connect your Yamaha via USB for MIDI'}
            </p>
            <p className="hint">
              Full 88-key MIDI works even beyond the on-screen range · computer keys A–; start at C4
            </p>
          </>
        )}
      </div>
    </>
  )
}
