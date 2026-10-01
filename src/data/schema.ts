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

const PeriodKeySchema = z.string().regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/);
const monthLabels = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export const ObservationSchema = z.object({
  periodKey: PeriodKeySchema,
  periodLabel: z.string().min(4),
  value: z.number(),
  status: z.enum(["final", "revised"])
}).strict().superRefine((observation, context) => {
  const [year, month] = observation.periodKey.split("-");
  const expectedLabel = month ? `${monthLabels[Number(month) - 1]} ${year}` : `Tahun ${year}`;
  if (observation.periodLabel !== expectedLabel) {
    context.addIssue({ code: "custom", path: ["periodLabel"], message: "Period label must agree with its calendar key." });
  }
});

export const SourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  url: z.url().startsWith("https://pontianakkota.bps.go.id/"),
  publisher: z.literal("BPS Kota Pontianak"),
  author: z.string().min(1).nullable(),
  publishedOn: z.iso.date().nullable(),
  accessedOn: z.iso.date(),
  reference: z.string().min(1),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  availability: z.enum(["active", "temporarily-unavailable", "withdrawn-review", "withdrawn"])
}).strict();

export const GeographySchema = z.object({
  code: z.literal("6171"),
  name: z.literal("Kota Pontianak"),
  province: z.literal("Kalimantan Barat"),
  scope: z.literal("municipality")
}).strict();

export const VerificationSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  verifiedOn: z.iso.date(),
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
}).strict().superRefine((verification, context) => {
  const seen = new Set<string>();
  verification.checks.forEach((check, index) => {
    if (seen.has(check)) {
      context.addIssue({
        code: "custom",
        path: ["checks", index],
        message: "Verification checks must be unique."
      });
    }
    seen.add(check);
  });
});

const expectedTopics: Record<(typeof INDICATOR_IDS)[number], z.infer<typeof TopicSchema>> = {
  "headline-inflation": "harga",
  "food-inflation": "harga",
  tpt: "pekerjaan",
  tpak: "pekerjaan",
  "poverty-rate": "kesejahteraan",
  "adjusted-expenditure-per-capita": "kesejahteraan"
};

// The reviewed municipal contracts distinguish reporting frequency from the annual
// trend's actual reference month (including March poverty with annual metadata).
const indicatorContracts = {
  "headline-inflation": { unit: "percent", frequency: "monthly-with-annual-trend", trendReference: "december", month: "12" },
  "food-inflation": { unit: "percent", frequency: "monthly-with-annual-trend", trendReference: "december", month: "12" },
  tpt: { unit: "percent", frequency: "annual", trendReference: "august", month: "08" },
  tpak: { unit: "percent", frequency: "annual", trendReference: "august", month: "08" },
  "poverty-rate": { unit: "percent", frequency: "annual", trendReference: "annual", month: "03" },
  "adjusted-expenditure-per-capita": { unit: "thousand-rupiah-ppp-per-person-per-year", frequency: "annual", trendReference: "annual", month: null }
} as const;

