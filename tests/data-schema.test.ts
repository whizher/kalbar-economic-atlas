import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadAtlasData } from "../src/data/load";
import { parseAtlasData } from "../src/data/schema";

const indicatorIds = [
  "headline-inflation",
  "food-inflation",
  "tpt",
  "tpak",
  "poverty-rate",
  "adjusted-expenditure-per-capita"
] as const;

const temporaryRoots: string[] = [];

function literalAtlasFixture() {
  return {
    geography: {
      code: "6171",
      name: "Kota Pontianak",
      province: "Kalimantan Barat",
      scope: "municipality"
    },
    sources: [{
      id: "bps-pontianak-source",
      title: "Tabel indikator Kota Pontianak",
      url: "https://pontianakkota.bps.go.id/id/statistics-table/2/contoh.html",
      publisher: "BPS Kota Pontianak",
      author: null,
      publishedOn: "2026-08-01",
      accessedOn: "2026-08-27",
      reference: "Tabel resmi Kota Pontianak",
      checksumSha256: null,
      availability: "active"
    }],
    verifications: [{
      id: "pontianak-v1-check",
      verifiedOn: "2026-08-27",
      method: "two-pass-manual",
      passCount: 2,
      checks: ["value", "period", "unit", "geography", "reference", "comparability"]
    }],
    indicators: [
      percentIndicator("headline-inflation", "harga", "Inflasi umum", [1.1, 1.2, 1.3, 1.4, 1.5]),
      percentIndicator("food-inflation", "harga", "Inflasi makanan", [2.1, 2.2, 2.3, 2.4, 2.5]),
      percentIndicator("tpt", "pekerjaan", "Tingkat Pengangguran Terbuka", [5.1, 5.2, 5.3, 5.4, 5.5]),
      percentIndicator("tpak", "pekerjaan", "Tingkat Partisipasi Angkatan Kerja", [60.1, 60.2, 60.3, 60.4, 60.5]),
      percentIndicator("poverty-rate", "kesejahteraan", "Persentase penduduk miskin", [10.1, 10.2, 10.3, 10.4, 10.5]),
      expenditureIndicator()
    ]
  };
}

function percentIndicator(
  id: Exclude<(typeof indicatorIds)[number], "adjusted-expenditure-per-capita">,
  topic: "harga" | "pekerjaan" | "kesejahteraan",
  label: string,
  values: [number, number, number, number, number]
) {
  return {
    id,
    topic,
    geographyCode: "6171",
    label,
    shortDefinition: "Definisi singkat indikator.",
    officialDefinition: "Definisi resmi indikator.",
    unit: "percent",
    frequency: "annual",
    trendReference: "annual",
    precision: 1,
    latest: observation("2025", "Tahun 2025", values[4]),
    trend: [
      observation("2021", "Tahun 2021", values[0]),
      observation("2022", "Tahun 2022", values[1]),
      observation("2023", "Tahun 2023", values[2]),
      observation("2024", "Tahun 2024", values[3]),
      observation("2025", "Tahun 2025", values[4])
    ],
    movement: {
      comparedWith: "2024",
      comparisonValue: values[3],
      delta: Number((values[4] - values[3]).toFixed(1)),
      unit: "percentage-point",
      label: "Perubahan dibanding tahun 2024."
    },
    whyItMatters: "Indikator ini penting untuk membaca kondisi ekonomi kota.",
    methodologyNote: "Menggunakan publikasi resmi BPS Kota Pontianak.",
    comparabilityNote: "Semua pengamatan dapat dibandingkan secara konsisten.",
    sourceIds: ["bps-pontianak-source"],
    verificationId: "pontianak-v1-check",
    revision: { state: "current", note: null }
  };
}

function expenditureIndicator() {
  const values = [12_001, 12_102, 12_203, 12_304, 12_405] as const;
  return {
    id: "adjusted-expenditure-per-capita",
    topic: "kesejahteraan",
    geographyCode: "6171",
    label: "Pengeluaran per kapita disesuaikan",
    shortDefinition: "Definisi singkat indikator.",
    officialDefinition: "Definisi resmi indikator.",
    unit: "thousand-rupiah-ppp-per-person-per-year",
    frequency: "annual",
    trendReference: "annual",
    precision: 0,
    latest: observation("2025", "Tahun 2025", values[4]),
    trend: [
      observation("2021", "Tahun 2021", values[0]),
      observation("2022", "Tahun 2022", values[1]),
      observation("2023", "Tahun 2023", values[2]),
      observation("2024", "Tahun 2024", values[3]),
      observation("2025", "Tahun 2025", values[4])
    ],
    movement: {
      comparedWith: "2024",
      comparisonValue: values[3],
      delta: 101,
      unit: "thousand-rupiah-ppp-per-person-per-year",
      label: "Perubahan dibanding tahun 2024."
    },
    whyItMatters: "Indikator ini penting untuk membaca kondisi ekonomi kota.",
    methodologyNote: "Menggunakan publikasi resmi BPS Kota Pontianak.",
    comparabilityNote: "Semua pengamatan dapat dibandingkan secara konsisten.",
    sourceIds: ["bps-pontianak-source"],
    verificationId: "pontianak-v1-check",
    revision: { state: "current", note: null }
  };
}

function observation(periodKey: string, periodLabel: string, value: number) {
  return { periodKey, periodLabel, value, status: "final" as const };
}

