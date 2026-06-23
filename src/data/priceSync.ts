import fs from "fs";
import path from "path";
import { fetchWithDelay } from "../fetch/client.js";
import type { CardMarketData } from "../fetch/types.js";

const JUSTTCG_KEY = process.env.JUSTTCG_API_KEY ?? "";
const CATALOG_DIR = path.resolve("data/catalogs/pokemon/sets");

// ── Types ─────────────────────────────────────────────────────────────────────

interface CatalogCard {
  id: string;
  name: string;
  cardNumber: string;
  rarity: string;
  setName: string;
  artUrl: string;
}

interface Catalog {
  setId: string;
  setName: string;
  printedTotal: number;
  totalCards: number;
  builtAt: string;
  justTcgId?: string;
  cards: CatalogCard[];
}

interface JustTcgCard {
  name: string;
  number: string;
  rarity: string;
  variants: Array<{
    price: number | null;
    printing: string;
    priceChange7d?: number | null;
    priceChange30d?: number | null;
  }>;
}

// ── Catalog helpers ───────────────────────────────────────────────────────────

function loadCatalog(setId: string): Catalog {
  const filePath = path.join(CATALOG_DIR, `${setId}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `No catalog found for "${setId}". Run: npm run catalog -- --set-id ${setId}`
    );
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Catalog;
}

function saveCatalog(catalog: Catalog): void {
  const filePath = path.join(CATALOG_DIR, `${catalog.setId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(catalog, null, 2));
}

// ── JustTCG helpers ───────────────────────────────────────────────────────────

async function resolveJustTcgSetId(setName: string): Promise<string> {
  console.log(`   🔍 Resolving JustTCG set ID for "${setName}"...`);
  const resp = await fetchWithDelay<{ data: Array<{ id: string; name: string }> }>(
    `https://api.justtcg.com/v1/sets?game=Pokemon`,
    { "x-api-key": JUSTTCG_KEY }
  );
  const match = resp.data.find(
    (s) =>
      s.name.toLowerCase() === setName.toLowerCase() ||
      s.name.toLowerCase().includes(setName.toLowerCase())
  );
  if (!match) throw new Error(`Set "${setName}" not found in JustTCG`);
  console.log(`   ✅ JustTCG set ID: ${match.id}`);
  return match.id;
}

async function fetchTopCards(justTcgId: string, limit: number): Promise<JustTcgCard[]> {
  const resp = await fetchWithDelay<{ data: JustTcgCard[] }>(
    `https://api.justtcg.com/v1/cards?set=${justTcgId}&orderBy=price&order=desc&limit=${limit}&printing=Holofoil`,
    { "x-api-key": JUSTTCG_KEY }
  );
  return resp.data ?? [];
}

function extractPrice(card: JustTcgCard): { price: number | null; change7d: number | null; change30d: number | null } {
  const v = card.variants
    .filter((v) => v.price != null)
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))[0];
  return {
    price: v?.price ?? null,
    change7d: v?.priceChange7d ?? null,
    change30d: v?.priceChange30d ?? null,
  };
}

// Strip " - 284/217" suffix JustTCG appends to some card names
function normalizeName(name: string): string {
  return name.replace(/\s*-\s*\d+\/\d+$/, "").trim().toLowerCase();
}

// Extract the numerator from a card number ("284/217" → "284", "226" → "226")
function cardNum(number: string): string {
  return number.split("/")[0].trim();
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function fetchLivePrices(setId: string, topN = 8): Promise<CardMarketData[]> {
  if (!JUSTTCG_KEY) throw new Error("JUSTTCG_API_KEY not set in .env");

  // 1. Load catalog — build lookup maps by number (primary) and name (fallback)
  const catalog = loadCatalog(setId);
  const numberMap = new Map<string, CatalogCard>(
    catalog.cards.map((c) => [cardNum(c.cardNumber), c])
  );
  const nameMap = new Map<string, CatalogCard>(
    catalog.cards.map((c) => [normalizeName(c.name), c])
  );

  // 2. Resolve JustTCG set ID — cached in catalog after first run
  if (!catalog.justTcgId) {
    catalog.justTcgId = await resolveJustTcgSetId(catalog.setName);
    saveCatalog(catalog); // cache so future runs skip this call
    console.log(`   💾 JustTCG set ID cached in catalog\n`);
  } else {
    console.log(`   ✅ JustTCG set ID (cached): ${catalog.justTcgId}`);
  }

  // 3. ONE call: top 15 cards by price
  const limit = Math.max(topN + 7, 15); // buffer for mismatches
  console.log(`   📡 JustTCG: fetching top ${limit} cards for ${catalog.justTcgId}...`);
  const jtCards = await fetchTopCards(catalog.justTcgId, limit);
  console.log(`   ✅ JustTCG returned ${jtCards.length} cards\n`);

  // 4. Join with catalog + log every result
  const matched: CardMarketData[] = [];
  const unmatched: string[] = [];

  for (const jt of jtCards) {
    const { price, change7d, change30d } = extractPrice(jt);
    const fmt = (v: number | null) => (v != null ? `$${v.toFixed(2)}` : "N/A");
    const chg = (v: number | null) => (v != null ? ` (7d: ${v > 0 ? "+" : ""}${v.toFixed(1)}%)` : "");

    // Match by card number first (most reliable), fall back to name
    const jtNum = cardNum(jt.number ?? "");
    const byNumber = jtNum ? numberMap.get(jtNum) : undefined;
    const byName   = nameMap.get(normalizeName(jt.name));
    const catalogCard = byNumber ?? byName;
    const matchedBy = byNumber ? `#${jtNum}` : byName ? `name` : null;

    if (catalogCard) {
      console.log(`   ✅ [${matchedBy}] ${jt.name} #${jt.number} — ${fmt(price)}${chg(change7d)}`);
      matched.push({
        id: catalogCard.id,
        name: catalogCard.name,
        cardNumber: jt.number ?? catalogCard.cardNumber,
        setName: catalogCard.setName,
        artUrl: catalogCard.artUrl,
        prices: {
          rawCurrent: price,
          psa10Current: null,
          psa10Change7d: change7d,
          psa10Change30d: change30d,
        },
      });
    } else {
      console.log(`   ⚠️  NO MATCH  ${jt.name} #${jt.number} — ${fmt(price)}`);
      unmatched.push(`${jt.name} #${jt.number}`);
    }
  }

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
