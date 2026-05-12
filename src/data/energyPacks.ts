/**
 * Energy refill packs offered when the player is out of energy.
 * `paddlePriceId` is a placeholder — wire to real Paddle SKUs in admin/pricing
 * later. The ad-grant fallback uses the existing rewarded-ad flow and does not
 * require any product setup.
 */
export interface EnergyPack {
  id: string;
  name: string;
  energy: number;
  bonusCoins?: number;
  priceUsd: number;
  paddlePriceId: string;
  highlight?: boolean;
}

export const ENERGY_PACKS: EnergyPack[] = [
  { id: "energy_small",  name: "Quick Spark",  energy: 20,  priceUsd: 0.99, paddlePriceId: "pri_energy_small" },
  { id: "energy_medium", name: "Power Surge",  energy: 60,  bonusCoins: 250,  priceUsd: 2.99, paddlePriceId: "pri_energy_medium", highlight: true },
  { id: "energy_mega",   name: "Mega Battery", energy: 200, bonusCoins: 1000, priceUsd: 7.99, paddlePriceId: "pri_energy_mega" },
];

export const AD_REFILL_AMOUNT = 5;