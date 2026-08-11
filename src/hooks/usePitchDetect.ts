import { useCallback, useEffect, useRef, useState } from 'react'
import { detectPitchYin, freqToNearestPitch, rmsLevel } from '../lib/pitchDetect'
import type { Pitch } from '../lib/music'

export type MicStatus = 'idle' | 'requesting' | 'listening' | 'quiet' | 'denied' | 'error'

type UsePitchDetectOptions = {
  enabled?: boolean
  /** Minimum RMS to accept a pitch. */
  rmsThreshold?: number
  /** Require this many stable frames of the same pitch before note-on. */
  stableFrames?: number
  /** Ignore re-triggers of the same pitch within this window (ms). */
  retriggerMs?: number
  onNoteOn?: (pitch: Pitch, freqHz: number) => void
}

export function usePitchDetect({
  enabled = true,
  rmsThreshold = 0.012,
  stableFrames = 3,
  retriggerMs = 320,
  onNoteOn,
}: UsePitchDetectOptions = {}) {
  const [status, setStatus] = useState<MicStatus>('idle')
  const [lastPitch, setLastPitch] = useState<Pitch | null>(null)
  const [lastFreq, setLastFreq] = useState<number | null>(null)

  const onNoteOnRef = useRef(onNoteOn)
  onNoteOnRef.current = onNoteOn

  const streamRef = useRef<MediaStream | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)
  const stableRef = useRef<{ pitch: Pitch | null; count: number }>({ pitch: null, count: 0 })
  const lastEmitRef = useRef<{ pitch: Pitch | null; at: number }>({ pitch: null, at: 0 })

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    void ctxRef.current?.close()
    ctxRef.current = null
    stableRef.current = { pitch: null, count: 0 }
    setStatus('idle')
    setLastPitch(null)
    setLastFreq(null)
  }, [])

  const start = useCallback(async () => {
    if (!enabled) return
    stop()
    setStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      })
      streamRef.current = stream
      const ctx = new AudioContext()
      ctxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      const buffer = new Float32Array(analyser.fftSize)
      setStatus('listening')

      const tick = () => {
        analyser.getFloatTimeDomainData(buffer)
        const rms = rmsLevel(buffer)
        if (rms < rmsThreshold) {
          stableRef.current = { pitch: null, count: 0 }
          setStatus((s) => (s === 'denied' || s === 'error' || s === 'idle' ? s : 'quiet'))
          rafRef.current = requestAnimationFrame(tick)
          return
        }

        const freq = detectPitchYin(buffer, ctx.sampleRate)
        if (freq == null) {
          rafRef.current = requestAnimationFrame(tick)
          return
        }

        const pitch = freqToNearestPitch(freq)
        setLastFreq(freq)
        setLastPitch(pitch)
        setStatus('listening')

        if (stableRef.current.pitch === pitch) {
          stableRef.current.count += 1
        } else {
          stableRef.current = { pitch, count: 1 }
        }

        if (stableRef.current.count >= stableFrames) {
          const now = performance.now()
          const sameAsLast =
            lastEmitRef.current.pitch === pitch && now - lastEmitRef.current.at < retriggerMs
          if (!sameAsLast) {
            lastEmitRef.current = { pitch, at: now }
            onNoteOnRef.current?.(pitch, freq)
            // Reset so sustained notes don't spam; next note needs a fresh stable run.
            stableRef.current = { pitch, count: 0 }
          }
        }

        rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      setStatus(name === 'NotAllowedError' || name === 'PermissionDeniedError' ? 'denied' : 'error')
    }
  }, [enabled, stop, rmsThreshold, stableFrames, retriggerMs])

  useEffect(() => () => stop(), [stop])

  const message =
    status === 'idle'
      ? 'Mic off — enable to play on your guitar'
      : status === 'requesting'
        ? 'Requesting microphone…'
        : status === 'listening'
          ? lastPitch
            ? `Listening · ${lastPitch}${lastFreq ? ` (${Math.round(lastFreq)} Hz)` : ''}`
            : 'Listening for your guitar…'
          : status === 'quiet'
            ? 'Listening · play a note'
            : status === 'denied'
              ? 'Microphone permission denied'
              : 'Microphone unavailable'

  return {
    status,
    message,
    lastPitch,
    lastFreq,
    start,
    stop,
    isActive: status === 'listening' || status === 'quiet',
  }
}
