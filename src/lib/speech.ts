/**
 * Text-to-speech through the browser's built-in, offline-capable Web Speech API.
 *
 * Speech engines differ in how they handle interruptions, so this module
 * avoids the patterns that are known to leave some of them silent:
 * - it only cancels when something is actually being spoken, and then waits a
 *   moment before speaking again (Safari/iOS and Chrome/Android can drop an
 *   utterance queued right after `cancel()`);
 * - it keeps a reference to the utterance being spoken (Chrome can garbage
 *   collect it mid-speech, after which its events never fire);
 * - it resets the engine (`cancel()` + `resume()`) whenever speech is turned
 *   on or off, so an engine left paused or jammed by an interruption recovers;
 * - a watchdog resets the engine and retries once if an utterance never starts.
 */

/** Wait after cancelling before speaking again. */
export const AFTER_CANCEL_MS = 80;
/** An utterance that hasn't started after this long is considered stuck. */
export const WATCHDOG_MS = 1500;
/** The same text requested again within this time is not repeated. */
const REPEAT_MS = 700;

let voice: SpeechSynthesisVoice | null = null;
let enabled = true;
let lastText = '';
let lastAt = 0;
/** The utterance being spoken, kept so that it isn't garbage-collected. */
let current: SpeechSynthesisUtterance | null = null;
let delayed: ReturnType<typeof setTimeout> | undefined;
let watchdog: ReturnType<typeof setTimeout> | undefined;

function synth(): SpeechSynthesis | null {
  return typeof globalThis !== 'undefined' && 'speechSynthesis' in globalThis ? globalThis.speechSynthesis : null;
}

function pickVoice(): void {
  const s = synth();
  if (!s) return;
  const english = s.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  voice =
    english.find((v) => v.lang === 'en-US' && v.localService) ??
    english.find((v) => v.localService) ??
    english[0] ??
    null;
}

{
  const s = synth();
  if (s) {
    pickVoice();
    s.addEventListener?.('voiceschanged', pickVoice);
  }
}

/** Stops everything and brings the engine back to a clean, unpaused state. */
function reset(): void {
  const s = synth();
  clearTimeout(delayed);
  clearTimeout(watchdog);
  current = null;
  lastText = '';
  if (!s) return;
  s.cancel();
  s.resume();
}

/** Turns text-to-speech on or off. */
export function setSpeechEnabled(on: boolean): void {
  enabled = on;
  reset();
}

/**
 * Speaks `text`, interrupting anything being spoken. Repeated requests for
 * the same text within a short time are ignored (e.g. hover + click).
 */
export function speak(text: string): void {
  const s = synth();
  if (!enabled || !s) return;
  const now = Date.now();
  if (text === lastText && now - lastAt < REPEAT_MS && current) return;
  lastText = text;
  lastAt = now;
  clearTimeout(delayed);
  clearTimeout(watchdog);

  const busy = s.speaking || s.pending || current !== null;
  if (s.paused) s.resume();
  if (busy) {
    current = null;
    s.cancel();
    delayed = setTimeout(() => utter(text, 1), AFTER_CANCEL_MS);
  } else {
    // Immediately, so that the first utterance stays within the user's gesture (needed on iOS).
    utter(text, 1);
  }
}

function utter(text: string, attempt: number): void {
  const s = synth();
  if (!enabled || !s) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang ?? 'en-US';
  if (voice) u.voice = voice;
  u.rate = 0.9;
  let started = false;
  u.onstart = () => {
    started = true;
    clearTimeout(watchdog);
  };
  u.onend = u.onerror = () => {
    if (current === u) current = null;
  };
  current = u;
  s.speak(u);
  watchdog = setTimeout(() => {
    if (started || current !== u || !enabled) return;
    // Stuck: reset the engine and try once more.
    current = null;
    s.cancel();
    s.resume();
    if (attempt < 2) delayed = setTimeout(() => utter(text, attempt + 1), AFTER_CANCEL_MS);
  }, WATCHDOG_MS);
}
