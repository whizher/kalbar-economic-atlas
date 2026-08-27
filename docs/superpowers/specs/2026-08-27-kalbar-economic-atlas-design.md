# Kalbar Economic Atlas: Pontianak Deep Dive Design

| Field | Value |
| --- | --- |
| Date | 2026-08-27 |
| Status | Approved design |
| Repository | `whizher/kalbar-economic-atlas` |
| First-release public title | Atlas Ekonomi Pontianak |

## 1. Purpose

Atlas Ekonomi Pontianak will be a public, mobile-first economic data site that helps non-specialists understand how prices, employment, and household welfare are changing in Pontianak. It will pair the latest official snapshot with the five most recent comparable annual observations and explain why each measure matters in everyday language.

The repository name deliberately allows later expansion across West Kalimantan. The first release is exclusively a Pontianak deep dive; it will not imply province-wide coverage.

## 2. Audience and Product Principles

The primary audience is the general public in Pontianak. Bahasa Indonesia is the first-release language. English localization is deferred.

The product must:

- explain statistics without assuming economics training;
- display the exact period, geographic scope, unit, definition, and source for every figure;
- distinguish measurement from interpretation;
- avoid causal claims, forecasts, rankings, and invented composite scores;
- remain useful on a mobile connection and when JavaScript is unavailable;
- make uncertainty, revisions, and methodology changes visible;
- avoid implying endorsement by BPS or any government body.

## 3. First-Release Scope

### 3.1 Included indicators

The first release contains six indicators, with two under each topic.

| Topic | Indicator | Latest snapshot | Five-observation trend |
| --- | --- | --- | --- |
| Harga | Headline inflation | Latest verified year-on-year all-items rate | Five most recent comparable year-end year-on-year rates |
| Harga | Food, beverages, and tobacco inflation | Latest verified year-on-year group rate | Five most recent comparable year-end year-on-year rates |
| Pekerjaan | Tingkat Pengangguran Terbuka (TPT) | Latest verified August Sakernas estimate | Five most recent comparable August estimates |
| Pekerjaan | Tingkat Partisipasi Angkatan Kerja (TPAK) | Latest verified August Sakernas estimate | Five most recent comparable August estimates |
| Kesejahteraan | Poverty rate (P0) | Latest verified annual municipal estimate | Five most recent comparable annual estimates |
| Kesejahteraan | Adjusted expenditure per capita | Latest verified annual municipal estimate | Five most recent comparable annual estimates |

The implementation must preserve the official unit for adjusted expenditure. Its public explanation must state that it is a purchasing-power/HDI measure, not household income, a salary, or cash received.

### 3.2 Explicitly excluded from v1

- other West Kalimantan municipalities or regencies;
- interactive maps or geographic rankings;
- live BPS API or browser-side data fetching;
- user accounts, saved dashboards, comments, or personalization beyond theme;
- analytics, advertising, cookies, tracking pixels, or telemetry;
- forecasts, causal claims, policy recommendations, or a synthetic economic-health score;
- an English translation;
- automated extraction or publication of new statistical values.

## 4. Information Architecture

The static site contains these routes:

- **Home:** the project purpose, latest-data status, three topic cards that each summarize two indicators, separate topic-level trend previews, and links to the three detailed topics.
- **Harga:** both inflation indicators, trends, definitions, methodology notes, and plain-language implications.
- **Pekerjaan:** TPT and TPAK, trends, definitions, methodology notes, and plain-language implications.
- **Kesejahteraan:** poverty and adjusted-expenditure indicators, trends, definitions, limitations, and plain-language implications.
- **Data & Methodology:** complete provenance, definitions, comparability notes, revision history, downloadable checked-in snapshots, and data-reuse notice.
- **About:** purpose, scope, non-affiliation disclaimer, contribution guidance, privacy statement, and license boundaries.

The home page is an overview, not a substitute for the topic pages. Every summary card links to the relevant detailed explanation.

## 5. Experience and Visual Direction

The approved hybrid direction combines:

- an off-white, navy, and teal civic-data structure for clarity;
- restrained Pontianak identity through a Kapuas River curve and equator-line motif;
- warm coral or gold accents for “Mengapa ini penting?” explanations.

The interface uses generous whitespace, high contrast, clear hierarchy, rounded cards, and restrained illustration. It must not use a full-page dark aesthetic in light mode, generic skyscraper imagery, BPS logos, or decorative dashboard clutter.

### 5.1 Dark mode

