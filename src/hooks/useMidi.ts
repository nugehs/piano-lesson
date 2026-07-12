import { useEffect, useRef, useState } from 'react'
import {
  describeMidi,
  requestMidiAccess,
  subscribeMidiNotes,
  type MidiConnection,
} from '../lib/midi'
import type { Pitch } from '../lib/music'

type UseMidiOptions = {
  enabled?: boolean
  onNoteOn?: (pitch: Pitch, velocity: number) => void
  onNoteOff?: (pitch: Pitch) => void
}

export function useMidi({ enabled = true, onNoteOn, onNoteOff }: UseMidiOptions = {}) {
  const [connection, setConnection] = useState<MidiConnection>({
    status: 'idle',
    deviceName: null,
    message: 'Checking for MIDI…',
  })
  const handlersRef = useRef({ onNoteOn, onNoteOff })
  handlersRef.current = { onNoteOn, onNoteOff }

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    let unsubscribe: (() => void) | undefined

    const refresh = (access: MIDIAccess | null) => {
      if (cancelled) return
      setConnection(describeMidi(access))
    }

    void (async () => {
      const access = await requestMidiAccess()
      if (cancelled) return
      refresh(access)

      if (!access) return

      unsubscribe = subscribeMidiNotes(access, {
        onNoteOn: (pitch: Pitch, velocity: number) =>
          handlersRef.current.onNoteOn?.(pitch, velocity),
        onNoteOff: (pitch: Pitch) => handlersRef.current.onNoteOff?.(pitch),
      })

      access.addEventListener('statechange', () => refresh(access))
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [enabled])

  async function reconnect() {
    const access = await requestMidiAccess()
    setConnection(describeMidi(access))
  }

  return { connection, reconnect }
}
