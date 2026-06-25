/**
 * enrichCatalog.ts
 * Fetches every card in a set from JustTCG and merges their IDs/variants
 * into the existing pokemontcg.io catalog. All JustTCG fields are optional —
 * existing catalog data is never overwritten.
 *
 * Usage:
 *   npx tsx scripts/enrichCatalog.ts --set-id me2pt5
 *   npx tsx scripts/enrichCatalog.ts --all   (runs all sets in config)
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { Command } from "commander";

const JUSTTCG_KEY = process.env.JUSTTCG_API_KEY ?? "";
const CATALOG_DIR = path.resolve("data/catalogs/pokemon/sets");
const SLEEP_MS = 350;

// ── Types ────────────────────────────────────────────────────────────────────

interface CatalogCard {
  id: string;
  name: string;
  cardNumber: string;
  rarity: string;
  setName: string;
  subtypes?: string[];
  artUrl: string;
  justTcgCardId?: string;
  justTcgVariants?: Array<{ variantId?: string; printing?: string }>;
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
  id?: string;
  cardId?: string;
  name: string;
  number: string;
  rarity?: string;
  variants?: Array<{ id?: string; printing?: string; price?: number | null }>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function apiFetch<T>(url: string): Promise<T> {
  await sleep(SLEEP_MS);
  const res = await fetch(url, { headers: { "x-api-key": JUSTTCG_KEY } });
  if (!res.ok) throw new Error(`JustTCG API ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

function normalizeName(s: string) {
  return s.replace(/\s*-\s*\d+\/\d+$/, "").trim().toLowerCase();
}
function cardNum(n: string) {
  return n.split("/")[0].trim();
}

async function resolveJustTcgSetId(setName: string): Promise<string> {
  const resp = await apiFetch<{ data: Array<{ id: string; name: string }> }>(
    "https://api.justtcg.com/v1/sets?game=Pokemon"
  );
  const match = resp.data.find(
    (s) =>
      s.name.toLowerCase() === setName.toLowerCase() ||
      s.name.toLowerCase().includes(setName.toLowerCase())
  );
  if (!match) throw new Error(`Set "${setName}" not found in JustTCG`);
  return match.id;
}

async function fetchAllJustTcgCards(justTcgSetId: string, totalCards: number): Promise<JustTcgCard[]> {
  const PAGE_SIZE = 20;
  const all: JustTcgCard[] = [];
  let page = 1;

  while (all.length < totalCards) {
    const resp = await apiFetch<{ data: JustTcgCard[] }>(
      `https://api.justtcg.com/v1/cards?set=${justTcgSetId}&orderBy=price&order=desc&limit=${PAGE_SIZE}&page=${page}`
    );
    const batch = resp.data ?? [];
    all.push(...batch);
    process.stdout.write(`\r   Page ${page}: ${all.length} cards fetched`);
    if (batch.length < PAGE_SIZE) break;
    page++;
  }
  console.log();
  return all;
}

// ── Core ─────────────────────────────────────────────────────────────────────

async function enrichSet(setId: string): Promise<void> {
  const catalogPath = path.join(CATALOG_DIR, `${setId}.json`);
  if (!fs.existsSync(catalogPath)) {
    console.error(`❌ No catalog found for ${setId} — run buildCatalog first`);
    return;
  }

  const catalog: Catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));

  // Resolve JustTCG set ID if not already cached
  if (!catalog.justTcgId) {
    console.log(`   🔍 Resolving JustTCG set ID for "${catalog.setName}"...`);
    catalog.justTcgId = await resolveJustTcgSetId(catalog.setName);
    console.log(`   ✅ ${catalog.justTcgId}`);
  } else {
    console.log(`   ✅ JustTCG set ID (cached): ${catalog.justTcgId}`);
  }

  // Fetch every card from JustTCG
  console.log(`   📡 Fetching all cards from JustTCG (${catalog.totalCards} expected)...`);
  const jtCards = await fetchAllJustTcgCards(catalog.justTcgId, catalog.totalCards);
  console.log(`   ✅ JustTCG returned ${jtCards.length} cards`);

  // Build lookup maps from our catalog
  const byNumber = new Map(catalog.cards.map((c) => [cardNum(c.cardNumber), c]));
  const byName   = new Map(catalog.cards.map((c) => [normalizeName(c.name), c]));

  let matched = 0;
  let skipped = 0;

  for (const jt of jtCards) {
    const num = cardNum(jt.number ?? "");
    const catalogCard = byNumber.get(num) ?? byName.get(normalizeName(jt.name));

    if (!catalogCard) { skipped++; continue; }

    // Merge — only add, never overwrite existing data
    const jtCardId = jt.id ?? jt.cardId;
    if (jtCardId && !catalogCard.justTcgCardId) {
      catalogCard.justTcgCardId = jtCardId;
    }

    if (jt.variants && jt.variants.length > 0) {
      const variants = jt.variants
        .filter((v) => v.id || v.printing)
        .map((v) => ({ variantId: v.id, printing: v.printing }));
      if (variants.length > 0) {
        catalogCard.justTcgVariants = variants;
      }
    }

    matched++;
  }

  console.log(`   📊 Merged: ${matched} matched, ${skipped} unmatched`);

  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
  console.log(`   💾 Saved: ${catalogPath}\n`);
}

// ── CLI ───────────────────────────────────────────────────────────────────────

const program = new Command();
program
  .option("--set-id <id>", "Enrich a single set")
  .option("--all", "Enrich all sets found in data/catalogs/pokemon/sets/");

program.parse(process.argv);
const opts = program.opts();

if (!JUSTTCG_KEY) {
  console.error("❌ JUSTTCG_API_KEY not set in .env");
  process.exit(1);
}

if (opts.all) {
  const files = fs.readdirSync(CATALOG_DIR).filter((f) => f.endsWith(".json"));
  console.log(`🔄 Enriching ${files.length} sets...\n`);
  for (const file of files) {
    const setId = file.replace(".json", "");
    console.log(`\n── ${setId} ──`);
    await enrichSet(setId);
  }
} else if (opts.setId) {
  console.log(`\n── ${opts.setId} ──`);
  await enrichSet(opts.setId);
} else {
  console.error("❌ Pass --set-id <id> or --all");
  process.exit(1);
}

console.log("✅ Done.");
