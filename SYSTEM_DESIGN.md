# CardIndx: End-to-End System Design Blueprint

This document specifies the technical design, data lifecycle, system boundaries, and structural diagrams for the CardIndx automated TCG media pipeline.

---

## 1. System Topology & Data Flow

The architecture operates as an ephemeral, strictly decoupled sequence of data transformations. Each phase is separated by a hard file-system boundary to ensure zero state leakage.

```text
[ GITHUB ACTIONS CRON ]
         │
         ▼
 ┌───────────────┐
 │  Phase 1:     │ ──► Hits api.pokemontcg.io (Fetch set roster)
 │  Data Fetcher │ ──► Filters down to Chase Cards (Collector # > Base #)
 └───────────────┘ ──► Throttled loop to api.pokemonpricetracker.com (PSA 10)
         │
         ▼ Writes to:
 ┌──────────────────────────────┐
 │ output/YYYY-MM-DD/data.json  │ ◄── [Deterministic Data Contract]
 └──────────────────────────────┘
         │
         ▼ Reads from:
 ┌───────────────┐
 │  Phase 2:     │ ──► Spawns Headless Chromium via Remotion
 │  Video Render │ ──► Compiles React motion graphics tree
 └───────────────┘ ──► Encodes frame streams into H.264 video
         │
         ▼ Writes to:
 ┌──────────────────────────────┐
 │ output/YYYY-MM-DD/reel.mp4   │ ◄── [Binary Output Asset]
 └──────────────────────────────┘
         │
         ▼ Reads from:
 ┌───────────────┐
 │  Phase 3:     │ ──► Builds multi-part form payload (Video + Caption)
 │  Publisher    │ ──► Dispatches to Buffer API Gateway
 └───────────────┘
         │
         ▼
[ SOCIAL APIS (IG/TIKTOK) ]
```

## 2. API Integration Specifications
Ingestion Sequence & Rate Mitigation
To resolve prices while protecting free-tier rate boundaries, the ingestion engine utilizes an anchor-and-query pattern rather than arbitrary string queries.

Call 1: The Set Anchor
Endpoint: GET https://api.pokemontcg.io/v2/cards

Query Params: q=set.id:sv3pt5&select=id,name,number,images

Purpose: Pulls the strict, authoritative list of cards belonging to a set (e.g., Pokémon 151).

Call 2: Graded Price Resolution Loop
Endpoint: GET https://api.pokemonpricetracker.com/psa10

Query Params: name={cardName}&set={setName}

Rate Limits Protection: Executed sequentially inside a standard for...of block combined with an explicit 200ms sleep mechanism (setTimeout). Promises are never evaluated in parallel (Promise.all) to avoid IP rate-limiting blocks from GitHub Actions runners.

## 3. Data Contract Layer (Zod Schema)
All serialized entities hitting the filesystem must conform strictly to the CardMarketDataSchema. Any payload mismatch triggers a non-zero exit sequence, halting the pipeline before spinning up the heavy video rendering context.

TypeScript
// Located at src/fetch/types.ts
export const CardMarketDataSchema = z.object({
  id: z.string(),                  // Match ID e.g., "sv3pt5-199"
  name: z.string(),                // e.g., "Charizard ex"
  cardNumber: z.string(),          // e.g., "199"
  setName: z.string(),             // e.g., "151"
  artUrl: z.string().url(),        // High-res imagery asset link
  prices: z.object({
    psa10Current: z.number().nullable(),
    psa10Change30d: z.number().nullable(), // Target metrics for video sorting
    rawCurrent: z.number().nullable(),
  })
});
## 4. Media Synthesis Guardrails (Remotion Engine)
The video compiler converts structured text into raw video binaries under strict rendering constraints to stay within GitHub Actions' resource footprints:

Asset Management: External card imagery (artUrl) is fetched directly during runtime rendering or pre-downloaded during Phase 1 to prevent browser loading timeouts.

Output Compression: The pipeline forces an explicit Constant Rate Factor (CRF) inside remotion.config.ts to compress output file sizes below 15MB, mitigating payload transfer limits when communicating with the Buffer API.

Idempotency Execution: The orchestrator checks for the existence of output/YYYY-MM-DD/reel.mp4. If found (restored via GitHub Workflow action caches), downstream processing skips media compilation steps completely.


---

### Verification
With this final document in place, your architectural notes are fully codified alongside your working entry code. Running the pipeline test once more verifies that everything remains untouched and operational:

```bash
npm run pipeline -- --game pokemon --config ./config/pokemon.json
You now have a clean system design and a solid layout skeleton ready for when your primary coding environments are clear to start filling in the logic!