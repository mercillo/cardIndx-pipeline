import path from "path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { CardMarketData } from "../fetch/types.js";

export async function renderVideo(cards: CardMarketData[], outputDir: string, setId: string): Promise<string> {
  const entryPoint = path.resolve("src/render/index.tsx");
  const outFile = path.join(outputDir, `${setId}_video.mp4`);

  console.log("📦 Bundling Remotion composition...");
  const bundleLocation = await bundle({ entryPoint });

  const inputProps = { data: cards };

  console.log("🎨 Selecting composition...");
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "MainComposition",
    inputProps,
  });

  console.log(`🎬 Rendering ${composition.durationInFrames} frames → ${outFile}`);
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outFile,
    inputProps,
    onProgress: ({ progress }) => {
      process.stdout.write(`\r   ${Math.round(progress * 100)}%`);
    },
  });

  process.stdout.write("\n");
  return outFile;
}
