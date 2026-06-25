import fs from "fs";
import path from "path";
import { fetchWithDelay } from "../fetch/client.js";
import type { CardMarketData } from "../fetch/types.js";

const JUSTTCG_KEY = process.env.JUSTTCG_API_KEY ?? "";
const CATALOG_DIR = path.resolve("data/catalogs/pokemon/sets");
const PRICE_DIR   = path.resolve("data/prices/pokemon/sets");

// ── Types ─────────────────────────────────────────────────────────────────────

interface CatalogCard {
  // pokemontcg.io fields
  id: string;
  name: string;
  cardNumber: string;
  rarity: string;
  setName: string;
  subtypes?: string[];
  artUrl: string;
  // JustTCG fields — populated during enrichment, used for POST batch fetching
  justTcgCardId?: string;         // card-level uuid
  justTcgNmHoloVariantId?: string; // Near Mint Holofoil variant uuid — used in POST /cards
}

interface Catalog {
  setId: string;
  setName: string;
  printedTotal: number;
  totalCards: number;
  builtAt: string;
  justTcgId?: string;
  justTcgEnrichedAt?: string;  // set after full JustTCG card merge; absence triggers enrichment
  cards: CatalogCard[];
}

interface JustTcgCard {
  uuid?: string;
  name: string;
  number: string;
  rarity: string;
  variants: Array<{
    uuid?: string;
    condition?: string;
    printing: string;
    price: number | null;
    priceChange7d?: number | null;
    priceChange30d?: number | null;
    priceChange90d?: number | null;
    minPrice7d?: number | null;
    maxPrice7d?: number | null;
    minPrice30d?: number | null;
    maxPrice30d?: number | null;
    minPriceAllTime?: number | null;
    maxPriceAllTime?: number | null;
  }>;
}

// ── Catalog helpers ───────────────────────────────────────────────────────────

const TCG_KEY = process.env.POKEMON_TCG_API_KEY ?? "";

async function buildCatalog(setId: string): Promise<Catalog> {
  if (!TCG_KEY) throw new Error("POKEMON_TCG_API_KEY not set in .env — needed to build catalog for new sets");

  console.log(`   🔨 No catalog found for "${setId}" — building from pokemontcg.io...`);

  const setMeta = await fetchWithDelay<{ data: { name: string; printedTotal: number; total: number } }>(
    `https://api.pokemontcg.io/v2/sets/${setId}`,
    { "X-Api-Key": TCG_KEY }
  );
  const { name: setName, printedTotal, total } = setMeta.data;

  const allCards: CatalogCard[] = [];
  let page = 1;
  while (true) {
    const resp = await fetchWithDelay<{
      data: Array<{ id: string; name: string; number: string; rarity: string; subtypes?: string[]; images: { large: string }; set: { name: string } }>;
      totalCount: number;
    }>(
      `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&select=id,name,number,rarity,subtypes,images,set&pageSize=250&page=${page}`,
      { "X-Api-Key": TCG_KEY }
    );
    for (const c of resp.data) {
      const rarity = c.rarity ?? "";
      if (rarity === "Common" || rarity === "Uncommon" || rarity === "Energy") continue;
      allCards.push({ id: c.id, name: c.name, cardNumber: c.number, rarity, subtypes: c.subtypes, setName: c.set.name, artUrl: c.images.large });
    }
    console.log(`   Page ${page}: +${resp.data.length} cards → ${allCards.length}/${resp.totalCount}`);
    if (allCards.length >= resp.totalCount || resp.data.length === 0) break;
    page++;
  }

  allCards.sort((a, b) => (parseInt(a.cardNumber) || 0) - (parseInt(b.cardNumber) || 0));

  const catalog: Catalog = { setId, setName, printedTotal, totalCards: total, builtAt: new Date().toISOString(), cards: allCards };
  fs.mkdirSync(CATALOG_DIR, { recursive: true });
  fs.writeFileSync(path.join(CATALOG_DIR, `${setId}.json`), JSON.stringify(catalog, null, 2));
  console.log(`   💾 Catalog saved (${allCards.length} cards)\n`);
  return catalog;
}

