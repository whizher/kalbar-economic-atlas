# Atlas Ekonomi Pontianak Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build the first public release of `whizher/kalbar-economic-atlas`: a static, Bahasa Indonesia Pontianak deep dive that explains prices, jobs, and household welfare through six fully attributed official indicators, latest snapshots, and five comparable annual observations.

**Architecture:** Astro renders every public route, data download, chart, and table to static output. Zod validates checked-in Pontianak snapshots at build time. The browser receives no data-fetching client and only a small local theme script; GitHub Actions validates pull requests with read-only permissions and deploys a strictly allowlisted Pages artifact from a separate privileged job.

**Tech Stack:** Node.js 24.20.0 LTS; Astro 7.2.8; TypeScript 6.0.3; Zod 4.4.3; Vitest 4.1.11; Playwright 1.62.1; `@axe-core/playwright` 4.13.0; GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-27-kalbar-economic-atlas-design.md`

## Global constraints

- Keep the v1 public scope exclusively Pontianak and the public language Bahasa Indonesia.
- Publish exactly these six indicators: headline inflation, food/beverages/tobacco inflation, TPT, TPAK, poverty rate, and adjusted expenditure per capita.
- Give each indicator its own latest period and exactly five comparable annual observations; never align periods by interpolation or substitute provincial figures.
- Treat checked-in values as verified snapshots. Project code must make no runtime requests to BPS or any other external service.
- Do not copy either approved image mockup into the repository. Reproduce the approved visual direction with local CSS and semantic SVG only.
- Keep charts scale-independent, keyboard-accessible, color-independent, and paired with an equivalent HTML table and text summary.
- Store only an explicit `light` or `dark` theme choice under `atlas-theme`; use no other persistent browser state.
- Apply MIT only to original code. Put BPS-derived data under the BPS terms notice with source-level attribution and the independent-project disclaimer.
- Use `actions/setup-node` v4 at the reviewed immutable SHA in CI. Do not move this project to `setup-node` v7 until a patched Node 24 release has been separately verified.
- No public repository creation, remote push, pull request, Pages setting change, or deployment is authorized by this plan. Those require a separate owner instruction after local verification.
- Every implementation task ends with a focused commit. Do not combine unrelated tasks or rewrite earlier task commits during execution.

## Verified dependency and Action baseline

The executor must confirm these pins are still available before installation, but must not silently replace them with newer versions:

| Dependency or Action | Approved pin | Reason |
| --- | --- | --- |
| Node.js | `24.20.0` | Latest LTS verified 2026-08-27 |
| `astro` | `7.2.8` | Static site framework; supports Node `>=22.12.0` |
| `typescript` | `6.0.3` | Astro-compatible TypeScript line |
| `zod` | `4.4.3` | Runtime schema validation |
| `vitest` | `4.1.11` | Unit and policy tests |
| `@playwright/test` | `1.62.1` | Browser integration tests |
| `@axe-core/playwright` | `4.13.0` | Automated accessibility checks |
| `@astrojs/check` | `0.9.10` | Astro and TypeScript diagnostics |
| `@types/node` | `24.13.3` | Node 24 type declarations for build scripts and test configuration |
| `actions/checkout` | `3d3c42e5aac5ba805825da76410c181273ba90b1` (`v7.0.1`) | Immutable official Node 24 release |
| `actions/setup-node` | `49933ea5288caeca8642d1e84afbd3f7d6820020` (`v4`) | Reviewed maintenance pin retained pending a patched v7 |
| `actions/configure-pages` | `45bfe0192ca1faeb007ade9deae92b16b8254a0d` (`v6.0.0`) | Immutable official Node 24 release |
| `actions/upload-pages-artifact` | `fc324d3547104276b827a68afc52ff2a11cc49c9` (`v5.0.0`) | Immutable official Pages artifact release |
| `actions/deploy-pages` | `cd2ce8fcbc39b97be8ca5fce6e763baed58fa128` (`v5.0.0`) | Immutable official Node 24 release |

## Target file map

```text
.
├── .github/
│   └── workflows/
│       ├── pages.yml
│       ├── source-check.yml
│       └── validate.yml
├── data/
│   └── pontianak/
│       ├── geography.json
│       ├── sources.json
│       ├── verification.json
│       └── indicators/
│           ├── adjusted-expenditure-per-capita.json
│           ├── food-inflation.json
│           ├── headline-inflation.json
│           ├── poverty-rate.json
│           ├── tpak.json
│           └── tpt.json
├── docs/
│   └── superpowers/
│       ├── plans/2026-08-27-pontianak-deep-dive-implementation.md
│       └── specs/2026-08-27-kalbar-economic-atlas-design.md
├── e2e/
│   ├── accessibility.spec.ts
│   ├── data-downloads.spec.ts
│   ├── navigation.spec.ts
│   ├── progressive-enhancement.spec.ts
│   ├── routes.ts
│   ├── smoke.spec.ts
│   └── theme.spec.ts
├── public/
│   ├── assets/
│   │   ├── favicon.svg
│   │   └── theme.js
│   └── robots.txt
├── scripts/
│   ├── check-sources.mjs
│   ├── build-policy.mjs
│   ├── validate-build.mjs
│   └── validate-data.mjs
├── src/
│   ├── components/
│   │   ├── DataFreshness.astro
│   │   ├── IndicatorCard.astro
│   │   ├── SourcePanel.astro
│   │   ├── ThemeToggle.astro
│   │   ├── TopicSummaryCard.astro
│   │   ├── TrendChart.astro
│   │   └── WhyItMatters.astro
│   ├── config/site.ts
│   ├── content/topics.ts
│   ├── data/
│   │   ├── format.ts
│   │   ├── load.ts
│   │   ├── schema.ts
│   │   └── trend.ts
│   ├── layouts/SiteShell.astro
│   ├── pages/
│   │   ├── 404.astro
│   │   ├── data/
│   │   │   └── pontianak/
│   │   │       ├── indicators.json.ts
│   │   │       └── sources.json.ts
│   │   ├── data-metodologi.astro
│   │   ├── harga.astro
│   │   ├── index.astro
│   │   ├── kesejahteraan.astro
│   │   ├── pekerjaan.astro
│   │   └── tentang.astro
│   └── styles/
│       ├── components.css
│       ├── global.css
│       └── tokens.css
├── tests/
│   ├── build-boundary.test.ts
│   ├── data-schema.test.ts
│   ├── data-snapshots.test.ts
│   ├── format.test.ts
│   ├── project-config.test.ts
│   ├── source-check.test.ts
│   ├── trend.test.ts
│   └── workflow-policy.test.ts
├── .gitignore
├── .nvmrc
├── CONTRIBUTING.md
├── DATA_USE.md
├── LICENSE
├── README.md
├── astro.config.mjs
├── package-lock.json
├── package.json
├── playwright.config.ts
├── tsconfig.json
└── vitest.config.ts
```

## Acceptance traceability

| Approved design criterion | Implementation and evidence |
| --- | --- |
| Six verified latest values plus five comparable observations each | Tasks 2–4; schema, snapshot, formatter, and source evidence tests |
| Complete period, unit, geography, source, and verification metadata | Tasks 2, 3, and 8; strict joins plus public data downloads |
| Home and five supporting pages on mobile/desktop | Tasks 5–8 and 10; route, responsive, and Axe suites |
| Accessible, persistent light/dark themes | Tasks 5 and 10; storage-failure, system preference, contrast, and keyboard checks |
| Every chart has a table and plain-language explanation | Tasks 4 and 6; geometry, chart/table parity, and content tests |
| No live API, analytics, cookies, tracking, accounts, or remote project resource | Task 9; artifact scanner, request capture, and JavaScript-disabled checks |
| Full data/unit/component/accessibility/build/workflow coverage | Tasks 2–12; focused red/green cycles followed by `npm run verify` |
| Main-only Pages with separate build/deploy credentials | Task 12; immutable workflow policy tests and three-job deployment design |
| Post-deployment route/theme/chart smoke check | Task 12; credential-free smoke job after `deploy` |
| License, data-use, privacy, attribution, contribution, and non-affiliation notices | Tasks 8 and 13; public pages plus repository guidance review |

## Task 1: Bootstrap the static Astro project

**Files:**

- Create: `.nvmrc`
- Create: `.gitignore`
- Create: `package.json`
- Create: `package-lock.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/project-config.test.ts`

**Interfaces:** Consumes the repository name and GitHub Pages project path from the spec. Produces the stable `npm run check`, `npm test`, `npm run build`, `npm run test:e2e`, and `npm run verify` commands used by every later task.

- [ ] Create `.nvmrc` containing exactly `24.20.0` and create `package.json` with the approved versions and scripts:

```json
{
  "name": "kalbar-economic-atlas",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": "24.20.0"
  },
  "scripts": {
    "dev": "astro dev",
    "check": "astro check",
    "test": "vitest run",
    "test:watch": "vitest",
    "data:validate": "node scripts/validate-data.mjs",
    "build": "npm run data:validate && astro build",
    "preview": "astro preview",
    "test:e2e": "playwright test",
    "verify": "npm run check && npm test && npm run build && npm run test:e2e"
  },
  "dependencies": {
    "astro": "7.2.8",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@astrojs/check": "0.9.10",
    "@axe-core/playwright": "4.13.0",
    "@playwright/test": "1.62.1",
    "@types/node": "24.13.3",
    "typescript": "6.0.3",
    "vitest": "4.1.11"
  }
}
```

- [ ] Run `npm install --package-lock-only`, then `npm ci`. Confirm `npm ls --depth=0` reports the exact direct dependency versions and commit `package-lock.json`.
- [ ] Write `tests/project-config.test.ts` first. Assert Node is exact, Astro is static, the canonical origin is `https://whizher.github.io`, the base path is `/kalbar-economic-atlas`, and trailing slashes are enabled.
- [ ] Run `npm test -- tests/project-config.test.ts`. Expected: failure because `astro.config.mjs` and the TypeScript configs do not yet exist.
- [ ] Add the minimal configuration:

