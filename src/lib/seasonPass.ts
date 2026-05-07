/**
 * Season Pass tiered pricing.
 * Price scales every 20 player levels.
 *   L1-19   → $9.99   (t1)
 *   L20-39  → $12.99  (t2)
 *   L40-59  → $15.99  (t3)
 *   L60-79  → $18.99  (t4)
 *   L80+    → $21.99  (t5)
 */
export interface SeasonPassTier {
  priceId: string;
  amountCents: number;
  display: string;
}

const TIERS: SeasonPassTier[] = [
  { priceId: "season_pass_t1_price", amountCents: 999, display: "$9.99" },
  { priceId: "season_pass_t2_price", amountCents: 1299, display: "$12.99" },
  { priceId: "season_pass_t3_price", amountCents: 1599, display: "$15.99" },
  { priceId: "season_pass_t4_price", amountCents: 1899, display: "$18.99" },
  { priceId: "season_pass_t5_price", amountCents: 2199, display: "$21.99" },
];

export function getSeasonPassTier(level: number): SeasonPassTier {
  const idx = Math.min(TIERS.length - 1, Math.max(0, Math.floor((level - 1) / 20)));
  return TIERS[idx];
}