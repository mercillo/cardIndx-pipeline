import fs from "fs";
import path from "path";
import { fetchWithDelay } from "../api/client.js";

const TCG_KEY = process.env.POKEMON_TCG_API_KEY ?? "";
export const CATALOG_DIR = path.resolve("data/catalogs/pokemon/sets");

export interface CatalogCard {
  id: string;
  name: string;
  cardNumber: string;
  rarity: string;
  setName: string;
  subtypes?: string[];
  artUrl: string;
  justTcgCardId?: string;
  justTcgNmHoloVariantId?: string;
}

export interface Catalog {
  setId: string;
  setName: string;
  printedTotal: number;
  totalCards: number;
  builtAt: string;
  justTcgId?: string;
  justTcgEnrichedAt?: string;
  cards: CatalogCard[];
}

const EXCLUDED_RARITIES = new Set(["Common", "Uncommon", "Energy"]);

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
      if (EXCLUDED_RARITIES.has(rarity)) continue;
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

export async function ensureCatalog(setId: string): Promise<Catalog> {
  const filePath = path.join(CATALOG_DIR, `${setId}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Catalog;
  }
  return buildCatalog(setId);
}

export function saveCatalog(catalog: Catalog): void {
  const filePath = path.join(CATALOG_DIR, `${catalog.setId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(catalog, null, 2));
}