```js
// astro.config.mjs
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://whizher.github.io",
  base: "/kalbar-economic-atlas",
  output: "static",
  trailingSlash: "always"
});
```

```json
// tsconfig.json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "allowJs": true,
    "resolveJsonModule": true,
    "types": ["node", "vitest/globals"]
  },
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    restoreMocks: true
  }
});
```

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

const baseURL = (
  process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4321/kalbar-economic-atlas/"
).replace(/\/?$/, "/");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: {
    baseURL,
    trace: "retain-on-failure"
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } }
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: "npm run build && npm run preview -- --host 127.0.0.1",
    url: "http://127.0.0.1:4321/kalbar-economic-atlas/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
```

- [ ] Add `.gitignore` entries for `node_modules/`, `dist/`, `.astro/`, `playwright-report/`, `test-results/`, and local environment files. Run `npm test -- tests/project-config.test.ts` and `npm run check`; both must pass.
- [ ] Install Chromium with `npx playwright install chromium` for local execution. Do not commit downloaded browser binaries.
- [ ] Commit: `chore: bootstrap Astro static site`

## Task 2: Define and validate the canonical data contract

**Files:**

- Create: `src/data/schema.ts`
- Create: `src/data/load.ts`
- Create: `scripts/validate-data.mjs`
- Create: `tests/data-schema.test.ts`

**Interfaces:** `AtlasDataSchema` consumes raw geography, source, verification, and indicator JSON. `loadAtlasData(root?)` returns one validated `AtlasData` object to pages and static JSON endpoints. Validation errors include the file and precise Zod path and stop the build.

- [ ] Write `tests/data-schema.test.ts` with a valid in-memory TPAK fixture and failing cases for an unknown indicator ID, six trend observations, duplicate periods, a percentage outside `0..100`, incomplete attribution, a non-Pontianak geography code, and an unrecognized source availability state.
- [ ] Run `npm test -- tests/data-schema.test.ts`. Expected: module-not-found failure for `src/data/schema.ts`.
- [ ] Implement these public types and constants in `src/data/schema.ts`:

```ts
import { z } from "zod";

export const INDICATOR_IDS = [
  "headline-inflation",
  "food-inflation",
  "tpt",
  "tpak",
  "poverty-rate",
  "adjusted-expenditure-per-capita"
] as const;

export const TopicSchema = z.enum(["harga", "pekerjaan", "kesejahteraan"]);
export const IndicatorIdSchema = z.enum(INDICATOR_IDS);
export const UnitSchema = z.enum(["percent", "thousand-rupiah-ppp-per-person-per-year"]);

export const ObservationSchema = z.object({
  periodKey: z.string().regex(/^\d{4}(-\d{2})?$/),
  periodLabel: z.string().min(4),
  value: z.number().finite(),
  status: z.enum(["final", "revised"])
}).strict();

export const SourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  url: z.string().url().startsWith("https://pontianakkota.bps.go.id/"),
  publisher: z.literal("BPS Kota Pontianak"),
  author: z.string().min(1).nullable(),
  publishedOn: z.string().date().nullable(),
  accessedOn: z.string().date(),
  reference: z.string().min(1),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  availability: z.enum(["active", "temporarily-unavailable", "withdrawn-review", "withdrawn"])
}).strict();
```

- [ ] Add the strict `GeographySchema`, `VerificationSchema`, and `IndicatorSchema` with these resolved fields:

```ts
export const GeographySchema = z.object({
  code: z.literal("6171"),
  name: z.literal("Kota Pontianak"),
  province: z.literal("Kalimantan Barat"),
  scope: z.literal("municipality")
}).strict();

export const VerificationSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  verifiedOn: z.string().date(),
  method: z.literal("two-pass-manual"),
  passCount: z.literal(2),
  checks: z.array(z.enum([
    "value",
    "period",
    "unit",
    "geography",
    "reference",
    "comparability"
  ])).length(6)
}).strict();

export const IndicatorSchema = z.object({
  id: IndicatorIdSchema,
  topic: TopicSchema,
  geographyCode: z.literal("6171"),
  label: z.string().min(1),
  shortDefinition: z.string().min(1),
  officialDefinition: z.string().min(1),
  unit: UnitSchema,
  frequency: z.enum(["monthly-with-annual-trend", "annual"]),
  trendReference: z.enum(["december", "august", "annual"]),
  precision: z.number().int().min(0).max(2),
  latest: ObservationSchema,
  trend: z.array(ObservationSchema).length(5),
  movement: z.object({
    comparedWith: z.string().regex(/^\d{4}(-\d{2})?$/),
    comparisonValue: z.number().finite(),
    delta: z.number().finite(),
    unit: z.enum(["percentage-point", "thousand-rupiah-ppp-per-person-per-year"]),
    label: z.string().min(1)
  }).strict(),
  whyItMatters: z.string().min(1),
  methodologyNote: z.string().min(1),
  comparabilityNote: z.string().min(1),
  sourceIds: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1),
  verificationId: z.string().regex(/^[a-z0-9-]+$/),
  revision: z.object({
    state: z.enum(["current", "revised", "withdrawn-review", "withdrawn"]),
    note: z.string().min(1).nullable()
  }).strict()
}).strict();

