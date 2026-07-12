import { useMemo, useState } from 'react'
import { getLesson } from './data/curriculum'
import { LessonPlayer } from './components/LessonPlayer'
import { FreePlay, PathView } from './components/PathView'
import { Piano } from './components/Piano'
import type { MidiConnection } from './lib/midi'
import {
  firstIncompleteLessonId,
  loadProgress,
  recordAttempt,
  saveProgress,
  type ProgressState,
} from './lib/progress'
import { synth } from './lib/synth'
import './App.css'

type Screen =
  | { name: 'path' }
  | { name: 'lesson'; id: string }
  | { name: 'free' }

export default function App() {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress())
  const [screen, setScreen] = useState<Screen>({ name: 'path' })
  const [midi, setMidi] = useState<MidiConnection | null>(null)

  const continueId = useMemo(() => firstIncompleteLessonId(progress), [progress])
  const lesson = screen.name === 'lesson' ? getLesson(screen.id) : undefined

  function updateProgress(next: ProgressState) {
    setProgress(next)
    saveProgress(next)
  }

  return (
    <div className="app">
      <div className="app__glow" aria-hidden />
      <div className="app__grain" aria-hidden />

      <main className="app__main">
        {screen.name === 'path' && (
          <PathView
            progress={progress}
            continueId={continueId}
            onOpenLesson={(id) => {
              void synth.unlock()
              setScreen({ name: 'lesson', id })
            }}
            onFreePlay={() => {
              void synth.unlock()
              setScreen({ name: 'free' })
            }}
          />
        )}

        {screen.name === 'lesson' && lesson && (
          <LessonPlayer
            lesson={lesson}
            onExit={() => setScreen({ name: 'path' })}
            onContinue={(id) => setScreen({ name: 'lesson', id })}
            onComplete={(score, passed) => {
              updateProgress(recordAttempt(progress, lesson.id, score, passed))
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

        {screen.name === 'free' && (
          <>
            <FreePlay onExit={() => setScreen({ name: 'path' })} />
            <div className="lesson__piano">
              <Piano start="C3" end="C6" onMidiConnection={setMidi} />
              <p className={`hint midi-status is-${midi?.status ?? 'idle'}`}>
                {midi?.message ?? 'Connect your Yamaha via USB for MIDI'}
              </p>
              <p className="hint">
                Full 88-key MIDI works even beyond the on-screen range · computer keys A–; start at C4
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