- A labeled theme toggle appears in the desktop header and mobile menu.
- The initial theme follows `prefers-color-scheme`.
- A deliberate user choice is stored locally and takes precedence on later visits.
- Only the theme value is stored; the site does not use cookies or persistent application state.
- Light and dark themes use purpose-designed surface, text, focus, and chart colors. Dark mode is not a color inversion.
- If JavaScript or storage is unavailable, the system theme remains the fallback and content stays readable.

### 5.2 Responsive behavior

The design is mobile-first. Cards stack on narrow screens; navigation becomes a keyboard-accessible menu; charts retain legible labels and expose the same values in a table. Desktop layouts may use multiple columns but must preserve the same reading order as the document source.

## 6. Technical Architecture

### 6.1 Platform

The site uses Astro in static-output mode with TypeScript. It has no backend, database, server-side runtime, or client-side application shell. GitHub Pages serves the generated files under the repository project path.

Astro renders the core experience to HTML at build time. Client-side JavaScript is limited to the theme preference, mobile navigation, and optional progressive chart details. A charting framework is not required for v1; accessible SVG charts and HTML data tables are preferred.

Dependency versions will be selected from supported stable releases at implementation time, committed through a lockfile, and updated through reviewed pull requests.

### 6.2 Component boundaries

Each unit has one public responsibility:

- `SiteShell`: document metadata, navigation, footer, skip link, and theme initialization.
- `ThemeToggle`: accessible theme control and local preference handling.
- `TopicSummaryCard`: a home-page entry point that groups the two indicators for one topic without combining their scales.
- `IndicatorCard`: latest value, period, unit, movement label, and topic link.
- `TrendChart`: an accessible five-observation SVG chart with text summary and table alternative.
- `WhyItMatters`: plain-language interpretation that never claims causation.
- `SourcePanel`: definition, methodology, comparability note, title, access date, author when present, and direct source link.
- `DataFreshness`: per-indicator latest-available status without pretending all indicators share one date.
- `DataLoader`: build-time access to validated canonical data.
- `DataFormatter`: Indonesian number, percentage, currency, period, and percentage-point presentation.

The component API receives validated data rather than reading arbitrary files itself. Presentation components do not decide statistical definitions or derive undocumented values.

### 6.3 Geographic extensibility

Data is namespaced under Pontianak from the beginning. Geographic identity includes a stable code, public name, and scope. The UI does not expose a region selector until another region has a complete, reviewed release. This permits later Kalbar expansion without weakening the Pontianak v1 scope.

## 7. Data Model and Flow

### 7.1 Canonical indicator record

Every indicator record contains:

- stable identifier and topic;
- geographic code and name;
- Indonesian public label and short definition;
- official statistical definition;
- unit, frequency, reference period, and display precision;
- latest verified observation;
- exactly five comparable annual trend observations;
- interpretation direction expressed in words rather than color alone;
- methodology and comparability notes;
- “Mengapa ini penting?” copy;
- one or more source records;
- verification date and verification method;
- revision information when applicable.

Every source record contains the content title, direct URL, publisher/author when available, publication date, access date, exact table or page reference, and a source-document checksum when the document can be obtained reproducibly.

### 7.2 Repository data layout

Checked-in extracted snapshots live under a Pontianak namespace, separate from explanatory copy and components. The repository does not mirror complete BPS publications unless their inclusion is necessary and clearly permitted. It stores the minimal extracted CSV or JSON values plus full provenance.

### 7.3 Update flow

1. A maintainer obtains the newest applicable source directly from BPS.
2. The maintainer records the required attribution and exact table or page.
3. Values are extracted into the checked-in snapshot without transformation beyond documented normalization.
4. A second pass independently re-reads the source and compares every extracted value, period, unit, and geographic scope.
5. Schema, range, completeness, comparability, and formatting validation runs locally and in CI.
6. The update is submitted as a focused pull request with a readable data diff and source links.
7. Deployment occurs only after review and successful validation.

The browser never contacts BPS. Astro bundles validated snapshots into static pages during the build.

## 8. Measurement and Interpretation Rules

### 8.1 Periods

“Latest” means the newest verified official value available for that indicator. It does not mean all cards share a reporting date. Each card displays its own month or year.

“Five-year trend” means the five most recent comparable annual observations. The site must not fill gaps by interpolation or mix unlike reference periods merely to align calendar years.

### 8.2 Inflation

