// Synthesized sound effects using Web Audio API — no external files needed

let ctx: AudioContext | null = null;
let _muted = localStorage.getItem("sfx-muted") === "true";

// --- Per-category SFX volumes & master toggle -------------------------------
export type SfxCategory = "coin" | "skull" | "win";

const VOL_KEYS: Record<SfxCategory, string> = {
  coin: "sfx.vol.coin",
  skull: "sfx.vol.skull",
  win: "sfx.vol.win",
};
const MASTER_KEY = "sfx.master.enabled";
const VOL_EVT = "sfx.vol.change";

function readVol(cat: SfxCategory): number {
  try {
    const v = localStorage.getItem(VOL_KEYS[cat]);
    if (v == null) return 0.8;
    const n = parseFloat(v);
    return isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.8;
  } catch { return 0.8; }
}
let _volumes: Record<SfxCategory, number> = {
  coin: readVol("coin"),
  skull: readVol("skull"),
  win: readVol("win"),
};
let _masterEnabled = (() => {
  try { return localStorage.getItem(MASTER_KEY) !== "false"; } catch { return true; }
})();

export function getVolume(cat: SfxCategory): number { return _volumes[cat]; }
export function setVolume(cat: SfxCategory, v: number) {
  const clamped = Math.max(0, Math.min(1, v));
  _volumes = { ..._volumes, [cat]: clamped };
  try { localStorage.setItem(VOL_KEYS[cat], String(clamped)); } catch {}
  window.dispatchEvent(new CustomEvent(VOL_EVT));
}
export function getMasterEnabled(): boolean { return _masterEnabled; }
export function setMasterEnabled(v: boolean) {
  _masterEnabled = v;
  try { localStorage.setItem(MASTER_KEY, String(v)); } catch {}
  window.dispatchEvent(new CustomEvent(VOL_EVT));
}
export function subscribeSfxVolumes(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(VOL_EVT, handler);
  return () => window.removeEventListener(VOL_EVT, handler);
}

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
  if (!_masterEnabled) return null;
  return ensureCtx();
}

/** Start ambient background music loop */
export function startBgm() {
  if (_muted || bgmPlaying) return;
  const c = ensureCtx();
  bgmPlaying = true;

  // Master gain for BGM — slightly louder and quicker fade so the upbeat
  // groove kicks in without dragging.
  bgmGain = c.createGain();
  bgmGain.gain.setValueAtTime(0, c.currentTime);
  bgmGain.gain.linearRampToValueAtTime(0.085, c.currentTime + 1); // fade in
  bgmGain.connect(c.destination);

  // Bright, upbeat C-major progression with skipping arpeggios on top of
  // soft pads. Each chord lasts 2s instead of 4s — roughly doubles tempo.
  const chords = [
    [261.63, 329.63, 392.00], // C major  (C4 E4 G4)
    [293.66, 369.99, 440.00], // D major  (D4 F#4 A4)
    [329.63, 415.30, 493.88], // E major  (E4 G#4 B4)
    [261.63, 349.23, 440.00], // F major  (C4 F4 A4)
    [293.66, 369.99, 440.00], // D major
    [329.63, 392.00, 493.88], // C/E      (E4 G4 B4)
  ];

  const loopDuration = 12; // seconds per full happy progression

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
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, chordStart);
        // Subtle vibrato
        const lfo = c.createOscillator();
        const lfoGain = c.createGain();
        lfo.frequency.setValueAtTime(4 + Math.random() * 1.2, chordStart);
        lfoGain.gain.setValueAtTime(1.5, chordStart);
        lfo.connect(lfoGain).connect(osc.frequency);
        lfo.start(chordStart);
        lfo.stop(chordStart + chordDur);

        // Snappier envelope so chords feel rhythmic, not droning
        g.gain.setValueAtTime(0, chordStart);
        g.gain.linearRampToValueAtTime(0.45, chordStart + 0.08);
        g.gain.linearRampToValueAtTime(0.3, chordStart + chordDur - 0.15);
        g.gain.linearRampToValueAtTime(0, chordStart + chordDur);

        osc.connect(g).connect(bgmGain!);
        osc.start(chordStart);
        osc.stop(chordStart + chordDur + 0.1);
        bgmNodes.push(osc, lfo);
      });

      // Bouncy arpeggio melody on top — quick 8th-note pattern across the
      // chord tones to give the loop a happy, plucky feel.
      const arpPattern = [0, 1, 2, 1, 2, 1, 0, 1];
      const stepDur = chordDur / arpPattern.length;
      arpPattern.forEach((noteIdx, i) => {
        const t = chordStart + i * stepDur;
        const arp = c.createOscillator();
        const ag = c.createGain();
        arp.type = "triangle";
        arp.frequency.setValueAtTime(chord[noteIdx] * 2, t);
        ag.gain.setValueAtTime(0, t);
        ag.gain.linearRampToValueAtTime(0.18, t + 0.01);
        ag.gain.exponentialRampToValueAtTime(0.001, t + stepDur * 0.9);
        arp.connect(ag).connect(bgmGain!);
        arp.start(t);
        arp.stop(t + stepDur);
        bgmNodes.push(arp);
      });
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
  const v = _volumes.coin;
  if (v <= 0) return;
  const notes = [523, 659, 784]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    const t = c.currentTime + i * 0.08;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.15 * v, t);
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
  const v = _volumes.skull;
  if (v <= 0) return;
  const osc1 = c.createOscillator();
  const gain1 = c.createGain();
  osc1.type = "sawtooth";
  osc1.frequency.setValueAtTime(200, c.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(60, c.currentTime + 0.4);
  gain1.gain.setValueAtTime(0.15 * v, c.currentTime);
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
  noiseGain.gain.setValueAtTime(0.06 * v, c.currentTime);
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
  const v = _volumes.win;
  if (v <= 0) return;
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
    gain.gain.setValueAtTime((0.18 - i * 0.02) * v, t);
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
    g.gain.setValueAtTime(0.1 * v, shimmerTime);
    g.gain.exponentialRampToValueAtTime(0.001, shimmerTime + 0.8);
    osc.connect(g).connect(c.destination);
    osc.start(shimmerTime);
    osc.stop(shimmerTime + 0.8);
  });
}
