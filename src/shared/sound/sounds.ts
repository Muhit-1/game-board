/**
 * Soft, synthesised UI sounds — short sine "tings" and knocks generated with the Web Audio API,
 * so there are no audio files to ship. Everything is kept quiet on purpose.
 */
export type SoundName = 'road' | 'settlement' | 'city' | 'robber' | 'erase' | 'error' | 'longest' | 'lost' | 'turn' | 'win';

const MASTER_VOLUME = 0.45;
const MUTE_KEY = 'game-board:muted';

let audioContext: AudioContext | null = null;
let muted = readMuted();

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    window.localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // Storage can be blocked (private windows); the mute choice then just lasts for this page.
  }
}

function getContext(): AudioContext | null {
  if (!audioContext) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  if (audioContext.state === 'suspended') void audioContext.resume();
  return audioContext;
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, type: OscillatorType = 'sine', volume = 0.07) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume * MASTER_VOLUME, start + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** A bell-like "ting": a fundamental plus a quieter inharmonic partial. */
function ting(ctx: AudioContext, frequency: number, start: number, duration = 0.9, volume = 0.06) {
  tone(ctx, frequency, start, duration, 'sine', volume);
  tone(ctx, frequency * 2.76, start, duration * 0.4, 'sine', volume * 0.25);
}

const PLAYERS: Record<SoundName, (ctx: AudioContext, t: number) => void> = {
  road: (ctx, t) => {
    tone(ctx, 196, t, 0.14, 'sine', 0.12);
    tone(ctx, 392, t, 0.07, 'triangle', 0.04);
  },
  settlement: (ctx, t) => {
    tone(ctx, 523, t, 0.25);
    tone(ctx, 659, t + 0.09, 0.3);
  },
  city: (ctx, t) => {
    tone(ctx, 523, t, 0.25);
    tone(ctx, 659, t + 0.09, 0.25);
    tone(ctx, 784, t + 0.18, 0.4);
  },
  robber: (ctx, t) => {
    tone(ctx, 110, t, 0.4, 'triangle', 0.12);
    tone(ctx, 82, t + 0.05, 0.4, 'sine', 0.1);
  },
  erase: (ctx, t) => {
    tone(ctx, 440, t, 0.12);
    tone(ctx, 330, t + 0.08, 0.18);
  },
  error: (ctx, t) => {
    tone(ctx, 220, t, 0.14, 'triangle', 0.07);
    tone(ctx, 196, t + 0.12, 0.2, 'triangle', 0.07);
  },
  longest: (ctx, t) => {
    ting(ctx, 1175, t);
    ting(ctx, 1480, t + 0.13);
    ting(ctx, 1760, t + 0.26, 1.3);
  },
  lost: (ctx, t) => {
    tone(ctx, 587, t, 0.3);
    tone(ctx, 440, t + 0.14, 0.5);
  },
  turn: (ctx, t) => ting(ctx, 988, t, 0.8, 0.05),
  win: (ctx, t) => {
    [523, 659, 784, 1047].forEach((f, i) => tone(ctx, f, t + i * 0.05, 1.4, 'sine', 0.05));
    ting(ctx, 2093, t + 0.2, 1.6, 0.04);
  },
};

export function playSound(name: SoundName): void {
  if (muted) return;
  const ctx = getContext();
  if (!ctx) return;
  PLAYERS[name](ctx, ctx.currentTime);
}
