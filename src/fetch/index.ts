import { fetchWithDelay } from "./client.js";
import { CardMarketData } from "./types.js";

const TCG_KEY = process.env.POKEMON_TCG_API_KEY ?? "";

// ── pokemontcg.io response shapes ────────────────────────────────────────────

interface TcgPriceVariant {
  low?: number | null;
  mid?: number | null;
  high?: number | null;
  market?: number | null;
  directLow?: number | null;
}

// SV era: Illustration Rare, Special Illustration Rare, Hyper Rare
// XY era equivalents: Full Art, Secret Rare
const CHASE_RARITIES = new Set([
  "Illustration Rare",
  "Special Illustration Rare",
  "Hyper Rare",
  "Full Art",
  "Secret Rare",
]);

interface TcgCard {
  id: string;
  name: string;
  number: string;
  rarity: string;
  supertype: string;   // "Pokémon" | "Trainer" | "Energy"
  set: { id: string; name: string };
  images: { small: string; large: string };
  tcgplayer?: {
    updatedAt?: string;
    prices?: {
      holofoil?: TcgPriceVariant;
      reverseHolofoil?: TcgPriceVariant;
      normal?: TcgPriceVariant;
      "1stEditionHolofoil"?: TcgPriceVariant;
    };
  };
}

// pokemontcg.io returns several price variants per card.
// Chase / illustration rares are almost always holofoil.
function extractRawPrice(card: TcgCard): number | null {
  const p = card.tcgplayer?.prices;
  if (!p) return null;
  return (
    p.holofoil?.market ??
    p["1stEditionHolofoil"]?.market ??
    p.reverseHolofoil?.market ??
    p.normal?.market ??
    null
  );
}


export async function runIngestion(setId: string): Promise<CardMarketData[]> {
  // ── Step 1: Fetch card roster + TCGPlayer prices ──────────────────────────
  console.log(`\n📡 pokemontcg.io — fetching set: ${setId}`);

  const tcgUrl =
    `https://api.pokemontcg.io/v2/cards` +
    `?q=set.id:${setId}` +
    `&select=id,name,number,supertype,rarity,set,images,tcgplayer` +
    `&orderBy=-number` +
    `&pageSize=250`;

  const tcgResp = await fetchWithDelay<{ data: TcgCard[] }>(tcgUrl, {
    "X-Api-Key": TCG_KEY,
  });

  console.log(`   ✅ ${tcgResp.data.length} cards returned from pokemontcg.io`);

  const chaseCards = tcgResp.data
    .filter((c) => c.supertype === "Pokémon" && CHASE_RARITIES.has(c.rarity))
    .slice(0, 8);

  console.log(`   🎯 ${chaseCards.length} chase cards after filtering`);

  // ── Step 2: Build results (PSA 10 lookup placeholder for future) ──────────
  const results: CardMarketData[] = [];

  for (const card of chaseCards) {
    const rawPrice = extractRawPrice(card);

    results.push({
      id: card.id,
      name: card.name,
      cardNumber: card.number,
      setName: card.set.name,
      artUrl: card.images.large,
      prices: {
        rawCurrent: rawPrice,
        psa10Current: null,
        psa10Change7d: null,
        psa10Change30d: null,
      },
    });

    const fmt = (v: number | null, fallback: string) =>
      v != null ? `$${v.toFixed(2)}` : fallback;
    console.log(`   📦 ${card.name} #${card.number} [${card.rarity}] — Raw: ${fmt(rawPrice, "N/A")}`);
  }

  results.sort((a, b) => (b.prices.rawCurrent ?? 0) - (a.prices.rawCurrent ?? 0));

  return results;
}
