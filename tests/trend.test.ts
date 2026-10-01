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

  it("uses a neutral summary when a display descriptor is omitted", () => {
    const geometry = createTrendGeometry(observations([1, 2, 3, 4, 5]));

    expect(geometry.summary)
      .toBe("Nilai awal 1,0 satuan data, nilai akhir 5,0 satuan data, perubahan absolut 4,0 satuan data.");
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

// These existing guards must fail closed before constructing geometry.
it.each([NaN, Infinity, -Infinity])("rejects nonfinite trend value %s", (value) => {
  expect(() => createTrendGeometry(observations([1, 2, value, 4, 5])))
    .toThrow("Trend values must be finite.");
});
it.each([
  [0, 40, 4], [-1, 40, 4], [100, 0, 4], [100, -1, 4], [100, 40, -1],
  [8, 40, 4], [100, 8, 4], [7, 40, 4], [100, 7, 4],
  [NaN, 40, 4], [Infinity, 40, 4], [-Infinity, 40, 4],
  [100, NaN, 4], [100, Infinity, 4], [100, -Infinity, 4],
  [100, 40, NaN], [100, 40, Infinity], [100, 40, -Infinity]
])("rejects unusable dimensions width=%s height=%s padding=%s", (width, height, padding) => {
  expect(() => createTrendGeometry(observations([1, 2, 3, 4, 5]), width, height, padding))
    .toThrow("Trend dimensions must leave space inside the view box.");
});
