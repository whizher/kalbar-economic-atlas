import { formatIndicatorValue, type DisplayUnit } from "./format";

export type TrendObservation = Readonly<{ value: number }>;

export type TrendDisplay = Readonly<{
  unit: DisplayUnit;
  precision: number;
}>;

export type TrendPoint = Readonly<{
  x: number;
  y: number;
}>;

export type TrendGeometry = Readonly<{
  viewBox: string;
  points: readonly TrendPoint[];
  polylinePoints: string;
  summary: string;
}>;

export function createTrendGeometry(
  observations: readonly TrendObservation[],
  width = 100,
  height = 40,
  padding = 4,
  display?: TrendDisplay
): TrendGeometry {
  if (observations.length !== 5) {
    throw new RangeError("Trend must contain exactly five observations.");
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(padding)
    || width <= 0 || height <= 0 || padding < 0 || padding * 2 >= width || padding * 2 >= height) {
    throw new RangeError("Trend dimensions must leave space inside the view box.");
  }

  const values = observations.map(({ value }) => {
    if (!Number.isFinite(value)) {
      throw new RangeError("Trend values must be finite.");
    }
    return value;
  });
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const horizontalStep = (width - padding * 2) / (observations.length - 1);
  const points = values.map((value, index) => ({
    x: padding + horizontalStep * index,
    y: minimum === maximum
      ? height / 2
      : height - padding - ((value - minimum) / (maximum - minimum)) * (height - padding * 2)
  }));
  const firstValue = values[0];
  const lastValue = values.at(-1) as number;
  const summary = display
    ? createDisplaySummary(firstValue, lastValue, display)
    : createNeutralSummary(firstValue, lastValue);

  return {
    viewBox: `0 0 ${width} ${height}`,
    points,
    polylinePoints: points.map(({ x, y }) => `${x},${y}`).join(" "),
    summary
  };
}

function createDisplaySummary(firstValue: number, lastValue: number, display: TrendDisplay): string {
  const movementUnit: DisplayUnit = display.unit === "percent" ? "percentage-point" : display.unit;

  return [
    `Nilai awal ${formatIndicatorValue(firstValue, display.unit, display.precision)}`,
    `nilai akhir ${formatIndicatorValue(lastValue, display.unit, display.precision)}`,
    `perubahan absolut ${formatIndicatorValue(Math.abs(lastValue - firstValue), movementUnit, display.precision)}.`
  ].join(", ");
}

function createNeutralSummary(firstValue: number, lastValue: number): string {
  const formatValue = (value: number) => `${formatIndicatorValue(value, "percent", 1).slice(0, -1)} satuan data`;

  return [
    `Nilai awal ${formatValue(firstValue)}`,
    `nilai akhir ${formatValue(lastValue)}`,
    `perubahan absolut ${formatValue(Math.abs(lastValue - firstValue))}.`
  ].join(", ");
}
