// Synthesized sound effects using Web Audio API — no external files needed

let ctx: AudioContext | null = null;
let _muted = localStorage.getItem("sfx-muted") === "true";

// Background music state
let bgmGain: GainNode | null = null;
let bgmPlaying = false;
let bgmNodes: AudioScheduledSourceNode[] = [];

export function isMuted(): boolean {
  return _muted;
}

export function setMuted(muted: boolean) {
  _muted = muted;
  localStorage.setItem("sfx-muted", String(muted));
  if (muted) {
    stopBgm();
  } else {
    startBgm();
  }
}

function ensureCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function getCtx(): AudioContext | null {
  if (_muted) return null;
  return ensureCtx();
}

/** Start ambient background music loop */
export function startBgm() {
  if (_muted || bgmPlaying) return;
  const c = ensureCtx();
  bgmPlaying = true;

  // Master gain for BGM
  bgmGain = c.createGain();
  bgmGain.gain.setValueAtTime(0, c.currentTime);
  bgmGain.gain.linearRampToValueAtTime(0.06, c.currentTime + 2); // fade in
  bgmGain.connect(c.destination);

  // Layered ambient pads — dreamy, game-like atmosphere
  const chords = [
    [130.81, 164.81, 196.00], // C3, E3, G3
    [146.83, 185.00, 220.00], // D3, F#3, A3
    [123.47, 155.56, 185.00], // B2, Eb3, F#3
    [110.00, 138.59, 164.81], // A2, C#3, E3
  ];

  const loopDuration = 16; // seconds per full chord cycle

  const scheduleLoop = () => {
    if (!bgmPlaying || !bgmGain) return;
    const now = c.currentTime;

    chords.forEach((chord, ci) => {
      const chordStart = now + ci * (loopDuration / chords.length);
      const chordDur = loopDuration / chords.length;

      chord.forEach((freq) => {
        // Pad oscillator
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, chordStart);
        // Subtle vibrato
        const lfo = c.createOscillator();
        const lfoGain = c.createGain();
        lfo.frequency.setValueAtTime(0.3 + Math.random() * 0.4, chordStart);
        lfoGain.gain.setValueAtTime(1.5, chordStart);
        lfo.connect(lfoGain).connect(osc.frequency);
        lfo.start(chordStart);
        lfo.stop(chordStart + chordDur);

        // Envelope
        g.gain.setValueAtTime(0, chordStart);
        g.gain.linearRampToValueAtTime(0.5, chordStart + 0.8);
        g.gain.setValueAtTime(0.5, chordStart + chordDur - 0.8);
        g.gain.linearRampToValueAtTime(0, chordStart + chordDur);

        osc.connect(g).connect(bgmGain!);
        osc.start(chordStart);
        osc.stop(chordStart + chordDur + 0.1);
        bgmNodes.push(osc, lfo);
      });

      // Soft high shimmer
      const shimmer = c.createOscillator();
      const sg = c.createGain();
      shimmer.type = "triangle";
      shimmer.frequency.setValueAtTime(chord[2] * 2, chordStart);
      sg.gain.setValueAtTime(0, chordStart);
      sg.gain.linearRampToValueAtTime(0.15, chordStart + 1);
      sg.gain.setValueAtTime(0.15, chordStart + chordDur - 1);
      sg.gain.linearRampToValueAtTime(0, chordStart + chordDur);
      shimmer.connect(sg).connect(bgmGain!);
      shimmer.start(chordStart);
      shimmer.stop(chordStart + chordDur + 0.1);
      bgmNodes.push(shimmer);
    });

    // Schedule next loop
    setTimeout(() => {
      bgmNodes = [];
      scheduleLoop();
    }, loopDuration * 900); // slightly before end to overlap
  };

  scheduleLoop();
}

/** Stop background music */
export function stopBgm() {
  bgmPlaying = false;
  if (bgmGain) {
    const c = bgmGain.context;
    bgmGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.5);
    setTimeout(() => {
      bgmNodes.forEach((n) => { try { n.stop(); } catch {} });
      bgmNodes = [];
      bgmGain?.disconnect();
      bgmGain = null;
    }, 600);
  }
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

/** Triumphant fanfare for level-up */
export function sfxLevelUp() {
  const c = getCtx();
  if (!c) return;
  // Ascending major arpeggio with harmonics
  const notes = [523, 659, 784, 1047, 1319, 1568]; // C5 E5 G5 C6 E6 G6
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const osc2 = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc2.type = "triangle";
    const t = c.currentTime + i * 0.1;
    osc.frequency.setValueAtTime(freq, t);
    osc2.frequency.setValueAtTime(freq * 2, t);
    gain.gain.setValueAtTime(0.18 - i * 0.02, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.4);
    osc2.start(t);
    osc2.stop(t + 0.4);
  });
  // Final shimmer chord
  const shimmerTime = c.currentTime + notes.length * 0.1 + 0.05;
  [1047, 1319, 1568, 2093].forEach((freq) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, shimmerTime);
    g.gain.setValueAtTime(0.1, shimmerTime);
    g.gain.exponentialRampToValueAtTime(0.001, shimmerTime + 0.8);
    osc.connect(g).connect(c.destination);
    osc.start(shimmerTime);
    osc.stop(shimmerTime + 0.8);
  });
}