const IndicatorShape = z.object({
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
    comparedWith: PeriodKeySchema,
    comparisonValue: z.number(),
    delta: z.number(),
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

export const IndicatorSchema = IndicatorShape.superRefine((indicator, context) => {
  const contract = indicatorContracts[indicator.id];
  const inflation = indicator.id === "headline-inflation" || indicator.id === "food-inflation";
  for (const field of ["unit", "frequency", "trendReference"] as const) {
    if (indicator[field] !== contract[field]) {
      context.addIssue({ code: "custom", path: [field], message: `Indicator ${indicator.id} must use ${contract[field]}.` });
    }
  }
  const matchesPeriod = (key: string, allowMonthly: boolean) => {
    if (allowMonthly) return /^\d{4}-(0[1-9]|1[0-2])$/.test(key);
    return contract.month === null ? /^\d{4}$/.test(key) : new RegExp(`^\\d{4}-${contract.month}$`).test(key);
  };
  for (const { key, path, allowMonthly } of [
    { key: indicator.latest.periodKey, path: ["latest", "periodKey"], allowMonthly: inflation },
    ...indicator.trend.map((point, index) => ({ key: point.periodKey, path: ["trend", index, "periodKey"], allowMonthly: false })),
    { key: indicator.movement.comparedWith, path: ["movement", "comparedWith"], allowMonthly: inflation }
  ]) {
    if (!matchesPeriod(key, allowMonthly)) {
      context.addIssue({ code: "custom", path, message: `Period must match the reviewed ${indicator.id} reference.` });
    }
  }
  const overlappingLatest = indicator.trend.find((point) => point.periodKey === indicator.latest.periodKey);
  if (overlappingLatest) {
    for (const field of ["value", "status"] as const) {
      if (indicator.latest[field] !== overlappingLatest[field]) {
        context.addIssue({ code: "custom", path: ["latest", field], message: `Latest ${field} must match the same trend period.` });
      }
    }
  }

  if (indicator.topic !== expectedTopics[indicator.id]) {
    context.addIssue({
      code: "custom",
      path: ["topic"],
      message: `Indicator ${indicator.id} must use the ${expectedTopics[indicator.id]} topic.`
    });
  }

  const periods = new Set<string>();
  indicator.trend.forEach((observation, index) => {
    if (periods.has(observation.periodKey)) {
      context.addIssue({
        code: "custom",
        path: ["trend", index, "periodKey"],
        message: "Trend periods must be unique."
      });
    }
    periods.add(observation.periodKey);

    if (index > 0 && periodRank(observation.periodKey) <= periodRank(indicator.trend[index - 1].periodKey)) {
      context.addIssue({
        code: "custom",
        path: ["trend", index, "periodKey"],
        message: "Trend periods must be strictly ascending."
      });
    }
  });

  const expectedMovementUnit = indicator.unit === "percent"
    ? "percentage-point"
    : "thousand-rupiah-ppp-per-person-per-year";
  if (indicator.movement.unit !== expectedMovementUnit) {
    context.addIssue({
      code: "custom",
      path: ["movement", "unit"],
      message: "Movement unit must match the indicator unit."
    });
  }

  if (roundToPrecision(indicator.latest.value - indicator.movement.comparisonValue, indicator.precision)
    !== roundToPrecision(indicator.movement.delta, indicator.precision)) {
    context.addIssue({
      code: "custom",
      path: ["movement", "delta"],
      message: "Movement delta must equal latest value minus comparison value at the declared precision."
    });
  }

  const comparedObservation = indicator.trend.find(
    (observation) => observation.periodKey === indicator.movement.comparedWith
  );
  if (comparedObservation && comparedObservation.value !== indicator.movement.comparisonValue) {
    context.addIssue({
      code: "custom",
      path: ["movement", "comparisonValue"],
      message: "Movement comparison value must match the cited trend observation."
    });
  }

  const finalTrendObservation = indicator.trend.at(-1);
  if (finalTrendObservation && periodRank(indicator.latest.periodKey) < periodRank(finalTrendObservation.periodKey)) {
    context.addIssue({
      code: "custom",
      path: ["latest", "periodKey"],
      message: "Latest observation cannot be older than the final trend observation."
    });
  }

  const numericValues = [
    { path: ["latest", "value"], value: indicator.latest.value },
    ...indicator.trend.map((observation, index) => ({ path: ["trend", index, "value"], value: observation.value })),
    { path: ["movement", "comparisonValue"], value: indicator.movement.comparisonValue }
  ];
  // A year-on-year change from positive price-index levels is strictly above
  // -100%; it is not a population share and has no generic 100% upper cap.
  const expenditure = indicator.id === "adjusted-expenditure-per-capita";
  const boundsMessage = inflation ? "Inflation rates must be greater than -100%."
    : expenditure ? "Adjusted expenditure values must be positive."
    : "Population shares must be between 0 and 100.";
  numericValues.forEach(({ path, value }) => {
    const valid = inflation ? value > -100 : expenditure ? value > 0 : value >= 0 && value <= 100;
    if (!valid) {
      context.addIssue({ code: "custom", path, message: boundsMessage });
    }
  });
});

export const AtlasDataSchema = z.object({
  geography: GeographySchema,
  sources: z.array(SourceSchema).min(1),
  verifications: z.array(VerificationSchema).min(1),
  indicators: z.array(IndicatorSchema).length(6)
}).strict().superRefine((atlas, context) => {
  const sourceIds = new Set<string>();
  atlas.sources.forEach((source, index) => {
    if (sourceIds.has(source.id)) {
      context.addIssue({
        code: "custom",
        path: ["sources", index, "id"],
        message: "Source IDs must be unique."
      });
    }
    sourceIds.add(source.id);
  });

  const verificationIds = new Set<string>();
  atlas.verifications.forEach((verification, index) => {
    if (verificationIds.has(verification.id)) {
      context.addIssue({
        code: "custom",
        path: ["verifications", index, "id"],
        message: "Verification IDs must be unique."
      });
    }
    verificationIds.add(verification.id);
  });

  const catalogueIds = new Set<string>();

  atlas.indicators.forEach((indicator, index) => {
    if (catalogueIds.has(indicator.id)) {
      context.addIssue({
        code: "custom",
        path: ["indicators", index, "id"],
        message: "Indicator IDs must be unique."
      });
    }
    catalogueIds.add(indicator.id);

    const indicatorSourceIds = new Set<string>();
    indicator.sourceIds.forEach((sourceId, sourceIndex) => {
      if (indicatorSourceIds.has(sourceId)) {
        context.addIssue({
          code: "custom",
          path: ["indicators", index, "sourceIds", sourceIndex],
          message: "Indicator source IDs must be unique."
        });
      }
      indicatorSourceIds.add(sourceId);

      if (!sourceIds.has(sourceId)) {
        context.addIssue({
          code: "custom",
          path: ["indicators", index, "sourceIds", sourceIndex],
          message: `Source ID ${sourceId} does not resolve.`
        });
      }
    });

    if (!verificationIds.has(indicator.verificationId)) {
      context.addIssue({
        code: "custom",
        path: ["indicators", index, "verificationId"],
        message: `Verification ID ${indicator.verificationId} does not resolve.`
      });
    }
  });

  const missing = INDICATOR_IDS.filter((id) => !catalogueIds.has(id));
  const extra = [...catalogueIds].filter((id) => !INDICATOR_IDS.includes(id as (typeof INDICATOR_IDS)[number]));
  if (missing.length > 0 || extra.length > 0) {
    context.addIssue({
      code: "custom",
      path: ["indicators"],
      message: `Indicator catalogue mismatch; missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"}.`
    });
  }
});

export type AtlasData = z.infer<typeof AtlasDataSchema>;
export type Indicator = z.infer<typeof IndicatorSchema>;
export type Observation = z.infer<typeof ObservationSchema>;
export type SourceRecord = z.infer<typeof SourceSchema>;

export function parseAtlasData(input: unknown): AtlasData {
  return AtlasDataSchema.parse(input);
}

function periodRank(periodKey: string) {
  const [year, month] = periodKey.split("-");
  return Number(year) * 100 + Number(month ?? "00");
}

function roundToPrecision(value: number, precision: number) {
  const multiplier = 10 ** precision;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}
