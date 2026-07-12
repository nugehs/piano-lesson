/**
 * Simple click metronome using the shared AudioContext pattern.
 */
export class Metronome {
  private ctx: AudioContext | null = null
  private timer: number | null = null
  private nextBeatAt = 0
  private beatIndex = 0
  onBeat: ((beatIndex: number) => void) | null = null

  private ensure(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume()
    }
    return this.ctx
  }

  async unlock(): Promise<void> {
    this.ensure()
  }

  get running(): boolean {
    return this.timer !== null
  }

  start(bpm: number, beatsPerBar = 4): void {
    this.stop()
    const ctx = this.ensure()
    const interval = 60 / bpm
    this.beatIndex = 0
    this.nextBeatAt = ctx.currentTime + 0.08

    const tick = () => {
      const now = ctx.currentTime
      while (this.nextBeatAt <= now + 0.05) {
        this.click(this.nextBeatAt, this.beatIndex % beatsPerBar === 0)
        this.onBeat?.(this.beatIndex)
        this.beatIndex += 1
        this.nextBeatAt += interval
      }
      this.timer = window.setTimeout(tick, 25)
    }
    tick()
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer)
      this.timer = null
    }
  }

  private click(time: number, accent: boolean): void {
    const ctx = this.ensure()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(accent ? 1320 : 880, time)
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.exponentialRampToValueAtTime(accent ? 0.22 : 0.12, time + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(time)
    osc.stop(time + 0.1)
  }
}

export const metronome = new Metronome()
