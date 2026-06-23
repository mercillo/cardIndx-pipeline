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
  };
}
