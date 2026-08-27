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

export const ObservationSchema = z.object({
  periodKey: z.string().regex(/^\d{4}(-\d{2})?$/),
  periodLabel: z.string().min(4),
  value: z.number().finite(),
  status: z.enum(["final", "revised"])
}).strict();

export const SourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  url: z.string().url().startsWith("https://pontianakkota.bps.go.id/"),
  publisher: z.literal("BPS Kota Pontianak"),
  author: z.string().min(1).nullable(),
  publishedOn: z.string().date().nullable(),
  accessedOn: z.string().date(),
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
  verifiedOn: z.string().date(),
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
    comparedWith: z.string().regex(/^\d{4}(-\d{2})?$/),
    comparisonValue: z.number().finite(),
    delta: z.number().finite(),
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
  const boundsMessage = indicator.unit === "percent"
    ? "Percentage values must be between 0 and 100."
    : "Adjusted expenditure values must be positive.";
  numericValues.forEach(({ path, value }) => {
    const valid = indicator.unit === "percent" ? value >= 0 && value <= 100 : value > 0;
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
  const sourceIds = new Set(atlas.sources.map((source) => source.id));
  const verificationIds = new Set(atlas.verifications.map((verification) => verification.id));
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

    indicator.sourceIds.forEach((sourceId, sourceIndex) => {
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
