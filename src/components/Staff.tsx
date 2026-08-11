import { useId, useMemo } from 'react'
import type { Pitch } from '../lib/music'
import {
  accidentalLabel,
  needsAccidental,
  pitchToStaffStep,
  stepToStaffY,
  type Clef,
} from '../lib/staff'
import './Staff.css'

export type StaffNote = {
  /** One pitch for a single note, several for a chord (rendered stacked). */
  pitches: Pitch[]
  /** Optional duration in beats for note head / stem styling. */
  duration?: number
  /** Highlight state */
  state?: 'idle' | 'current' | 'done' | 'miss'
}

type StaffProps = {
  notes: StaffNote[]
  clef?: Clef
  /** Index of the note the learner should play next. */
  cursor?: number
  label?: string
}

const LINE_GAP = 12
const STAFF_TOP = 36
const LEFT = 56
const NOTE_GAP = 36

function TrebleClef({ x, y }: { x: number; y: number }) {
  return (
    <text x={x} y={y} className="staff__clef" aria-hidden>
      𝄞
    </text>
  )
}

function BassClef({ x, y }: { x: number; y: number }) {
  return (
    <text x={x} y={y} className="staff__clef staff__clef--bass" aria-hidden>
      𝄢
    </text>
  )
}

function ledgerLines(
  step: number,
  clef: Clef,
  staffBottomY: number,
): number[] {
  const y = staffBottomY + stepToStaffY(step, clef, LINE_GAP)
  const lines: number[] = []
  // Staff occupies 4 gaps = 5 lines from staffBottomY upward by 4*LINE_GAP
  const topY = staffBottomY - 4 * LINE_GAP
  if (y > staffBottomY) {
    for (let ly = staffBottomY + LINE_GAP; ly <= y + 0.1; ly += LINE_GAP) lines.push(ly)
  }
  if (y < topY) {
    for (let ly = topY - LINE_GAP; ly >= y - 0.1; ly -= LINE_GAP) lines.push(ly)
  }
  return lines
}

function noteHeadRadius(duration = 1): { rx: number; ry: number; filled: boolean } {
  if (duration >= 2) return { rx: 7, ry: 5.5, filled: false }
  return { rx: 6.5, ry: 5, filled: true }
}

export function Staff({ notes, clef = 'treble', cursor = 0, label }: StaffProps) {
  const uid = useId()
  const width = Math.max(320, LEFT + notes.length * NOTE_GAP + 40)
  const height = 120
  const staffBottomY = STAFF_TOP + 4 * LINE_GAP

  const rendered = useMemo(
    () =>
      notes.map((note, index) => {
        const heads = note.pitches.map((pitch) => {
          const step = pitchToStaffStep(pitch)
          return {
            pitch,
            step,
            cy: staffBottomY + stepToStaffY(step, clef, LINE_GAP),
          }
        })
        const cx = LEFT + index * NOTE_GAP
        const state =
          note.state ??
          (index < cursor ? 'done' : index === cursor ? 'current' : 'idle')
        return { ...note, heads, cx, state, index }
      }),
    [notes, clef, cursor, staffBottomY],
  )

  return (
    <div className="staff" role="img" aria-label={label ?? `${clef} staff notation`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="staff__svg" width="100%">
        <defs>
          <filter id={`${uid}-soft`}>
            <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Staff lines */}
        {Array.from({ length: 5 }, (_, i) => {
          const y = STAFF_TOP + i * LINE_GAP
          return (
            <line
              key={y}
              x1={24}
              x2={width - 16}
              y1={y}
              y2={y}
              className="staff__line"
            />
          )
        })}

        {clef === 'treble' ? (
          <TrebleClef x={28} y={STAFF_TOP + 3.55 * LINE_GAP} />
        ) : (
          <BassClef x={28} y={STAFF_TOP + 1.15 * LINE_GAP} />
        )}

        {rendered.map((note) => {
          const head = noteHeadRadius(note.duration)
          const ledgers = [
            ...new Set(note.heads.flatMap((h) => ledgerLines(h.step, clef, staffBottomY))),
          ]
          const avgStep = note.heads.reduce((sum, h) => sum + h.step, 0) / note.heads.length
          const stemUp = avgStep < (clef === 'treble' ? 6 : -5)
          const stemX = stemUp ? note.cx + head.rx - 1 : note.cx - head.rx + 1
          const cys = note.heads.map((h) => h.cy)
          // Stem spans the whole chord, extending past the outermost head.
          const stemY1 = stemUp ? Math.max(...cys) : Math.min(...cys)
          const stemY2 = stemUp ? Math.min(...cys) - 28 : Math.max(...cys) + 28
          const showStem = (note.duration ?? 1) < 2
          const pulseCy = (Math.min(...cys) + Math.max(...cys)) / 2
          const pulseR = 14 + (Math.max(...cys) - Math.min(...cys)) / 2

          return (
            <g
              key={`${note.heads.map((h) => h.pitch).join('-')}-${note.index}`}
              className={`staff__note is-${note.state}`}
            >
              {ledgers.map((y) => (
                <line
                  key={y}
                  x1={note.cx - 10}
                  x2={note.cx + 10}
                  y1={y}
                  y2={y}
                  className="staff__ledger"
                />
              ))}

              {note.heads.map((h) => (
                <g key={h.pitch}>
                  {needsAccidental(h.pitch) && (
                    <text x={note.cx - 16} y={h.cy + 4} className="staff__accidental">
                      {accidentalLabel(h.pitch)}
                    </text>
                  )}
                  <ellipse
                    cx={note.cx}
                    cy={h.cy}
                    rx={head.rx}
                    ry={head.ry}
                    transform={`rotate(-18 ${note.cx} ${h.cy})`}
                    className={`staff__head ${head.filled ? 'is-filled' : 'is-open'}`}
                    filter={`url(#${uid}-soft)`}
                  />
                </g>
              ))}

              {showStem && (
                <line x1={stemX} x2={stemX} y1={stemY1} y2={stemY2} className="staff__stem" />
              )}

              {note.state === 'current' && (
                <circle cx={note.cx} cy={pulseCy} r={pulseR} className="staff__pulse" />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
