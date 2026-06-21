import React from "react";
import {
  AbsoluteFill,
  Series,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
  Img,
  Sequence,
} from "remotion";
import { loadFont as loadTitan } from "@remotion/google-fonts/TitanOne";
import { loadFont as loadFigtree } from "@remotion/google-fonts/Figtree";

const titan = loadTitan("normal", { weights: ["400"], subsets: ["latin"] });
const figtree = loadFigtree("normal", { weights: ["700", "900"], subsets: ["latin"] });

const DISPLAY = titan.fontFamily;
const BODY = figtree.fontFamily;

// palette
const C = {
  bg1: "#1a0a2e",
  bg2: "#3d1466",
  hot: "#ff3d8b",
  yellow: "#ffd23f",
  cyan: "#3ddbff",
  lime: "#aaff3d",
  white: "#fff8ee",
};

const VariantCtx = React.createContext<Variant>(null as any);
const useV = () => React.useContext(VariantCtx);

export type Variant = {
  hook1: string;
  hook2: string;
  tagline: string;
  attackName: string;
  damage: string;
  finisher: string;
  victory: string;
  ctaLine1: string;
  ctaLine2: string;
  /** Body-motion intensity preset. Scales lunges, squash/stretch and idle sway. */
  intensity?: "subtle" | "balanced" | "exaggerated";
};

// Intensity multipliers applied to MonsterBody offsets/scales.
// "balanced" = 1.0 baseline; subtle dials motion down, exaggerated amps it up.
export const INTENSITY: Record<NonNullable<Variant["intensity"]>, number> = {
  subtle: 0.55,
  balanced: 1,
  exaggerated: 1.7,
};

export const VARIANTS: Record<string, Variant> = {
  original: {
    hook1: "MONSTER",
    hook2: "BATTLE!",
    tagline: "COLLECT • TRAIN • WIN",
    attackName: "EMBER BLAST!",
    damage: "-440",
    finisher: "CRITICAL!",
    victory: "VICTORY!",
    ctaLine1: "COLLECT 100+ MONSTERS.",
    ctaLine2: "BATTLE. LEVEL UP. RULE THE ARENA.",
    intensity: "balanced",
  },
  hookA: {
    hook1: "CAN YOU",
    hook2: "WIN THIS?",
    tagline: "TAP • ROLL • CRUSH",
    attackName: "INFERNO FANG!",
    damage: "-512",
    finisher: "MEGA HIT!",
    victory: "FLAWLESS!",
    ctaLine1: "BUILD THE ULTIMATE SQUAD.",
    ctaLine2: "PLAY FREE TODAY.",
    intensity: "subtle",
  },
  hookB: {
    hook1: "ONE TAP.",
    hook2: "BIG K.O.",
    tagline: "FAST • FIERCE • FUN",
    attackName: "PYRO STRIKE!",
    damage: "-678",
    finisher: "PERFECT!",
    victory: "DOMINATED!",
    ctaLine1: "100+ MONSTERS TO HUNT.",
    ctaLine2: "JOIN THE ARENA NOW.",
    intensity: "exaggerated",
  },
  hookC: {
    hook1: "READY",
    hook2: "TO BRAWL?",
    tagline: "ROLL • RAGE • REIGN",
    attackName: "BLAZE COMBO!",
    damage: "-999",
    finisher: "ULTRA KO!",
    victory: "CHAMPION!",
    ctaLine1: "EVOLVE YOUR TEAM.",
    ctaLine2: "DOWNLOAD & PLAY FREE.",
    intensity: "balanced",
  },
};

