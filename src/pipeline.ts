import "dotenv/config";
import { Command } from "commander";
import fs from "fs";
import path from "path";
import { fetchLivePrices } from "./services/index.js";
import { enrichWithPriceHistory } from "./services/priceHistory.js";
import type { CardMarketData } from "./api/types.js";
import { renderVideo } from "./render/renderVideo.js";
import { renderCarousel } from "./render/renderCarousel.js";
import { wasPublishedToday, recordPublish } from "./services/publishLog.js";

const program = new Command();
program
  .requiredOption("-g, --game <type>", "Game name")
  .requiredOption("-c, --config <path>", "Config path")
  .option("-s, --set-id <id>", "Set ID to run (e.g. sv3pt5, me4)")
  .option("-i, --set-index <number>", "Index into targetSets array — auto-rotates by day if neither flag is passed")
  .option("--cards <numbers>", "Comma-separated card numbers to render (overrides config cards list)")
  .option("--date <date>", "Override video date label and output folder (YYYY-MM-DD, defaults to today)")
  .option("--title <title>", "Override video title shown in Mosaic (defaults to set name)")
  .option("--music <filename>", "Music file from public/ folder (e.g. pkmn_dandandan.mp3, defaults to pokemon_music.mp3)")
  .option("--carousel", "Render 10 PNG slides instead of a video")
  .option("--force", "Skip duplicate-publish check and run anyway")
  .option("--fetch-only", "Fetch and print card data without saving or rendering")
  .option("--render-only", "Skip API call, render video from today's existing data file");

program.parse(process.argv);
const options = program.opts();

async function main() {
  // 1. SETUP & CONFIGURATION
  const configPath = path.resolve(options.config);
  if (!fs.existsSync(configPath)) {
    console.error(`❌ Config not found: ${configPath}`);
    process.exit(1);
  }

  const rawConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const d = new Date();
  const todayFallback = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const videoDate = options.date ?? todayFallback;
  const outputDir = path.resolve(path.join("output", videoDate));

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

  const format: "video" | "carousel" = options.carousel ? "carousel" : "video";

  if (!options.force && !options.fetchOnly && !options.renderOnly) {
    if (wasPublishedToday(targetSet.id, videoDate, format)) {
      console.warn(`⚠️  ${targetSet.id} (${format}) already published for ${videoDate}. Use --force to override.`);
      process.exit(0);
    }
  }

  console.log(`🚀 Booting pipeline for: [${options.game.toUpperCase()}] — set: ${targetSet.name}`);

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
  const videoTitle = options.title ?? targetSet.name;

  if (options.carousel) {
    console.log("\n--- Phase 2: Media Synthesis (Carousel) ---");
    const slides = await renderCarousel(enriched, outputDir, targetSet.id, videoDate, videoTitle, options.music);
    slides.forEach((p, i) => console.log(`  ✅ Slide ${i + 1}: ${path.basename(p)}`));
  } else {
    console.log("\n--- Phase 2: Media Synthesis ---");
    const videoPath = await renderVideo(enriched, outputDir, targetSet.id, videoDate, videoTitle, options.music);
    console.log("✅ Video ready:", videoPath);
  }

  // 4. PHASE 3: DISTRIBUTION
  console.log("\n--- Phase 3: Distribution Gateway ---");
  recordPublish(targetSet.id, videoDate, format);
  console.log("🚀 Social distribution successful.");
}

main().catch(console.error);
