import { useMemo, useState } from 'react'
import { usePitchDetect } from '../hooks/usePitchDetect'
import {
  GUITAR_STRINGS,
  OPEN_STRING_LABELS,
  OPEN_STRING_PITCHES,
  centsFromPitch,
  type GuitarString,
} from '../lib/guitar'
import { Fretboard } from './Fretboard'
import './TuningCheck.css'

type TuningCheckProps = {
  onExit: () => void
}

type StringReading = {
  cents: number | null
  heard: boolean
}

function centsLabel(cents: number | null): string {
  if (cents === null) return '—'
  if (Math.abs(cents) <= 8) return 'In tune'
  return cents > 0 ? `Sharp ${Math.round(cents)}¢` : `Flat ${Math.round(Math.abs(cents))}¢`
}

export function TuningCheck({ onExit }: TuningCheckProps) {
  const [active, setActive] = useState<GuitarString>(6)
  const [readings, setReadings] = useState<Record<GuitarString, StringReading>>(() => {
    const init = {} as Record<GuitarString, StringReading>
    for (const s of GUITAR_STRINGS) init[s] = { cents: null, heard: false }
    return init
  })

  const targetPitch = OPEN_STRING_PITCHES[active]

  const mic = usePitchDetect({
    enabled: true,
    stableFrames: 2,
    retriggerMs: 180,
    onNoteOn: (_pitch, freq) => {
      const cents = centsFromPitch(freq, targetPitch)
      // Only update if within ~2 semitones of the open string target.
      if (Math.abs(cents) > 200) return
      setReadings((prev) => ({
        ...prev,
        [active]: { cents, heard: true },
      }))
    },
  })

  const guide = useMemo(() => [{ string: active, fret: 0 }], [active])
  const current = readings[active]

  return (
    <section className="lesson tuning">
      <header className="lesson__header">
        <button type="button" className="text-btn" onClick={onExit}>
          ← Path
        </button>
        <div>
          <p className="eyebrow">Guitar</p>
          <h1>Tune up</h1>
        </div>
      </header>

      <p className="lesson__teach">
        Standard tuning: E A D G B e. Pick a string, enable the mic, and pluck the open string. Green
        means close enough to start a lesson.
      </p>

      <div className="lesson__mic">
        {mic.isActive ? (
          <button type="button" className="btn btn--ghost btn--compact" onClick={mic.stop}>
            Mute mic
          </button>
        ) : (
          <button type="button" className="btn btn--primary btn--compact" onClick={() => void mic.start()}>
            Enable mic
          </button>
        )}
        <p className="hint">{mic.message}</p>
      </div>

      <ul className="tuning__strings">
        {GUITAR_STRINGS.map((string) => {
          const reading = readings[string]
          const ok = reading.cents !== null && Math.abs(reading.cents) <= 12
          return (
            <li key={string}>
              <button
                type="button"
                className={`tuning__string ${active === string ? 'is-active' : ''} ${ok ? 'is-ok' : ''}`}
                onClick={() => setActive(string)}
              >
                <span>
                  {string}. {OPEN_STRING_LABELS[string]}
                </span>
                <strong>{centsLabel(reading.cents)}</strong>
              </button>
            </li>
          )
        })}
      </ul>

      <p className="tuning__target" aria-live="polite">
        Target {targetPitch}
        {current.heard && current.cents !== null
          ? ` · ${centsLabel(current.cents)}`
          : ' · pluck the open string'}
      </p>

      <div className="lesson__piano">
        <Fretboard guide={guide} enableClick={false} />
      </div>
    </section>
  )
}
