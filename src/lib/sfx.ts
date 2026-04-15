// Synthesized sound effects using Web Audio API — no external files needed

let ctx: AudioContext | null = null;
let _muted = localStorage.getItem("sfx-muted") === "true";

export function isMuted(): boolean {
  return _muted;
}

export function setMuted(muted: boolean) {
  _muted = muted;
  localStorage.setItem("sfx-muted", String(muted));
}

function getCtx(): AudioContext | null {
  if (_muted) return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/** Short dice-rattle tick (called rapidly during roll animation) */
export function sfxDiceTick() {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(800 + Math.random() * 600, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.04);
  gain.gain.setValueAtTime(0.08, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.04);
}

/** Satisfying "pop" when the monster lands on a tile */
export function sfxLand() {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, c.currentTime + 0.12);
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.12);
}

/** Cheerful ascending chime for positive tile rewards */
export function sfxCoinGain() {
  const c = getCtx();
  if (!c) return;
  const notes = [523, 659, 784]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    const t = c.currentTime + i * 0.08;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  });
}

/** Ominous descending buzz for skull tile penalty */
export function sfxSkull() {
  const c = getCtx();
  if (!c) return;
  const osc1 = c.createOscillator();
  const gain1 = c.createGain();
  osc1.type = "sawtooth";
  osc1.frequency.setValueAtTime(200, c.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(60, c.currentTime + 0.4);
  gain1.gain.setValueAtTime(0.15, c.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
  osc1.connect(gain1).connect(c.destination);
  osc1.start();
  osc1.stop(c.currentTime + 0.4);

  const bufferSize = c.sampleRate * 0.3;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = c.createBufferSource();
  const noiseGain = c.createGain();
  noise.buffer = buffer;
  noiseGain.gain.setValueAtTime(0.06, c.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  noise.connect(noiseGain).connect(c.destination);
  noise.start();
  noise.stop(c.currentTime + 0.3);
}

/** Quick hop sound during movement */
export function sfxHop() {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(300, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(500, c.currentTime + 0.05);
  osc.frequency.exponentialRampToValueAtTime(250, c.currentTime + 0.08);
  gain.gain.setValueAtTime(0.1, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.08);
}
