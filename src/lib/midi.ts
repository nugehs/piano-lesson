import { midiToPitch, type Pitch } from './music'

export type MidiStatus = 'unsupported' | 'denied' | 'idle' | 'ready' | 'error'

export type MidiConnection = {
  status: MidiStatus
  deviceName: string | null
  message: string
}

type NoteHandlers = {
  onNoteOn: (pitch: Pitch, velocity: number) => void
  onNoteOff: (pitch: Pitch) => void
}

const NOTE_ON = 0x90
const NOTE_OFF = 0x80

function isMidiAccessAvailable(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function'
}

export async function requestMidiAccess(): Promise<MIDIAccess | null> {
  if (!isMidiAccessAvailable()) return null
  try {
    return await navigator.requestMIDIAccess({ sysex: false })
  } catch {
    return null
  }
}

export function describeMidi(access: MIDIAccess | null): MidiConnection {
  if (!isMidiAccessAvailable()) {
    return {
      status: 'unsupported',
      deviceName: null,
      message: 'This browser does not support Web MIDI. Try Chrome or Edge on desktop.',
    }
  }
  if (!access) {
    return {
      status: 'denied',
      deviceName: null,
      message: 'MIDI permission denied. Allow MIDI access, then reconnect your Yamaha.',
    }
  }

  const inputs = [...access.inputs.values()]
  const named = inputs.find((input) => Boolean(input.name?.trim()))
  if (!named) {
    return {
      status: 'idle',
      deviceName: null,
      message: 'No MIDI keyboard found. Connect your Yamaha with USB and power it on.',
    }
  }

  return {
    status: 'ready',
    deviceName: named.name ?? 'MIDI keyboard',
    message: `Connected: ${named.name ?? 'MIDI keyboard'}`,
  }
}

/**
 * Subscribe to note on/off from all MIDI inputs (Yamaha USB-to-Host, etc.).
 * Returns an unsubscribe function.
 */
export function subscribeMidiNotes(
  access: MIDIAccess,
  handlers: NoteHandlers,
): () => void {
  const onMessage = (event: MIDIMessageEvent) => {
    const data = event.data
    if (!data || data.length < 2) return

    const status = data[0] & 0xf0
    const note = data[1]
    const velocity = data[2] ?? 0

    if (status === NOTE_ON && velocity > 0) {
      handlers.onNoteOn(midiToPitch(note), velocity / 127)
      return
    }

    if (status === NOTE_OFF || (status === NOTE_ON && velocity === 0)) {
      handlers.onNoteOff(midiToPitch(note))
    }
  }

  const bind = (input: MIDIInput) => {
    input.addEventListener('midimessage', onMessage as EventListener)
  }
  const unbind = (input: MIDIInput) => {
    input.removeEventListener('midimessage', onMessage as EventListener)
  }

  for (const input of access.inputs.values()) bind(input)

  const onStateChange = () => {
    for (const input of access.inputs.values()) {
      unbind(input)
      bind(input)
    }
  }
  access.addEventListener('statechange', onStateChange)

  return () => {
    access.removeEventListener('statechange', onStateChange)
    for (const input of access.inputs.values()) unbind(input)
  }
}