async function ensureCatalog(setId: string): Promise<Catalog> {
  const filePath = path.join(CATALOG_DIR, `${setId}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Catalog;
  }
  return buildCatalog(setId);
}

function saveCatalog(catalog: Catalog): void {
  const filePath = path.join(CATALOG_DIR, `${catalog.setId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(catalog, null, 2));
}

// ── Price history ─────────────────────────────────────────────────────────────

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

// { cardId: { "2026-06-24": { price, change7d, ... } } }
type PriceHistoryFile = Record<string, Record<string, PriceSnapshot>>;

function appendTodaysPrices(setId: string, cards: CardMarketData[]): void {
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

const JUSTTCG_PAGE_SIZE = 20;

async function fetchTopCards(justTcgId: string, limit: number, printing = "Holofoil"): Promise<JustTcgCard[]> {
  const printingParam = printing ? `&printing=${printing}` : "";

  if (limit <= JUSTTCG_PAGE_SIZE) {
    const resp = await fetchWithDelay<{ data: JustTcgCard[] }>(
      `https://api.justtcg.com/v1/cards?set=${justTcgId}&orderBy=price&order=desc&limit=${limit}${printingParam}`,
      { "x-api-key": JUSTTCG_KEY }
    );
    return resp.data ?? [];
  }

  // Paginate when more than one page needed
  const all: JustTcgCard[] = [];
  let page = 1;
  while (all.length < limit) {
    const resp = await fetchWithDelay<{ data: JustTcgCard[] }>(
      `https://api.justtcg.com/v1/cards?set=${justTcgId}&orderBy=price&order=desc&limit=${JUSTTCG_PAGE_SIZE}&page=${page}${printingParam}`,
      { "x-api-key": JUSTTCG_KEY }
    );
    const batch = resp.data ?? [];
    all.push(...batch);
    if (batch.length < JUSTTCG_PAGE_SIZE) break; // last page
    page++;
  }
  return all.slice(0, limit);
}

async function enrichCatalogWithJustTcg(catalog: Catalog): Promise<void> {
  if (catalog.justTcgEnrichedAt) {
    console.log(`   ✅ Catalog already enriched (${catalog.justTcgEnrichedAt}) — skipping full fetch`);
    return;
  }

  console.log(`   🔄 Enriching catalog with JustTCG card IDs (one-time)...`);
  const allCards = await fetchTopCards(catalog.justTcgId!, catalog.totalCards, "");
  console.log(`   ✅ JustTCG returned ${allCards.length} cards for enrichment`);

  const byNumber = new Map(catalog.cards.map((c) => [cardNum(c.cardNumber), c]));
  const byName   = new Map(catalog.cards.map((c) => [normalizeName(c.name), c]));

  let merged = 0;
  for (const jt of allCards) {
    const num = cardNum(jt.number ?? "");
    const catalogCard = byNumber.get(num) ?? byName.get(normalizeName(jt.name));
    if (!catalogCard) continue;

    if (jt.uuid && !catalogCard.justTcgCardId) catalogCard.justTcgCardId = jt.uuid;

    const nmHolo = jt.variants?.find(
      (v) => v.condition === "Near Mint" && v.printing === "Holofoil"
    );
    if (nmHolo?.uuid && !catalogCard.justTcgNmHoloVariantId) {
      catalogCard.justTcgNmHoloVariantId = nmHolo.uuid;
    }

    merged++;
  }

  catalog.justTcgEnrichedAt = new Date().toISOString();
  saveCatalog(catalog);
  console.log(`   💾 Enriched ${merged} cards — catalog saved\n`);
}

function extractPrice(card: JustTcgCard) {
  const nmHolo = card.variants.find(
    (v) => v.condition === "Near Mint" && v.printing === "Holofoil" && v.price != null
  );
  const fallback = card.variants
    .filter((v) => v.price != null)
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))[0];
  const v = nmHolo ?? fallback;
  return {
    price:      v?.price ?? null,
    change7d:   v?.priceChange7d ?? null,
    change30d:  v?.priceChange30d ?? null,
    change90d:  v?.priceChange90d ?? null,
    min7d:      v?.minPrice7d ?? null,
    max7d:      v?.maxPrice7d ?? null,
    min30d:     v?.minPrice30d ?? null,
    max30d:     v?.maxPrice30d ?? null,
    minAllTime: v?.minPriceAllTime ?? null,
    maxAllTime: v?.maxPriceAllTime ?? null,
  };
}

// Strip " - 284/217" suffix JustTCG appends to some card names
function normalizeName(name: string): string {
  return name.replace(/\s*-\s*\d+\/\d+$/, "").trim().toLowerCase();
}

// Extract the numerator from a card number ("284/217" → "284", "098/094" → "98")
function cardNum(number: string): string {
  return number.split("/")[0].trim().replace(/^0+(\d)/, "$1");
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function fetchLivePrices(setId: string, topN = 8, cardFilter?: string[]): Promise<CardMarketData[]> {
  if (!JUSTTCG_KEY) throw new Error("JUSTTCG_API_KEY not set in .env");

  // 1. Load catalog (auto-builds from pokemontcg.io if missing)
  const catalog = await ensureCatalog(setId);
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

  // 2b. Enrich catalog with JustTCG card IDs — one-time per set, skipped if already done
  await enrichCatalogWithJustTcg(catalog);

  // 3. ONE call — fetch all cards when specific ones are requested, top N otherwise
  let jtCards: JustTcgCard[];
  if (cardFilter && cardFilter.length > 0) {
    const totalCards = catalog.totalCards ?? 500;
    console.log(`   📡 JustTCG: fetching all ${totalCards} cards for ${catalog.justTcgId} (card filter active)...`);
    jtCards = await fetchTopCards(catalog.justTcgId, totalCards);
  } else {
    const limit = Math.max(topN + 7, 15);
    console.log(`   📡 JustTCG: fetching top ${limit} cards for ${catalog.justTcgId}...`);
    jtCards = await fetchTopCards(catalog.justTcgId, limit);
  }
  console.log(`   ✅ JustTCG returned ${jtCards.length} cards\n`);

  // 4. Join with catalog + log every result
  const matched: CardMarketData[] = [];
  const unmatched: string[] = [];

  for (const jt of jtCards) {
    const { price, change7d, change30d, change90d, min7d, max7d, min30d, max30d, minAllTime, maxAllTime } = extractPrice(jt);
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
      if (jt.uuid && !catalogCard.justTcgCardId) catalogCard.justTcgCardId = jt.uuid;
      const nmHolo = jt.variants?.find((v) => v.condition === "Near Mint" && v.printing === "Holofoil");
      if (nmHolo?.uuid && !catalogCard.justTcgNmHoloVariantId) catalogCard.justTcgNmHoloVariantId = nmHolo.uuid;
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
          change90d,
          min7d, max7d,
          min30d, max30d,
          minAllTime, maxAllTime,
        },
      });
    } else {
      console.log(`   ⚠️  NO MATCH  ${jt.name} #${jt.number} — ${fmt(price)}`);
      unmatched.push(`${jt.name} #${jt.number}`);
    }
  }

  // Persist any newly cached JustTCG card IDs back to disk
  saveCatalog(catalog);

  // Append today's prices for all matched cards before slicing to topN
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