export const AtlasDataSchema = z.object({
  geography: GeographySchema,
  sources: z.array(SourceSchema).min(1),
  verifications: z.array(VerificationSchema).min(1),
  indicators: z.array(IndicatorSchema).length(6)
}).strict();
```

- [ ] Refine `IndicatorSchema` so percentage units stay between 0 and 100, adjusted expenditure stays positive, trend periods are unique and ascending, movement units match indicator units, `movement.delta` equals `latest.value - comparisonValue` at the declared precision, any `comparedWith` period also present in the trend has the same value, `latest` is not older than the final trend point, and topic/indicator mappings match the approved six-item catalogue. Refine `AtlasDataSchema` so every `sourceId` and `verificationId` resolves, catalogue IDs are unique, all six verification checks are unique, and there are neither missing nor extra indicator IDs.
- [ ] Export `AtlasDataSchema`, `AtlasData`, `Indicator`, `Observation`, `SourceRecord`, and `parseAtlasData(input)`.
- [ ] Implement `loadAtlasData(root = process.cwd())` in `src/data/load.ts` using `node:fs/promises`. Sort the six indicator filenames before parsing, join the three Pontianak metadata files, reject missing or extra indicator files, and wrap errors as `Data validation failed at <path>: <message>`.
- [ ] Implement `scripts/validate-data.mjs` as a thin call to `loadAtlasData()` that prints `Validated 6 Pontianak indicators and 30 trend observations.` only after successful parsing.
- [ ] Run `npm test -- tests/data-schema.test.ts`. Expected: all schema cases pass.
- [ ] Commit: `feat: define validated atlas data contract`

## Task 3: Create the verified Pontianak source catalogue and snapshots

**Files:**

- Create: `data/pontianak/geography.json`
- Create: `data/pontianak/sources.json`
- Create: `data/pontianak/verification.json`
- Create: `data/pontianak/indicators/headline-inflation.json`
- Create: `data/pontianak/indicators/food-inflation.json`
- Create: `data/pontianak/indicators/tpt.json`
- Create: `data/pontianak/indicators/tpak.json`
- Create: `data/pontianak/indicators/poverty-rate.json`
- Create: `data/pontianak/indicators/adjusted-expenditure-per-capita.json`
- Create: `tests/data-snapshots.test.ts`

**Interfaces:** Consumes only the twelve approved BPS source pages below and their official document/table links. Produces the sole production data inputs. The browser never reads the BPS pages; later pages consume only `loadAtlasData()` output.

- [ ] Write `tests/data-snapshots.test.ts` first. Assert the exact six IDs, topic membership `2/2/2`, geography code `6171`, exactly five annual observations per indicator, latest-period labels, complete source joins, verification method `two-pass-manual`, and a nonempty comparability note for every series.
- [ ] Run `npm test -- tests/data-snapshots.test.ts`. Expected: failure because the data directory is absent.
- [ ] Add `geography.json` with stable code `6171`, public name `Kota Pontianak`, province `Kalimantan Barat`, and scope `municipality`.
- [ ] Build `sources.json` from exactly these official catalogue entries, preserving each title, direct page URL, BPS publisher, publication date when shown, access date `2026-08-27`, exact page/table reference, explicit nullable author, and a SHA-256 checksum when the downloadable document is reproducible:

| Source ID | Direct catalogue URL | Required use |
| --- | --- | --- |
| `pontianak-dalam-angka-2026` | `https://pontianakkota.bps.go.id/id/publication/2026/02/27/d3d400239ad6cf7d959c2404/kota-pontianak-dalam-angka-2026.html` | Cross-check annual welfare and city scope |
| `ihk-pontianak-2021` | `https://pontianakkota.bps.go.id/id/publication/2022/03/23/ba4797ae921daa1695bc088e/indeks-harga-konsumen-kota-pontianak-2021.html` | December 2021 food-group inflation |
| `ihk-pontianak-2022` | `https://pontianakkota.bps.go.id/publication/2023/03/21/80edf8f05ad14ed95c009897/indeks-harga-konsumen-kota-pontianak-2022.html` | December 2022 food-group inflation |
| `ihk-pontianak-2023` | `https://pontianakkota.bps.go.id/id/publication/2024/03/21/c2abcd79687989e691ea338e/indeks-harga-konsumen-kota-pontianak-2023.html` | December 2023 food-group inflation |
| `ihk-pontianak-2025` | `https://pontianakkota.bps.go.id/id/publication/2026/06/05/21038398a2694540c254503d/indeks-harga-konsumen-kota-pontianak-2025.html` | Headline and food-group inflation |
| `ketenagakerjaan-pontianak-2021` | `https://pontianakkota.bps.go.id/id/publication/2022/06/30/65a137725d28f9e212b449e8/labor-statistics-of-pontianak-municipality-2021.html` | August 2021 municipal TPT |
| `ketenagakerjaan-pontianak-2022` | `https://pontianakkota.bps.go.id/id/publication/2023/06/27/d5ba993f14431cb08d4fa2de/statistik-ketenagakerjaan-kota-pontianak-2022.html` | August 2022 municipal TPT |
| `ketenagakerjaan-pontianak-2025` | `https://pontianakkota.bps.go.id/id/publication/2026/06/26/5cb84d57097179ac93ca2e6a/statistik-ketenagakerjaan-kota-pontianak-2025.html` | August TPT and TPAK |
| `poverty-p0-table` | `https://pontianakkota.bps.go.id/en/statistics-table/2/NTExIzI=/persentase-penduduk-miskin-p0-menurut-kabupaten-kota-di-provinsi-kalimantan.html` | Annual municipal poverty rate |
| `adjusted-expenditure-table` | `https://pontianakkota.bps.go.id/id/statistics-table/2/MzM2IzI=/pengeluaran-per-kapita-yang-disesuaikan-ppp-menurut-kabupaten-kota-provinsi-kalimantan-barat.html` | Annual adjusted per-capita expenditure |
| `ipm-pontianak-2025` | `https://pontianakkota.bps.go.id/id/pressrelease/2026/01/23/1067/indeks-pembangunan-manusia--ipm--kota-pontianak-pada-tahun-2025-mencapai-82-80-poin.html` | Reproducible 2021–2025 municipal adjusted-expenditure series |
| `bps-terms` | `https://pontianakkota.bps.go.id/id/term-of-use` | Data-use boundary, not an indicator source |

