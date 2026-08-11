import { useMemo } from 'react'
import {
  DEFAULT_FRET_COUNT,
  GUITAR_STRINGS,
  OPEN_STRING_LABELS,
  fretPositionKey,
  pitchAtFret,
  type FretPosition,
  type GuitarString,
} from '../lib/guitar'
import type { Pitch } from '../lib/music'
import { synth } from '../lib/synth'
import './Fretboard.css'

type FretboardProps = {
  fretCount?: number
  guide?: FretPosition[]
  success?: FretPosition[]
  error?: FretPosition[]
  active?: FretPosition[]
  /** When true, clicking a fret triggers local synth + onNoteOn. */
  enableClick?: boolean
  onNoteOn?: (pitch: Pitch, position: FretPosition) => void
}

function toKeySet(list?: FretPosition[]): Set<string> {
  return new Set((list ?? []).map(fretPositionKey))
}

export function Fretboard({
  fretCount = DEFAULT_FRET_COUNT,
  guide,
  success,
  error,
  active,
  enableClick = true,
  onNoteOn,
}: FretboardProps) {
  const frets = useMemo(() => Array.from({ length: fretCount + 1 }, (_, i) => i), [fretCount])
  const guideSet = toKeySet(guide)
  const successSet = toKeySet(success)
  const errorSet = toKeySet(error)
  const activeSet = toKeySet(active)

  function press(string: GuitarString, fret: number) {
    if (!enableClick) return
    const position = { string, fret }
    const pitch = pitchAtFret(string, fret)
    void synth.unlock()
    synth.noteOn(pitch)
    window.setTimeout(() => synth.noteOff(pitch), 320)
    onNoteOn?.(pitch, position)
  }

  return (
    <div className="fretboard" role="group" aria-label="Guitar fretboard">
      <div className="fretboard__nut" aria-hidden />
      <div
        className="fretboard__grid"
        style={{
          gridTemplateColumns: `4.5rem repeat(${fretCount}, minmax(2.4rem, 1fr))`,
          gridTemplateRows: `repeat(6, 1.7rem)`,
        }}
      >
        {GUITAR_STRINGS.map((string, row) =>
          frets.map((fret) => {
            const key = fretPositionKey({ string, fret })
            const isOpen = fret === 0
            const classes = [
              'fretboard__cell',
              isOpen ? 'is-open' : 'is-fret',
              guideSet.has(key) ? 'is-guide' : '',
              successSet.has(key) ? 'is-success' : '',
              errorSet.has(key) ? 'is-error' : '',
              activeSet.has(key) ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <button
                key={key}
                type="button"
                className={classes}
                style={{ gridColumn: fret + 1, gridRow: row + 1 }}
                aria-label={`${OPEN_STRING_LABELS[string]} string, fret ${fret}, ${pitchAtFret(string, fret)}`}
                onClick={() => press(string, fret)}
              >
                {isOpen ? (
                  <span className="fretboard__open-label">{OPEN_STRING_LABELS[string]}</span>
                ) : (
                  <span className="fretboard__dot" aria-hidden />
                )}
              </button>
            )
          }),
        )}
      </div>
      <div
        className="fretboard__fret-numbers"
        style={{ gridTemplateColumns: `4.5rem repeat(${fretCount}, minmax(2.4rem, 1fr))` }}
      >
        <span />
        {Array.from({ length: fretCount }, (_, i) => (
          <span key={i + 1}>{i + 1}</span>
        ))}
      </div>
    </div>
  )
}