The latest inflation snapshot uses a year-on-year rate. The annual trend uses comparable year-end year-on-year rates. Raw CPI index levels are not joined across base-year changes. Changes in base year, weights, or expenditure-group classification are annotated and explained.

### 8.3 Employment

TPT and TPAK annual trends use the same Sakernas reference period, normally August for municipal estimates. February provincial estimates must not be substituted for Pontianak municipal August estimates.

### 8.4 Welfare

Poverty and adjusted-expenditure observations use official annual municipal estimates. The poverty rate must not be presented as a complete description of hardship. Adjusted expenditure must not be labeled as average household income or treated as directly spendable money.

### 8.5 Direction and language

The interface states the change and unit explicitly, including the distinction between percent and percentage points. It does not rely on red/green color or a universal up/down-good convention. Explanations use measured language such as “berkaitan dengan” or “dapat memengaruhi,” and do not infer causality from a time trend.

## 9. Validation and Failure Behavior

The production build fails when a required indicator is missing, a source record is incomplete, a trend does not contain exactly five valid comparable observations, a unit is invalid, periods are duplicated or unordered, or a value violates indicator-specific constraints.

Automated validation cannot prove that an official value was transcribed correctly. The documented two-pass source check is therefore a release requirement, not an optional supplement.

Older-but-current official data remains visible with its exact period and “data terbaru yang tersedia” wording. Methodology breaks are annotated. The site never silently fabricates continuity or substitutes a provincial figure for a municipal one.

A temporary source outage does not trigger automatic deletion. The monthly source-availability workflow records a failure for manual review. A maintainer distinguishes a network or rate-limit error from confirmed withdrawal.

If BPS confirms that reused content has been withdrawn, the affected production data is updated or removed in a reviewed pull request. Ordinary Git history remains the audit trail. If BPS or applicable law requires removal from repository history, a narrowly scoped history rewrite requires explicit owner approval and a documented backup/recovery plan.

The last successful GitHub Pages deployment remains online when validation or deployment fails.

## 10. Accessibility and Progressive Enhancement

The release targets WCAG 2.2 AA and includes:

- semantic landmarks and heading hierarchy;
- a skip link and complete keyboard navigation;
- visible focus states in both themes;
- labeled controls with adequate target sizes;
- chart summaries and equivalent data tables;
- color-independent series identification;
- adequate contrast in light and dark themes;
- support for reduced-motion preferences;
- meaningful page titles and link text;
- readable content when JavaScript is disabled.

Icons never act as the sole label. Motion is decorative and nonessential.

## 11. Privacy, Security, and Licensing

### 11.1 Privacy boundary

The site has no accounts, cookies, analytics, tracking, advertising, form submissions, or external runtime requests initiated by project code. The only persistent browser value is the selected theme. Project code collects no personal data; the privacy notice separately identifies GitHub Pages as the hosting provider.

### 11.2 Repository and workflow security

- Pull-request validation uses read-only repository permissions.
- Pages deployment triggers only from `main` or an explicitly authorized manual dispatch.
- Static build and privileged deployment are separate jobs.
- Deployment permissions are granted only to the dependent deployment job.
- Third-party GitHub Actions are pinned to full immutable commit SHAs.
- Workflows use minimal permissions and explicit timeouts.
- The Pages artifact contains only an allowlisted static-site inventory.
- No secret is exposed to pull-request code or embedded in the generated site.

### 11.3 Licensing and BPS compliance

The MIT license covers original project code only. BPS-derived values and source material are not relicensed under MIT. The repository includes a data-use notice that points to the BPS terms and preserves the required attribution for each source: title, access date, author when present, and direct link.

The site and repository state clearly that the project is independent and is not endorsed, sponsored, or operated by BPS or the Pontianak municipal government.

A read-only source-availability workflow runs monthly at 03:17 UTC on the first day of the month. It makes minimal requests, has no write permission, does not change or delete data, and relies on workflow failure notification to request manual review.

## 12. Testing Strategy

### 12.1 Data and unit tests

- valid and invalid schema fixtures;
- all six indicator identifiers and topic assignments;
- exact five-observation trend requirements;
- chronological ordering and duplicate detection;
- indicator-specific range and unit rules;
- percent versus percentage-point formatting;
- Indonesian number, currency, and period formatting;
- complete source attribution and verification metadata;
- methodology-break annotations;
- source-withdrawal review state.

### 12.2 Component and integration tests