- [ ] Pass one for headline inflation: extract the latest verified all-items year-on-year value and five comparable December year-on-year rates, plus period, unit, table/page, base/classification notes, and revision state.
- [ ] Pass one for food/beverages/tobacco inflation: extract the latest verified group year-on-year value and five comparable December year-on-year rates with the same metadata; never substitute the all-items rate.
- [ ] Pass one for TPT: extract the latest and five annual August municipal Sakernas estimates with exact page/table and revision state; never use February or provincial values.
- [ ] Pass one for TPAK: re-extract the August sequence shown below and its source metadata before accepting the existing anchor values.
- [ ] Pass one for poverty: extract the latest and five annual Kota Pontianak P0 estimates, official unit, table reference, and revision state.
- [ ] Pass one for adjusted expenditure: extract the latest and five annual municipal PPP-adjusted values, preserve the official unit, and record that it is not household income.
- [ ] Pass two for the two price records: reopen the cited source and compare every value, period, unit, city scope, base/classification note, and reference against the JSON.
- [ ] Pass two for TPT and TPAK: independently reread the August municipal tables and compare all values, period labels, units, city scope, and references.
- [ ] Pass two for poverty and adjusted expenditure: independently reread the municipal rows and compare all values, periods, units, scope, and references.
- [ ] Record the completion date, method, two completed passes, and all six check categories in `verification.json`. If any pass disagrees, stop and resolve the source evidence before committing.
- [ ] Use the already verified August TPAK sequence as a concrete anchor record; recheck it in pass two before committing:

```json
{
  "id": "tpak",
  "topic": "pekerjaan",
  "geographyCode": "6171",
  "label": "Tingkat Partisipasi Angkatan Kerja (TPAK)",
  "shortDefinition": "Persentase penduduk usia kerja yang termasuk angkatan kerja.",
  "officialDefinition": "Persentase angkatan kerja terhadap penduduk usia kerja.",
  "unit": "percent",
  "frequency": "annual",
  "trendReference": "august",
  "precision": 2,
  "latest": { "periodKey": "2025-08", "periodLabel": "Agustus 2025", "value": 61.77, "status": "final" },
  "trend": [
    { "periodKey": "2021-08", "periodLabel": "Agustus 2021", "value": 61.94, "status": "final" },
    { "periodKey": "2022-08", "periodLabel": "Agustus 2022", "value": 64.82, "status": "final" },
    { "periodKey": "2023-08", "periodLabel": "Agustus 2023", "value": 63.47, "status": "final" },
    { "periodKey": "2024-08", "periodLabel": "Agustus 2024", "value": 64.53, "status": "final" },
    { "periodKey": "2025-08", "periodLabel": "Agustus 2025", "value": 61.77, "status": "final" }
  ],
  "movement": {
    "comparedWith": "2024-08",
    "comparisonValue": 64.53,
    "delta": -2.76,
    "unit": "percentage-point",
    "label": "Turun 2,76 poin persentase dibanding Agustus 2024."
  },
  "whyItMatters": "TPAK menunjukkan seberapa besar penduduk usia kerja yang bekerja atau aktif mencari kerja. Perubahannya dapat berkaitan dengan pendidikan, tanggung jawab rumah tangga, peluang kerja, dan faktor lain.",
  "methodologyNote": "Estimasi Sakernas Agustus untuk Kota Pontianak.",
  "comparabilityNote": "Kelima pengamatan menggunakan estimasi Agustus tingkat Kota Pontianak.",
  "sourceIds": ["ketenagakerjaan-pontianak-2025"],
  "verificationId": "pontianak-v1-2026-08-27",
  "revision": { "state": "current", "note": null }
}
```

- [ ] Use these exact public explanations in the corresponding records:

| Indicator | `whyItMatters` |
| --- | --- |
| Headline inflation | `Inflasi merangkum perubahan harga rata-rata berbagai barang dan jasa. Angka ini membantu melihat tekanan harga secara luas, tetapi pengalaman setiap rumah tangga dapat berbeda sesuai pola belanjanya.` |
| Food inflation | `Harga makanan, minuman, dan tembakau berkaitan langsung dengan belanja rutin banyak rumah tangga. Perubahan kelompok ini perlu dibaca bersama kelompok pengeluaran lain, bukan sebagai gambaran seluruh biaya hidup.` |
| TPT | `TPT menunjukkan bagian angkatan kerja yang belum bekerja dan sedang mencari atau mempersiapkan pekerjaan. Angka ini tidak mencakup semua bentuk kekurangan pekerjaan atau mutu pekerjaan.` |
| TPAK | `TPAK menunjukkan seberapa besar penduduk usia kerja yang bekerja atau aktif mencari kerja. Perubahannya dapat berkaitan dengan pendidikan, tanggung jawab rumah tangga, peluang kerja, dan faktor lain.` |
| Poverty rate | `Persentase penduduk miskin menunjukkan bagian penduduk di bawah garis kemiskinan resmi. Ukuran ini penting, tetapi tidak merangkum seluruh pengalaman kerentanan atau kesenjangan.` |
| Adjusted expenditure | `Pengeluaran per kapita yang disesuaikan adalah ukuran daya beli dalam penghitungan pembangunan manusia. Angka ini bukan pendapatan rumah tangga, gaji, atau uang tunai yang diterima seseorang.` |

- [ ] Run `npm run data:validate` and `npm test -- tests/data-schema.test.ts tests/data-snapshots.test.ts`. Expected: `6` indicators, `30` annual observations, and all tests pass.
- [ ] Inspect `git diff -- data/pontianak`. Confirm every numeric change is human-readable, every record names its exact period, no complete BPS publication is committed, and no inferred value appears without an official source.
- [ ] Commit: `data: add verified Pontianak v1 snapshots`

## Task 4: Implement Indonesian formatting and trend geometry

**Files:**

- Create: `src/data/format.ts`
- Create: `src/data/trend.ts`
- Create: `tests/format.test.ts`
- Create: `tests/trend.test.ts`

**Interfaces:** `formatIndicatorValue`, `formatDelta`, and `formatPeriod` consume validated units and observations and produce Indonesian display strings. `createTrendGeometry` consumes exactly five observations and produces deterministic SVG coordinates and a text movement summary without interpreting direction as universally good or bad.

- [ ] Write failing table-driven tests for percent values, percentage-point deltas, Indonesian grouping/decimal separators, adjusted-expenditure units, zero changes, negative changes, December labels, August labels, and the warning that adjusted expenditure is not income.
- [ ] Write failing geometry tests for increasing, decreasing, flat, and mixed five-value series. Assert a `0 0 100 40` view box, finite points, left-to-right ordering, flat-series centering, and text that states the first value, last value, absolute change, and unit.
- [ ] Run `npm test -- tests/format.test.ts tests/trend.test.ts`. Expected: module-not-found failures.
- [ ] Implement the formatter API with `Intl.NumberFormat("id-ID")` and explicit unit labels:

```ts
export type DisplayUnit = "percent" | "percentage-point" | "thousand-rupiah-ppp-per-person-per-year";

export function formatIndicatorValue(value: number, unit: DisplayUnit, precision: number): string;
export function formatDelta(value: number, unit: DisplayUnit, precision: number): string;
export function formatPeriod(periodKey: string, referenceMonth: "august" | "december" | "annual"): string;
```

- [ ] Implement `createTrendGeometry(observations, width = 100, height = 40, padding = 4)`. If all values are equal, place every point at `height / 2`; otherwise map min to `height - padding` and max to `padding`. Never add a statistical smoother or forecast.
- [ ] Run the two focused test files, then `npm test`. Expected: all tests pass.
- [ ] Commit: `feat: add Indonesian data presentation helpers`

## Task 5: Build the responsive site shell and theme behavior

**Files:**

