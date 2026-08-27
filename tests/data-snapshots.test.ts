import { describe, expect, it } from "vitest";
import { loadAtlasData } from "../src/data/load";

const expectedIndicatorIds = [
  "adjusted-expenditure-per-capita",
  "food-inflation",
  "headline-inflation",
  "poverty-rate",
  "tpak",
  "tpt"
] as const;

const expectedSourceIds = [
  "adjusted-expenditure-table",
  "bps-terms",
  "ihk-pontianak-2021",
  "ihk-pontianak-2022",
  "ihk-pontianak-2023",
  "ihk-pontianak-2025",
  "ipm-pontianak-2025",
  "ketenagakerjaan-pontianak-2021",
  "ketenagakerjaan-pontianak-2022",
  "ketenagakerjaan-pontianak-2025",
  "pontianak-dalam-angka-2026",
  "poverty-p0-table"
] as const;

const expectedSnapshots = {
  "headline-inflation": {
    topic: "harga",
    values: [1.16, 6.35, 2.09, 1.58, 1.5],
    latest: { periodKey: "2025-12", periodLabel: "Desember 2025", value: 1.5 },
    unit: "percent",
    precision: 2
  },
  "food-inflation": {
    topic: "harga",
    values: [0.79, 5.43, 3.19, 3.38, 2.32],
    latest: { periodKey: "2025-12", periodLabel: "Desember 2025", value: 2.32 },
    unit: "percent",
    precision: 2
  },
  tpt: {
    topic: "pekerjaan",
    values: [12.38, 9.92, 8.92, 8.29, 7.91],
    latest: { periodKey: "2025-08", periodLabel: "Agustus 2025", value: 7.91 },
    unit: "percent",
    precision: 2
  },
  tpak: {
    topic: "pekerjaan",
    values: [61.94, 64.82, 63.47, 64.53, 61.77],
    latest: { periodKey: "2025-08", periodLabel: "Agustus 2025", value: 61.77 },
    unit: "percent",
    precision: 2
  },
  "poverty-rate": {
    topic: "kesejahteraan",
    values: [4.58, 4.46, 4.45, 4.2, 4],
    latest: { periodKey: "2025-03", periodLabel: "Maret 2025", value: 4 },
    unit: "percent",
    precision: 2
  },
  "adjusted-expenditure-per-capita": {
    topic: "kesejahteraan",
    values: [14610, 15141, 15632, 16212, 16725],
    latest: { periodKey: "2025", periodLabel: "Tahun 2025", value: 16725 },
    unit: "thousand-rupiah-ppp-per-person-per-year",
    precision: 0
  }
} as const;

describe("verified Pontianak v1 snapshots", () => {
  it("loads the exact six-indicator, two-per-topic municipal catalogue", async () => {
    const atlas = await loadAtlasData();

    expect(atlas.geography).toEqual({
      code: "6171",
      name: "Kota Pontianak",
      province: "Kalimantan Barat",
      scope: "municipality"
    });
    expect(atlas.indicators.map(({ id }) => id).sort()).toEqual(expectedIndicatorIds);
    expect(atlas.indicators.filter(({ topic }) => topic === "harga")).toHaveLength(2);
    expect(atlas.indicators.filter(({ topic }) => topic === "pekerjaan")).toHaveLength(2);
    expect(atlas.indicators.filter(({ topic }) => topic === "kesejahteraan")).toHaveLength(2);
    expect(atlas.indicators.reduce((total, indicator) => total + indicator.trend.length, 0)).toBe(30);
  });

  it("preserves every independently verified five-value sequence and latest observation", async () => {
    const atlas = await loadAtlasData();

    for (const [id, expected] of Object.entries(expectedSnapshots)) {
      const indicator = atlas.indicators.find((candidate) => candidate.id === id);
      expect(indicator, `missing ${id}`).toBeDefined();
      expect(indicator?.topic).toBe(expected.topic);
      expect(indicator?.geographyCode).toBe("6171");
      expect(indicator?.trend.map(({ value }) => value)).toEqual(expected.values);
      expect(indicator?.latest).toMatchObject(expected.latest);
      expect(indicator?.trend.at(-1)).toEqual(indicator?.latest);
      expect(indicator?.unit).toBe(expected.unit);
      expect(indicator?.precision).toBe(expected.precision);
      expect(indicator?.comparabilityNote.trim().length).toBeGreaterThan(0);
    }
  });

  it("stores adjusted expenditure at the official integer thousand-rupiah scale", async () => {
    const atlas = await loadAtlasData();
    const expenditure = atlas.indicators.find(({ id }) => id === "adjusted-expenditure-per-capita");

    expect(expenditure?.trend.map(({ value }) => value)).toEqual([14610, 15141, 15632, 16212, 16725]);
    expect(expenditure?.trend.every(({ value }) => Number.isInteger(value))).toBe(true);
    expect(expenditure?.latest.value).toBe(16725);
    expect(expenditure?.movement).toMatchObject({
      comparedWith: "2024",
      comparisonValue: 16212,
      delta: 513,
      unit: "thousand-rupiah-ppp-per-person-per-year"
    });
  });

  it("joins every indicator to approved evidence and the completed two-pass check", async () => {
    const atlas = await loadAtlasData();
    const sourceIds = atlas.sources.map(({ id }) => id);
    const sourceIdSet = new Set(sourceIds);
    const verificationIds = new Set(atlas.verifications.map(({ id }) => id));

    expect(sourceIds).toHaveLength(12);
    expect(sourceIdSet.size).toBe(12);
    expect([...sourceIdSet].sort()).toEqual(expectedSourceIds);
    expect(atlas.verifications).toEqual([{
      id: "pontianak-v1-2026-08-27",
      verifiedOn: "2026-08-27",
      method: "two-pass-manual",
      passCount: 2,
      checks: ["value", "period", "unit", "geography", "reference", "comparability"]
    }]);

    for (const indicator of atlas.indicators) {
      expect(indicator.sourceIds.length).toBeGreaterThan(0);
      expect(indicator.sourceIds.every((sourceId) => sourceIdSet.has(sourceId))).toBe(true);
      expect(indicator.sourceIds).not.toContain("bps-terms");
      expect(verificationIds.has(indicator.verificationId)).toBe(true);
    }
  });
});
