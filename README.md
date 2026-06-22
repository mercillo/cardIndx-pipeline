# CardIndx Pipeline 🚀

An ephemeral, decoupled TCG market-moving data pipeline and media synthesis engine. Driven by a daily cron job via GitHub Actions, this system tracks asset value shifts and auto-generates short-form video content.

## 📐 System Architecture

### 1. Architectural Boundaries
* **Domain Isolation:** Strict monorepo boundaries. Code residing in `src/fetch`, `src/render`, or `src/post` may not share internal cross-domain imports. All context passes via deterministic files stored in `output/YYYY-MM-DD/`.
* **Compute Strategy:** Ephemeral execution context via GitHub Actions (`ubuntu-latest`). No persistent database footprint.

### 2. Execution Pipeline Sequence
1. **Ingestion & Serialization (`src/fetch`):** Hydrates target set data models, validates stream execution schemas via Zod, filters down to chase elements, and evaluates price delta points against external pricing APIs.
2. **Media Synthesis (`src/render`):** Spawns a headless browser via Remotion, parses the daily localized JSON schema, and compiles React-driven motion layouts into an MP4 binary.
3. **Distribution Gateway (`src/post`):** Interacts with distribution endpoints to automate publishing queues via form-data binary pipes.

---

## 🛠️ Local Development

### Prerequisites
* Node.js (v20+ recommended)
* NPM

### Setup
1. Clone the repository.
2. Initialize dependencies: `npm install`
3. Configure your local environment: `cp .env.example .env` (and populate your tokens)

### Running the Orchestrator
To execute the pipeline orchestrator locally against a target layout profile:
```bash
npm run pipeline -- --game pokemon --config ./config/pokemon.json