- Create: `src/config/site.ts`
- Create: `src/layouts/SiteShell.astro`
- Create: `src/components/ThemeToggle.astro`
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/styles/components.css`
- Create: `public/assets/theme.js`
- Create: `public/assets/favicon.svg`
- Create: `public/robots.txt`
- Create: `src/pages/index.astro`
- Create: `e2e/routes.ts`
- Create: `e2e/navigation.spec.ts`
- Create: `e2e/theme.spec.ts`

**Interfaces:** `SiteShell` accepts `title`, `description`, and optional `currentPath`; it owns metadata, skip link, landmarks, navigation, footer, base-path-safe URLs, and theme initialization. `ThemeToggle` exposes one labeled button. The theme script owns the sole persistent browser key, `atlas-theme`.

- [ ] Create `e2e/routes.ts` with base-relative paths so local and deployed tests cannot accidentally escape the project path:

```ts
export const PUBLIC_ROUTES = [
  { path: "./", heading: "Ekonomi Pontianak, dijelaskan dengan jernih." },
  { path: "harga/", heading: "Harga di Pontianak" },
  { path: "pekerjaan/", heading: "Pekerjaan di Pontianak" },
  { path: "kesejahteraan/", heading: "Kesejahteraan rumah tangga" },
  { path: "data-metodologi/", heading: "Data & metodologi" },
  { path: "tentang/", heading: "Tentang Atlas Ekonomi Pontianak" }
] as const;
```

- [ ] Add browser tests first. Use `PUBLIC_ROUTES` without adding leading slashes. In `navigation.spec.ts`, assert the home document uses `lang="id"`, has one `main`, a working skip link, all six public navigation destinations, a native mobile disclosure, and base-path-safe links on desktop and Pixel 7. In `theme.spec.ts`, assert system-dark fallback, explicit light/dark selection, reload persistence, an `aria-pressed` state, and continued readability when storage methods throw.
- [ ] Run `npm run test:e2e -- e2e/navigation.spec.ts e2e/theme.spec.ts --project=desktop-chromium`. Expected: the preview server cannot build because the first page and shell do not exist.
- [ ] Create `src/config/site.ts` with this immutable public identity:

```ts
export const SITE = {
  title: "Atlas Ekonomi Pontianak",
  description: "Harga, pekerjaan, dan kesejahteraan Pontianak dari data resmi yang dijelaskan untuk semua orang.",
  repository: "https://github.com/whizher/kalbar-economic-atlas",
  basePath: "/kalbar-economic-atlas",
  navigation: [
    ["Beranda", "/"],
    ["Harga", "/harga/"],
    ["Pekerjaan", "/pekerjaan/"],
    ["Kesejahteraan", "/kesejahteraan/"],
    ["Data & Metodologi", "/data-metodologi/"],
    ["Tentang", "/tentang/"]
  ]
} as const;

export const withBase = (path: string) =>
  `${SITE.basePath}${path === "/" ? "/" : path}`;
```

- [ ] Create the light and dark token systems in `tokens.css` from this resolved palette, then verify actual contrast in Task 10:

| Token | Light | Dark |
| --- | --- | --- |
| Page | `#f7f3e8` | `#081a24` |
| Surface | `#fffdf7` | `#102b38` |
| Raised surface | `#ffffff` | `#173845` |
| Primary text | `#102a43` | `#f5f1e6` |
| Muted text | `#486274` | `#b8cbd2` |
| Teal | `#087f8c` | `#55c7c9` |
| Navy | `#173f5f` | `#8fc5e8` |
| Coral | `#d95d4f` | `#ff9688` |
| Gold | `#b7791f` | `#f5c451` |
| Border | `#c8d4d9` | `#345461` |
| Focus | `#6b46c1` | `#d6bcfa` |

Use system fonts, a `1.5` body line height, `0.25rem` minimum focus outline, and `44px` minimum interactive targets. Apply dark tokens both under `@media (prefers-color-scheme: dark)` and `html[data-theme="dark"]`; force light tokens under `html[data-theme="light"]`.
- [ ] Create `public/assets/theme.js` as a dependency-free script. It must catch storage failures, validate stored values, follow `matchMedia("(prefers-color-scheme: dark)")` when no explicit choice exists, update every `[data-theme-toggle]` button, and store only `light` or `dark` after a click:

```js
(() => {
  const key = "atlas-theme";
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  let stored = null;

  try {
    const candidate = localStorage.getItem(key);
    stored = candidate === "light" || candidate === "dark" ? candidate : null;
  } catch {
    stored = null;
  }

  if (stored) root.dataset.theme = stored;
  root.classList.add("theme-ready");

  const current = () => root.dataset.theme ?? (media.matches ? "dark" : "light");
  const sync = () => {
    const dark = current() === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", String(dark));
      button.textContent = dark ? "Gunakan mode terang" : "Gunakan mode gelap";
    });
  };

  window.addEventListener("DOMContentLoaded", () => {
    sync();
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const next = current() === "dark" ? "light" : "dark";
        root.dataset.theme = next;
        try { localStorage.setItem(key, next); } catch { /* system fallback remains available */ }
        sync();
      });
    });
  });

  media.addEventListener("change", () => {
    if (!root.dataset.theme) sync();
  });
})();
```

- [ ] Build `SiteShell.astro` with an inline pre-paint read of `atlas-theme`, then load the fixed local theme script with a base-aware URL. Include a visible-on-focus skip link; a desktop nav; a native `<details>` mobile menu containing the same links and toggle; and a footer containing the BPS non-affiliation statement, privacy summary, methodology link, and repository link.
- [ ] Keep toggle buttons hidden until `.theme-ready` exists so they are not inert when JavaScript is unavailable. Core navigation remains usable through native links and `<details>` without JavaScript.
- [ ] Use a semantic inline SVG Kapuas curve and equator line as restrained decoration with `aria-hidden="true"`. Make the favicon a local `viewBox="0 0 64 64"` SVG containing one teal river curve crossing one gold equator line, without letters or government marks. Set `robots.txt` to exactly `User-agent: *`, then `Allow: /`. Do not include logos, remote fonts, raster images, or a client framework.
- [ ] Add the minimal home shell with `<h1>Ekonomi Pontianak, dijelaskan dengan jernih.</h1>` and lead text `Lihat perubahan harga, pekerjaan, dan kesejahteraan melalui data resmi terbaru dan tren tahunan yang dapat dibandingkan.`
- [ ] Run the two focused browser tests in both Playwright projects. Expected: navigation and theme tests pass with no uncaught page errors.
- [ ] Commit: `feat: add accessible site shell and themes`

## Task 6: Build the reusable data components and home overview

**Files:**

- Create: `src/content/topics.ts`
- Create: `src/components/DataFreshness.astro`
- Create: `src/components/IndicatorCard.astro`
- Create: `src/components/SourcePanel.astro`
- Create: `src/components/TopicSummaryCard.astro`
- Create: `src/components/TrendChart.astro`
- Create: `src/components/WhyItMatters.astro`
- Modify: `src/pages/index.astro`
- Modify: `e2e/navigation.spec.ts`

**Interfaces:** Every component receives validated `Indicator` or `SourceRecord` values through props and never reads a file itself. `TrendChart` consumes one indicator and renders one `figure` containing a labeled SVG, movement summary, and equivalent five-row table. `TopicSummaryCard` accepts exactly two same-topic indicators and keeps their values and scales separate.

- [ ] Extend `navigation.spec.ts` first. Assert the home page shows exactly three topic summaries, six latest-value cards, one explicit latest-period label per card, six separate trend previews, links each summary to its topic page, and labels freshness per indicator rather than with one site-wide date.
- [ ] Add a focused accessibility assertion that each home chart has one accessible name, a text summary, and a five-row body whose periods and formatted values match the SVG point labels.
- [ ] Run `npm run test:e2e -- e2e/navigation.spec.ts --project=desktop-chromium`. Expected: failures for the missing topic cards and charts.
- [ ] Create `src/content/topics.ts` with exact topic metadata:

