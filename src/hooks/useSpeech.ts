'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Prefer a natural-sounding en-* voice over the platform default. */
const VOICE_PREFERENCE = [
  'Google UK English Male',
  'Microsoft Guy Online',
  'Daniel',
  'Google US English',
  'Samantha',
];

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  for (const name of VOICE_PREFERENCE) {
    const match = voices.find((v) => v.name === name);
    if (match) return match;
  }
  return voices.find((v) => v.lang.startsWith('en')) ?? null;
}

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  /** Character offset of the word currently being spoken, for caption sync. */
  const [charIndex, setCharIndex] = useState(0);

  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const mutedRef = useRef(muted);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) voiceRef.current = pickVoice(voices);
    };
    load();
    // Chrome populates the voice list asynchronously.
    window.speechSynthesis.addEventListener('voiceschanged', load);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const cancel = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeaking(false);
    setPaused(false);
    setCharIndex(0);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      if (mutedRef.current || !text.trim()) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      if (voiceRef.current) utterance.voice = voiceRef.current;

      utterance.onstart = () => {
        setSpeaking(true);
        setPaused(false);
        setCharIndex(0);
      };
      utterance.onboundary = (event) => {
        if (event.name === 'word' || event.name === undefined) setCharIndex(event.charIndex);
      };
      utterance.onpause = () => setPaused(true);
      utterance.onresume = () => setPaused(false);
      utterance.onend = () => {
        setSpeaking(false);
        setPaused(false);
        setCharIndex(0);
        utteranceRef.current = null;
      };
      utterance.onerror = () => {
        setSpeaking(false);
        setPaused(false);
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [],
  );

  const toggle = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    if (synth.speaking && !synth.paused) synth.pause();
    else if (synth.paused) synth.resume();
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((wasMuted) => {
      if (!wasMuted) cancel();
      return !wasMuted;
    });
  }, [cancel]);

  return { speak, cancel, toggle, toggleMute, speaking, paused, muted, charIndex };
}
