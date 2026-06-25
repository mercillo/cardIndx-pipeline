export interface CardMarketData {
  id: string;
  name: string;
  cardNumber: string;
  setId?: string;
  setName: string;
  subtypes?: string[];
  rarity?: string;
  artUrl: string;
  prices: {
    rawCurrent: number | null;
    psa10Current: number | null;
    psa10Change7d: number | null;
    psa10Change30d: number | null;
    change90d?: number | null;
    min7d?: number | null;
    max7d?: number | null;
    min30d?: number | null;
    max30d?: number | null;
    minAllTime?: number | null;
    maxAllTime?: number | null;
  };
}
