import fs from "fs";
import path from "path";

const LOG_PATH = path.resolve("data/publish-log.json");

interface PublishEntry {
  setId: string;
  date: string;
  format: "video" | "carousel";
}

function loadLog(): PublishEntry[] {
  if (!fs.existsSync(LOG_PATH)) return [];
  return JSON.parse(fs.readFileSync(LOG_PATH, "utf-8")) as PublishEntry[];
}

export function wasPublishedToday(setId: string, date: string, format: "video" | "carousel"): boolean {
  return loadLog().some((e) => e.setId === setId && e.date === date && e.format === format);
}

export function recordPublish(setId: string, date: string, format: "video" | "carousel"): void {
  const log = loadLog();
  log.push({ setId, date, format });
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
  console.log(`📋 Logged: ${setId} · ${format} · ${date}`);
}