```ts
export const TOPICS = {
  harga: {
    title: "Harga",
    summary: "Bagaimana harga rata-rata berubah, termasuk kelompok makanan, minuman, dan tembakau.",
    href: "/harga/"
  },
  pekerjaan: {
    title: "Pekerjaan",
    summary: "Seberapa besar penduduk usia kerja berpartisipasi dan berapa bagian angkatan kerja yang belum bekerja.",
    href: "/pekerjaan/"
  },
  kesejahteraan: {
    title: "Kesejahteraan",
    summary: "Bagaimana kemiskinan resmi dan ukuran daya beli dalam pembangunan manusia berubah.",
    href: "/kesejahteraan/"
  }
} as const;
```

- [ ] Implement `IndicatorCard` with the indicator label, latest formatted value, exact period, official unit, explicit movement sentence and comparison period, plus a link to the detailed topic. Movement is never communicated only by arrow or color.
- [ ] Implement `TrendChart` using `createTrendGeometry`. Render axes/points in inline SVG with `role="img"` and a unique `aria-labelledby`; provide a visible summary and a `<table>` captioned `Data tren lima pengamatan: <indicator label>`. Use one scale per indicator and do not draw combined dual-axis charts.
- [ ] Implement `SourcePanel` with definition, methodology, comparability, source title, BPS publisher/author state, publication/access dates, exact reference, and a direct external link carrying a visible `Sumber resmi BPS` label. Do not embed remote previews.
- [ ] Implement `WhyItMatters` in the coral/gold explanation style and `DataFreshness` with the exact indicator period plus `Data terbaru yang tersedia untuk indikator ini`.
- [ ] Implement `TopicSummaryCard` to group two same-topic `IndicatorCard` instances and one compact trend preview per indicator. Add a runtime guard that throws during the build if the IDs do not belong to the declared topic or if the count is not two.
- [ ] Update the home page to call `loadAtlasData()`, order topics as Harga, Pekerjaan, Kesejahteraan, and render all components. Add a methodology callout explaining that reporting dates differ by indicator.
- [ ] Run `npm run check`, `npm test`, and the focused home browser test in both projects. Expected: all pass and the home source order remains heading → explanation → topic summaries → methodology link.
- [ ] Commit: `feat: build Pontianak economic overview`

## Task 7: Add the three detailed topic pages

**Files:**

- Create: `src/pages/harga.astro`
- Create: `src/pages/pekerjaan.astro`
- Create: `src/pages/kesejahteraan.astro`
- Modify: `e2e/navigation.spec.ts`

**Interfaces:** Each topic page selects exactly its two validated indicators, gives each a separate article/chart/table/source chain, and returns to the relevant home summary. The pages share components but contain topic-specific methodology and limitation copy.

- [ ] Add failing route tests for `harga/`, `pekerjaan/`, and `kesejahteraan/` from `PUBLIC_ROUTES`. For each route assert the expected `<h1>`, exactly two indicators, ten trend table rows in total, direct BPS links, a limitations section, breadcrumb/home link, and canonical URL under the project base.
- [ ] Add content assertions that the Harga page says `year-on-year` and refuses to join raw CPI across base changes; Pekerjaan says `Sakernas Agustus` and does not mention February as a substituted value; Kesejahteraan says adjusted expenditure is neither income nor cash received.
- [ ] Run the three route cases. Expected: 404 responses.
- [ ] Implement `harga.astro` with title `Harga di Pontianak`, explanation of year-on-year rates and December annual comparability, the two inflation records, separate charts, methodology-base notes, and the sentence `Perubahan indeks, bobot, atau klasifikasi dicatat; tingkat indeks dari dasar yang berbeda tidak disambungkan.`
- [ ] Implement `pekerjaan.astro` with title `Pekerjaan di Pontianak`, August Sakernas scope, separate TPT/TPAK meanings, the limitation that employment quality and underemployment are not fully described, and no good/bad coloring for participation changes.
- [ ] Implement `kesejahteraan.astro` with title `Kesejahteraan rumah tangga`, separate poverty/adjusted-expenditure explanations, the official-unit display, poverty-measure limitations, and the sentence `Pengeluaran per kapita yang disesuaikan bukan pendapatan, gaji, atau uang tunai yang diterima rumah tangga.`
- [ ] Run `npm run check` and the focused route tests on desktop and mobile. Inspect at `375px`, `768px`, and `1280px`: cards must not overflow, tables may scroll inside labeled regions, and document/source order must match visual order.
- [ ] Commit: `feat: add prices jobs and welfare deep dives`

## Task 8: Add transparency pages, data downloads, and license boundaries

**Files:**

- Create: `src/pages/data-metodologi.astro`
- Create: `src/pages/tentang.astro`
- Create: `src/pages/404.astro`
- Create: `src/pages/data/pontianak/indicators.json.ts`
- Create: `src/pages/data/pontianak/sources.json.ts`
- Create: `LICENSE`
- Create: `DATA_USE.md`
- Create: `CONTRIBUTING.md`
- Create: `e2e/data-downloads.spec.ts`
- Modify: `e2e/navigation.spec.ts`

**Interfaces:** The two static endpoints return validated, pretty-printed UTF-8 JSON with `Content-Type: application/json; charset=utf-8` and no cache-dependent runtime generation. `indicators.json` contains geography, non-personal verification records, and indicators; `sources.json` contains the joined source catalogue. Data & Metodologi links both downloads and explains their schema, validation, comparability, verification, revision, and withdrawal process.

- [ ] Write `data-downloads.spec.ts` first. Assert both endpoints return `200`, JSON content type, Pontianak code `6171`, the exact six indicator IDs, 30 trend observations, complete source attribution, and no fields outside the validated public data contract.
- [ ] Extend navigation tests for Data & Metodologi, Tentang, and the custom 404 page. Assert the privacy statement, non-affiliation disclaimer, code/data licensing split, contribution link, and source catalogue are visible.
- [ ] Run the focused tests. Expected: 404 responses for all new routes.
- [ ] Implement the static endpoints with `prerender = true` and validated data:

```ts
import type { APIRoute } from "astro";
import { loadAtlasData } from "../../../data/load";

export const prerender = true;

export const GET: APIRoute = async () => {
  const data = await loadAtlasData();
  const snapshot = {
    geography: data.geography,
    verifications: data.verifications,
    indicators: data.indicators
  };
  return new Response(`${JSON.stringify(snapshot, null, 2)}\n`, {
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
};
```

- [ ] Use the equivalent code in `sources.json.ts` but return only `data.sources`. Ensure neither endpoint includes local paths, reviewer identities, source-working files, or full downloaded publications.
- [ ] Implement Data & Metodologi with the six definitions, period rules, two-pass method, comparability/base notes, source catalogue, revision history, source-availability states, both JSON download links, and a prominent `Data BPS tidak dilisensikan ulang di bawah MIT` notice.
- [ ] Implement Tentang with the purpose, Pontianak-only v1 boundary, independence/non-endorsement statement, GitHub Pages hosting privacy note, no accounts/cookies/analytics/tracking statement, sole theme-storage disclosure, contribution link, and code/data licensing split.
- [ ] Add the standard MIT text for original project code in `LICENSE`. In `DATA_USE.md`, cite the BPS terms URL and require source title, access date, author when present, publisher, direct link, exact table/page, and respect for withdrawal. In `CONTRIBUTING.md`, document the two-pass data-update process and ban automated publication of newly scraped values.
- [ ] Implement a friendly 404 page with a home link and no search form or telemetry.
- [ ] Run `npm run check`, `npm test`, and the focused browser tests. Expected: all transparency and download assertions pass.
- [ ] Commit: `docs: add methodology licensing and data downloads`

