import type { CardMarketData } from "../api/types.js";
import { ensureCatalog, saveCatalog } from "./catalog.js";
import { resolveJustTcgSetId, fetchTopCards, enrichCatalog, extractPrice, cacheJustTcgIds, normalizeName, cardNum } from "./justTcg.js";
import { appendTodaysPrices } from "./priceHistory.js";

const JUSTTCG_KEY = process.env.JUSTTCG_API_KEY ?? "";

export async function fetchLivePrices(setId: string, topN = 8, cardFilter?: string[]): Promise<CardMarketData[]> {
  if (!JUSTTCG_KEY) throw new Error("JUSTTCG_API_KEY not set in .env");

  // 1. Load catalog — auto-builds from pokemontcg.io on first run
  const catalog = await ensureCatalog(setId);
  const numberMap = new Map(catalog.cards.map((c) => [cardNum(c.cardNumber), c]));
  const nameMap   = new Map(catalog.cards.map((c) => [normalizeName(c.name), c]));

  // 2. Resolve JustTCG set ID — cached in catalog after first run
  if (!catalog.justTcgId) {
    catalog.justTcgId = await resolveJustTcgSetId(catalog.setName);
    saveCatalog(catalog);
    console.log(`   💾 JustTCG set ID cached in catalog\n`);
  } else {
    console.log(`   ✅ JustTCG set ID (cached): ${catalog.justTcgId}`);
  }

  // 3. Enrich catalog with JustTCG card UUIDs — runs once per set, skipped thereafter
  await enrichCatalog(catalog);

  // 4. Fetch live prices from JustTCG
  let jtCards;
  if (cardFilter && cardFilter.length > 0) {
    console.log(`   📡 JustTCG: fetching all ${catalog.totalCards} cards (card filter active)...`);
    jtCards = await fetchTopCards(catalog.justTcgId!, catalog.totalCards);
  } else {
    const limit = Math.max(topN + 7, 15);
    console.log(`   📡 JustTCG: fetching top ${limit} cards for ${catalog.justTcgId}...`);
    jtCards = await fetchTopCards(catalog.justTcgId!, limit);
  }
  console.log(`   ✅ JustTCG returned ${jtCards.length} cards\n`);

  // 5. Join JustTCG results with catalog
  const matched: CardMarketData[] = [];
  const unmatched: string[] = [];
  const fmt = (v: number | null) => (v != null ? `$${v.toFixed(2)}` : "N/A");
  const chg = (v: number | null) => (v != null ? ` (7d: ${v > 0 ? "+" : ""}${v.toFixed(1)}%)` : "");

  for (const jt of jtCards) {
    const { price, change7d, change30d, change90d, min7d, max7d, min30d, max30d, minAllTime, maxAllTime } = extractPrice(jt);
    const jtNum      = cardNum(jt.number ?? "");
    const catalogCard = numberMap.get(jtNum) ?? nameMap.get(normalizeName(jt.name));
    const matchedBy  = numberMap.get(jtNum) ? `#${jtNum}` : nameMap.get(normalizeName(jt.name)) ? "name" : null;

    if (catalogCard) {
      console.log(`   ✅ [${matchedBy}] ${jt.name} #${jt.number} — ${fmt(price)}${chg(change7d)}`);
      cacheJustTcgIds(jt, catalogCard);
      matched.push({
        id: catalogCard.id,
        name: catalogCard.name,
        cardNumber: jt.number ?? catalogCard.cardNumber,
        setId,
        setName: catalogCard.setName,
        subtypes: catalogCard.subtypes,
        rarity: catalogCard.rarity || undefined,
        artUrl: catalogCard.artUrl,
        prices: {
          rawCurrent: price,
          psa10Current: null,
          psa10Change7d: change7d,
          psa10Change30d: change30d,
          change90d, min7d, max7d, min30d, max30d, minAllTime, maxAllTime,
        },
      });
    } else {
      console.log(`   ⚠️  NO MATCH  ${jt.name} #${jt.number} — ${fmt(price)}`);
      unmatched.push(`${jt.name} #${jt.number}`);
    }
  }

  saveCatalog(catalog);
  appendTodaysPrices(setId, matched);

  console.log(
    `\n   📊 Match summary: ${matched.length} matched, ${unmatched.length} unmatched` +
      (unmatched.length > 0 ? `\n      Unmatched: ${unmatched.join(", ")}` : "")
  );

  const top = matched
    .filter((c) => c.prices.rawCurrent !== null)
    .sort((a, b) => (b.prices.rawCurrent ?? 0) - (a.prices.rawCurrent ?? 0))
    .slice(0, topN);

  if (top.length < topN) {
    console.warn(`   ⚠️  Only ${top.length}/${topN} cards ready for render — consider expanding catalog or limit`);
  }

  return top;
}
