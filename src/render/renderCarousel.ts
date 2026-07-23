import path from "path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import type { CardMarketData } from "../api/types.js";

const MOSAIC_STILL_FRAME = 75;
const SLIDE_START = 150;
const SLIDE_DURATION = 90;
const SLIDE_SETTLED_OFFSET = 30;
const OUTRO_SETTLED_OFFSET = 25;

export async function renderCarousel(
  cards: CardMarketData[],
  outputDir: string,
  setId: string,
  date: string,
  title?: string,
  music?: string
): Promise<string[]> {
  const entryPoint = path.resolve("src/render/index.tsx");

  console.log("📦 Bundling Remotion composition...");
  const bundleLocation = await bundle({ entryPoint, enableCaching: false });

  const inputProps = { data: cards, date, title, music };

  console.log("🎨 Selecting composition...");
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "MainComposition",
    inputProps,
  });

  const outroStart = SLIDE_START + cards.length * SLIDE_DURATION;

  const slides: Array<{ frame: number; label: string }> = [
    { frame: MOSAIC_STILL_FRAME, label: "01_mosaic" },
    ...cards.map((_, i) => ({
      frame: SLIDE_START + i * SLIDE_DURATION + SLIDE_SETTLED_OFFSET,
      label: `${String(i + 2).padStart(2, "0")}_card`,
    })),
    { frame: outroStart + OUTRO_SETTLED_OFFSET, label: `${String(cards.length + 2).padStart(2, "0")}_outro` },
  ];

  const outputPaths: string[] = [];

  for (const { frame, label } of slides) {
    const outFile = path.join(outputDir, `${setId}_slide_${label}.png`);
    process.stdout.write(`   📸 Slide ${label}...`);
    await renderStill({
      composition,
      serveUrl: bundleLocation,
      frame,
      output: outFile,
      inputProps,
      imageFormat: "png",
      overwrite: true,
    });
    process.stdout.write(" ✅\n");
    outputPaths.push(outFile);
  }

  return outputPaths;
}