const Bg: React.FC<{ shift?: number }> = ({ shift = 0 }) => {
  const frame = useCurrentFrame();
  const t = (frame + shift) / 30;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${50 + Math.sin(t) * 10}% ${50 + Math.cos(t * 0.7) * 10}%, ${C.bg2}, ${C.bg1} 70%)`,
      }}
    />
  );
};

// ============================================================
// MonsterBody — fakes humanoid body motion on a static monster image.
// Modes: idle (breathing), walk (stride + arm swing), windup (crouch & lean
// back), attack (forward thrust + stretch), hit (flinch shake), ko (limp
// rotate, parent handles fall), victory (arms-up bounce).
// transformOrigin is bottom center so the "feet" stay planted.
// ============================================================
type BodyMode = "idle" | "walk" | "windup" | "attack" | "hit" | "ko" | "victory";

const MonsterBody: React.FC<{
  src: string;
  width: number;
  mode: BodyMode;
  facing?: 1 | -1; // 1 = facing right, -1 = facing left
  glow?: string;
  brightness?: number;
  grayscale?: number;
  frameOffset?: number; // for syncing
}> = ({ src, width, mode, facing = 1, glow, brightness, grayscale, frameOffset = 0 }) => {
  const f = useCurrentFrame() + frameOffset;

  // Default body offsets
  let translateY = 0;
  let translateX = 0;
  let rotate = 0;
  let scaleX = 1;
  let scaleY = 1;
  // Simulated "arm/limb" swing via skew gives a sense of body twist
  let skewX = 0;

  if (mode === "idle") {
    // chest breathing — gentle Y bob and scaleY pulse
    translateY = Math.sin(f / 12) * 6;
    scaleY = 1 + Math.sin(f / 12) * 0.015;
    scaleX = 1 - Math.sin(f / 12) * 0.01;
    rotate = Math.sin(f / 24) * 1.5;
  } else if (mode === "walk") {
    // Stride: vertical hop on each footfall (|sin|), forward sway, slight tilt
    const stride = Math.abs(Math.sin(f / 4));
    translateY = -stride * 18; // hop up on step
    translateX = Math.sin(f / 4) * 8;
    rotate = Math.sin(f / 4) * 6; // body twist with each step
    skewX = Math.sin(f / 4) * 3; // arms swinging
    scaleY = 1 - stride * 0.04; // tiny squash on landing
    scaleX = 1 + stride * 0.03;
  } else if (mode === "windup") {
    // Coil back: lean away, crouch
    const w = Math.min(1, f / 10);
    translateX = -16 * w * facing;
    translateY = 8 * w;
    rotate = -10 * w * facing;
    scaleY = 1 - 0.08 * w;
    scaleX = 1 + 0.06 * w;
  } else if (mode === "attack") {
    // Forward thrust: explosive scale + lean in
    const a = Math.min(1, f / 6);
    translateX = 28 * a * facing;
    translateY = -10 * a;
    rotate = 14 * a * facing;
    scaleX = 1 + 0.12 * a;
    scaleY = 1 - 0.06 * a;
    skewX = 8 * a * facing;
  } else if (mode === "hit") {
    // Flinch: jitter rotate, head-back recoil
    rotate = Math.sin(f * 5) * 8 - 6 * facing;
    translateY = Math.sin(f * 4) * 4;
    scaleX = 0.96;
    scaleY = 1.04;
  } else if (mode === "ko") {
    // Limp: slight wobble
    rotate = Math.sin(f / 6) * 2;
    scaleY = 0.96;
  } else if (mode === "victory") {
    // Jumping celebration
    const j = Math.abs(Math.sin(f / 10));
    translateY = -j * 40;
    scaleY = 1 + j * 0.08;
    scaleX = 1 - j * 0.04;
    rotate = Math.sin(f / 14) * 4;
  }

  const filterParts: string[] = [];
  if (brightness != null) filterParts.push(`brightness(${brightness})`);
  if (grayscale != null) filterParts.push(`grayscale(${grayscale})`);
  if (glow) filterParts.push(`drop-shadow(0 0 60px ${glow})`);
  filterParts.push("drop-shadow(0 30px 30px rgba(0,0,0,0.5))");

  return (
    <div
      style={{
        width,
        transformOrigin: "50% 100%",
        transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) skewX(${skewX}deg) scale(${scaleX}, ${scaleY})`,
        display: "inline-block",
      }}
    >
      <Img
        src={src}
        style={{
          width,
          transform: facing === -1 ? "scaleX(-1)" : undefined,
          filter: filterParts.join(" "),
        }}
      />
    </div>
  );
};

const Confetti: React.FC<{ count?: number; colors?: string[] }> = ({ count = 40, colors = [C.hot, C.yellow, C.cyan, C.lime] }) => {
  const frame = useCurrentFrame();
  const pieces = Array.from({ length: count }, (_, i) => {
    const seed = i * 9301 + 49297;
    const rx = ((seed * 17) % 1000) / 1000;
    const ry = ((seed * 31) % 1000) / 1000;
    const speed = 0.5 + ((seed * 7) % 100) / 100;
    const drift = Math.sin((frame + i * 5) / 20) * 30;
    const y = (ry * 1080 + frame * speed * 4) % 1200 - 100;
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: rx * 1920 + drift,
          top: y,
          width: 14,
          height: 14,
          background: colors[i % colors.length],
          transform: `rotate(${frame * 4 + i * 30}deg)`,
          borderRadius: i % 3 === 0 ? "50%" : 2,
        }}
      />
    );
  });
  return <AbsoluteFill>{pieces}</AbsoluteFill>;
};

