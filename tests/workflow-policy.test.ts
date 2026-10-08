import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

// Parse the workflow GitHub consumes, rather than matching YAML formatting.
// js-yaml is already in the locked dependency tree; no new package is needed.
const { load } = createRequire(import.meta.url)("js-yaml") as {
  load: (yaml: string) => Workflow;
};

type Step = {
  uses?: string;
  run?: string;
  id?: string;
  with?: Record<string, unknown>;
  env?: Record<string, unknown>;
};
type Job = {
  "runs-on": string;
  "timeout-minutes": number;
  permissions?: Record<string, string>;
  needs?: string | string[];
  steps: Step[];
  environment?: unknown;
  outputs?: Record<string, string>;
};
type Workflow = {
  on: Record<string, unknown>;
  permissions: Record<string, string>;
  concurrency: { group: string; "cancel-in-progress": boolean };
  jobs: Record<string, Job>;
};

const CHECKOUT = "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1";
const SETUP_NODE = "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020";
const CONFIGURE_PAGES = "actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d";
const UPLOAD_PAGES = "actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9";
const DEPLOY_PAGES = "actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128";

function readWorkflow(name: string): Workflow {
  const path = `.github/workflows/${name}.yml`;
  expect(existsSync(path), `${path} must exist`).toBe(true);
  return load(readFileSync(path, "utf8"));
}

function assertCommonPolicy(workflow: Workflow) {
  expect(workflow.on).not.toHaveProperty("pull_request_target");
  for (const permissions of [workflow.permissions, ...Object.values(workflow.jobs).map((job) => job.permissions)]) {
    if (permissions === undefined) continue;
    expect(typeof permissions).toBe("object");
    expect(permissions).not.toHaveProperty("*");
    expect(Object.values(permissions)).not.toContain("*");
  }
  for (const job of Object.values(workflow.jobs)) {
    expect(job["runs-on"]).toBe("ubuntu-latest");
    expect(Number.isInteger(job["timeout-minutes"])).toBe(true);
    expect(job["timeout-minutes"]).toBeGreaterThan(0);
    expect(job["timeout-minutes"]).toBeLessThanOrEqual(15);
    for (const step of job.steps) {
      if (step.uses) expect(step.uses).toMatch(/^[\w-]+\/[\w-]+@[a-f0-9]{40}$/);
      if (step.uses?.startsWith("actions/checkout@")) {
        expect(step.uses).toBe(CHECKOUT);
        expect(step.with?.["persist-credentials"]).toBe(false);
      }
      if (step.uses?.startsWith("actions/setup-node@")) {
        expect(step.uses).toBe(SETUP_NODE); // reviewed v4, not a mutable tag or unreviewed major
        expect(step.with?.["node-version-file"]).toBe(".nvmrc");
        expect(step.with).not.toHaveProperty("node-version");
      }
      expect(step.with?.["persist-credentials"]).not.toBe(true);
    }
  }
}