## Task 9: Enforce the static artifact and runtime privacy boundaries

**Files:**

- Create: `scripts/build-policy.mjs`
- Create: `scripts/validate-build.mjs`
- Create: `tests/build-boundary.test.ts`
- Create: `e2e/progressive-enhancement.spec.ts`
- Modify: `package.json`

**Interfaces:** `classifyArtifactPath(path)` returns `required`, `allowed-generated`, or `rejected`. `validateBuild(root)` enumerates every file in `dist/`, requires all routes/data/assets, rejects any other file or unsafe external resource reference, and exits nonzero before artifact upload.

- [ ] Write `tests/build-boundary.test.ts` first. Feed the classifier every required HTML/data/asset path plus accepted hashed CSS names. Assert rejection of source maps, test files, Markdown, raw source-working data, complete PDFs, environment files, lockfiles, nested JavaScript bundles, and any unrecognized extension.
- [ ] Write a failing test fixture whose HTML contains a remote `<script>`, `<img>`, stylesheet, iframe, audio, video, or source URL; whose CSS contains `url(https://...)`; and whose JavaScript contains `fetch(` or `XMLHttpRequest`. Assert a precise rejection message for each. External user-clicked `<a href>` source/repository links remain allowed.
- [ ] Run `npm test -- tests/build-boundary.test.ts`. Expected: module-not-found failure for `scripts/build-policy.mjs`.
- [ ] Implement the exact required inventory:

```js
export const REQUIRED_PATHS = new Set([
  "index.html",
  "harga/index.html",
  "pekerjaan/index.html",
  "kesejahteraan/index.html",
  "data-metodologi/index.html",
  "tentang/index.html",
  "404.html",
  "data/pontianak/indicators.json",
  "data/pontianak/sources.json",
  "assets/favicon.svg",
  "assets/theme.js",
  "robots.txt"
]);

export const ALLOWED_GENERATED = [
  /^_astro\/[a-zA-Z0-9_-]+\.css$/
];
```

- [ ] Implement recursive enumeration with normalized POSIX paths. Reject symlinks, empty files except where Astro explicitly produces none, files over `500 KiB`, unknown files, and a missing required path. Require at least one generated CSS asset and require the total artifact size to stay under `2 MiB` for v1.
- [ ] Scan built resource-bearing attributes and CSS/JavaScript content as described by the tests. Allow no runtime request primitive in project JavaScript; the only v1 script is the local theme preference script.
- [ ] Add `progressive-enhancement.spec.ts`. With `javaScriptEnabled: false`, assert all six latest values, all 30 trend observations, source links, navigation links, and tables remain present and readable. In the normal browser, collect initial page requests across all six public routes and assert every project-initiated request shares the site origin.
- [ ] Run `npm run build`, `npm test -- tests/build-boundary.test.ts`, and the progressive-enhancement test on desktop/mobile. Expected: the validator reports the exact file count/size and all tests pass.
- [ ] Change the `build` script to `npm run data:validate && astro build && node scripts/validate-build.mjs`, then rerun the same checks to prove every production build enforces the artifact boundary.
- [ ] Commit: `test: enforce static site privacy boundary`

## Task 10: Complete automated accessibility and responsive checks

**Files:**

- Create: `e2e/accessibility.spec.ts`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/global.css`
- Modify: `src/styles/components.css`
- Modify: components/pages only when a failing test identifies a concrete accessibility defect

**Interfaces:** The accessibility suite visits every public HTML route in desktop/mobile, light/dark, keyboard, reduced-motion, 200% zoom, and JavaScript-disabled contexts. It fails on serious or critical Axe violations and separately asserts requirements that Axe cannot infer.

- [ ] Write a parameterized Axe test for every entry in `PUBLIC_ROUTES` plus `tidak-ditemukan/`. Run each route in explicit light and dark mode on both Playwright projects with `wcag2a`, `wcag2aa`, `wcag21aa`, and `wcag22aa` tags.
- [ ] Add non-Axe assertions for one page-level `<h1>`, monotonic heading levels, one descriptive title, skip-link focus, visible focus on every interactive control, `44px` pointer target minimum, table captions, no color-only movement label, and no horizontal document overflow at `320px` width.
- [ ] Add keyboard tests: tab through the header, open/close the native mobile menu, activate the theme button, reach source links, and return to content without a pointer. Add reduced-motion emulation and assert decorative transitions become effectively instant.
- [ ] Run `npm run test:e2e -- e2e/accessibility.spec.ts`. Expected: record every real failure before changing production CSS or markup.
- [ ] Fix only the demonstrated defects. Preserve the approved off-white/navy/teal plus coral/gold direction and recheck both purpose-built theme palettes; do not satisfy contrast by removing the visual identity.
- [ ] Rerun the focused accessibility suite, then all browser tests. Expected: zero serious/critical violations and every explicit assertion passes.
- [ ] Perform a manual screen-reader spot check of home → one topic → source panel, keyboard-only navigation, 200% browser zoom, and one narrow mobile viewport. Record the results in the eventual pull-request verification notes rather than adding personal details to the repository.
- [ ] Commit: `test: verify accessibility and responsive behavior`

## Task 11: Add the non-mutating monthly source availability check

**Files:**

- Create: `scripts/check-sources.mjs`
- Create: `tests/source-check.test.ts`
- Create: `.github/workflows/source-check.yml`

**Interfaces:** `checkSource(source, fetchImpl)` makes one minimal read-only request and returns a structured status. The command checks each unique active BPS URL, distinguishes response failure from confirmed withdrawal, prints a review report, exits nonzero on unavailable sources, and never edits data.

- [ ] Write `tests/source-check.test.ts` first using a local fetch stub. Cover a successful `HEAD`, a `405` followed by one range-limited `GET`, redirect success, `404`, `429`, `500`, timeout/network error, duplicate URLs, and the rule that no request uses a mutating method.
- [ ] Run `npm test -- tests/source-check.test.ts`. Expected: module-not-found failure for `scripts/check-sources.mjs`.
- [ ] Implement `checkSource` with a 15-second `AbortSignal.timeout`, a fixed transparent user agent `kalbar-economic-atlas-source-check/1.0`, `redirect: "follow"`, and `HEAD` first. Fall back to `GET` with `Range: bytes=0-0` only on `405` or `501`. Treat `2xx` and `3xx` final responses as reachable; report every other status for manual review.
- [ ] Make direct execution load the validated catalogue, deduplicate by URL, check sequentially to minimize load, print one line per source, and set exit code `1` if any active source is unreachable. The output must say `Manual review required; no repository data was changed.` on failure.
- [ ] Add `.github/workflows/source-check.yml` with only `schedule` and `workflow_dispatch` triggers, schedule `17 3 1 * *`, top-level `permissions: contents: read`, a five-minute job timeout, one concurrency group, approved checkout/setup-node SHAs, `npm ci`, and `node scripts/check-sources.mjs`.
- [ ] Run the unit test and `node scripts/check-sources.mjs` once against the current catalogue. If a live URL is temporarily unavailable, preserve the data and document the observation; do not change `availability` without confirming the source state.
- [ ] Commit: `ci: monitor official source availability monthly`

## Task 12: Add read-only validation and isolated Pages deployment

**Files:**

- Create: `.github/workflows/validate.yml`
- Create: `.github/workflows/pages.yml`
- Create: `tests/workflow-policy.test.ts`
- Create: `e2e/smoke.spec.ts`

**Interfaces:** `validate.yml` runs untrusted pull-request code with `contents: read` only. `pages.yml` builds in a read-only job, gives Pages/OIDC permissions only to a one-action deploy job, and runs a credential-free smoke job afterward. The smoke test accepts `PLAYWRIGHT_BASE_URL` and never mutates production.

- [ ] Write `tests/workflow-policy.test.ts` first. Assert exact triggers, full 40-character Action SHAs, explicit timeouts, setup-node v4 pin, Node version file usage, no wildcard permissions, PR validation permissions exactly `contents: read`, Pages push restricted to `main`, build/deploy separation, deploy permissions exactly `pages: write` plus `id-token: write`, and a deploy job containing only `actions/deploy-pages`.
- [ ] Add a test that forbids `pull_request_target`, mutable tags, `persist-credentials: true`, secrets in validation/build steps, deployment code in the build job, repository code in the privileged deploy job, and deployment from the source-check workflow.
- [ ] Run `npm test -- tests/workflow-policy.test.ts`. Expected: failures because validation and Pages workflows are absent.
- [ ] Create `.github/workflows/validate.yml`:

```yaml
name: Validate

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: validate-${{ github.ref }}
  cancel-in-progress: true

