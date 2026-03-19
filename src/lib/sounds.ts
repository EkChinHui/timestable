let ctx: AudioContext | null = null;
let muted = typeof localStorage !== 'undefined'
  ? localStorage.getItem('mt_muted') === 'true'
  : false;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('mt_muted', String(muted));
  }
  return muted;
}

function play(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  if (muted) return;
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

export function playCorrect() {
  play(523, 0.12); // C5
  setTimeout(() => play(659, 0.15), 80); // E5
}

export function playWrong() {
  play(200, 0.25, 'square', 0.15);
}

export function playStreak() {
  play(523, 0.08); // C5
  setTimeout(() => play(659, 0.08), 60); // E5
  setTimeout(() => play(784, 0.15), 120); // G5
}

export function playComplete() {
  play(523, 0.1);
  setTimeout(() => play(659, 0.1), 100);
  setTimeout(() => play(784, 0.1), 200);
  setTimeout(() => play(1047, 0.2), 300); // C6
}