async function writeFixture(root: string, fixture = literalAtlasFixture(), filenames = indicatorIds) {
  const base = join(root, "data", "pontianak");
  const indicatorDirectory = join(base, "indicators");
  await mkdir(indicatorDirectory, { recursive: true });
  await Promise.all([
    writeFile(join(base, "geography.json"), JSON.stringify(fixture.geography)),
    writeFile(join(base, "sources.json"), JSON.stringify(fixture.sources)),
    writeFile(join(base, "verification.json"), JSON.stringify(fixture.verifications)),
    ...filenames.map((id) => writeFile(
      join(indicatorDirectory, `${id}.json`),
      JSON.stringify(fixture.indicators.find((indicator) => indicator.id === id))
    ))
  ]);
}

async function temporaryFixture() {
  const root = await mkdtemp(join(tmpdir(), "pontianak-atlas-"));
  temporaryRoots.push(root);
  await writeFixture(root);
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("canonical Pontianak atlas data", () => {
  it("accepts the literal six-indicator catalogue with two indicators per topic", () => {
    const atlas = parseAtlasData(literalAtlasFixture());

    expect(atlas.indicators.map((indicator) => indicator.id)).toEqual(indicatorIds);
    expect(atlas.indicators.filter((indicator) => indicator.topic === "harga")).toHaveLength(2);
    expect(atlas.indicators.filter((indicator) => indicator.topic === "pekerjaan")).toHaveLength(2);
    expect(atlas.indicators.filter((indicator) => indicator.topic === "kesejahteraan")).toHaveLength(2);
  });

  it("rejects an unknown indicator ID", () => {
    const fixture = literalAtlasFixture();
    fixture.indicators[0].id = "consumer-confidence" as never;

    expectInvalidAt(fixture, ["indicators", 0, "id"]);
  });

  it("rejects a sixth trend observation", () => {
    const fixture = literalAtlasFixture();
    fixture.indicators[0].trend.push(observation("2026", "Tahun 2026", 1.6));

    expectInvalidAt(fixture, ["indicators", 0, "trend"]);
  });

  it("rejects duplicate trend periods", () => {
    const fixture = literalAtlasFixture();
    fixture.indicators[0].trend[4].periodKey = "2024";

    expectInvalidAt(fixture, ["indicators", 0, "trend", 4, "periodKey"]);
  });

  it("rejects a percentage outside zero through one hundred", () => {
    const fixture = literalAtlasFixture();
    fixture.indicators[0].latest.value = 100.1;

    expectInvalidAt(fixture, ["indicators", 0, "latest", "value"]);
  });

  it("rejects an indicator whose source attribution does not resolve", () => {
    const fixture = literalAtlasFixture();
    fixture.indicators[0].sourceIds = ["missing-bps-source"];

    expectInvalidAt(fixture, ["indicators", 0, "sourceIds", 0]);
  });

  it("rejects a non-Pontianak geography code", () => {
    const fixture = literalAtlasFixture();
    fixture.geography.code = "6172" as never;

    expectInvalidAt(fixture, ["geography", "code"]);
  });

  it("rejects an unrecognized source availability state", () => {
    const fixture = literalAtlasFixture();
    fixture.sources[0].availability = "archived" as never;

    expectInvalidAt(fixture, ["sources", 0, "availability"]);
  });

  it("loads sorted indicator files and joins the three metadata files", async () => {
    const root = await temporaryFixture();

    const atlas = await loadAtlasData(root);

    expect(atlas.geography.code).toBe("6171");
    expect(atlas.indicators.map((indicator) => indicator.id)).toEqual([...indicatorIds].sort());
    expect(atlas.indicators.every((indicator) => indicator.sourceIds[0] === "bps-pontianak-source")).toBe(true);
  });

  it("rejects a missing indicator file with its directory path", async () => {
    const root = await temporaryFixture();
    const path = join(root, "data", "pontianak", "indicators");
    await rm(join(path, "tpt.json"));

    await expect(loadAtlasData(root)).rejects.toThrow(
      new RegExp(`Data validation failed at ${escapeRegExp(path)}: .*missing: tpt\\.json`)
    );
  });

  it("rejects an extra indicator file with its directory path", async () => {
    const root = await temporaryFixture();
    const path = join(root, "data", "pontianak", "indicators");
    await writeFile(join(path, "unapproved.json"), JSON.stringify({}));

    await expect(loadAtlasData(root)).rejects.toThrow(
      new RegExp(`Data validation failed at ${escapeRegExp(path)}: .*extra: unapproved\\.json`)
    );
  });

  it("reports a cross-record attribution failure at the offending indicator file", async () => {
    const root = await temporaryFixture();
    const path = join(root, "data", "pontianak", "indicators", "headline-inflation.json");
    const fixture = literalAtlasFixture();
    fixture.indicators[0].sourceIds = ["missing-bps-source"];
    await writeFile(path, JSON.stringify(fixture.indicators[0]));

    await expect(loadAtlasData(root)).rejects.toThrow(
      new RegExp(`Data validation failed at ${escapeRegExp(path)}: indicators\\.2\\.sourceIds\\.0:`)
    );
  });
});

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function expectInvalidAt(input: unknown, path: (string | number)[]) {
  try {
    parseAtlasData(input);
    throw new Error("Expected schema validation to fail");
  } catch (error) {
    expect(error).toMatchObject({
      issues: expect.arrayContaining([expect.objectContaining({ path })])
    });
  }
}
