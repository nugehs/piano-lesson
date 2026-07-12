import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMidi } from '../hooks/useMidi'
import type { MidiConnection } from '../lib/midi'
import {
  buildRange,
  isBlackKey,
  KEYBOARD_MAP,
  noteLabel,
  type NoteName,
  type Pitch,
} from '../lib/music'
import { synth } from '../lib/synth'
import './Piano.css'

type PianoProps = {
  start?: Pitch
  end?: Pitch
  activePitches?: Set<Pitch> | Pitch[]
  guidePitches?: Set<Pitch> | Pitch[]
  successPitches?: Set<Pitch> | Pitch[]
  errorPitches?: Set<Pitch> | Pitch[]
  showLabels?: boolean
  enableComputerKeys?: boolean
  enableMidi?: boolean
  /** When false, MIDI still lights keys / sounds, but parent handles scoring via onNoteOn. */
  onNoteOn?: (pitch: Pitch, velocity?: number) => void
  onNoteOff?: (pitch: Pitch) => void
  onMidiConnection?: (connection: MidiConnection) => void
}

function toSet(value?: Set<Pitch> | Pitch[]): Set<Pitch> {
  if (!value) return new Set()
  return value instanceof Set ? value : new Set(value)
}

export function Piano({
  start = 'C3',
  end = 'C5',
  activePitches,
  guidePitches,
  successPitches,
  errorPitches,
  showLabels = true,
  enableComputerKeys = true,
  enableMidi = true,
  onNoteOn,
  onNoteOff,
  onMidiConnection,
}: PianoProps) {
  const pitches = useMemo(() => buildRange(start, end), [start, end])
  const whites = useMemo(
    () => pitches.filter((p) => !isBlackKey(p.replace(/\d+$/, '') as NoteName)),
    [pitches],
  )
  const [pressed, setPressed] = useState<Set<Pitch>>(() => new Set())
  const heldKeys = useRef(new Set<string>())
  const pitchSet = useRef(new Set(pitches))
  pitchSet.current = new Set(pitches)

  const active = toSet(activePitches)
  const guide = toSet(guidePitches)
  const success = toSet(successPitches)
  const error = toSet(errorPitches)

  const press = useCallback(
    (pitch: Pitch, velocity = 0.85, playLocal = true) => {
      setPressed((prev) => {
        if (prev.has(pitch)) return prev
        const next = new Set(prev)
        next.add(pitch)
        return next
      })
      // Yamaha already sounds over USB MIDI — skip local synth to avoid double notes.
      if (playLocal) synth.noteOn(pitch, velocity)
      onNoteOn?.(pitch, velocity)
    },
    [onNoteOn],
  )

  const release = useCallback(
    (pitch: Pitch, stopLocal = true) => {
      setPressed((prev) => {
        if (!prev.has(pitch)) return prev
        const next = new Set(prev)
        next.delete(pitch)
        return next
      })
      if (stopLocal) synth.noteOff(pitch)
      onNoteOff?.(pitch)
    },
    [onNoteOff],
  )

  const { connection } = useMidi({
    enabled: enableMidi,
    onNoteOn: (pitch, velocity) => press(pitch, velocity, false),
    onNoteOff: (pitch) => release(pitch, false),
  })

  useEffect(() => {
    onMidiConnection?.(connection)
  }, [connection, onMidiConnection])

  useEffect(() => {
    if (!enableComputerKeys) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      const pitch = KEYBOARD_MAP[event.key.toLowerCase()]
      if (!pitch || !pitchSet.current.has(pitch)) return
      if (heldKeys.current.has(event.key)) return
      heldKeys.current.add(event.key)
      event.preventDefault()
      press(pitch)
    }

    const onKeyUp = (event: KeyboardEvent) => {
      const pitch = KEYBOARD_MAP[event.key.toLowerCase()]
      heldKeys.current.delete(event.key)
      if (!pitch) return
      release(pitch)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [enableComputerKeys, press, release])

  return (
    <div className="piano" role="group" aria-label="Piano keyboard">
      <div className="piano__whites">
        {whites.map((pitch) => {
          const note = pitch.replace(/\d+$/, '') as NoteName
          const isActive = pressed.has(pitch) || active.has(pitch)
          const classes = [
            'piano__key',
            'piano__key--white',
            isActive ? 'is-active' : '',
            guide.has(pitch) ? 'is-guide' : '',
            success.has(pitch) ? 'is-success' : '',
            error.has(pitch) ? 'is-error' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={pitch}
              type="button"
              className={classes}
              aria-label={pitch}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                press(pitch)
              }}
              onPointerUp={() => release(pitch)}
              onPointerCancel={() => release(pitch)}
              onPointerLeave={(e) => {
                if (e.buttons === 0) release(pitch)
              }}
            >
              {showLabels && <span className="piano__label">{noteLabel(note)}</span>}
            </button>
          )
        })}
      </div>

      <div className="piano__blacks">
        {whites.map((pitch, index) => {
          const note = pitch.replace(/\d+$/, '') as NoteName
          if (!['C', 'D', 'F', 'G', 'A'].includes(note)) {
            return <div key={`spacer-${pitch}`} className="piano__black-slot" />
          }
          const octave = pitch.match(/\d+$/)?.[0] ?? '4'
          const blackPitch = `${note}#${octave}` as Pitch
          if (!pitches.includes(blackPitch)) {
            return <div key={`missing-${pitch}`} className="piano__black-slot" />
          }

          const isActive = pressed.has(blackPitch) || active.has(blackPitch)
          const classes = [
            'piano__key',
            'piano__key--black',
            isActive ? 'is-active' : '',
            guide.has(blackPitch) ? 'is-guide' : '',
            success.has(blackPitch) ? 'is-success' : '',
            error.has(blackPitch) ? 'is-error' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div key={blackPitch} className="piano__black-slot">
              <button
                type="button"
                className={classes}
                aria-label={blackPitch}
                style={{ ['--slot' as string]: index }}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  e.stopPropagation()
                  press(blackPitch)
                }}
                onPointerUp={() => release(blackPitch)}
                onPointerCancel={() => release(blackPitch)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
