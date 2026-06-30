import { fetchWithDelay } from "../api/client.js";
import type { Catalog, CatalogCard } from "./catalog.js";
import { saveCatalog } from "./catalog.js";

const JUSTTCG_KEY = process.env.JUSTTCG_API_KEY ?? "";
const PAGE_SIZE = 20;

export interface JustTcgCard {
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

// Strip " - 284/217" suffix JustTCG appends to some card names
export function normalizeName(name: string): string {
  return name.replace(/\s*-\s*\d+\/\d+$/, "").trim().toLowerCase();
}

// Extract numerator from card number ("284/217" → "284", "098/094" → "98")
export function cardNum(number: string): string {
  return number.split("/")[0].trim().replace(/^0+(\d)/, "$1");
}

export async function resolveJustTcgSetId(setName: string): Promise<string> {
  console.log(`   🔍 Resolving JustTCG set ID for "${setName}"...`);
  const resp = await fetchWithDelay<{ data: Array<{ id: string; name: string }> }>(
    `https://api.justtcg.com/v1/sets?game=Pokemon`,
    { "x-api-key": JUSTTCG_KEY }
  );
  const match = resp.data.find(
    (s) => s.name.toLowerCase() === setName.toLowerCase() ||
           s.name.toLowerCase().includes(setName.toLowerCase())
  );
  if (!match) throw new Error(`Set "${setName}" not found in JustTCG`);
  console.log(`   ✅ JustTCG set ID: ${match.id}`);
  return match.id;
}

export async function fetchTopCards(justTcgId: string, limit: number, printing = "Holofoil"): Promise<JustTcgCard[]> {
  const printingParam = printing ? `&printing=${printing}` : "";

  if (limit <= PAGE_SIZE) {
    const resp = await fetchWithDelay<{ data: JustTcgCard[] }>(
      `https://api.justtcg.com/v1/cards?set=${justTcgId}&orderBy=price&order=desc&limit=${limit}${printingParam}`,
      { "x-api-key": JUSTTCG_KEY }
    );
    return resp.data ?? [];
  }

  const all: JustTcgCard[] = [];
  let page = 1;
  while (all.length < limit) {
    const resp = await fetchWithDelay<{ data: JustTcgCard[] }>(
      `https://api.justtcg.com/v1/cards?set=${justTcgId}&orderBy=price&order=desc&limit=${PAGE_SIZE}&page=${page}${printingParam}`,
      { "x-api-key": JUSTTCG_KEY }
    );
    const batch = resp.data ?? [];
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    page++;
  }
  return all.slice(0, limit);
}

export async function enrichCatalog(catalog: Catalog): Promise<void> {
  if (catalog.justTcgEnrichedAt) {
    console.log(`   ✅ Catalog already enriched (${catalog.justTcgEnrichedAt}) — skipping`);
    return;
  }

  console.log(`   🔄 Enriching catalog with JustTCG card IDs (one-time)...`);
  const allCards = await fetchTopCards(catalog.justTcgId!, catalog.totalCards, "");
  console.log(`   ✅ JustTCG returned ${allCards.length} cards for enrichment`);

  const byNumber = new Map(catalog.cards.map((c) => [cardNum(c.cardNumber), c]));
  const byName   = new Map(catalog.cards.map((c) => [normalizeName(c.name), c]));

  let merged = 0;
  for (const jt of allCards) {
    const catalogCard = byNumber.get(cardNum(jt.number ?? "")) ?? byName.get(normalizeName(jt.name));
    if (!catalogCard) continue;
    cacheJustTcgIds(jt, catalogCard);
    merged++;
  }

  catalog.justTcgEnrichedAt = new Date().toISOString();
  saveCatalog(catalog);
  console.log(`   💾 Enriched ${merged} cards — catalog saved\n`);
}

export function extractPrice(card: JustTcgCard) {
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

export function cacheJustTcgIds(jt: JustTcgCard, catalogCard: CatalogCard): void {
  if (jt.uuid && !catalogCard.justTcgCardId) catalogCard.justTcgCardId = jt.uuid;
  const nmHolo = jt.variants?.find((v) => v.condition === "Near Mint" && v.printing === "Holofoil");
  if (nmHolo?.uuid && !catalogCard.justTcgNmHoloVariantId) catalogCard.justTcgNmHoloVariantId = nmHolo.uuid;
}
