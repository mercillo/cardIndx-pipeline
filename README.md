# cardIndx-pipeline

Automated Pokémon TCG market data pipeline. Fetches daily prices for the top 8 most valuable cards in a set and renders a 30-second portrait video (1080×1920) for TikTok / Instagram Reels / YouTube Shorts.

[![Daily Pipeline](../../actions/workflows/daily-pipeline.yml/badge.svg)](../../actions/workflows/daily-pipeline.yml)

---

## How it works

```
pokemontcg.io  ──(one-time)──▶  data/catalogs/pokemon/sets/{id}.json
                                          │
JustTCG API  ──(daily, 1 call)──▶  join by card number  ──▶  top 8 by price
                                          │
                                   Remotion render
                                          │
                              output/{date}/{id}_video.mp4
```

1. **Catalog** *(one-time per set)* — `buildCatalog` fetches the full card roster from pokemontcg.io and saves it locally. Never called again unless the set is updated.
2. **Live prices** *(daily)* — Pipeline makes a single JustTCG API call for the top 15 cards by price. Results are joined with the catalog (by card number, name as fallback) to get artwork and metadata.
3. **History enrichment** — Diffs against local daily snapshots to compute 7d / 30d % changes. Falls back to JustTCG's built-in 7d change until local history builds up.
4. **Render** — Remotion generates an MP4: mosaic overview → 8 individual card slides → outro.
5. **Output** — Data snapshot committed to repo for history. Video uploaded as GitHub Actions artifact.

---

## Setup

```bash
npm install
cp .env.example .env
```

`.env`:
```
POKEMON_TCG_API_KEY=your_key_here
JUSTTCG_API_KEY=your_key_here
```

---

## Running the pipeline

The `npm run pipeline` shorthand expands to `tsx src/pipeline.ts -g pokemon -c config/pokemon.json`.

```bash
# Full run — fetch prices, enrich history, render video
npm run pipeline -- --set-id me2pt5

# Auto-rotate by day of year across all configured sets (no --set-id)
npm run pipeline

# Skip the API call, re-render from today's existing data file
npm run pipeline -- --set-id me2pt5 --render-only

# Fetch and print prices to console without saving or rendering
npm run pipeline -- --set-id me2pt5 --fetch-only

# Live preview in Remotion Studio (uses mock data, no API calls)
npx remotion studio src/render/index.tsx
```

### Pipeline flags

| Flag | Description |
|---|---|
| `--set-id <id>` | Run a specific set (e.g. `me2pt5`, `me4`) |
| `--set-index <n>` | Run the nth set in config instead of auto-rotating |
| `--render-only` | Skip API call, render from today's saved data file |
| `--fetch-only` | Print fetched prices to console, skip save and render |

### Catalogs

Card metadata (names, art URLs, card numbers) is cached in `data/catalogs/pokemon/sets/{id}.json`. The pipeline builds this automatically the first time a new set is run — no manual step needed. On subsequent runs it reads from the local file.

To force-rebuild a catalog (e.g. a set got new cards added):

```bash
npm run catalog -- --set-id me2pt5
```

---

## GitHub Actions

Runs automatically at **9am ET daily**. Videos are uploaded as artifacts (14-day retention) and data snapshots are committed back to the repo to build price history.

### Required secrets
**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Description |
|---|---|
| `POKEMON_TCG_API_KEY` | pokemontcg.io API key (free) |
| `JUSTTCG_API_KEY` | JustTCG API key (1,000 free calls/month) |

### Manual trigger
**Actions → Daily Card Pipeline → Run workflow** — optionally pass a `set_id` to override the day's rotation.

---

## Configured sets

Defined in `config/pokemon.json`. The `id` field maps to the pokemontcg.io set ID. Only sets with a built catalog will run successfully.

| Series | Sets |
|---|---|
| Mega Evolution | `me1` `me2` `me2pt5` `me3` `me4` |
| Scarlet & Violet | `sv1` – `sv10`, `sv8pt5`, `sv6pt5`, `sv4pt5` |
| Sword & Shield | `swsh12`, `swsh12pt5`, gallery subsets |

---

## Output

```
data/catalogs/pokemon/sets/
  me2pt5.json        ← full card roster (committed, built once)

output/
  2026-06-22/
    me2pt5_data.json ← top 8 cards + prices (committed daily for history)
    me2pt5_video.mp4 ← rendered video (Actions artifact, not committed)
```
