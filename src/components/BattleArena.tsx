import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Monster3D } from "./Monster3D";
import { Button } from "./ui/button";
import type { BattleState, TurnEvent } from "@/lib/combat";
import { MONSTERS } from "@/data/monsters";

interface Props {
  battle: BattleState;
  onAction: (a: "attack" | "defend" | "special") => void;
  loading?: boolean;
  recentEvents?: TurnEvent[];
  waveLabel?: string;
}

function monsterImage(id: string): string {
  return MONSTERS.find((m) => m.id === id)?.image ?? MONSTERS[0].image;
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

export function BattleArena({ battle, onAction, loading, recentEvents, waveLabel }: Props) {
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [battle.log.length]);

  const atk = battle.attacker_monster;
  const def = battle.defender_monster;
  const atkHp = battle.attacker_hp;
  const defHp = battle.defender_hp;
  const canSpecial = battle.attacker_special_cd === 0 && battle.status === "active";
  const ended = battle.status === "ended";

  // Latest event used for floating damage numbers
  const lastEvent = recentEvents?.[recentEvents.length - 1];

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-2xl border-4 border-wood-dark bg-gradient-to-b from-[#1a0f2e] via-[#2d1b4e] to-[#0d0824] shadow-chunky overflow-hidden">
      {waveLabel && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-wood-dark border-2 border-gold text-gold font-display text-xs tracking-wider">
          {waveLabel}
        </div>
      )}

      {/* Arena floor gradient + glow */}
      <div className="relative h-72 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(280_80%_30%/0.6),transparent_70%)]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-amber-900/40 to-transparent" />

        {/* Defender (top-right) */}
        <motion.div
          className="absolute right-4 top-6"
          animate={lastEvent?.side === "defender" && lastEvent.action !== "defend"
            ? { x: [-8, 0], rotate: [-2, 0] }
            : { x: 0, rotate: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Monster3D src={monsterImage(def.monster_id)} size={140} compact />
          <div className="text-center font-display text-xs text-cream mt-1">
            {def.name} Lv.{def.level}
          </div>
        </motion.div>

        {/* Attacker (bottom-left) */}
        <motion.div
          className="absolute left-4 bottom-2"
          animate={lastEvent?.side === "attacker" && lastEvent.action !== "defend"
            ? { x: [8, 0], rotate: [2, 0] }
            : { x: 0, rotate: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Monster3D src={monsterImage(atk.monster_id)} size={140} compact />
          <div className="text-center font-display text-xs text-cream mt-1">
            {atk.name} Lv.{atk.level}
          </div>
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

      {/* Battle log */}
      <div
        ref={logRef}
        className="mx-4 mt-2 h-20 overflow-y-auto rounded bg-black/40 border border-wood-dark p-2 text-[11px] font-body text-cream/90 space-y-0.5"
      >
        {battle.log.map((e, i) => (
          <div key={i} className={e.crit ? "text-yellow-300" : e.bleed ? "text-rose-400" : ""}>
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
          ⚔️ Attack
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
    </div>
  );
}