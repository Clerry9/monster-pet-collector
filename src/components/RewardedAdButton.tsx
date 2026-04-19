import { motion } from "framer-motion";
import { Tv, Loader2 } from "lucide-react";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import { toast } from "sonner";

interface Props {
  playerLevel: number;
  onReward: (coins: number) => void;
  className?: string;
  compact?: boolean;
}

export function RewardedAdButton({ playerLevel, onReward, className = "", compact = false }: Props) {
  const ad = useRewardedAd(playerLevel, (c) => {
    onReward(c);
    toast.success(`+${c} 🪙 from ad reward!`);
  });

  const label = ad.loading
    ? "Loading ad…"
    : ad.dailyLeft === 0
      ? "Daily limit reached"
      : ad.cooldownLeft > 0
        ? `Ready in ${Math.ceil(ad.cooldownLeft / 1000)}s`
        : compact
          ? `+${ad.reward} 🪙`
          : `Watch Ad — +${ad.reward} 🪙`;

  return (
    <motion.button
      whileTap={ad.canWatch ? { scale: 0.95 } : undefined}
      onClick={() => ad.watch()}
      disabled={!ad.canWatch}
      className={`relative rounded-full border-2 border-wood-dark px-4 py-2 font-display text-sm flex items-center justify-center gap-2 transition
        bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-chunky-sm
        disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      aria-label={label}
    >
      {ad.loading ? <Loader2 size={14} className="animate-spin" /> : <Tv size={14} />}
      <span>{label}</span>
      {ad.dailyLeft > 0 && !ad.loading && (
        <span className="text-[10px] opacity-80">({ad.dailyLeft} left today)</span>
      )}
    </motion.button>
  );
}
