import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Monster3D } from "./Monster3D";
import { Button } from "./ui/button";
import type { BattleState, ItemId, RunItem, TurnEvent } from "@/lib/combat";
import { MONSTERS } from "@/data/monsters";

interface Props {
  battle: BattleState;
  onAction: (a: "attack" | "defend" | "special") => void;
  onUseItem?: (id: ItemId) => void;
  loading?: boolean;
  recentEvents?: TurnEvent[];
  waveLabel?: string;
  items?: RunItem[];
  winStreak?: number;
}

const ELEMENT_EMOJI: Record<string, string> = {
  fire: "🔥", water: "💧", earth: "🌿", air: "💨", neutral: "✦",
};

const ITEM_META: Record<ItemId, { emoji: string; label: string }> = {
  potion: { emoji: "🧪", label: "Potion" },
  bomb: { emoji: "💣", label: "Bomb" },
  shield: { emoji: "🪄", label: "Shield" },
};

function monsterImage(id: string): string {
  return MONSTERS.find((m) => m.id === id)?.image ?? MONSTERS[0].image;
}

function StatBlock({ label, name, level, hp, a, d, s, tone }: { label: string; name: string; level: number; hp: number; a: number; d: number; s: number; tone: "you" | "enemy" }) {
  const accent = tone === "you" ? "border-emerald-400/60 bg-emerald-500/10" : "border-candy-red/60 bg-candy-red/10";
  const titleColor = tone === "you" ? "text-emerald-300" : "text-candy-red";
  return (
    <div className={`rounded-lg border-2 ${accent} px-3 py-2`} aria-label={`${label} ${name} stats`}>
      <div className="flex items-center justify-between text-xs font-display">
        <span className={titleColor}>{label}</span>
        <span className="text-cream/80 truncate ml-1">{name} Lv.{level}</span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 text-xs font-body">
        {[
          ["❤️", hp, "HP"],
          ["⚔️", a, "ATK"],
          ["🛡️", d, "DEF"],
          ["💨", s, "SPD"],
        ].map(([e, v, k]) => (
          <div key={String(k)} className="flex flex-col items-center rounded bg-black/30 px-1 py-1" title={String(k)}>
            <span aria-hidden="true">{e as string}</span>
            <span className="tabular-nums font-bold text-cream">{v as number}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusIcons({ c }: { c: { burn_turns?: number; poison_turns?: number; bleed_turns?: number; stun_turns?: number; freeze_turns?: number; shield_turns?: number } }) {
  const items: Array<[string, number | undefined, string]> = [
    ["🔥", c.burn_turns, "burn"],
    ["☠️", c.poison_turns, "poison"],
    ["🩸", c.bleed_turns, "bleed"],
    ["💫", c.stun_turns, "stun"],
    ["❄️", c.freeze_turns, "freeze"],
    ["🛡️", c.shield_turns, "shield"],
  ];
  return (
    <div className="flex gap-0.5 justify-center mt-0.5">
      {items.map(([e, n, k]) =>
        (n ?? 0) > 0 ? (
          <span key={k} title={`${k} (${n})`} className="text-[10px] leading-none">
            {e}<span className="text-cream/60 text-[8px]">{n}</span>
          </span>
        ) : null,
      )}
    </div>
  );
}

function HpBar({ current, max, side }: { current: number; max: number; side: "attacker" | "defender" }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const lowHp = pct < 30;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[10px] font-display text-cream mb-1">
        <span className="opacity-80">{side === "attacker" ? "YOU" : "ENEMY"}</span>
        <span className={lowHp ? "text-candy-red animate-pulse" : ""}>
          {current} / {max}
        </span>
      </div>
      <div className="h-3 rounded-full bg-black/40 border border-wood-dark overflow-hidden">
        <motion.div
          className={`h-full ${lowHp ? "bg-gradient-to-r from-candy-red to-orange-500" : "bg-gradient-to-r from-emerald-400 to-emerald-600"}`}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export function BattleArena({ battle, onAction, onUseItem, loading, recentEvents, waveLabel, items, winStreak }: Props) {
  const logRef = useRef<HTMLDivElement>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [flashKey, setFlashKey] = useState(0);
  const [cinematic, setCinematic] = useState<{ name: string; side: "attacker" | "defender" } | null>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [battle.log.length]);

  // Trigger shake/flash/cinematic from recent events
  useEffect(() => {
    if (!recentEvents || recentEvents.length === 0) return;
    const big = recentEvents.some((e) => e.damage && e.damage > 0);
    if (big) setShakeKey((k) => k + 1);
    const crit = recentEvents.some((e) => e.crit);
    if (crit) setFlashKey((k) => k + 1);
    const special = recentEvents.find((e) => e.action === "special");
    if (special) {
      const name = special.side === "attacker" ? battle.attacker_monster.signature_name : battle.defender_monster.signature_name;
      setCinematic({ name, side: special.side });
      const t = setTimeout(() => setCinematic(null), 900);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentEvents]);

  const atk = battle.attacker_monster;
  const def = battle.defender_monster;
  const atkHp = battle.attacker_hp;
  const defHp = battle.defender_hp;
  const canSpecial = battle.attacker_special_cd === 0 && battle.status === "active";
  const ended = battle.status === "ended";
  const lowSelf = atkHp / atk.max_hp < 0.25;
  const combo = atk.combo_count ?? 0;

  // Latest event used for floating damage numbers
  const lastEvent = recentEvents?.[recentEvents.length - 1];

  return (
    <motion.div
      key={`shake-${shakeKey}`}
      animate={shakeKey > 0 ? { x: [-6, 6, -3, 3, 0], y: [2, -2, 0, 0, 0] } : { x: 0, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative w-full max-w-2xl mx-auto rounded-2xl border-4 border-wood-dark bg-gradient-to-b from-[#1a0f2e] via-[#2d1b4e] to-[#0d0824] shadow-chunky overflow-hidden"
    >
      {waveLabel && (
        <div className="relative z-20 mx-auto mt-2 w-fit px-3 py-1 rounded-full bg-wood-dark border-2 border-gold text-gold font-display text-xs tracking-wider flex items-center gap-2">
          <span>{waveLabel}</span>
          {(winStreak ?? 0) > 0 && (
            <span className="text-[10px] text-orange-300">🔥 {winStreak}</span>
          )}
        </div>
      )}

      {/* Pre-fight stat readout — visible at battle start and remains as a quick reference */}
      <div className="relative z-20 mx-3 mt-2 grid grid-cols-2 gap-2 text-cream">
        <StatBlock label="YOU" name={atk.name} level={atk.level} hp={atk.max_hp} a={atk.atk} d={atk.def} s={atk.spd} tone="you" />
        <StatBlock label="ENEMY" name={def.name} level={def.level} hp={def.max_hp} a={def.atk} d={def.def} s={def.spd} tone="enemy" />
      </div>

      {/* Compact team total summary (HP/ATK/DEF/SPD) */}
      <div className="relative z-20 mx-3 mt-2 grid grid-cols-2 gap-2 text-cream text-xs font-display">
        <div className="rounded-md border border-emerald-400/40 bg-emerald-500/5 px-2 py-1.5 flex items-center justify-between">
          <span className="text-emerald-300">TEAM</span>
          <span className="tabular-nums">❤️ {atk.max_hp} ⚔️ {atk.atk} 🛡️ {atk.def} 💨 {atk.spd}</span>
        </div>
        <div className="rounded-md border border-candy-red/40 bg-candy-red/5 px-2 py-1.5 flex items-center justify-between">
          <span className="text-candy-red">OPP.</span>
          <span className="tabular-nums">❤️ {def.max_hp} ⚔️ {def.atk} 🛡️ {def.def} 💨 {def.spd}</span>
        </div>
      </div>

      {/* Low HP vignette */}
      <AnimatePresence>
        {lowSelf && (
          <motion.div
            key="vignette"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_120px_40px_rgba(220,38,38,0.55)] animate-pulse"
          />
        )}
      </AnimatePresence>

      {/* Crit white flash */}
      <AnimatePresence>
        {flashKey > 0 && (
          <motion.div
            key={`flash-${flashKey}`}
            initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute inset-0 z-30 bg-white"
          />
        )}
      </AnimatePresence>

      {/* Special move cinematic */}
      <AnimatePresence>
        {cinematic && (
          <motion.div
            key="cine"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/60"
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -8, opacity: 0 }}
              animate={{ scale: 1.05, rotate: 0, opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
              className={`font-display text-3xl md:text-4xl tracking-widest text-center px-6 py-3 rounded-xl border-4 ${
                cinematic.side === "attacker" ? "border-gold text-gold bg-gold/10" : "border-candy-red text-candy-red bg-candy-red/10"
              } drop-shadow-[0_0_18px_rgba(255,215,0,0.6)]`}
            >
              {cinematic.name.toUpperCase()}<span className="text-lg">!</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Arena floor gradient + glow */}
      <div className="relative h-52 sm:h-72 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(280_80%_30%/0.6),transparent_70%)]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-amber-900/40 to-transparent" />

        {/* Defender (top-right) */}
        <motion.div
          className="absolute right-3 top-2 sm:right-4 sm:top-6"
          animate={lastEvent?.side === "defender" && lastEvent.action !== "defend"
            ? { x: [-8, 0], rotate: [-2, 0] }
            : { x: 0, rotate: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Monster3D src={monsterImage(def.monster_id)} size={100} compact />
          <div className="text-center font-display text-xs text-cream mt-1 flex items-center justify-center gap-1">
            <span>{ELEMENT_EMOJI[def.element ?? "neutral"]}</span>
            <span>{def.name} Lv.{def.level}</span>
          </div>
          <StatusIcons c={def} />
        </motion.div>

        {/* Attacker (bottom-left) */}
        <motion.div
          className="absolute left-3 bottom-1 sm:left-4 sm:bottom-2"
          animate={lastEvent?.side === "attacker" && lastEvent.action !== "defend"
            ? { x: [8, 0], rotate: [2, 0] }
            : { x: 0, rotate: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Monster3D src={monsterImage(atk.monster_id)} size={100} compact />
          <div className="text-center font-display text-xs text-cream mt-1 flex items-center justify-center gap-1">
            <span>{ELEMENT_EMOJI[atk.element ?? "neutral"]}</span>
            <span>{atk.name} Lv.{atk.level}</span>
          </div>
          <StatusIcons c={atk} />
        </motion.div>

        {/* Floating damage numbers */}
        <AnimatePresence>
          {recentEvents?.map((e, i) => (
            e.damage ? (
              <motion.div
                key={`${battle.current_turn}-${i}-${e.side}`}
                initial={{ opacity: 0, y: 0, scale: 0.6 }}
                animate={{ opacity: 1, y: -40, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7 }}
                className={`absolute font-display text-2xl ${e.crit ? "text-yellow-300" : "text-candy-red"} drop-shadow-lg pointer-events-none`}
                style={{
                  left: e.side === "attacker" ? "70%" : "20%",
                  top: e.side === "attacker" ? "20%" : "60%",
                }}
              >
                -{e.damage}{e.crit ? "!" : ""}
              </motion.div>
            ) : null
          ))}
        </AnimatePresence>
      </div>

      {/* HP bars */}
      <div className="px-4 pt-3 pb-2 space-y-2 bg-wood/40 border-t-2 border-wood-dark">
        <HpBar current={defHp} max={def.max_hp} side="defender" />
        <HpBar current={atkHp} max={atk.max_hp} side="attacker" />
      </div>

      {/* Combo meter */}
      {combo > 0 && !ended && (
        <div className="px-4 pt-1 flex items-center gap-1 text-[10px] font-display text-amber-300">
          <span>COMBO</span>
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-1.5 flex-1 rounded ${n <= combo ? "bg-amber-300" : "bg-amber-300/15"}`} />
          ))}
          {combo >= 3 && <span className="ml-1 text-yellow-200">✦ FINISHER READY</span>}
        </div>
      )}

      {/* Battle log */}
      <div
        ref={logRef}
        className="mx-4 mt-2 h-14 sm:h-20 overflow-y-auto rounded bg-black/40 border border-wood-dark p-2 text-[11px] font-body text-cream/90 space-y-0.5"
      >
        {battle.log.map((e, i) => (
          <div key={i} className={
            e.crit ? "text-yellow-300"
            : e.bleed ? "text-rose-400"
            : e.burn ? "text-orange-400"
            : e.poison ? "text-purple-300"
            : e.stun ? "text-sky-300"
            : ""
          }>
            {e.text}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2 p-4">
        <Button
          variant="default"
          disabled={loading || ended}
          onClick={() => onAction("attack")}
          className="font-display"
        >
          ⚔️ Attack{combo >= 2 ? " ✦" : ""}
        </Button>
        <Button
          variant="secondary"
          disabled={loading || ended}
          onClick={() => onAction("defend")}
          className="font-display"
        >
          🛡️ Defend
        </Button>
        <Button
          variant={canSpecial ? "default" : "outline"}
          disabled={loading || ended || !canSpecial}
          onClick={() => onAction("special")}
          className="font-display"
          title={atk.signature_name}
        >
          {canSpecial ? "✨ Special" : `CD ${battle.attacker_special_cd}`}
        </Button>
      </div>

      {/* Item bar */}
      {items && items.length > 0 && onUseItem && (
        <div className="px-4 pb-3 flex items-center gap-2 border-t border-wood-dark/50 pt-2">
          <span className="text-[10px] font-display text-cream/60 mr-1">ITEMS</span>
          {items.filter((it) => it.count > 0).map((it) => {
            const meta = ITEM_META[it.id];
            return (
              <button
                key={it.id}
                onClick={() => onUseItem(it.id)}
                disabled={loading || ended}
                className="relative flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 border border-gold/40 text-cream text-xs hover:bg-black/60 hover:border-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title={meta.label}
              >
                <span className="text-base">{meta.emoji}</span>
                <span className="font-display text-[10px]">×{it.count}</span>
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}