import { describe, expect, it } from "vitest";
import {
  ADJUSTED_EXPENDITURE_WARNING,
  formatDelta,
  formatIndicatorValue,
  formatPeriod
} from "../src/data/format";

describe("Indonesian indicator formatting", () => {
  it.each([
    { value: 2.32, unit: "percent" as const, precision: 2, expected: "2,32%" },
    { value: 1.5, unit: "percent" as const, precision: 1, expected: "1,5%" },
    {
      value: 14_610,
      unit: "thousand-rupiah-ppp-per-person-per-year" as const,
      precision: 0,
      expected: "14.610 ribu rupiah PPP per orang per tahun"
    },
    {
      value: 15_141,
      unit: "thousand-rupiah-ppp-per-person-per-year" as const,
      precision: 0,
      expected: "15.141 ribu rupiah PPP per orang per tahun"
    },
    {
      value: 15_632,
      unit: "thousand-rupiah-ppp-per-person-per-year" as const,
      precision: 0,
      expected: "15.632 ribu rupiah PPP per orang per tahun"
    },
    {
      value: 16_212,
      unit: "thousand-rupiah-ppp-per-person-per-year" as const,
      precision: 0,
      expected: "16.212 ribu rupiah PPP per orang per tahun"
    },
    {
      value: 16_725,
      unit: "thousand-rupiah-ppp-per-person-per-year" as const,
      precision: 0,
      expected: "16.725 ribu rupiah PPP per orang per tahun"
    }
  ])("formats $value as $expected", ({ value, unit, precision, expected }) => {
    expect(formatIndicatorValue(value, unit, precision)).toBe(expected);
  });

  it.each([
    { value: 0.08, expected: "+0,08 poin persentase" },
    { value: 0, expected: "0,00 poin persentase" },
    { value: -1.06, expected: "-1,06 poin persentase" }
  ])("keeps percentage-point delta signs for $value", ({ value, expected }) => {
    expect(formatDelta(value, "percentage-point", 2)).toBe(expected);
  });

  it("formats an integer adjusted-expenditure movement without decimal artifacts", () => {
    expect(formatDelta(513, "thousand-rupiah-ppp-per-person-per-year", 0))
      .toBe("+513 ribu rupiah PPP per orang per tahun");
  });

  it.each([
    { periodKey: "2025-12", referenceMonth: "december" as const, expected: "Desember 2025" },
    { periodKey: "2025-08", referenceMonth: "august" as const, expected: "Agustus 2025" },
    { periodKey: "2025", referenceMonth: "annual" as const, expected: "Tahun 2025" }
  ])("formats $periodKey as $expected", ({ periodKey, referenceMonth, expected }) => {
    expect(formatPeriod(periodKey, referenceMonth)).toBe(expected);
  });

  it("states that adjusted expenditure is not income", () => {
    expect(ADJUSTED_EXPENDITURE_WARNING)
      .toBe("Pengeluaran per kapita yang disesuaikan bukan pendapatan, gaji, atau uang tunai yang diterima rumah tangga.");
  });
});
