import { describe, expect, it } from "vitest";
import { createTrendGeometry } from "../src/data/trend";

function observations(values: readonly number[]) {
  return values.map((value, index) => ({
    periodKey: String(2021 + index),
    periodLabel: `Tahun ${2021 + index}`,
    status: "final" as const,
    value
  }));
}

describe("five-observation trend geometry", () => {
  it.each([
    {
      name: "increasing series",
      values: [1, 2, 3, 4, 5],
      expectedY: [36, 28, 20, 12, 4]
    },
    {
      name: "decreasing series",
      values: [5, 4, 3, 2, 1],
      expectedY: [4, 12, 20, 28, 36]
    },
    {
      name: "mixed series",
      values: [5, 2, 4, 1, 3],
      expectedY: [4, 28, 12, 36, 20]
    }
  ])("maps $name from its own minimum to maximum", ({ values, expectedY }) => {
    const geometry = createTrendGeometry(observations(values));

    expect(geometry.viewBox).toBe("0 0 100 40");
    expect(geometry.points.map(({ x }) => x)).toEqual([4, 27, 50, 73, 96]);
    expect(geometry.points.map(({ y }) => y)).toEqual(expectedY);
    expect(geometry.points.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
    expect(geometry.points.every((point, index, points) => index === 0 || point.x > points[index - 1].x)).toBe(true);
  });

  it("centres a flat series", () => {
    const geometry = createTrendGeometry(observations([7, 7, 7, 7, 7]));

    expect(geometry.points.map(({ y }) => y)).toEqual([20, 20, 20, 20, 20]);
  });

  it("summarizes first value, last value, absolute change, and the supplied unit", () => {
    const geometry = createTrendGeometry(
      observations([14_610, 15_141, 15_632, 16_212, 16_725]),
      100,
      40,
      4,
      { unit: "thousand-rupiah-ppp-per-person-per-year", precision: 0 }
    );

    expect(geometry.summary)
      .toBe("Nilai awal 14.610 ribu rupiah PPP per orang per tahun, nilai akhir 16.725 ribu rupiah PPP per orang per tahun, perubahan absolut 2.115 ribu rupiah PPP per orang per tahun.");
  });

  it("rejects a series that does not contain exactly five observations", () => {
    expect(() => createTrendGeometry(observations([1, 2, 3, 4])))
      .toThrow("Trend must contain exactly five observations.");
  });
});
