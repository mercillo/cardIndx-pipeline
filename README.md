# cardIndx-pipeline

Automated Pokémon card market data pipeline. Fetches daily prices for the top chase cards (Illustration Rare, Special Illustration Rare, Hyper Rare) across configured sets and renders a 30-second portrait video (1080×1920) for TikTok / Instagram Reels / YouTube Shorts.

---

## How it works

1. **Ingestion** — Pulls card roster + TCGPlayer market prices from pokemontcg.io
2. **History enrichment** — Diffs against stored snapshots to compute 7d / 30d % changes
3. **Render** — Remotion generates an MP4 with a mosaic overview + individual card slides
4. **Output** — Files saved to `output/{date}/{setId}_data.json` and `output/{date}/{setId}_video.mp4`

---

## Setup

```bash
npm install
cp .env.example .env   # add your API key
```

`.env`:
```
POKEMON_TCG_API_KEY=your_key_here
```

---

## Running the pipeline

### Auto-rotate by day (default)
Picks a set automatically based on day of year, cycling through all configured sets.
```bash
npx tsx src/pipeline.ts -g pokemon -c config/pokemon.json
```

### Run a specific set by ID
```bash
npx tsx src/pipeline.ts -g pokemon -c config/pokemon.json --set-id me4
npx tsx src/pipeline.ts -g pokemon -c config/pokemon.json --set-id sv3pt5
```

### Run a specific set by index
```bash
npx tsx src/pipeline.ts -g pokemon -c config/pokemon.json --set-index 7
```

### Preview in Remotion Studio
```bash
npx remotion studio src/render/index.tsx
```

---

## Configured sets

Sets are defined in `config/pokemon.json`. The pipeline runs `targetSets[0]` by default, or whichever set is selected via flag. To add or remove sets, edit the array — the `id` field maps directly to the pokemontcg.io set ID.

| Series | Example sets |
|---|---|
| Mega Evolution | `me1` – `me4` (Chaos Rising, Perfect Order, …) |
| Scarlet & Violet | `sv1` – `sv10`, `sv8pt5` (Prismatic Evolutions, 151, …) |
| Sword & Shield | `swsh12`, `swsh12pt5`, gallery subsets |

Full set IDs: https://api.pokemontcg.io/v2/sets

---

## Output files

```
output/
  2026-06-22/
    me4_data.json     ← raw card + price data (committed to repo for history)
    me4_video.mp4     ← rendered video (uploaded as Actions artifact)
```

`data.json` files are committed daily so the pipeline can compute 7d / 30d price changes. Videos are not committed (too large) — download them from the GitHub Actions artifacts tab.

---

## GitHub Actions

The pipeline runs automatically at **9am ET daily** via `.github/workflows/daily-pipeline.yml`.

### Required secret
Add to **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
|---|---|
| `POKEMON_TCG_API_KEY` | your pokemontcg.io API key |

### Manual trigger
Go to **Actions → Daily Card Pipeline → Run workflow** and optionally pass a set index to override the day's rotation.

---

## Chase card rarities

The pipeline filters to these rarities across all sets:

- `Illustration Rare` — SV era IRs
- `Special Illustration Rare` — SV era SIRs
- `Hyper Rare` — SV era gold cards
- `Full Art` — XY era equivalent
- `Secret Rare` — XY era equivalent
