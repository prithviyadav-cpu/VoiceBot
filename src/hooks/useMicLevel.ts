'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Tracks live microphone loudness in a ref, without re-rendering.
 *
 * The value feeds a per-frame render loop in the 3D orb, so it must not go
 * through React state — 60 re-renders/sec would be visible jank. Callers read
 * `levelRef.current` inside their own animation frame.
 */
export function useMicLevel() {
  const levelRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    levelRef.current = 0;
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current) return true;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext();
      ctxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.75;
      ctx.createMediaStreamSource(stream).connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteTimeDomainData(buffer);

        // RMS around the 128 midpoint of unsigned 8-bit PCM.
        let sumSquares = 0;
        for (let i = 0; i < buffer.length; i += 1) {
          const centered = (buffer[i] - 128) / 128;
          sumSquares += centered * centered;
        }
        const rms = Math.sqrt(sumSquares / buffer.length);

        // Speech RMS sits well below 1.0; scale it into a usable 0..1 range.
        levelRef.current = Math.min(1, rms * 3.2);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      return true;
    } catch {
      stop();
      return false;
    }
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { levelRef, start, stop };
}
