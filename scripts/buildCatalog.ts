import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TCG_KEY  = process.env.POKEMON_TCG_API_KEY ?? "";
const DELAY_MS = 300;

export interface CatalogCard {
  id: string;
  name: string;
  cardNumber: string;
  rarity: string;
  setName: string;
  subtypes?: string[];
  artUrl: string;
}

export interface Catalog {
  setId: string;
  setName: string;
  printedTotal: number;
  totalCards: number;
  builtAt: string;
  cards: CatalogCard[];
}

async function delay() {
  return new Promise((r) => setTimeout(r, DELAY_MS));
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  await delay();
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json() as Promise<T>;
}

async function buildCatalog(setId: string): Promise<void> {
  console.log(`\n🔨 Building catalog for: ${setId}`);

  // Set metadata
  const setMeta = await fetchJson<{ data: { name: string; printedTotal: number; total: number } }>(
    `https://api.pokemontcg.io/v2/sets/${setId}`,
    { "X-Api-Key": TCG_KEY }
  );
  const { name: setName, printedTotal, total } = setMeta.data;
  console.log(`   Set: ${setName} | printed: ${printedTotal} | declared total: ${total}`);

  // Paginate through all cards — no rarity filter, save everything
  const allCards: CatalogCard[] = [];
  let page = 1;
  while (true) {
    const url =
      `https://api.pokemontcg.io/v2/cards` +
      `?q=set.id:${setId}` +
      `&select=id,name,number,rarity,subtypes,images,set` +
      `&pageSize=250&page=${page}`;

    const resp = await fetchJson<{
      data: Array<{
        id: string; name: string; number: string; rarity: string;
        subtypes?: string[]; images: { large: string }; set: { name: string };
      }>;
      totalCount: number;
    }>(url, { "X-Api-Key": TCG_KEY });

    for (const c of resp.data) {
      allCards.push({
        id: c.id,
        name: c.name,
        cardNumber: c.number,
        rarity: c.rarity ?? "",
        subtypes: c.subtypes,
        setName: c.set.name,
        artUrl: c.images.large,
      });
    }

    console.log(`   Page ${page}: +${resp.data.length} cards → ${allCards.length}/${resp.totalCount}`);
    if (allCards.length >= resp.totalCount || resp.data.length === 0) break;
    page++;
  }

  // Sort by card number numerically
  allCards.sort((a, b) => {
    const n = (s: string) => parseInt(s.split("/")[0]) || 0;
    return n(a.cardNumber) - n(b.cardNumber);
  });

  const missing = total - allCards.length;
  if (missing > 0) {
    console.log(`   ⚠️  pokemontcg.io is missing ${missing} cards (likely #${allCards.length + 1}–${total}, high-rarity SIRs/MARs)`);
    console.log(`      These will be filled from JustTCG when syncPrices runs.`);
  }

  const catalog: Catalog = {
    setId,
    setName,
    printedTotal,
    totalCards: total,
    builtAt: new Date().toISOString(),
    cards: allCards,
  };

  const outPath = path.resolve(__dirname, `../data/catalogs/pokemon/sets/${setId}.json`);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(catalog, null, 2));
  console.log(`   💾 Saved ${allCards.length} cards → data/catalogs/pokemon/sets/${setId}.json\n`);
}

// ── CLI ───────────────────────────────────────────────────────────────────────
const setId = process.argv.find((a) => a.startsWith("--set-id="))?.split("=")[1]
  ?? process.argv[process.argv.indexOf("--set-id") + 1];

if (!setId) {
  console.error("Usage: npm run catalog -- --set-id <id>");
  process.exit(1);
}

buildCatalog(setId).catch((e) => { console.error(e); process.exit(1); });
