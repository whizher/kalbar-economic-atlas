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
  const inflation = topic === "harga";
  const month = inflation ? "12" : topic === "pekerjaan" ? "08" : "03";
  const monthLabel = inflation ? "Desember" : topic === "pekerjaan" ? "Agustus" : "Maret";
  const period = (year: number, value: number) => observation(`${year}-${month}`, `${monthLabel} ${year}`, value);
  return {
    id,
    topic,
    geographyCode: "6171",
    label,
    shortDefinition: "Definisi singkat indikator.",
    officialDefinition: "Definisi resmi indikator.",
    unit: "percent",
    frequency: inflation ? "monthly-with-annual-trend" : "annual",
    trendReference: inflation ? "december" : topic === "pekerjaan" ? "august" : "annual",
    precision: 1,
    latest: period(2025, values[4]),
    trend: [
      period(2021, values[0]),
      period(2022, values[1]),
      period(2023, values[2]),
      period(2024, values[3]),
      period(2025, values[4])
    ],
    movement: {
      comparedWith: `2024-${month}`,
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
    fixture.indicators[0].trend[4] = { ...fixture.indicators[0].trend[3] };

    expectInvalidAt(fixture, ["indicators", 0, "trend", 4, "periodKey"]);
  });

  it("rejects a percentage outside zero through one hundred", () => {
    const fixture = literalAtlasFixture();
    constantSeriesValue(fixture, 2, 100.1);

    expectInvalidAt(fixture, ["indicators", 2, "latest", "value"]);
  });

  it("rejects an indicator whose source attribution does not resolve", () => {
    const fixture = literalAtlasFixture();
    fixture.indicators[0].sourceIds = ["missing-bps-source"];

    expectInvalidAt(fixture, ["indicators", 0, "sourceIds", 0]);
  });

  it("rejects an indicator with no source attribution", () => {
    const fixture = literalAtlasFixture();
    fixture.indicators[0].sourceIds = [];

    expectInvalidAt(fixture, ["indicators", 0, "sourceIds"]);
  });

  it("rejects an indicator with an empty verification attribution", () => {
    const fixture = literalAtlasFixture();
    fixture.indicators[0].verificationId = "";

    expectInvalidAt(fixture, ["indicators", 0, "verificationId"]);
  });

  it("rejects an indicator with a missing verification attribution", () => {
    const fixture = literalAtlasFixture();
    delete (fixture.indicators[0] as { verificationId?: string }).verificationId;

    expectInvalidAt(fixture, ["indicators", 0, "verificationId"]);
  });

  it("rejects duplicate source record IDs at the duplicate record", () => {
    const fixture = literalAtlasFixture();
    fixture.sources.push({ ...fixture.sources[0] });

    expectInvalidAt(fixture, ["sources", 1, "id"]);
  });

  it("rejects duplicate verification record IDs at the duplicate record", () => {
    const fixture = literalAtlasFixture();
    fixture.verifications.push({ ...fixture.verifications[0] });

    expectInvalidAt(fixture, ["verifications", 1, "id"]);
  });

  it("rejects a duplicate source attribution at the duplicate entry", () => {
    const fixture = literalAtlasFixture();
    fixture.indicators[0].sourceIds.push("bps-pontianak-source");

    expectInvalidAt(fixture, ["indicators", 0, "sourceIds", 1]);
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

  it("rejects a missing indicators directory at the indicators path", async () => {
    const root = await temporaryFixture();
    const path = join(root, "data", "pontianak", "indicators");
    await rm(path, { recursive: true });

    await expect(loadAtlasData(root)).rejects.toThrow(
      new RegExp(`Data validation failed at ${escapeRegExp(path)}:`)
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

// Independent candidate snapshots exercise update semantics rather than stored-value literals.
describe("indicator semantic contracts", () => {
  it.each(indicatorIds)("rejects the wrong unit for %s even when movement agrees", (id) => {
    const fixture = literalAtlasFixture();
    const index = indicatorIds.indexOf(id);
    const candidate = fixture.indicators[index];
    candidate.unit = id === "adjusted-expenditure-per-capita" ? "percent" : "thousand-rupiah-ppp-per-person-per-year";
    candidate.movement.unit = candidate.unit === "percent" ? "percentage-point" : candidate.unit;
    expectInvalidAt(fixture, ["indicators", index, "unit"]);
  });
  it.each(indicatorIds)("rejects the wrong frequency for %s", (id) => {
    const fixture = literalAtlasFixture();
    const index = indicatorIds.indexOf(id);
    fixture.indicators[index].frequency = id.includes("inflation") ? "annual" : "monthly-with-annual-trend";
    expectInvalidAt(fixture, ["indicators", index, "frequency"]);
  });
  it.each(indicatorIds)("rejects the wrong trend reference for %s", (id) => {
    const fixture = literalAtlasFixture();
    const index = indicatorIds.indexOf(id);
    fixture.indicators[index].trendReference = id.includes("inflation") ? "annual" : "december";
    expectInvalidAt(fixture, ["indicators", index, "trendReference"]);
  });
  it.each([
    [0, "2021-11", "November 2021"], [1, "2021-01", "Januari 2021"],
    [2, "2021-02", "Februari 2021"], [3, "2021-02", "Februari 2021"],
    [4, "2021-09", "September 2021"], [5, "2021-12", "Desember 2021"],
    [2, "2021", "Tahun 2021"], [0, "2021-99", "Bulan 99 2021"],
    [0, "2021-00", "Bulan 00 2021"]
  ])("rejects a non-comparable trend at indicator %s: %s", (index, key, label) => {
    const fixture = literalAtlasFixture();
    fixture.indicators[index as number].trend[0].periodKey = key as string;
    fixture.indicators[index as number].trend[0].periodLabel = label as string;
    expectInvalidAt(fixture, ["indicators", index as number, "trend", 0, "periodKey"]);
  });
  it.each([
    [0, "2026-99", "Bulan 99 2026"], [0, "2026", "Tahun 2026"],
    [2, "2026-02", "Februari 2026"], [3, "2026", "Tahun 2026"],
    [4, "2026-09", "September 2026"], [5, "2026-12", "Desember 2026"]
  ])("rejects a latest period shape at indicator %s: %s", (index, key, label) => {
    const fixture = literalAtlasFixture();
    fixture.indicators[index as number].latest.periodKey = key as string;
    fixture.indicators[index as number].latest.periodLabel = label as string;
    expectInvalidAt(fixture, ["indicators", index as number, "latest", "periodKey"]);
  });
  it.each(["latest", "trend"] as const)("rejects a contradictory %s label", (location) => {
    const fixture = literalAtlasFixture();
    if (location === "latest") fixture.indicators[0].latest.periodLabel = "Agustus 2025";
    else fixture.indicators[0].trend[0].periodLabel = "Desember 2022";
    expectInvalidAt(fixture, ["indicators", 0, location, ...(location === "trend" ? [0] : []), "periodLabel"]);
  });
  it("rejects differing latest and trend values despite a consistent movement", () => {
    const fixture = literalAtlasFixture();
    fixture.indicators[2].latest.value = 5.7;
    fixture.indicators[2].movement.delta = 0.3;
    expectInvalidAt(fixture, ["indicators", 2, "latest", "value"]);
  });
  it("rejects differing latest and trend statuses for the same period", () => {
    const fixture = literalAtlasFixture();
    fixture.indicators[2].latest.status = "revised" as never;
    expectInvalidAt(fixture, ["indicators", 2, "latest", "status"]);
  });
  it.each([0, 1])("accepts a newer non-December monthly latest for inflation %s", (index) => {
    const fixture = literalAtlasFixture();
    fixture.indicators[index].latest = observation("2026-04", "April 2026", 2.7);
    fixture.indicators[index].movement.delta = Number((2.7 - fixture.indicators[index].movement.comparisonValue).toFixed(1));
    expect(() => parseAtlasData(fixture)).not.toThrow();
  });
  it("accepts comparable observations in other years without hardcoded snapshot dates", () => {
    const fixture = literalAtlasFixture();
    for (const indicator of fixture.indicators) {
      for (const point of [...indicator.trend, indicator.latest]) {
        point.periodKey = point.periodKey.replace(/^202/, "203");
        point.periodLabel = point.periodLabel.replace(/202/, "203");
      }
      indicator.movement.comparedWith = indicator.movement.comparedWith.replace(/^202/, "203");
    }
    expect(() => parseAtlasData(fixture)).not.toThrow();
  });
  it.each([0, 1])("accepts deflation and rates above 100 for inflation %s", (index) => {
    for (const value of [-99.9, -0.5, 150]) {
      const fixture = literalAtlasFixture();
      const candidate = fixture.indicators[index];
      candidate.latest.value = candidate.trend[4].value = value;
      candidate.trend[0].value = candidate.movement.comparisonValue = value;
      candidate.movement.comparedWith = candidate.trend[0].periodKey;
      candidate.movement.delta = 0;
      expect(() => parseAtlasData(fixture)).not.toThrow();
    }
  });
  it.each([0, 1])("rejects inflation at or below -100 across value paths for %s", (index) => {
    for (const value of [-100, -101]) {
      for (const path of ["latest", "trend", "comparison"] as const) {
        const fixture = literalAtlasFixture();
        constantSeriesValue(fixture, index, value);
        expectInvalidAt(fixture, ["indicators", index, ...(path === "trend" ? ["trend", 0, "value"] : path === "comparison" ? ["movement", "comparisonValue"] : ["latest", "value"])]);
      }
    }
  });
  it.each([2, 3, 4])("rejects negative or excessive shares across value paths for %s", (index) => {
    for (const value of [-0.1, 100.1]) {
      for (const path of ["latest", "trend", "comparison"] as const) {
        const fixture = literalAtlasFixture();
        constantSeriesValue(fixture, index, value);
        expectInvalidAt(fixture, ["indicators", index, ...(path === "trend" ? ["trend", 0, "value"] : path === "comparison" ? ["movement", "comparisonValue"] : ["latest", "value"])]);
      }
    }
  });
  it.each([Number.NaN, Infinity, -Infinity])("rejects nonfinite observation/comparison numbers %s", (value) => {
    for (const path of ["latest", "trend", "comparison"] as const) {
      const fixture = literalAtlasFixture();
      if (path === "latest") fixture.indicators[0].latest.value = value;
      if (path === "trend") fixture.indicators[0].trend[0].value = value;
      if (path === "comparison") fixture.indicators[0].movement.comparisonValue = value;
      expect(() => parseAtlasData(fixture)).toThrow();
    }
  });
  it.each([0, -1])("rejects nonpositive expenditure %s", (value) => {
    const fixture = literalAtlasFixture();
    fixture.indicators[5].trend[0].value = value;
    expectInvalidAt(fixture, ["indicators", 5, "trend", 0, "value"]);
  });
});

it.each([
  [0, "2024-99"], [2, "2024-02"], [3, "2024"], [4, "2024-09"], [5, "2024-12"]
])("rejects a non-comparable movement reference at indicator %s: %s", (index, key) => {
  const fixture = literalAtlasFixture();
  fixture.indicators[index as number].movement.comparedWith = key as string;
  expectInvalidAt(fixture, ["indicators", index as number, "movement", "comparedWith"]);
});

function constantSeriesValue(fixture: ReturnType<typeof literalAtlasFixture>, index: number, value: number) {
  const candidate = fixture.indicators[index];
  candidate.latest.value = value;
  for (const point of candidate.trend) point.value = value;
  candidate.movement.comparisonValue = value;
  candidate.movement.delta = 0;
}

it.each([2, 3, 4])("accepts both inclusive share boundaries for indicator %s", (index) => {
  for (const value of [0, 100]) {
    const fixture = literalAtlasFixture();
    constantSeriesValue(fixture, index, value);
    expect(() => parseAtlasData(fixture)).not.toThrow();
  }
});
