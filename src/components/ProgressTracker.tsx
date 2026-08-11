import type { Instrument } from '../lib/instrument'
import {
  clearProgress,
  formatRelativeTime,
  getProgressSummary,
  type ProgressState,
} from '../lib/progress'
import './ProgressTracker.css'

type ProgressTrackerProps = {
  instrument: Instrument
  progress: ProgressState
  onReset: (next: ProgressState) => void
}

export function ProgressTracker({ instrument, progress, onReset }: ProgressTrackerProps) {
  const summary = getProgressSummary(progress, instrument)

  function handleReset() {
    const ok = window.confirm(
      `Reset all ${instrument} progress saved on this device? The other instrument is left alone.`,
    )
    if (!ok) return
    onReset(clearProgress(instrument))
  }

  return (
    <section className="tracker" aria-labelledby="tracker-title">
      <div className="tracker__head">
        <div>
          <p className="eyebrow">Progress</p>
          <h2 id="tracker-title">Your path so far</h2>
          <p className="muted tracker__meta">
            Saved on this device · Last practice {formatRelativeTime(summary.lastPlayedAt)}
          </p>
        </div>
        <button type="button" className="text-btn tracker__reset" onClick={handleReset}>
          Reset
        </button>
      </div>

      <div className="tracker__overall" aria-label={`${summary.percent}% of lessons complete`}>
        <div className="tracker__bar">
          <div className="tracker__bar-fill" style={{ width: `${summary.percent}%` }} />
        </div>
        <div className="tracker__overall-copy">
          <strong>{summary.percent}%</strong>
          <span className="muted">
            {summary.done}/{summary.total} lessons
          </span>
        </div>
      </div>

      <dl className="tracker__stats">
        <div>
          <dt>Current stage</dt>
          <dd>{summary.currentLevelTitle}</dd>
        </div>
        <div>
          <dt>Up next</dt>
          <dd>{summary.nextLessonTitle}</dd>
        </div>
        <div>
          <dt>Attempts</dt>
          <dd>{summary.attempts}</dd>
        </div>
        <div>
          <dt>Avg best</dt>
          <dd>{summary.attempts === 0 ? '—' : `${Math.round(summary.avgBestScore * 100)}%`}</dd>
        </div>
      </dl>

      <ul className="tracker__stages">
        {summary.levels.map((level) => (
          <li key={level.levelId} className="tracker__stage">
            <div className="tracker__stage-top">
              <span>
                {level.order}. {level.title}
              </span>
              <span className="muted">
                {level.done}/{level.total}
              </span>
            </div>
            <div className="tracker__stage-bar" aria-hidden>
              <div className="tracker__stage-fill" style={{ width: `${level.percent}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
