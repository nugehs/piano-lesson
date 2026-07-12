/// <reference types="vite/client" />

interface Navigator {
  requestMIDIAccess(options?: MIDIOptions): Promise<MIDIAccess>
}
