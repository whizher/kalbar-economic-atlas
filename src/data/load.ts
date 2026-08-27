import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import {
  AtlasDataSchema,
  GeographySchema,
  INDICATOR_IDS,
  IndicatorSchema,
  SourceSchema,
  VerificationSchema,
  type AtlasData
} from "./schema.ts";

class DataValidationFailure extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(message);
    this.path = path;
  }
}

export async function loadAtlasData(root = process.cwd()): Promise<AtlasData> {
  const base = join(root, "data", "pontianak");
  const geographyPath = join(base, "geography.json");
  const sourcesPath = join(base, "sources.json");
  const verificationPath = join(base, "verification.json");
  const indicatorsPath = join(base, "indicators");

  try {
    const indicatorNames = (await readdir(indicatorsPath)).sort((left, right) => left.localeCompare(right));
    const expectedNames = INDICATOR_IDS.map((id) => `${id}.json`).sort((left, right) => left.localeCompare(right));
    const missing = expectedNames.filter((name) => !indicatorNames.includes(name));
    const extra = indicatorNames.filter((name) => !expectedNames.includes(name));
    if (missing.length > 0 || extra.length > 0) {
      throw new DataValidationFailure(
        indicatorsPath,
        `Indicator files must exactly match the approved catalogue; missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"}.`
      );
    }

    const geography = parseFile(GeographySchema, geographyPath, await readJson(geographyPath));
    const sources = parseFile(z.array(SourceSchema).min(1), sourcesPath, await readJson(sourcesPath));
    const verifications = parseFile(
      z.array(VerificationSchema).min(1),
      verificationPath,
      await readJson(verificationPath)
    );
    const indicators = await Promise.all(indicatorNames.map(async (name) => {
      const path = join(indicatorsPath, name);
      return parseFile(IndicatorSchema, path, await readJson(path));
    }));

    const atlas = AtlasDataSchema.safeParse({ geography, sources, verifications, indicators });
    if (atlas.success) {
      return atlas.data;
    }

    const issue = atlas.error.issues[0];
    throw new DataValidationFailure(
      pathForAtlasIssue(issue.path, {
        base,
        geographyPath,
        sourcesPath,
        verificationPath,
        indicatorsPath,
        indicatorNames
      }),
      `${formatZodPath(issue.path)}: ${issue.message}`
    );
  } catch (error) {
    if (error instanceof DataValidationFailure) {
      throw new Error(`Data validation failed at ${error.path}: ${error.message}`, { cause: error });
    }
    throw new Error(`Data validation failed at ${base}: ${errorMessage(error)}`, { cause: error });
  }
}

async function readJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new DataValidationFailure(path, errorMessage(error));
  }
}

function parseFile<T extends z.ZodType>(schema: T, path: string, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (result.success) {
    return result.data;
  }

  const issue = result.error.issues[0];
  throw new DataValidationFailure(path, `${formatZodPath(issue.path)}: ${issue.message}`);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function formatZodPath(path: PropertyKey[]) {
  return path.length === 0 ? "(root)" : path.join(".");
}

function pathForAtlasIssue(
  path: PropertyKey[],
  paths: {
    base: string;
    geographyPath: string;
    sourcesPath: string;
    verificationPath: string;
    indicatorsPath: string;
    indicatorNames: string[];
  }
) {
  switch (path[0]) {
    case "geography":
      return paths.geographyPath;
    case "sources":
      return paths.sourcesPath;
    case "verifications":
      return paths.verificationPath;
    case "indicators":
      return typeof path[1] === "number" && paths.indicatorNames[path[1]]
        ? join(paths.indicatorsPath, paths.indicatorNames[path[1]])
        : paths.indicatorsPath;
    default:
      return paths.base;
  }
}
