/** Text-to-speech through the browser's built-in, offline-capable Web Speech API. */

let voice: SpeechSynthesisVoice | null = null;
let lastText = '';
let lastAt = 0;

function supported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function pickVoice(): void {
  const voices = speechSynthesis.getVoices();
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  voice =
    english.find((v) => v.lang === 'en-US' && v.localService) ??
    english.find((v) => v.localService) ??
    english[0] ??
    null;
}

if (supported()) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

/**
 * Speaks `text`, interrupting anything being spoken. Repeated requests for
 * the same text within a short time are ignored (e.g. hover + click).
 */
export function speak(text: string): void {
  if (!supported()) return;
  const now = Date.now();
  if (text === lastText && now - lastAt < 700 && speechSynthesis.speaking) return;
  lastText = text;
  lastAt = now;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang ?? 'en-US';
  if (voice) u.voice = voice;
  u.rate = 0.9;
  speechSynthesis.speak(u);
}
