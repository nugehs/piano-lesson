import {
  LEVELS,
  LESSONS,
  lessonsForLevel,
  type Level,
  type Lesson,
  type LevelId,
} from '../data/curriculum'
import { guitarLessonsForLevel, guitarLevelsAsShared } from '../data/guitarCurriculum'
import {
  instrumentLabel,
  instrumentTagline,
  type Instrument,
} from '../lib/instrument'
import {
  completedCount,
  levelCompletion,
  type ProgressState,
} from '../lib/progress'
import { ProgressTracker } from './ProgressTracker'

type PathViewProps = {
  instrument: Instrument
  progress: ProgressState
  onOpenLesson: (id: string) => void
  onFreePlay: () => void
  onTune?: () => void
  onResetProgress: (next: ProgressState) => void
  onInstrumentChange: (instrument: Instrument) => void
  continueId: string
}

function catalogFor(instrument: Instrument): { levels: Level[]; lessons: Lesson[] } {
  if (instrument === 'guitar') {
    const levels = guitarLevelsAsShared()
    return { levels, lessons: levels.flatMap((l) => guitarLessonsForLevel(l.id)) }
  }
  return { levels: LEVELS, lessons: LESSONS }
}

function lessonsInLevel(instrument: Instrument, levelId: LevelId): Lesson[] {
  return instrument === 'guitar' ? guitarLessonsForLevel(levelId) : lessonsForLevel(levelId)
}

export function PathView({
  instrument,
  progress,
  onOpenLesson,
  onFreePlay,
  onTune,
  onResetProgress,
  onInstrumentChange,
  continueId,
}: PathViewProps) {
  const { levels, lessons } = catalogFor(instrument)
  const done = completedCount(progress, instrument)
  const total = lessons.length
  const headline =
    instrument === 'guitar' ? 'From open strings to real songs.' : 'From first note to fluent hands.'

  return (
    <section className="path">
      <header className="path__hero">
        <p className="brand">Keypath</p>
        <div className="path__instruments" role="tablist" aria-label="Instrument">
          {(['piano', 'guitar'] as Instrument[]).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={instrument === item}
              className={`path__instrument ${instrument === item ? 'is-active' : ''}`}
              onClick={() => onInstrumentChange(item)}
            >
              {instrumentLabel(item)}
            </button>
          ))}
        </div>
        <h1>{headline}</h1>
        <p className="lede">{instrumentTagline(instrument)}</p>
        <div className="path__cta">
          <button type="button" className="btn btn--primary" onClick={() => onOpenLesson(continueId)}>
            Continue learning
          </button>
          <button type="button" className="btn btn--ghost" onClick={onFreePlay}>
            Free play
          </button>
          {instrument === 'guitar' && onTune && (
            <button type="button" className="btn btn--ghost" onClick={onTune}>
              Tune up
            </button>
          )}
        </div>
        <p className="path__progress" aria-live="polite">
          {done} of {total} {instrumentLabel(instrument).toLowerCase()} lessons complete · progress
          saved in this browser
        </p>
      </header>

      <ProgressTracker
        instrument={instrument}
        progress={progress}
        onReset={onResetProgress}
      />

      <div className="path__levels">
        {levels.map((level) => {
          const levelLessons = lessonsInLevel(instrument, level.id)
          const pct = Math.round(levelCompletion(progress, level.id, instrument) * 100)
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
                {levelLessons.map((lesson, i) => {
                  const status = progress.lessons[lesson.id]
                  const complete = Boolean(status?.completed)
                  const best =
                    status && status.attempts > 0 ? Math.round(status.bestScore * 100) : null
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
                          <span className="muted">
                            {lesson.summary}
                            {best !== null ? ` · Best ${best}%` : ''}
                            {status?.attempts
                              ? ` · ${status.attempts} try${status.attempts === 1 ? '' : 's'}`
                              : ''}
                          </span>
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

export function FreePlay({
  instrument,
  onExit,
}: {
  instrument: Instrument
  onExit: () => void
}) {
  const isGuitar = instrument === 'guitar'
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
        {isGuitar
          ? 'Enable the mic and play freely on your guitar, or tap the fretboard to explore shapes. Great for warming up before a lesson.'
          : 'Plug your Yamaha in with USB, allow MIDI in the browser, and play freely. Keys light up as you play — great for warming up before a lesson.'}
      </p>
    </section>
  )
}
