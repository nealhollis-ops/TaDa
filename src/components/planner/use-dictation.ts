"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Speak into any box. The words land in the box as they are recognised and stop
 * there: nothing is ever sent on the member's behalf, so a misheard word can be
 * read and fixed before it does anything.
 *
 * `onText` receives the running transcript. `onUnsupported` is called instead of
 * listening when the browser has no speech recognition, which is every browser
 * on iOS outside Safari, so the caller can say something useful.
 */
export function useDictation(onText: (text: string) => void, onUnsupported?: () => void) {
  const [listening, setListening] = useState(false);
  const recog = useRef<SpeechRecognition | null>(null);

  const toggle = useCallback(() => {
    const w = window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      onUnsupported?.();
      return;
    }
    if (listening && recog.current) {
      recog.current.stop();
      return;
    }
    const r = new SR();
    recog.current = r;
    r.lang = "en-US";
    r.interimResults = true;
    r.onresult = (ev: SpeechRecognitionEvent) => {
      let txt = "";
      for (let i = 0; i < ev.results.length; i++) txt += ev.results[i][0].transcript;
      onText(txt);
    };
    // Stopping speaking only fills the box; the member decides what happens next.
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    setListening(true);
    r.start();
  }, [listening, onText, onUnsupported]);

  return { listening, toggle };
}