// SCENE 1 — Title hook (60f / 2s)
const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = useV();
  const pop = spring({ frame, fps, config: { damping: 10, stiffness: 180 } });
  const subPop = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const slamScale = interpolate(pop, [0, 1], [3, 1]);
  const rotate = interpolate(pop, [0, 1], [-15, -3]);
  const flash = frame < 4 ? 1 : 0;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <Bg />
      <Confetti count={25} />
      <AbsoluteFill style={{ background: C.white, opacity: flash }} />
      <div
        style={{
          transform: `scale(${slamScale}) rotate(${rotate}deg)`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY,
            fontSize: 220,
            color: C.yellow,
            WebkitTextStroke: `10px ${C.hot}`,
            textShadow: `0 14px 0 ${C.hot}, 0 24px 60px rgba(0,0,0,0.6)`,
            letterSpacing: -4,
            lineHeight: 0.9,
          }}
        >
          {v.hook1}
        </div>
        <div
          style={{
            fontFamily: DISPLAY,
            fontSize: 220,
            color: C.cyan,
            WebkitTextStroke: `10px ${C.hot}`,
            textShadow: `0 14px 0 ${C.hot}, 0 24px 60px rgba(0,0,0,0.6)`,
            letterSpacing: -4,
            lineHeight: 0.9,
          }}
        >
          {v.hook2}
        </div>
        <div
          style={{
            transform: `scale(${subPop})`,
            marginTop: 24,
            fontFamily: BODY,
            fontWeight: 900,
            fontSize: 44,
            color: C.white,
            letterSpacing: 8,
          }}
        >
          {v.tagline}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// SCENE 2 — VS intro (75f / 2.5s)
