import fs from "fs";
import path from "path";
import type { CardMarketData } from "../api/types.js";

const PRICE_DIR = path.resolve("data/prices/pokemon/sets");

interface PriceSnapshot {
  price: number | null;
  change7d?: number | null;
  change30d?: number | null;
  change90d?: number | null;
  min7d?: number | null;
  max7d?: number | null;
  min30d?: number | null;
  max30d?: number | null;
  minAllTime?: number | null;
  maxAllTime?: number | null;
}

type PriceHistoryFile = Record<string, Record<string, PriceSnapshot>>;

export function appendTodaysPrices(setId: string, cards: CardMarketData[]): void {
  const today = new Date().toISOString().split("T")[0];
  const filePath = path.join(PRICE_DIR, `${setId}.json`);

  let history: PriceHistoryFile = {};
  if (fs.existsSync(filePath)) {
    try { history = JSON.parse(fs.readFileSync(filePath, "utf-8")); } catch {}
  }

  for (const card of cards) {
    if (!history[card.id]) history[card.id] = {};
    history[card.id][today] = {
      price:      card.prices.rawCurrent,
      change7d:   card.prices.psa10Change7d,
      change30d:  card.prices.psa10Change30d,
      change90d:  card.prices.change90d,
      min7d:      card.prices.min7d,
      max7d:      card.prices.max7d,
      min30d:     card.prices.min30d,
      max30d:     card.prices.max30d,
      minAllTime: card.prices.minAllTime,
      maxAllTime: card.prices.maxAllTime,
    };
  }

  fs.mkdirSync(PRICE_DIR, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
  console.log(`   💾 Price history updated: ${cards.length} cards → data/prices/pokemon/sets/${setId}.json`);
}

export function loadPriceSnapshot(setId: string, daysAgo: number): Map<string, number | null> {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const dateStr = d.toISOString().split("T")[0];
  const filePath = path.join(PRICE_DIR, `${setId}.json`);

  if (!fs.existsSync(filePath)) return new Map();
  try {
    const history: PriceHistoryFile = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const result = new Map<string, number | null>();
    for (const [cardId, dates] of Object.entries(history)) {
      if (dateStr in dates) result.set(cardId, dates[dateStr].price);
    }
    return result;
  } catch {
    return new Map();
  }
}

export function enrichWithPriceHistory(cards: CardMarketData[], setId: string): CardMarketData[] {
  const snap7d  = loadPriceSnapshot(setId, 7);
  const snap30d = loadPriceSnapshot(setId, 30);

  const hasHistory7  = snap7d.size > 0;
  const hasHistory30 = snap30d.size > 0;
  console.log(
    `\n📅 Price history: 7d ${hasHistory7 ? "✅" : "❌ (not enough data yet)"} | 30d ${hasHistory30 ? "✅" : "❌ (not enough data yet)"}`
  );

  const pctChange = (current: number | null, past: number | null | undefined): number | null => {
    if (current == null || past == null || past === 0) return null;
    return ((current - past) / past) * 100;
  };

  return cards.map((card) => {
    const curr   = card.prices.rawCurrent;
    const past7  = snap7d.get(card.id);
    const past30 = snap30d.get(card.id);
    return {
      ...card,
      prices: {
        ...card.prices,
        psa10Change7d:  pctChange(curr, past7)  ?? card.prices.psa10Change7d,
        psa10Change30d: pctChange(curr, past30) ?? card.prices.psa10Change30d,
      },
    };
  });
}