jobs:
  validate:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4; retain pending patched Node 24 release
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run verify
```

- [ ] Create `.github/workflows/pages.yml` with only `push` to `main` and `workflow_dispatch`; workflow-level `permissions: {}`; `concurrency.group: pages`; and `cancel-in-progress: false`. The `build` job gets `contents: read`, checks out without credentials, sets up Node with the reviewed v4 SHA, runs `npm ci`, `npm run check`, `npm test`, and `npm run build`, then configures Pages and uploads only `dist/` with the approved SHAs.
- [ ] Add a dependent `deploy` job with no checkout and no shell command. Grant only `pages: write` and `id-token: write`; set environment `github-pages`; expose `page_url` from the single `actions/deploy-pages@cd2ce8f...` step.
- [ ] Create `e2e/smoke.spec.ts` to visit every base-relative entry in `PUBLIC_ROUTES`, assert each page heading, switch light → dark → light, confirm one chart/table pair per topic, and collect page errors. It must never use a leading-slash route, must use the configured base URL, and must contain no mutation.
- [ ] Add a dependent `smoke` job with `contents: read`, no deployment permissions, checkout/setup/npm/Chromium steps, and `PLAYWRIGHT_BASE_URL: ${{ needs.deploy.outputs.page_url }}`. Run only `e2e/smoke.spec.ts` on desktop Chromium.
- [ ] Run `npm test -- tests/workflow-policy.test.ts`, then `npm run verify`. Expected: every workflow policy, unit, build, and browser test passes locally.
- [ ] Commit: `ci: add hardened validation and Pages deployment`

## Task 13: Finish repository guidance and verify the release candidate

**Files:**

- Create: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `DATA_USE.md`
- Modify: any file only when fresh verification identifies a concrete defect

**Interfaces:** The README is the entry point for the general public and contributors. It explains the public site, six-indicator v1 scope, verified-snapshot flow, local commands, privacy boundary, attribution/license split, accessibility commitment, and release process without claiming the site is already deployed.

- [ ] Write README sections in this order: project purpose; v1 indicators; data freshness/period differences; statement that design mockups are references and are not shipped; local development; verification commands; data update protocol; accessibility; privacy; source attribution; license split; independence disclaimer; publication status. Do not add a production screenshot before a live deployment exists.
- [ ] Add a `Toolchain maintenance` note explaining that project runtime is Node 24.20.0 but CI retains immutable `actions/setup-node` v4 until the patched Node 24 Action line is verified. State that Action upgrades change workflow and policy tests together through review.
- [ ] Review `CONTRIBUTING.md` against the actual commands and make the data-change pull-request checklist explicit: first pass, independent second pass, exact source reference, checksum when reproducible, focused diff, schema/build/browser tests, and no automatic publication of new values.
- [ ] Review `DATA_USE.md` against the current BPS terms page. Confirm the MIT boundary, attribution fields, withdrawal procedure, ordinary-history audit trail, and requirement for explicit owner approval before any narrowly scoped history rewrite.
- [ ] Run fresh verification from a clean dependency install:

```bash
npm ci
npm run check
npm test
npm run build
npm run test:e2e
npm audit --omit=dev
git diff --check
```

- [ ] Inspect the build report: all six HTML routes plus 404 load; JSON downloads contain six indicators and 30 trend observations; every artifact path is allowlisted; total output remains under 2 MiB; no source-working document, secret, source map, test, or external runtime request is present.
- [ ] Inspect all 36 displayed numeric values against the checked-in verified data, both themes, desktop/mobile layouts, keyboard flow, source links, and JavaScript-disabled pages. Confirm no causal claim, forecast, ranking, composite score, province-wide claim, or income mislabel appears.
- [ ] Run privacy and scope searches:

```bash
rg -n "(analytics|gtag|googletagmanager|segment|mixpanel|facebook|pixel|cookie|document\.cookie|fetch\(|XMLHttpRequest|WebSocket)" src public dist
rg -n "(forecast|peringkat|ranking|skor ekonomi|pendapatan rata-rata)" src data
```

Expected: only intentional explanatory denials/test fixtures appear; inspect each match rather than accepting a raw zero/nonzero count.

- [ ] Invoke `superpowers:verification-before-completion` and run its required fresh evidence checks. Then invoke `superpowers:requesting-code-review` for a whole-branch review against the approved design and this plan. Resolve every Critical or Important finding through a new focused commit and repeat affected checks.
- [ ] Commit: `docs: complete Pontianak atlas release guide`. If verification required code fixes, use separate accurately named commits before this documentation commit.
- [ ] Confirm `git status --short` is empty and record the final commit SHA, tree SHA, test totals, artifact inventory, privacy review, data verification record, and unresolved non-blocking notes.
- [ ] Stop locally. Present the verified branch and ask for a separate decision on public repository creation/publication. Do not push, open a pull request, change Pages settings, create an issue, or deploy without that instruction.

## Definition of done

- [ ] All thirteen task commits are present and reviewable.
- [ ] Every acceptance criterion in the approved design has direct test or manual-review evidence.
- [ ] Six validated indicators, six latest observations, and 30 comparable annual observations are published from checked-in verified snapshots.
- [ ] The public routes, data downloads, themes, accessible charts/tables, licensing notices, and source catalogue pass locally under the Pages base path.
- [ ] Read-only PR validation, main-only Pages deployment, isolated credentials, immutable pins, source monitoring, and artifact boundaries pass workflow-policy tests.
- [ ] The working tree is clean and no remote mutation has occurred.

## Implementation handoff

After plan approval, choose one execution mode:

1. **Subagent-Driven (recommended):** execute one task at a time with a fresh worker, then run specification and code-quality review gates before advancing.
2. **Inline Execution:** execute the same tasks serially in this conversation with checkpoints after each reviewer gate.

Both modes stop before remote publication and require a separate explicit owner instruction to create or publish `whizher/kalbar-economic-atlas`.
