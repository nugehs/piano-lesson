import { LEVELS, LESSONS, lessonsForLevel } from '../data/curriculum'
import { completedCount, levelCompletion, type ProgressState } from '../lib/progress'

type PathViewProps = {
  progress: ProgressState
  onOpenLesson: (id: string) => void
  onFreePlay: () => void
  continueId: string
}

export function PathView({ progress, onOpenLesson, onFreePlay, continueId }: PathViewProps) {
  const done = completedCount(progress)
  const total = LESSONS.length

  return (
    <section className="path">
      <header className="path__hero">
        <p className="brand">Keypath</p>
        <h1>From first note to fluent hands.</h1>
        <p className="lede">
          Learn on your Yamaha over USB MIDI — staff notation, metronome rhythm scoring, and a path from
          first notes to fluent playing.
        </p>
        <div className="path__cta">
          <button type="button" className="btn btn--primary" onClick={() => onOpenLesson(continueId)}>
            Continue learning
          </button>
          <button type="button" className="btn btn--ghost" onClick={onFreePlay}>
            Free play
          </button>
        </div>
        <p className="path__progress" aria-live="polite">
          {done} of {total} lessons complete
        </p>
      </header>

      <div className="path__levels">
        {LEVELS.map((level) => {
          const lessons = lessonsForLevel(level.id)
          const pct = Math.round(levelCompletion(progress, level.id) * 100)
          return (
            <section key={level.id} className="level" aria-labelledby={`level-${level.id}`}>
              <div className="level__head">
                <div>
                  <p className="eyebrow">Stage {level.order}</p>
                  <h2 id={`level-${level.id}`}>{level.title}</h2>
                  <p className="muted">{level.subtitle}</p>
                </div>
                <div className="level__meter" aria-label={`${pct}% complete`}>
                  <div className="level__meter-fill" style={{ width: `${pct}%` }} />
                  <span>{pct}%</span>
                </div>
              </div>
              <ul className="level__lessons">
                {lessons.map((lesson, i) => {
                  const status = progress.lessons[lesson.id]
                  const complete = Boolean(status?.completed)
                  return (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        className={`lesson-row ${complete ? 'is-done' : ''} ${continueId === lesson.id ? 'is-next' : ''}`}
                        onClick={() => onOpenLesson(lesson.id)}
                      >
                        <span className="lesson-row__index">{String(i + 1).padStart(2, '0')}</span>
                        <span className="lesson-row__body">
                          <strong>{lesson.title}</strong>
                          <span className="muted">{lesson.summary}</span>
                        </span>
                        <span className="lesson-row__status">
                          {complete ? 'Done' : continueId === lesson.id ? 'Next' : 'Open'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </section>
  )
}

export function FreePlay({ onExit }: { onExit: () => void }) {
  return (
    <section className="lesson">
      <header className="lesson__header">
        <button type="button" className="text-btn" onClick={onExit}>
          ← Path
        </button>
        <div>
          <p className="eyebrow">Sandbox</p>
          <h1>Free play</h1>
        </div>
      </header>
      <p className="lesson__teach">
        Plug your Yamaha in with USB, allow MIDI in the browser, and play freely. Keys light up as you
        play — great for warming up before a lesson.
      </p>
    </section>
  )
}