- every route builds and links correctly under the GitHub Pages base path;
- each summary card renders the correct period and source relationship;
- charts and data tables contain matching values;
- keyboard navigation, mobile menu, and theme toggle behavior;
- system-theme default and remembered explicit preference;
- light/dark contrast and visible focus states;
- usable static content with client JavaScript disabled;
- no unapproved runtime network requests.

### 12.3 Build and deployment tests

- a deterministic Astro production build;
- an exact allowlisted artifact inventory;
- only approved public snapshots are included; source-working files, non-public documents, test fixtures, secrets, and development files are excluded from the Pages artifact;
- read-only pull-request validation;
- `main`-only production deployment policy;
- separation between build and privileged deployment jobs;
- immutable Action pins and workflow timeouts;
- a post-deployment smoke test of all public routes and both themes.

Automated accessibility checks supplement manual keyboard, zoom, screen-reader spot checks, and mobile-browser inspection.

## 13. Acceptance Criteria

The first release is complete only when:

1. All six indicators have a latest verified observation and exactly five comparable annual observations.
2. Every value carries complete BPS attribution, an exact period, unit, geography, and verification record.
3. The home page and five supporting pages render correctly on mobile and desktop.
4. Light and dark themes are accessible, keyboard-operable, and persistent as designed.
5. Every chart has an equivalent table and plain-language interpretation.
6. No live API, analytics, cookies, tracking, account system, or unapproved external runtime request exists.
7. All data, unit, component, accessibility, build, workflow-policy, and artifact-boundary checks pass.
8. GitHub Pages deploys from `main` through separate build and deployment jobs.
9. The production site is smoke-tested after deployment, including navigation, both themes, charts, source links, and JavaScript-disabled core content.
10. The repository includes the code license, data-use notice, source catalogue, privacy statement, non-affiliation disclaimer, and contribution instructions.

## 14. Initial Official Source Catalogue

All sources below were accessed on 2026-08-27. Indicator data files must record the exact table or page used during extraction.

1. **BPS Kota Pontianak. “Kota Pontianak Dalam Angka 2026.”** Released 2026-02-27. [Direct source](https://pontianakkota.bps.go.id/id/publication/2026/02/27/d3d400239ad6cf7d959c2404/kota-pontianak-dalam-angka-2026.html)
2. **BPS Kota Pontianak. “Indeks Harga Konsumen Kota Pontianak 2025.”** Released 2026-06-05. [Direct source](https://pontianakkota.bps.go.id/id/publication/2026/06/05/21038398a2694540c254503d/indeks-harga-konsumen-kota-pontianak-2025.html)
3. **BPS Kota Pontianak. “Statistik Ketenagakerjaan Kota Pontianak 2025.”** Released 2026-06-26. [Direct source](https://pontianakkota.bps.go.id/id/publication/2026/06/26/5cb84d57097179ac93ca2e6a/statistik-ketenagakerjaan-kota-pontianak-2025.html)
4. **BPS Kota Pontianak. “Persentase Penduduk Miskin (P0) Menurut Kabupaten/Kota di Provinsi Kalimantan Barat.”** [Direct source](https://pontianakkota.bps.go.id/en/statistics-table/2/NTExIzI=/persentase-penduduk-miskin-p0-menurut-kabupaten-kota-di-provinsi-kalimantan.html)
5. **BPS Kota Pontianak. “Pengeluaran per Kapita yang Disesuaikan Menurut Kabupaten/Kota di Provinsi Kalimantan Barat.”** [Direct source](https://pontianakkota.bps.go.id/id/statistics-table/2/MzM2IzI=/pengeluaran-per-kapita-yang-disesuaikan-ppp-menurut-kabupaten-kota-provinsi-kalimantan-barat.html)
6. **BPS Kota Pontianak. “Ketentuan Penggunaan.”** [Direct source](https://pontianakkota.bps.go.id/id/term-of-use)

## 15. Design Decisions Summary

- Pontianak deep dive for the general public.
- Prices, jobs, and household welfare as the core story.
- Latest verified snapshot plus five comparable annual observations.
- Six balanced indicators.
- Checked-in verified snapshots; no live data pipeline.
- Astro static generation with TypeScript and minimal JavaScript.
- Hybrid civic/Pontianak/editorial visual direction.
- Device-aware, locally remembered dark mode.
- Bahasa Indonesia first.
- Accessible charts with table equivalents.
- Read-only PR validation and isolated Pages deployment privileges.
- MIT for original code; BPS terms and full attribution for derived data.
- No public repository creation, implementation, or deployment is authorized by this design document alone.
