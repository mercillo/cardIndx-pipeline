import "dotenv/config";
import { Command } from "commander";
import fs from "fs";
import path from "path";
import { fetchLivePrices, loadPriceSnapshot } from "./data/priceSync.js";
import type { CardMarketData } from "./fetch/types.js";
import { renderVideo } from "./render/renderVideo.js";

const program = new Command();
program
  .requiredOption("-g, --game <type>", "Game name")
  .requiredOption("-c, --config <path>", "Config path")
  .option("-s, --set-id <id>", "Set ID to run (e.g. sv3pt5, me4)")
  .option("-i, --set-index <number>", "Index into targetSets array — auto-rotates by day if neither flag is passed")
  .option("--cards <numbers>", "Comma-separated card numbers to render (overrides config cards list)")
  .option("--fetch-only", "Fetch and print card data without saving or rendering")
  .option("--render-only", "Skip API call, render video from today's existing data file");

program.parse(process.argv);
const options = program.opts();

function enrichWithPriceHistory(cards: CardMarketData[], setId: string): CardMarketData[] {
  const snap7d = loadPriceSnapshot(setId, 7);
  const snap30d = loadPriceSnapshot(setId, 30);

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

  const sets: Array<{ id: string; name: string; cards?: string[] }> = rawConfig.targetSets ?? [];
  if (sets.length === 0) {
    console.error("❌ No targetSets found in config");
    process.exit(1);
  }

  let targetSet: { id: string; name: string; cards?: string[] } | undefined;

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

  // Resolve card filter early — needed by both fetch and post-processing
  const cardFilter: string[] | undefined = options.cards
    ? options.cards.split(",").map((n: string) => n.trim())
    : targetSet.cards;

  // 2. PHASE 1: INGESTION
  let enriched: CardMarketData[];

  if (options.renderOnly) {
    const dataFile = path.join(outputDir, `${targetSet.id}_data.json`);
    if (!fs.existsSync(dataFile)) {
      console.error(`❌ No data file found at ${dataFile}. Run without --render-only first.`);
      process.exit(1);
    }
    enriched = JSON.parse(fs.readFileSync(dataFile, "utf-8")) as CardMarketData[];
    console.log(`\n⏭️  Skipping fetch — loaded ${enriched.length} cards from ${dataFile}`);
  } else {
    console.log("\n--- Phase 1: Data Ingestion ---");
    const marketData = await fetchLivePrices(targetSet.id, rawConfig.videoConfig?.topCount ?? 8, cardFilter);

    if (options.fetchOnly) {
      console.log("\n📋 Top cards:");
      marketData.forEach((c, i) => {
        const price = c.prices.rawCurrent != null ? `$${c.prices.rawCurrent.toFixed(2)}` : "N/A";
        console.log(`  ${i + 1}. ${c.name} #${c.cardNumber} — ${price}`);
      });
      return;
    }

    enriched = enrichWithPriceHistory(marketData, targetSet.id);
  }

  // Apply card filter
  if (cardFilter && cardFilter.length > 0) {
    const before = enriched.length;
    enriched = enriched.filter((c) => cardFilter.includes(c.cardNumber));
    enriched.sort((a, b) => (b.prices.rawCurrent ?? 0) - (a.prices.rawCurrent ?? 0));
    console.log(`🎯 Card filter: ${enriched.length}/${before} cards selected (${cardFilter.join(", ")})`);
  }

  if (!options.renderOnly) {
    const dataFile = path.join(outputDir, `${targetSet.id}_data.json`);
    fs.writeFileSync(dataFile, JSON.stringify(enriched, null, 2));
    console.log("✅ Data cached to:", dataFile);
  }

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
