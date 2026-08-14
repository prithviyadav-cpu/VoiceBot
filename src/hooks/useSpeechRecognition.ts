'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Options = {
  /** Fired once per utterance with the finalized transcript. */
  onFinal: (transcript: string) => void;
  onError?: (message: string) => void;
};

const ERROR_COPY: Record<string, string> = {
  'no-speech': "I didn't catch that. Try again.",
  'audio-capture': 'No microphone found. Check your input device.',
  'not-allowed': 'Microphone access was blocked. Allow it in your browser settings.',
  'service-not-allowed': 'Speech recognition was blocked by the browser.',
  network: 'Speech recognition needs a network connection.',
  aborted: '',
};

/**
 * Wraps the Web Speech API for single-utterance dictation.
 *
 * `interimResults` is on so the UI can show words as they are recognized, but
 * only the final transcript is submitted.
 */
export function useSpeechRecognition({ onFinal, onError }: Options) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Callbacks are re-created each render; read them through refs so the
  // recognition instance is built exactly once.
  const onFinalRef = useRef(onFinal);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onFinalRef.current = onFinal;
    onErrorRef.current = onError;
  }, [onFinal, onError]);

  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setInterim('');
    };

    recognition.onresult = (event) => {
      let pending = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          const finalText = text.trim();
          setInterim('');
          if (finalText) onFinalRef.current(finalText);
          return;
        }
        pending += text;
      }
      setInterim(pending);
    };

    recognition.onerror = (event) => {
      const copy = ERROR_COPY[event.error] ?? `Speech recognition failed (${event.error}).`;
      if (copy) onErrorRef.current?.(copy);
    };

    recognition.onend = () => {
      setListening(false);
      setInterim('');
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    try {
      recognitionRef.current?.start();
    } catch {
      // start() throws InvalidStateError if already running; harmless.
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { supported, listening, interim, start, stop };
}
