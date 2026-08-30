export type DisplayUnit =
  | "percent"
  | "percentage-point"
  | "thousand-rupiah-ppp-per-person-per-year";

export type ReferenceMonth = "august" | "december" | "annual";

export const ADJUSTED_EXPENDITURE_WARNING =
  "Pengeluaran per kapita yang disesuaikan bukan pendapatan, gaji, atau uang tunai yang diterima rumah tangga.";

const unitLabels: Record<DisplayUnit, string> = {
  percent: "%",
  "percentage-point": "poin persentase",
  "thousand-rupiah-ppp-per-person-per-year": "ribu rupiah PPP per orang per tahun"
};

export function formatIndicatorValue(value: number, unit: DisplayUnit, precision: number): string {
  return `${formatNumber(value, precision)}${unit === "percent" ? unitLabels[unit] : ` ${unitLabels[unit]}`}`;
}

export function formatDelta(value: number, unit: DisplayUnit, precision: number): string {
  const normalizedValue = Object.is(value, -0) ? 0 : value;
  const sign = normalizedValue > 0 ? "+" : "";

  return `${sign}${formatIndicatorValue(normalizedValue, unit, precision)}`;
}

export function formatPeriod(periodKey: string, referenceMonth: ReferenceMonth): string {
  const annualMatch = /^(\d{4})$/.exec(periodKey);
  const monthlyMatch = /^(\d{4})-(\d{2})$/.exec(periodKey);

  if (referenceMonth === "annual" && annualMatch) {
    return `Tahun ${annualMatch[1]}`;
  }

  const expectedMonth = referenceMonth === "august" ? "08" : "12";
  const monthLabel = referenceMonth === "august" ? "Agustus" : "Desember";
  if (monthlyMatch && monthlyMatch[2] === expectedMonth) {
    return `${monthLabel} ${monthlyMatch[1]}`;
  }

  throw new RangeError(`Period ${periodKey} does not match ${referenceMonth}.`);
}

function formatNumber(value: number, precision: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError("Display values must be finite.");
  }
  if (!Number.isInteger(precision) || precision < 0 || precision > 20) {
    throw new RangeError("Display precision must be an integer from 0 to 20.");
  }

  const normalizedValue = Object.is(value, -0) ? 0 : value;

  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  }).format(normalizedValue);
}
