# cardindx Pipeline — System Design

> **Project:** Automated Pokémon card market data content pipeline  
> **Channel:** @pkmnIndx (POC) → expanding to @opIndx, @mtgIndx, @ygIndx, @nbaIndx, @nflIndx  
> **Stack:** Node.js · TypeScript · Remotion · GitHub Actions · Buffer API  
> **Goal:** Zero-touch daily video generation and posting — one config change to run

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Functional Requirements](#2-functional-requirements)
3. [Non-Functional Requirements](#3-non-functional-requirements)
4. [Scale Estimates](#4-scale-estimates)
5. [Architecture Overview](#5-architecture-overview)
6. [Repo Structure](#6-repo-structure)
7. [Data Flow](#7-data-flow)
8. [Key Design Decisions](#8-key-design-decisions)
9. [Component Breakdown](#9-component-breakdown)
10. [Config Schema](#10-config-schema)
11. [TypeScript Types](#11-typescript-types)
12. [Failure Modes & Mitigation](#12-failure-modes--mitigation)
13. [Extensibility](#13-extensibility)
14. [Secrets Management](#14-secrets-management)
15. [Upgrade Path](#15-upgrade-path)
16. [API Keys & Services](#16-api-keys--services)
17. [Content Spec](#17-content-spec)
18. [Visual Design Spec](#18-visual-design-spec)
19. [Cost Breakdown](#19-cost-breakdown)
20. [Open Questions](#20-open-questions)

---

## 1. Problem Statement

There is no clean, automated, daily data feed showing Pokémon card price movements in a visual format comparable to stock market tickers. Existing content is manual, opinion-driven, or buried in spreadsheets.

**cardindx** fills that gap — treating Pokémon cards like financial assets, publishing daily price movement data (raw and PSA graded) as short-form video content, with zero manual intervention after initial setup.

The long-term vision is a multi-channel media platform covering all major TCG and sports card markets, eventually adding buy/sell signals based on trend data.

---

## 2. Functional Requirements

- Fetch top 10 cards from a configured Pokémon set daily
- Pull per-card: raw (ungraded) price, PSA 10 price, 7-day % change, 30-day % change
- Download high-resolution card art for each result
- Generate a branded 30-second vertical video (1080×1920) using Remotion:
  - Title card (0–3s)
  - Mosaic grid of all 10 cards with % badges (3–6s)
  - Individual card slides, one per card at ~2s each (6–26s)
  - Outro / follow CTA (26–30s)
- Generate a mosaic image (all 10 cards in a 2×5 grid)
- Generate 10 individual card images (for carousel posting)
- Auto-post video + images to: TikTok, Instagram, YouTube Shorts, X
- Run automatically once daily at 8am ET with zero manual steps
- Configurable via `config.json`: set name, card count, time window, post caption

---

## 3. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Pipeline duration | < 5 minutes end to end |
| Cost (POC phase) | $0/mo (domain ~$0.85/mo aside) |
| Secret safety | Zero secrets in source control, ever |
| Idempotency | Safe to re-run same day — no duplicate posts |
| Observability | Per-run logs, GitHub Actions status, email alert on failure |
| Extensibility | Adding a new channel requires only a new config file + workflow |
| Output organisation | Files in `output/YYYY-MM-DD/`, gitignored, cleaned after 7 days |
| Type safety | TypeScript strict mode throughout — no `any` |

---

## 4. Scale Estimates

| Metric | Value |
|---|---|
| Pipeline runs per day | 1–2 |
| API calls per run | ~15 (10 cards + set lookup + metadata) |
| Images generated per run | 11 (1 mosaic + 10 card slides) |
| Videos rendered per run | 1 (30s MP4, 1080×1920) |
| Estimated render time | 60–120 seconds |
| Output size per run | ~80–150MB |
| GitHub Actions minutes/day | ~5 min → 150 min/mo (free tier = 2,000/mo) |
| API credits/day (free = 100) | ~15/run → 30/day with 2 runs ✓ |

---

## 5. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    TRIGGER LAYER                        │
│            GitHub Actions cron (8am ET daily)           │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                     DATA LAYER                          │
│   PokemonPriceTracker API  │  pokemontcg.io  │  config  │
│   (prices + PSA + %change) │  (art + meta)   │  .json   │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                  PROCESSING LAYER                       │
│         src/fetch/index.ts — merge, rank, sort          │
└──────────────┬────────────────────────┬─────────────────┘
               │                        │
┌──────────────▼──────┐    ┌────────────▼────────────────┐
│   IMAGE GENERATION  │    │     VIDEO GENERATION        │
│  Remotion renderStill│    │   Remotion renderMedia      │
│  mosaic.png          │    │   reel.mp4 (30s)            │
│  card_01–10.png      │    │                             │
└──────────────┬───────┘    └────────────┬────────────────┘
               │                        │
┌──────────────▼────────────────────────▼─────────────────┐
│                    OUTPUT LAYER                         │
│              output/YYYY-MM-DD/                         │
│    reel.mp4 · mosaic.png · card_01.png … card_10.png   │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                 DISTRIBUTION LAYER                      │
│          src/post/index.ts → Buffer API                 │
│     TikTok · Instagram · YouTube Shorts · X             │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Repo Structure

```
cardindx-pipeline/
├── .github/
│   └── workflows/
│       ├── daily.yml              # Main cron — runs pipeline daily
│       └── daily-mtg.yml          # Future: MTG channel (same pipeline, different config)
├── src/
│   ├── fetch/
│   │   ├── index.ts               # Fetches + merges API data, returns CardData[]
│   │   └── types.ts               # API response types + CardData type
│   ├── render/
│   │   ├── compositions/
│   │   │   ├── CardSlide.tsx      # Single card component (rank, price, % badges)
│   │   │   ├── Mosaic.tsx         # 2×5 grid of all cards
│   │   │   ├── TitleCard.tsx      # Opening title card
│   │   │   └── Outro.tsx          # Follow CTA
│   │   ├── Root.tsx               # Remotion root — registers all compositions
│   │   └── render.ts              # Calls renderMedia() and renderStill()
│   ├── post/
│   │   └── index.ts               # Buffer API — posts video + images to all platforms
│   ├── utils/
│   │   ├── logger.ts              # Structured console logging with timestamps
│   │   ├── retry.ts               # Exponential backoff helper
│   │   └── outputDir.ts           # Resolves output/YYYY-MM-DD/ path
│   └── pipeline.ts                # Orchestrator — fetch → render → post
├── config.json                    # Active run config (set name, count, window)
├── config.example.json            # Documented example config
├── output/                        # Generated files — gitignored
├── .env.example                   # Documents all required env vars (no values)
├── .gitignore
├── package.json
├── tsconfig.json
├── remotion.config.ts
└── SYSTEM_DESIGN.md               # This file
```

---

## 7. Data Flow

### Step 1 — Fetch
`src/fetch/index.ts`

1. Read `config.json` to get set name, card count, time window
2. Call PokemonPriceTracker API → returns cards with raw price, PSA 10, % changes
3. Call pokemontcg.io API for high-res card art URLs (fallback if PokemonPriceTracker art is low-res)
4. Validate response shape with Zod schemas
5. Merge data, sort by market cap / price descending, take top N
6. Download card art images to `output/YYYY-MM-DD/assets/`
7. Write `output/YYYY-MM-DD/data.json` — cached card data for render stage

### Step 2 — Render
`src/render/render.ts`

1. Read `output/YYYY-MM-DD/data.json`
2. Call `renderStill()` for each card → `card_01.png` through `card_10.png`
3. Call `renderStill()` for mosaic → `mosaic.png`
4. Call `renderMedia()` for full video → `reel.mp4`

### Step 3 — Post
`src/post/index.ts`

1. Read Buffer API token from env
2. Upload `reel.mp4` → schedule to TikTok, Instagram Reels, YouTube Shorts
3. Upload `mosaic.png` + `card_01–10.png` → schedule carousel to Instagram
4. Post `mosaic.png` + caption to X
5. Log success/failure per platform

---

## 8. Key Design Decisions

### Monorepo
One repo for the entire pipeline. Shared types, shared config, single CI/CD workflow. Adding a new channel is a new config file, not a new repo.

**Tradeoff:** Slightly larger repo, but no cross-repo dependency overhead at this scale.

### TypeScript strict mode
Remotion is TypeScript-first. All API response shapes, card data, and video props are strongly typed. Zod used for runtime validation of external API responses.

**Tradeoff:** Slightly more setup. Worth it — catches shape mismatches before runtime.

### Config-driven pipeline
Business logic (set name, card count, time window, caption template) lives in `config.json` — committed to git, versioned, auditable. Secrets never in config.

```json
// config.json
{
  "setName": "Surging Sparks",
  "cardCount": 10,
  "priceWindow": "7d",
  "showGraded": true,
  "captionTemplate": "Top {count} cards in {set} this week 📈 #pkmnIndx #pokemoncards"
}
```

### GitHub Actions cron
Free, co-located with code, no extra infrastructure. Failure emails are automatic. Status visible in the Actions tab.

**Upgrade path:** Swap for AWS EventBridge + Lambda when rendering moves to cloud.

### Remotion for video generation
React components render to video. Same design system as a web app. Frame-perfect animations. Significantly better output quality than FFmpeg + Pillow.

**Why not FFmpeg directly:** FFmpeg produces functional but flat output. Remotion lets you design the card layout visually using CSS, use web fonts, animate with spring physics, and iterate in a live preview. The output looks studio-produced.

### Idempotency via filesystem check
If `output/YYYY-MM-DD/reel.mp4` exists, skip fetch and render, go straight to post. Re-running after a post failure won't regenerate or double-post.

### Output as GitHub artifact
Each run uploads `output/YYYY-MM-DD/` as a GitHub Actions artifact (available for 7 days). No S3 needed at POC scale — cost stays at $0.

**Upgrade path:** Add S3 upload step when permanent storage is needed.

---

## 9. Component Breakdown

### `TitleCard.tsx`
- Duration: 3 seconds (90 frames @ 30fps)
- Shows: set name, "Top 10 This Week", date
- Animation: fade in from black

### `Mosaic.tsx`
- Duration: 3 seconds
- Shows: 2×5 grid of all 10 card thumbnails
- Each card has: card art, % badge (green ▲ or red ▼)
- Animation: cards pop in staggered with spring animation

### `CardSlide.tsx`
- Duration: 2 seconds per card (60 frames)
- Shows:
  - Rank (#1, #2…)
  - Card art (full bleed background, darkened)
  - Card name
  - Raw price (e.g. $84.00)
  - PSA 10 price (e.g. $210.00)
  - 7-day % change (green ▲ or red ▼)
  - 30-day % change (green ▲ or red ▼)
- Animation: slide up from bottom, numbers count up

### `Outro.tsx`
- Duration: 4 seconds
- Shows: @pkmnIndx logo, "Follow for daily card market data"
- Animation: fade in, subtle pulse on handle

---

## 10. Config Schema

```typescript
// src/fetch/types.ts
interface PipelineConfig {
  setName: string;           // e.g. "Surging Sparks"
  setCode?: string;          // Optional API set code
  cardCount: number;         // 10 standard, 5 for high-value
  priceWindow: "7d" | "30d" | "both";
  showGraded: boolean;       // Show PSA 10 price
  captionTemplate: string;   // {count}, {set}, {date} interpolated
  postTime?: string;         // Override post time e.g. "08:00"
}
```

---

## 11. TypeScript Types

```typescript
// Core card data shape — used across all pipeline stages
interface CardData {
  rank: number;
  id: string;
  name: string;
  set: string;
  rarity: string;
  imageUrl: string;
  localImagePath: string;    // Downloaded to output/YYYY-MM-DD/assets/
  rawPrice: number;          // Ungraded market price (USD)
  psa10Price: number | null; // PSA 10 market price (USD) — null if unavailable
  change7d: number;          // % change over 7 days (e.g. 18.2 = +18.2%)
  change30d: number;         // % change over 30 days
}

// Remotion video props — passed to all compositions
interface VideoProps {
  cards: CardData[];
  config: PipelineConfig;
  date: string;              // YYYY-MM-DD
}
```

---

## 12. Failure Modes & Mitigation

| Failure | Detection | Mitigation |
|---|---|---|
| API rate limit | HTTP 429 response | Exponential backoff, 3 retries, then fail loudly |
| API returns bad shape | Zod parse error | Throw before render — clear error message, GitHub emails you |
| Card image download fails | HTTP error or timeout | Fallback to pokemontcg.io. If both fail, render placeholder with card name |
| Remotion render crash | Process exit code ≠ 0 | Fetch data cached to disk — fix component, re-run render only |
| Buffer post fails | HTTP error | Log per-platform success/fail. Re-run post stage only — idempotency prevents duplicates |
| GitHub Actions timeout | Job exceeds 15min limit | Alert fires. Remotion render is ~2 min — well within budget |
| Duplicate post | Re-run same day | Filesystem check: if `reel.mp4` exists, skip fetch + render, go straight to post |
| Missing env var | `process.env` undefined check at startup | Pipeline exits immediately with list of missing vars — fail fast |

---

## 13. Extensibility

### Adding a new channel (e.g. @mtgIndx)

1. Create `config.mtg.json`:
```json
{
  "setName": "Duskmourn: House of Horror",
  "cardCount": 10,
  "priceWindow": "7d",
  "showGraded": true,
  "captionTemplate": "Top {count} MTG cards this week 📈 #mtgIndx #magicthegathering"
}
```

2. Create `.github/workflows/daily-mtg.yml`:
```yaml
env:
  CONFIG_PATH: config.mtg.json
```

That's it. Zero code changes. The entire pipeline is parameterized by config.

### Adding buy/sell signals (future)

1. Store 30+ days of `data.json` files in S3
2. Add `src/analysis/trends.ts` — reads historical data, computes trend direction
3. Add `TrendBadge` component to `CardSlide.tsx` — shows BUY / HOLD / WATCH signal
4. No changes to fetch, render, or post layers

---

## 14. Secrets Management

All secrets stored as GitHub Actions environment variables. Never in code, never in config.json, never in `.env` committed to git.

### Required secrets (set in GitHub → Settings → Secrets → Actions)

| Secret name | What it is |
|---|---|
| `POKEMON_PRICE_TRACKER_API_KEY` | PokemonPriceTracker.com API key |
| `POKEMON_TCG_API_KEY` | pokemontcg.io API key |
| `TCGAPI_KEY` | tcgapi.dev API key (future channels) |
| `BUFFER_ACCESS_TOKEN` | Buffer API token for auto-posting |
| `NOTIFICATION_EMAIL` | Email for failure alerts |

### `.env.example` (committed — documents required vars, no values)
```
POKEMON_PRICE_TRACKER_API_KEY=
POKEMON_TCG_API_KEY=
TCGAPI_KEY=
BUFFER_ACCESS_TOKEN=
```

---

## 15. Upgrade Path

### POC → Growth

| Component | POC | Growth |
|---|---|---|
| Rendering | Local (GitHub Actions runner) | Remotion Lambda (AWS) |
| Storage | GitHub Actions artifact (7 days) | S3 bucket (permanent) |
| Scheduling | GitHub Actions cron | Same or AWS EventBridge |
| Posting | Buffer free (3 channels) | Buffer Essentials ($18/mo) |
| Alerting | GitHub Actions email | Slack webhook |
| Data history | None | S3 + DynamoDB for trend analysis |
| Cost | ~$0/mo | ~$50–90/mo |

### Growth → Scale (all 6 channels)

- Remotion Lambda scales to parallel renders per channel
- Separate GitHub Actions workflows per channel, same codebase
- S3 for asset storage and historical data
- Add `src/analysis/` module for buy/sell signal generation
- TCGPlayer affiliate links auto-generated per card in captions

---

## 16. API Keys & Services

| Service | Purpose | Tier | Cost |
|---|---|---|---|
| PokemonPriceTracker.com | Raw prices, PSA 10, % change | Free (100 credits/day) | $0 |
| pokemontcg.io | Card art, set metadata | Free | $0 |
| tcgapi.dev | Future: MTG, YGO, One Piece, NBA, NFL | Free (100 req/day) | $0 |
| GitHub Actions | CI/CD, cron scheduling | Free (2,000 min/mo) | $0 |
| Buffer | Auto-posting to all platforms | Free (3 channels) | $0 |
| Remotion | Video generation | Free (individual license) | $0 |
| Namecheap | cardindx.com domain + email forwarding | Paid | ~$0.85/mo |

---

## 17. Content Spec

### Video structure (30 seconds, 1080×1920, 30fps = 900 frames)

| Segment | Duration | Frames | Component |
|---|---|---|---|
| Title card | 3s | 0–90 | `TitleCard.tsx` |
| Mosaic grid | 3s | 90–180 | `Mosaic.tsx` |
| Card #1–10 | 2s each = 20s | 180–780 | `CardSlide.tsx` ×10 |
| Outro | 4s | 780–900 | `Outro.tsx` |

### Image output
- `mosaic.png` — 1080×1080, 2×5 grid of card thumbnails with % badges
- `card_01.png` through `card_10.png` — 1080×1920 each, individual card data

### Caption template
```
Top 10 {set} cards this week 📈

#{rank} {cardName} — {change7d}% (7d)

Full breakdown ↑ | Follow @pkmnIndx for daily data
#pokemoncards #pkmnIndx #cardmarket #psa #tcg
```

---

## 18. Visual Design Spec

### Color palette
| Token | Hex | Usage |
|---|---|---|
| Brand red | `#CC0000` | Logo, accents, rank badge |
| White | `#FFFFFF` | Backgrounds, primary text |
| Near-black | `#1A1A1A` | Dark overlays, secondary text |
| Price up | `#22C55E` | Green % change badges |
| Price down | `#EF4444` | Red % change badges |
| Muted | `#666666` | Secondary labels |

### Typography
- Headlines: Inter Bold (Google Fonts — free)
- Numbers/prices: Inter Mono or JetBrains Mono (monospace — makes price changes easier to read)
- Labels: Inter Regular

### Card slide layout (1080×1920)
```
┌─────────────────────────────┐
│ #1                    [7d]  │  ← rank + time badge
│                             │
│    [card art — full bleed]  │
│    [with dark overlay]      │
│                             │
│  Charizard ex               │  ← card name
│  Surging Sparks             │  ← set name
│                             │
│  Raw:    $84.00             │  ← prices
│  PSA 10: $210.00            │
│                             │
│  7d:  ▲ +18.2%  [green]    │  ← % changes
│  30d: ▼  -4.1%  [red]      │
│                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━   │
│  @pkmnIndx                  │  ← footer
└─────────────────────────────┘
```

---

## 19. Cost Breakdown

### POC phase (just @pkmnIndx)
| Item | Monthly cost |
|---|---|
| Domain + email forwarding | ~$0.85 |
| All APIs + tools | $0 |
| **Total** | **~$0.85/mo** |

### Full launch (all 6 channels, monetized)
| Item | Monthly cost |
|---|---|
| TCG API Pro (commercial license) | $49.99 |
| ElevenLabs Starter (voiceover, optional) | $6.00 |
| Buffer Essentials (6 channels) | $18.00 |
| Remotion Lambda (AWS compute) | ~$5–15 |
| Domain | ~$0.85 |
| **Total** | **~$80–90/mo** |

---

## 20. Open Questions

| Question | Status | Notes |
|---|---|---|
| PSA graded data accuracy | Needs validation | PokemonPriceTracker pulls from real eBay sales — verify against manual checks |
| Buffer TikTok auto-posting | Needs testing | TikTok API may restrict new accounts to draft mode initially |
| YouTube Shorts OAuth setup | Needs setup | Requires Google Cloud project + one-time OAuth flow |
| Instagram carousel via Buffer | Needs testing | Verify Buffer free plan supports carousel format |
| Music licensing | Decided | YouTube Audio Library (free) for now |
| Voiceover | Decided | No voiceover in v1 — muted with text overlays |
| Buy/sell signals | Future | Requires 30+ days of historical data first |
| Custom music | Future | Owner wants to create original music eventually |

---

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| Jun 22, 2026 | Domain: cardindx.com | Scalable across all 6 channels, professional |
| Jun 22, 2026 | Email: Namecheap forwarding | Free, upgrade to Workspace when monetized |
| Jun 22, 2026 | Stack: Node.js + TypeScript | One language end to end, React experience |
| Jun 22, 2026 | Video: Remotion | Better output quality than FFmpeg, React-native |
| Jun 22, 2026 | No voiceover in v1 | Muted videos perform well on TikTok, $0 cost |
| Jun 22, 2026 | 10 cards standard, 5 for high-value | Fits 30s video cleanly |
| Jun 22, 2026 | Both 7d + 30d price windows | More data = more signal |
| Jun 22, 2026 | POC sets: Surging Sparks + Chaos Rising | Active price movement |
| Jun 22, 2026 | Color scheme: white + red | Clean data aesthetic with brand energy |
| Jun 22, 2026 | Posting: 1–2 videos/day, all platforms | Maximum reach, same content |

---

*Last updated: Jun 22, 2026*  
*Maintained by: cardindx pipeline*