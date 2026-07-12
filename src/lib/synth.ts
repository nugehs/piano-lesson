import { pitchToFreq, type Pitch } from './music'

type ActiveVoice = {
  osc: OscillatorNode
  gain: GainNode
}

/**
 * Lightweight piano-ish synth via layered oscillators + envelope.
 * Good enough for learning feedback without sample packs.
 */
export class PianoSynth {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private voices = new Map<Pitch, ActiveVoice>()

  private ensure(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.35
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume()
    }
    return this.ctx
  }

  async unlock(): Promise<void> {
    this.ensure()
  }

  noteOn(pitch: Pitch, velocity = 0.85): void {
    const ctx = this.ensure()
    const master = this.master
    if (!master) return

    this.noteOff(pitch, 0.03)

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const freq = pitchToFreq(pitch)

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, ctx.currentTime)

    // Soft partial for a slightly richer attack.
    const partial = ctx.createOscillator()
    const partialGain = ctx.createGain()
    partial.type = 'sine'
    partial.frequency.setValueAtTime(freq * 2, ctx.currentTime)
    partialGain.gain.value = 0.18

    const now = ctx.currentTime
    const peak = Math.max(0.05, Math.min(1, velocity)) * 0.7
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(peak * 0.55, now + 0.18)

    osc.connect(gain)
    partial.connect(partialGain)
    partialGain.connect(gain)
    gain.connect(master)

    osc.start(now)
    partial.start(now)
    partial.stop(now + 8)
    osc.stop(now + 8)

    // Keep primary voice handle for noteOff; partial rides the same gain.
    this.voices.set(pitch, { osc, gain })
  }

  noteOff(pitch: Pitch, release = 0.18): void {
    const voice = this.voices.get(pitch)
    if (!voice || !this.ctx) return

    const now = this.ctx.currentTime
    voice.gain.gain.cancelScheduledValues(now)
    voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.0001), now)
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + release)
    try {
      voice.osc.stop(now + release + 0.02)
    } catch {
      // already stopped
    }
    this.voices.delete(pitch)
  }

  stopAll(): void {
    for (const pitch of [...this.voices.keys()]) {
      this.noteOff(pitch, 0.05)
    }
  }
}

export const synth = new PianoSynth()
