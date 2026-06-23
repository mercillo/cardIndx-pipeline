export interface InsightLabel {
  label: string;
  color: string;
}

export interface TrendSignal {
  label: string;
  detail: string;
  color: string;
}

export interface PriceMath {
  pastPrice: number;
  dollarChange: number;
  pctChange: number;
}

export function getPriceTier(current: number | null): InsightLabel | null {
  if (current == null) return null;
  if (current >= 500) return { label: "ELITE", color: "#A78BFA" };
  if (current >= 200) return { label: "PREMIUM", color: "#60A5FA" };
  if (current >= 50) return { label: "MID", color: "#94A3B8" };
  return { label: "BUDGET", color: "#64748B" };
}

export function getMovementLabel(change7d: number | null | undefined): InsightLabel | null {
  if (change7d == null) return null;
  if (change7d >= 10) return { label: "SURGING", color: "#22C55E" };
  if (change7d >= 5) return { label: "RISING", color: "#4ADE80" };
  if (change7d >= -5) return { label: "STABLE", color: "#94A3B8" };
  if (change7d >= -10) return { label: "DECLINING", color: "#F87171" };
  return { label: "FALLING", color: "#EF4444" };
}

export function getTrendSignal(
  change7d: number | null | undefined,
  change30d: number | null | undefined
): TrendSignal | null {
  if (change7d == null || change30d == null) return null;
  const up7 = change7d > 0;
  const up30 = change30d > 0;

  if (!up30 && up7) return { label: "REVERSAL", detail: "was falling, now recovering", color: "#FBBF24" };
  if (up30 && up7 && change7d >= change30d) return { label: "MOMENTUM", detail: "sustained uptrend", color: "#22C55E" };
  if (up30 && up7 && change7d < change30d) return { label: "COOLING", detail: "pace slowing", color: "#94A3B8" };
  if (up30 && !up7) return { label: "FADING", detail: "losing steam", color: "#F87171" };
  return { label: "CONTINUED DIP", detail: "both timeframes down", color: "#EF4444" };
}

// Derive the past price from current price and % change
export function getPriceMath(current: number | null, pctChange: number | null | undefined): PriceMath | null {
  if (current == null || pctChange == null) return null;
  const pastPrice = current / (1 + pctChange / 100);
  const dollarChange = current - pastPrice;
  return { pastPrice, dollarChange, pctChange };
}
