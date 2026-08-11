import { midiToPitch, type Pitch } from './music'

/**
 * Simplified YIN pitch detection on a time-domain frame.
 * Returns frequency in Hz, or null if no clear pitch.
 * @see https://aubio.org/manpages/latest/yin.html (conceptually)
 */
export function detectPitchYin(
  buffer: Float32Array,
  sampleRate: number,
  threshold = 0.15,
): number | null {
  const size = buffer.length
  if (size < 64) return null

  // Difference function
  const yinBuffer = new Float32Array(Math.floor(size / 2))
  yinBuffer[0] = 1

  for (let tau = 1; tau < yinBuffer.length; tau += 1) {
    let sum = 0
    for (let i = 0; i < yinBuffer.length; i += 1) {
      const delta = buffer[i] - buffer[i + tau]
      sum += delta * delta
    }
    yinBuffer[tau] = sum
  }

  // Cumulative mean normalized difference
  let runningSum = 0
  yinBuffer[0] = 1
  for (let tau = 1; tau < yinBuffer.length; tau += 1) {
    runningSum += yinBuffer[tau]
    yinBuffer[tau] = runningSum === 0 ? 1 : (yinBuffer[tau] * tau) / runningSum
  }

  // Absolute threshold
  let tauEstimate = -1
  for (let tau = 2; tau < yinBuffer.length; tau += 1) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 < yinBuffer.length && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau += 1
      }
      tauEstimate = tau
      break
    }
  }

  if (tauEstimate === -1) return null

  // Parabolic interpolation
  const x0 = tauEstimate < 1 ? tauEstimate : tauEstimate - 1
  const x2 = tauEstimate + 1 < yinBuffer.length ? tauEstimate + 1 : tauEstimate
  let betterTau: number
  if (x0 === tauEstimate) {
    betterTau = yinBuffer[tauEstimate] <= yinBuffer[x2] ? tauEstimate : x2
  } else if (x2 === tauEstimate) {
    betterTau = yinBuffer[tauEstimate] <= yinBuffer[x0] ? tauEstimate : x0
  } else {
    const s0 = yinBuffer[x0]
    const s1 = yinBuffer[tauEstimate]
    const s2 = yinBuffer[x2]
    betterTau = tauEstimate + (s2 - s0) / (2 * (2 * s1 - s2 - s0))
  }

  const freq = sampleRate / betterTau
  // Guitar-ish usable range (low E2 ~82Hz to roughly E6)
  if (freq < 70 || freq > 1400) return null
  return freq
}

export function freqToNearestPitch(freqHz: number): Pitch {
  const midi = Math.round(69 + 12 * Math.log2(freqHz / 440))
  return midiToPitch(Math.max(12, Math.min(108, midi)))
}

export function rmsLevel(buffer: Float32Array): number {
  let sum = 0
  for (let i = 0; i < buffer.length; i += 1) {
    sum += buffer[i] * buffer[i]
  }
  return Math.sqrt(sum / buffer.length)
}