function assertReadOnlyJob(job: Job) {
  expect(JSON.stringify(job)).not.toMatch(/\bsecrets\s*(?:\.|\[)/i);
  expect(job.steps.some((step) => step.uses === CHECKOUT)).toBe(true);
  expect(job.steps.some((step) => step.uses === SETUP_NODE)).toBe(true);
  expect(job.steps.map((step) => step.uses ?? "").filter(Boolean)).not.toContain(DEPLOY_PAGES);
  for (const step of job.steps) {
    expect(step.run ?? "").not.toMatch(/\b(?:deploy|publish)\b|\bgh\s+api\b/i);
  }
}

function assertValidationPolicy(workflow: Workflow) {
  assertCommonPolicy(workflow);
  expect(workflow.on).toEqual({ pull_request: null, push: { branches: ["main"] } });
  expect(workflow.permissions).toEqual({ contents: "read" });
  expect(workflow.concurrency).toEqual({ group: "validate-${{ github.ref }}", "cancel-in-progress": true });
  expect(Object.keys(workflow.jobs)).toEqual(["validate"]);
  const job = workflow.jobs.validate;
  expect(job.permissions ?? workflow.permissions).toEqual({ contents: "read" });
  assertReadOnlyJob(job);
  expect(job.steps).toEqual([
    { uses: CHECKOUT, with: { "persist-credentials": false } },
    { uses: SETUP_NODE, with: { "node-version-file": ".nvmrc", cache: "npm" } },
    { run: "npm ci" },
    { run: "npx playwright install --with-deps chromium" },
    { run: "npm run verify" }
  ]);
}

function assertPagesPolicy(workflow: Workflow) {
  assertCommonPolicy(workflow);
  expect(workflow.on).toEqual({ push: { branches: ["main"] }, workflow_dispatch: null });
  expect(workflow.permissions).toEqual({});
  expect(workflow.concurrency).toEqual({ group: "pages", "cancel-in-progress": false });
  expect(Object.keys(workflow.jobs)).toEqual(["build", "deploy", "smoke"]);
  const { build, deploy, smoke } = workflow.jobs;
  expect(build.permissions).toEqual({ contents: "read" });
  expect(build.needs).toBeUndefined();
  assertReadOnlyJob(build);
  expect(build.steps).toEqual([
    { uses: CHECKOUT, with: { "persist-credentials": false } },
    { uses: SETUP_NODE, with: { "node-version-file": ".nvmrc", cache: "npm" } },
    { run: "npm ci" },
    { run: "npx playwright install --with-deps chromium" },
    { run: "npm run verify" },
    { uses: CONFIGURE_PAGES }, // default enablement=false; no repository settings mutation
    { uses: UPLOAD_PAGES, with: { path: "dist/" } }
  ]);
  expect(deploy).not.toHaveProperty("if");
  expect(build).not.toHaveProperty("continue-on-error");
  expect(deploy.needs).toBe("build");
  expect(deploy.permissions).toEqual({ pages: "write", "id-token": "write" });
  expect(deploy.environment).toEqual({ name: "github-pages", url: "${{ steps.deployment.outputs.page_url }}" });
  expect(deploy.outputs).toEqual({ page_url: "${{ steps.deployment.outputs.page_url }}" });
  // A privileged job consumes only the validated artifact; no repository code runs here.
  expect(deploy.steps).toEqual([{ id: "deployment", uses: DEPLOY_PAGES }]);
  expect(smoke.needs).toBe("deploy");
  expect(smoke.permissions).toEqual({ contents: "read" });
  assertReadOnlyJob(smoke);
  expect(smoke.steps).toEqual([
    { uses: CHECKOUT, with: { "persist-credentials": false } },
    { uses: SETUP_NODE, with: { "node-version-file": ".nvmrc", cache: "npm" } },
    { run: "npm ci" },
    { run: "npx playwright install --with-deps chromium" },
    {
      run: "npx playwright test e2e/smoke.spec.ts --project=desktop-chromium",
      env: { PLAYWRIGHT_BASE_URL: "${{ needs.deploy.outputs.page_url }}" }
    }
  ]);
}

function assertSourceCheckPolicy(workflow: Workflow) {
  assertCommonPolicy(workflow);
  expect(workflow.permissions).toEqual({ contents: "read" });
  for (const job of Object.values(workflow.jobs)) {
    expect(job.permissions ?? workflow.permissions).toEqual({ contents: "read" });
    expect(job.environment).toBeUndefined();
    assertReadOnlyJob(job);
    for (const step of job.steps) expect(step.uses ?? "").not.toMatch(/pages/i);
  }
}

describe("workflow trust boundaries", () => {
  it("validates untrusted pull requests without write credentials or deployment", () => {
    assertValidationPolicy(readWorkflow("validate"));
  });
  it("publishes only main through an isolated one-action privileged job, then reads the deployed site", () => {
    assertPagesPolicy(readWorkflow("pages"));
  });
  it("keeps source availability checking read-only and separate from deployment", () => {
    assertSourceCheckPolicy(readWorkflow("source-check"));
  });
});

// Mutate parsed real workflows to prove the policy assertions reject security regressions.
describe("unsafe workflow regressions", () => {
  it.each<[string, (workflow: Workflow) => void]>([
    ["pull_request_target", (workflow) => { workflow.on.pull_request_target = null; }],
    ["validation write access", (workflow) => { workflow.permissions.contents = "write"; }],
    ["job permission escalation", (workflow) => { workflow.jobs.validate.permissions = { contents: "write" }; }],
    ["wildcard permissions", (workflow) => { workflow.permissions["*"] = "write"; }],
    ["mutable Action tag", (workflow) => { workflow.jobs.validate.steps[0].uses = "actions/checkout@v7"; }],
    ["unreviewed setup-node major", (workflow) => { workflow.jobs.validate.steps[1].uses = "actions/setup-node@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; }],
    ["persisted checkout credentials", (workflow) => { workflow.jobs.validate.steps[0].with!["persist-credentials"] = true; }],
    ["secret in a validation step", (workflow) => { workflow.jobs.validate.steps[2].env = { TOKEN: "${{ secrets.TOKEN }}" }; }],
    ["missing timeout", (workflow) => { delete (workflow.jobs.validate as Partial<Job>)["timeout-minutes"]; }],
    ["deployment from validation", (workflow) => { workflow.jobs.validate.steps.push({ run: "npm run deploy" }); }]
  ])("rejects %s", (_name, mutate) => {
    const workflow = readWorkflow("validate");
    mutate(workflow);
    expect(() => assertValidationPolicy(workflow)).toThrow();
  });

  it.each<[string, (workflow: Workflow) => void]>([
    ["Pages push from any branch", (workflow) => { workflow.on.push = {}; }],
    ["PR deployment", (workflow) => { workflow.on.pull_request = null; }],
    ["build write access", (workflow) => { workflow.jobs.build.permissions!.pages = "write"; }],
    ["secret in build code", (workflow) => { workflow.jobs.build.steps[2].run = "echo ${{ secrets['TOKEN'] }}"; }],
    ["deployment from build", (workflow) => { workflow.jobs.build.steps.push({ uses: DEPLOY_PAGES }); }],
    ["upload of repository source", (workflow) => { workflow.jobs.build.steps.find((step) => step.uses === UPLOAD_PAGES)!.with!.path = "."; }],
    ["Pages settings enablement", (workflow) => { workflow.jobs.build.steps.find((step) => step.uses === CONFIGURE_PAGES)!.with = { enablement: true }; }],
    ["checkout in privileged deploy", (workflow) => { workflow.jobs.deploy.steps.unshift({ uses: CHECKOUT, with: { "persist-credentials": false } }); }],
    ["shell code in privileged deploy", (workflow) => { workflow.jobs.deploy.steps.push({ run: "npm run deploy" }); }],
    ["extra privileged deploy permissions", (workflow) => { workflow.jobs.deploy.permissions!.contents = "read"; }],
    ["build missing browser installation", (workflow) => { workflow.jobs.build.steps = workflow.jobs.build.steps.filter((step) => step.run !== "npx playwright install --with-deps chromium"); }],
    ["build missing full verification", (workflow) => { workflow.jobs.build.steps = workflow.jobs.build.steps.filter((step) => step.run !== "npm run verify"); }],
    ["build using only static validation", (workflow) => { workflow.jobs.build.steps.find((step) => step.run === "npm run verify")!.run = "npm run check && npm test && npm run build"; }],
    ["verification after artifact upload", (workflow) => { const index = workflow.jobs.build.steps.findIndex((step) => step.run === "npm run verify"); const [verify] = workflow.jobs.build.steps.splice(index, 1); workflow.jobs.build.steps.push(verify); }],
    ["browser installation after verification", (workflow) => { const index = workflow.jobs.build.steps.findIndex((step) => step.run === "npx playwright install --with-deps chromium"); const [install] = workflow.jobs.build.steps.splice(index, 1); workflow.jobs.build.steps.push(install); }],
    ["verification failure ignored", (workflow) => { Object.assign(workflow.jobs.build.steps.find((step) => step.run === "npm run verify")!, { "continue-on-error": true }); }],
    ["deploy runs after failed build", (workflow) => { Object.assign(workflow.jobs.deploy, { if: "always()" }); }],
    ["deploy without validated build", (workflow) => { delete workflow.jobs.deploy.needs; }],
    ["privileged smoke", (workflow) => { workflow.jobs.smoke.permissions!["id-token"] = "write"; }],
    ["smoke pointed at a hardcoded host", (workflow) => { workflow.jobs.smoke.steps[4].env!.PLAYWRIGHT_BASE_URL = "https://example.com/"; }],
    ["smoke running the full suite", (workflow) => { workflow.jobs.smoke.steps[4].run = "npx playwright test"; }]
  ])("rejects %s", (_name, mutate) => {
    const workflow = readWorkflow("pages");
    // Supply the intended gate before each single mutation, including on the old RED workflow.
    workflow.jobs.build.steps = [
      { uses: CHECKOUT, with: { "persist-credentials": false } },
      { uses: SETUP_NODE, with: { "node-version-file": ".nvmrc", cache: "npm" } },
      { run: "npm ci" },
      { run: "npx playwright install --with-deps chromium" },
      { run: "npm run verify" },
      { uses: CONFIGURE_PAGES },
      { uses: UPLOAD_PAGES, with: { path: "dist/" } }
    ];
    assertPagesPolicy(workflow);
    mutate(workflow);
    expect(() => assertPagesPolicy(workflow)).toThrow();
  });

  it.each<[string, (workflow: Workflow) => void]>([
    ["deploy Action in source checking", (workflow) => { workflow.jobs["check-sources"].steps.push({ uses: DEPLOY_PAGES }); }],
    ["deploy command in source checking", (workflow) => { workflow.jobs["check-sources"].steps.push({ run: "npm run deploy" }); }],
    ["deployment credentials in source checking", (workflow) => { workflow.jobs["check-sources"].permissions = { pages: "write", "id-token": "write" }; }]
  ])("rejects %s", (_name, mutate) => {
    const workflow = readWorkflow("source-check");
    mutate(workflow);
    expect(() => assertSourceCheckPolicy(workflow)).toThrow();
  });
});
