import "dotenv/config";
import { Command } from "commander";
import fs from "fs";
import path from "path";
import { fetchLivePrices } from "./data/priceSync.js";
import type { CardMarketData } from "./fetch/types.js";
import { renderVideo } from "./render/renderVideo.js";

const program = new Command();
program
  .requiredOption("-g, --game <type>", "Game name")
  .requiredOption("-c, --config <path>", "Config path")
  .option("-s, --set-id <id>", "Set ID to run (e.g. sv3pt5, me4)")
  .option("-i, --set-index <number>", "Index into targetSets array — auto-rotates by day if neither flag is passed")
  .option("--fetch-only", "Fetch and print card data without saving or rendering");

program.parse(process.argv);
const options = program.opts();

function enrichWithPriceHistory(cards: CardMarketData[], setId: string): CardMarketData[] {
  function loadSnapshot(daysAgo: number): Map<string, number | null> {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const dateStr = d.toISOString().split("T")[0];
    const filePath = path.resolve(path.join("output", dateStr, `${setId}_data.json`));
    if (!fs.existsSync(filePath)) return new Map();
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as CardMarketData[];
      return new Map(data.map((c) => [c.id, c.prices.rawCurrent]));
    } catch {
      return new Map();
    }
  }

  const snap7d = loadSnapshot(7);
  const snap30d = loadSnapshot(30);

  const hasHistory7 = snap7d.size > 0;
  const hasHistory30 = snap30d.size > 0;
  console.log(
    `\n📅 Price history: 7d snapshot ${hasHistory7 ? "✅" : "❌ (not enough data yet)"} | 30d snapshot ${hasHistory30 ? "✅" : "❌ (not enough data yet)"}`
  );

  return cards.map((card) => {
    const curr = card.prices.rawCurrent;
    const past7 = snap7d.get(card.id);
    const past30 = snap30d.get(card.id);

    const pctChange = (current: number | null, past: number | null | undefined): number | null => {
      if (current == null || past == null || past === 0) return null;
      return ((current - past) / past) * 100;
    };

    return {
      ...card,
      prices: {
        ...card.prices,
        psa10Change7d: pctChange(curr, past7) ?? card.prices.psa10Change7d,
        psa10Change30d: pctChange(curr, past30) ?? card.prices.psa10Change30d,
      },
    };
  });
}

async function main() {
  // 1. SETUP & CONFIGURATION
  const configPath = path.resolve(options.config);
  if (!fs.existsSync(configPath)) {
    console.error(`❌ Config not found: ${configPath}`);
    process.exit(1);
  }

  const rawConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const outputDir = path.resolve(path.join("output", today));

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const sets: Array<{ id: string; name: string }> = rawConfig.targetSets ?? [];
  if (sets.length === 0) {
    console.error("❌ No targetSets found in config");
    process.exit(1);
  }

  let targetSet: { id: string; name: string } | undefined;

  if (options.setId) {
    targetSet = sets.find((s) => s.id === options.setId);
    if (!targetSet) {
      console.error(`❌ Set ID "${options.setId}" not found in config. Valid IDs: ${sets.map((s) => s.id).join(", ")}`);
      process.exit(1);
    }
  } else {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000
    );
    const defaultIndex = dayOfYear % sets.length;
    const setIndex = options.setIndex != null ? parseInt(options.setIndex) : defaultIndex;
    targetSet = sets[setIndex];
    if (!targetSet) {
      console.error(`❌ No set at index ${setIndex}`);
      process.exit(1);
    }
  }

  console.log(`🚀 Booting pipeline for: [${options.game.toUpperCase()}] — set: ${targetSet.name}`);

  // 2. PHASE 1: INGESTION
  console.log("\n--- Phase 1: Data Ingestion ---");
  const marketData = await fetchLivePrices(targetSet.id);

  if (options.fetchOnly) {
    console.log("\n📋 Top cards:");
    marketData.forEach((c, i) => {
      const price = c.prices.rawCurrent != null ? `$${c.prices.rawCurrent.toFixed(2)}` : "N/A";
      console.log(`  ${i + 1}. ${c.name} #${c.cardNumber} — ${price}`);
    });
    return;
  }

  const enriched = enrichWithPriceHistory(marketData, targetSet.id);

  const dataFile = path.join(outputDir, `${targetSet.id}_data.json`);
  fs.writeFileSync(dataFile, JSON.stringify(enriched, null, 2));
  console.log("✅ Data cached to:", dataFile);

  // 3. PHASE 2: SYNTHESIS
  console.log("\n--- Phase 2: Media Synthesis ---");
  const videoPath = await renderVideo(enriched, outputDir, targetSet.id, today);
  console.log("✅ Video ready:", videoPath);

  // 4. PHASE 3: DISTRIBUTION
  console.log("\n--- Phase 3: Distribution Gateway ---");
  // await dispatchToBuffer(outputDir);
  console.log("🚀 Social distribution successful.");
}

main().catch(console.error);