const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const left = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
  const right = spring({ frame: frame - 6, fps, config: { damping: 12, stiffness: 120 } });
  const vs = spring({ frame: frame - 28, fps, config: { damping: 6, stiffness: 200 } });
  const lx = interpolate(left, [0, 1], [-1100, 0]);
  const rx = interpolate(right, [0, 1], [1100, 0]);
  const slamFlash = frame > 24 && frame < 30 ? 0.5 : 0;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg shift={60} />
      <AbsoluteFill style={{ background: C.white, opacity: slamFlash }} />
      {/* diagonal split */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(110deg, ${C.hot} 0%, ${C.hot} 49%, transparent 49.2%, transparent 50.8%, ${C.cyan} 51%)`,
          opacity: 0.18,
        }}
      />
      {/* left monster */}
      <div style={{ position: "absolute", left: 120 + lx, top: 180, textAlign: "center" }}>
        <MonsterBody src={staticFile("images/m1.png")} width={620} mode="idle" />
        <div style={{ fontFamily: DISPLAY, fontSize: 64, color: C.yellow, marginTop: 8, WebkitTextStroke: `4px ${C.bg1}` }}>EMBERFANG</div>
        <div style={{ fontFamily: BODY, fontWeight: 900, color: C.white, fontSize: 28, letterSpacing: 3 }}>LVL 24 • FIRE</div>
      </div>
      {/* right monster */}
      <div style={{ position: "absolute", right: 120 - rx, top: 180, textAlign: "center" }}>
        <MonsterBody src={staticFile("images/m2.png")} width={620} mode="idle" frameOffset={9} />
        <div style={{ fontFamily: DISPLAY, fontSize: 64, color: C.cyan, marginTop: 8, WebkitTextStroke: `4px ${C.bg1}` }}>AQUAJAW</div>
        <div style={{ fontFamily: BODY, fontWeight: 900, color: C.white, fontSize: 28, letterSpacing: 3 }}>LVL 22 • AQUA</div>
      </div>
      {/* VS badge */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "44%",
          transform: `translate(-50%, -50%) scale(${vs}) rotate(${interpolate(vs, [0, 1], [-180, -8])}deg)`,
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY,
            fontSize: 360,
            color: C.white,
            WebkitTextStroke: `14px ${C.hot}`,
            textShadow: `0 20px 0 ${C.hot}, 0 30px 70px rgba(0,0,0,0.7)`,
          }}
        >
          VS
        </div>
      </div>
    </AbsoluteFill>
  );
};

const HpBar: React.FC<{ x: number; y: number; color: string; pct: number; label: string }> = ({ x, y, color, pct, label }) => (
  <div style={{ position: "absolute", left: x, top: y, width: 520 }}>
    <div style={{ fontFamily: BODY, fontWeight: 900, color: C.white, fontSize: 24, letterSpacing: 2, marginBottom: 8 }}>{label}</div>
    <div style={{ height: 36, background: "rgba(0,0,0,0.55)", borderRadius: 18, border: `4px solid ${C.white}`, overflow: "hidden", boxShadow: "0 6px 0 rgba(0,0,0,0.4)" }}>
      <div style={{ width: `${pct * 100}%`, height: "100%", background: `linear-gradient(90deg, ${color}, ${C.white})`, transition: "none" }} />
    </div>
  </div>
);

// SCENE 3 — Attack 1 (Emberfang hits Aquajaw) 90f
const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = useV();
  const charge = spring({ frame, fps, config: { damping: 20 } });
  const lunge = frame > 18 ? interpolate(frame, [18, 30], [0, 380], { extrapolateRight: "clamp" }) : 0;
  const recoil = frame > 30 ? interpolate(frame, [30, 50], [380, 80], { extrapolateRight: "clamp" }) : lunge;
  const hit = frame >= 28 && frame <= 34;
  const shake = hit ? Math.sin(frame * 4) * 18 : 0;
  const hpPct = frame < 30 ? 0.92 : interpolate(frame, [30, 45], [0.92, 0.48], { extrapolateRight: "clamp" });
  const burst = spring({ frame: frame - 28, fps, config: { damping: 8, stiffness: 220 } });
  const damageY = frame > 30 ? interpolate(frame, [30, 70], [0, -180], { extrapolateRight: "clamp" }) : 0;
  const damageOp = frame > 30 ? interpolate(frame, [30, 38, 70], [0, 1, 0]) : 0;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg shift={120} />
      {/* speed lines */}
      <AbsoluteFill style={{ background: "repeating-linear-gradient(90deg, transparent 0 60px, rgba(255,210,63,0.08) 60px 64px)", opacity: hit ? 1 : 0.3 }} />
      <HpBar x={80} y={80} color={C.lime} pct={1} label="EMBERFANG  HP" />
      <HpBar x={1320} y={80} color={hpPct > 0.5 ? C.lime : C.hot} pct={hpPct} label="AQUAJAW  HP" />

      {/* attacker */}
      <div style={{ position: "absolute", left: 180 + recoil, bottom: 120, transform: `rotate(${interpolate(charge, [0, 1], [-8, 6])}deg)` }}>
        <MonsterBody
          src={staticFile("images/m1.png")}
          width={560}
          mode={frame < 18 ? "windup" : "attack"}
          frameOffset={frame < 18 ? 0 : -18}
          glow="rgba(255,61,139,0.8)"
          facing={1}
        />
      </div>
      {/* defender */}
      <div style={{ position: "absolute", right: 180 + shake, bottom: 120 + (hit ? 30 : 0) }}>
        <MonsterBody
          src={staticFile("images/m2.png")}
          width={560}
          mode={hit ? "hit" : frame > 34 ? "hit" : "idle"}
          frameOffset={hit ? -28 : 0}
          brightness={hit ? 2.4 : undefined}
          facing={-1}
        />
      </div>
      {/* impact burst */}
      {frame > 26 && frame < 50 && (
        <div
          style={{
            position: "absolute",
            right: 360,
            bottom: 360,
            width: 400,
            height: 400,
            transform: `translate(50%, 50%) scale(${burst})`,
            background: `radial-gradient(circle, ${C.yellow} 0%, ${C.hot} 50%, transparent 70%)`,
            borderRadius: "50%",
            mixBlendMode: "screen",
            opacity: interpolate(frame, [26, 32, 50], [0, 1, 0]),
          }}
        />
      )}
      {/* damage number */}
      {frame > 30 && (
        <div
          style={{
            position: "absolute",
            right: 380,
            top: 380 + damageY,
            fontFamily: DISPLAY,
            fontSize: 180,
            color: C.yellow,
            WebkitTextStroke: `8px ${C.hot}`,
            textShadow: `0 8px 0 ${C.hot}`,
            opacity: damageOp,
            transform: "rotate(-8deg)",
          }}
        >
          {v.damage}
        </div>
      )}
      {/* move name */}
      {frame >= 6 && frame < 36 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 420, textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              padding: "16px 48px",
              background: C.hot,
              border: `6px solid ${C.white}`,
              borderRadius: 24,
              fontFamily: DISPLAY,
              fontSize: 84,
              color: C.white,
              letterSpacing: 4,
              transform: `scale(${spring({ frame: frame - 6, fps, config: { damping: 8 } })}) rotate(-4deg)`,
              boxShadow: `0 12px 0 ${C.bg1}`,
            }}
          >
            {v.attackName}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// SCENE 4 — Counter attack but Emberfang dodges & finishes (90f)
const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = useV();
  const aquaLunge = frame < 22 ? interpolate(frame, [4, 20], [0, 340], { extrapolateRight: "clamp" }) : interpolate(frame, [20, 32], [340, 100], { extrapolateRight: "clamp" });
  const dodgeY = frame > 14 && frame < 32 ? -240 : 0;
  const dodgeRot = frame > 14 && frame < 32 ? -20 : 0;
  // Counter strike: Emberfang slams back at 40
  const finishLunge = frame > 42 ? interpolate(frame, [42, 52], [0, 420], { extrapolateRight: "clamp" }) : 0;
  const finishRecoil = frame > 52 ? interpolate(frame, [52, 70], [420, 200], { extrapolateRight: "clamp" }) : finishLunge;
  const ko = frame > 52;
  const aquaHp = frame < 54 ? 0.48 : interpolate(frame, [54, 70], [0.48, 0], { extrapolateRight: "clamp" });
  const finishBurst = spring({ frame: frame - 52, fps, config: { damping: 6, stiffness: 200 } });
  const koShake = ko ? Math.sin(frame * 5) * 24 : 0;
  const koFall = ko ? interpolate(frame, [60, 90], [0, 260], { extrapolateRight: "clamp" }) : 0;
  const koRot = ko ? interpolate(frame, [60, 90], [0, 90], { extrapolateRight: "clamp" }) : 0;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg shift={200} />
      <AbsoluteFill style={{ background: ko && frame < 58 ? C.white : "transparent" }} />
      <HpBar x={80} y={80} color={C.lime} pct={1} label="EMBERFANG  HP" />
      <HpBar x={1320} y={80} color={aquaHp > 0.3 ? C.yellow : C.hot} pct={aquaHp} label="AQUAJAW  HP" />

      {/* Emberfang — dodges then strikes */}
      <div
        style={{
          position: "absolute",
          left: 180 + finishRecoil,
          bottom: 120 - dodgeY,
          transform: `rotate(${dodgeRot + (finishLunge > 0 ? 8 : 0)}deg)`,
        }}
      >
        <MonsterBody
          src={staticFile("images/m1.png")}
          width={560}
          mode={frame > 42 ? "attack" : frame > 14 && frame < 32 ? "walk" : "idle"}
          frameOffset={frame > 42 ? -42 : 0}
          glow="rgba(255,61,139,0.9)"
          facing={1}
        />
      </div>
      {/* Aquajaw — attacks then gets KO'd */}
      <div
        style={{
          position: "absolute",
          right: 180 + aquaLunge + koShake,
          bottom: 120 - koFall,
          transform: `rotate(${koRot}deg)`,
        }}
      >
        <MonsterBody
          src={staticFile("images/m2.png")}
          width={560}
          mode={ko ? "ko" : frame < 22 ? "attack" : "hit"}
          frameOffset={ko ? -52 : 0}
          grayscale={ko ? 0.6 : undefined}
          brightness={ko ? 0.7 : undefined}
          facing={-1}
        />
      </div>

      {/* Finishing burst */}
      {frame > 50 && frame < 78 && (
        <div
          style={{
            position: "absolute",
            right: 300,
            bottom: 320,
            width: 600,
            height: 600,
            transform: `translate(50%, 50%) scale(${finishBurst * 1.5})`,
            background: `radial-gradient(circle, ${C.white} 0%, ${C.yellow} 30%, ${C.hot} 60%, transparent 75%)`,
            borderRadius: "50%",
            mixBlendMode: "screen",
            opacity: interpolate(frame, [50, 56, 78], [0, 1, 0]),
          }}
        />
      )}

      {/* CRITICAL banner */}
      {frame > 50 && frame < 80 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              fontFamily: DISPLAY,
              fontSize: 200,
              color: C.yellow,
              WebkitTextStroke: `10px ${C.hot}`,
              transform: `rotate(-6deg) scale(${spring({ frame: frame - 50, fps, config: { damping: 7 } })})`,
              textShadow: `0 16px 0 ${C.hot}, 0 30px 60px rgba(0,0,0,0.7)`,
            }}
          >
            {v.finisher}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// SCENE 5 — Victory + CTA (135f / 4.5s)
const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = useV();
  const winPop = spring({ frame, fps, config: { damping: 8, stiffness: 180 } });
  const cta = spring({ frame: frame - 50, fps, config: { damping: 12 } });
  const logo = spring({ frame: frame - 80, fps, config: { damping: 14 } });
  const bob = Math.sin(frame / 8) * 16;
  const flash = frame < 4 ? 1 : 0;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg shift={300} />
      <Confetti count={60} />
      <AbsoluteFill style={{ background: C.white, opacity: flash }} />

      {/* Victorious monster */}
      <div style={{ position: "absolute", left: "50%", top: 140 + bob, transform: `translateX(-50%) scale(${winPop})` }}>
        <MonsterBody
          src={staticFile("images/m1.png")}
          width={520}
          mode="victory"
          glow="rgba(255,210,63,0.9)"
        />
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: 80,
        }}
      >
        <div
          style={{
            transform: `scale(${winPop}) rotate(-3deg)`,
            fontFamily: DISPLAY,
            fontSize: 200,
            color: C.yellow,
            WebkitTextStroke: `10px ${C.hot}`,
            textShadow: `0 16px 0 ${C.hot}, 0 30px 60px rgba(0,0,0,0.7)`,
            lineHeight: 0.9,
          }}
        >
          {v.victory}
        </div>
        <div
          style={{
            transform: `scale(${cta})`,
            marginTop: 28,
            fontFamily: BODY,
            fontWeight: 900,
            fontSize: 56,
            color: C.white,
            letterSpacing: 6,
            textAlign: "center",
          }}
        >
          {v.ctaLine1}
          <br />
          {v.ctaLine2}
        </div>
        <div
          style={{
            transform: `scale(${logo})`,
            marginTop: 36,
            padding: "20px 56px",
            background: C.hot,
            border: `6px solid ${C.white}`,
            borderRadius: 28,
            fontFamily: DISPLAY,
            fontSize: 64,
            color: C.white,
            letterSpacing: 4,
            boxShadow: `0 14px 0 ${C.bg1}`,
          }}
        >
          MONSTERPETCOL.COM
        </div>
      </div>
    </AbsoluteFill>
  );
};

export type MainVideoProps = {
  variantId?: keyof typeof VARIANTS;
};

export const MainVideo: React.FC<MainVideoProps> = ({ variantId = "original" }) => {
  const { width, height } = useVideoConfig();
  const variant = VARIANTS[variantId] ?? VARIANTS.original;
  // Native stage is designed at 1920x1080. Scale to fit canvas width.
  const STAGE_W = 1920;
  const STAGE_H = 1080;
  const scale = width / STAGE_W;
  const stageDisplayH = STAGE_H * scale;
  const offsetY = (height - stageDisplayH) / 2;

  return (
    <VariantCtx.Provider value={variant}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, ${C.bg2}, ${C.bg1} 75%)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: offsetY,
            width: STAGE_W,
            height: STAGE_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <Series>
            <Series.Sequence durationInFrames={60}><Scene1 /></Series.Sequence>
            <Series.Sequence durationInFrames={75}><Scene2 /></Series.Sequence>
            <Series.Sequence durationInFrames={90}><Scene3 /></Series.Sequence>
            <Series.Sequence durationInFrames={90}><Scene4 /></Series.Sequence>
            <Series.Sequence durationInFrames={135}><Scene5 /></Series.Sequence>
          </Series>
        </div>
      </AbsoluteFill>
    </VariantCtx.Provider>
  );
};