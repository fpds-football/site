import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validate } from "@fpds-football/fpds";
import { expect, type Page, test } from "@playwright/test";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

async function section(page: Page, name: string) {
  await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: new RegExp(`^${name},`) }).click();
  await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
}

/** A free agent who sends their own profile: the smallest valid submission. */
async function fillFreeAgent(page: Page) {
  await section(page, "Submission");
  await page.getByLabel("Permanent transfer").check();
  await page.getByLabel("Trial").check();
  await page.getByLabel("Who sends this submission?").selectOption({ label: "The player" });

  await section(page, "Player");
  await page.getByLabel("Full name").fill("Daniel Okoye");
  await page.getByLabel("Date of birth").fill("1997-11-02");
  await page.getByLabel("Nationalities").selectOption("NGA");
  await page.getByLabel("Nationalities").selectOption("GBR");

  await section(page, "Positions");
  await page.getByLabel("Primary position").selectOption("CB");

  await section(page, "Contract");
  await page.getByLabel("Contract status").selectOption("free_agent");

  await section(page, "Consent");
  await page.getByLabel("Lawful basis for sharing this data").selectOption("consent");
  await page.getByLabel("Consent date").fill("2026-09-01");
}

async function exportDocument(page: Page) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export submission" }).click();
  const file = await download;
  const path = await file.path();
  return { name: file.suggestedFilename(), document: JSON.parse(readFileSync(path, "utf8")) };
}

test.beforeEach(async ({ page }) => {
  await page.goto("/build/");
  await expect(page.getByRole("heading", { level: 2, name: "Submission" })).toBeVisible();
});

test("exports a valid submission that the library accepts", async ({ page }) => {
  await fillFreeAgent(page);
  await expect(page.getByText("The file is valid against FPDS 0.1.")).toBeVisible();

  const { name, document } = await exportDocument(page);

  expect(name).toMatch(/^daniel-okoye-\d{4}-\d{2}-\d{2}\.fpds\.json$/);
  expect(validate(document).issues).toEqual([]);
  expect(document.fpds_version).toBe("0.1.0");
  expect(document.submission.submission_id).toMatch(UUID);
  expect(document.submission.purposes).toEqual(["permanent_transfer", "trial"]);
  expect(document.player.nationalities).toEqual(["NGA", "GBR"]);
  expect(document.player.current_club).toBeUndefined();
  expect(document.consent.is_minor).toBe(false);
  expect(document.representation).toBeUndefined();
});

test("each export of the same draft has a new submission ID", async ({ page }) => {
  await fillFreeAgent(page);
  const first = await exportDocument(page);
  const second = await exportDocument(page);
  expect(first.document.submission.submission_id).not.toBe(second.document.submission.submission_id);
});

test("sends no request that is not a static file from this site", async ({ page, baseURL }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(`${request.method()} ${request.url()}`));

  await fillFreeAgent(page);
  await exportDocument(page);
  await page.getByRole("button", { name: "Save draft" }).click();

  const unexpected = requests.filter(
    (request) => !request.startsWith(`GET ${baseURL}/`) && !request.startsWith("GET blob:") && !request.startsWith("GET data:"),
  );
  expect(unexpected).toEqual([]);
  expect(requests.some((request) => request.toLowerCase().includes("okoye"))).toBe(false);
});

test("export is blocked until the submission is valid, and lists what is missing", async ({ page }) => {
  await page.getByRole("button", { name: "Export submission" }).click();
  await expect(page.getByTestId("export-checklist")).toContainText("Purposes is required.");
  await expect(page.getByTestId("export-checklist")).toContainText("Full name is required.");
});

test("a minor cannot send their own submission, and the fix changes the sender", async ({ page }) => {
  await page.getByLabel("Who sends this submission?").selectOption({ label: "The player" });
  await section(page, "Player");
  await page.getByLabel("Date of birth").fill("2010-03-08");

  await expect(page.getByTestId("minor-notice")).toBeVisible();
  await section(page, "Submission");
  const conflict = page.getByRole("alert").filter({ hasText: "A minor cannot send their own submission." });
  await expect(conflict).toBeVisible();

  // The builder does not change the sender without the user.
  await expect(page.getByLabel("Who sends this submission?")).toHaveValue("player");
  await conflict.getByRole("button", { name: "Change the sender to intermediary" }).click();
  await expect(page.getByLabel("Who sends this submission?")).toHaveValue("intermediary");

  await section(page, "Representation");
  await expect(page.getByLabel("Agent name")).toBeVisible();
  await expect(page.locator('[data-field="/representation/agent_name"]')).toHaveAttribute("data-state", "required");
});

test("a contract status hides fields that do not apply, and keeps their values out of the export", async ({ page }) => {
  await section(page, "Contract");
  await page.getByLabel("Contract status").selectOption("under_contract");
  await page.getByLabel("Contract expiry date").fill("2027-06-30");

  await page.getByLabel("Contract status").selectOption("free_agent");
  const expiry = page.locator('[data-field="/contract/expiry_date"]');
  await expect(expiry).toHaveAttribute("data-state", "not_applicable");
  await expect(expiry).toContainText("The builder keeps your value, but the export does not include it.");
  await expect(page.getByTestId("omitted")).toContainText("Contract expiry date");

  await page.getByLabel("Contract status").selectOption("under_contract");
  await expect(page.getByLabel("Contract expiry date")).toHaveValue("2027-06-30");
});

test("information only disables the other purposes", async ({ page }) => {
  await page.getByLabel("Information only").check();
  await expect(page.getByLabel("Loan")).toBeDisabled();
  await page.getByLabel("Information only").uncheck();
  await page.getByLabel("Loan").check();
  await expect(page.getByLabel("Information only")).toBeDisabled();
});

test("work survives a reload in the same tab, and Clear everything removes it", async ({ page }) => {
  await section(page, "Player");
  await page.getByLabel("Full name").fill("Liam Grealy");
  await page.reload();
  await section(page, "Player");
  await expect(page.getByLabel("Full name")).toHaveValue("Liam Grealy");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear everything" }).click();
  await section(page, "Player");
  await expect(page.getByLabel("Full name")).toHaveValue("");
  await page.reload();
  await section(page, "Player");
  await expect(page.getByLabel("Full name")).toHaveValue("");
});

test("a draft file saves unfinished work and opens again", async ({ page }) => {
  await section(page, "Player");
  await page.getByLabel("Full name").fill("Mateo Silva Ferreira");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save draft" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.fpds-draft\.json$/);
  const contents = readFileSync(await file.path(), "utf8");
  expect(JSON.parse(contents)).toHaveProperty("fpds_draft");
  expect(validate(JSON.parse(contents)).valid).toBe(false);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear everything" }).click();
  await page.getByTestId("open-file").setInputFiles({ name: "draft.fpds-draft.json", mimeType: "application/json", buffer: Buffer.from(contents) });
  await section(page, "Player");
  await expect(page.getByLabel("Full name")).toHaveValue("Mateo Silva Ferreira");
});

test("opening an FPDS document and exporting it gives a new version", async ({ page }) => {
  const example = readFileSync(join(import.meta.dirname, "fixtures/midfielder-under-contract.fpds.json"));
  const original = JSON.parse(example.toString());

  await page.getByTestId("open-file").setInputFiles({ name: "midfielder.fpds.json", mimeType: "application/json", buffer: example });
  await expect(page.getByRole("status").filter({ hasText: "new ID" })).toBeVisible();
  await expect(page.getByText("The file is valid against FPDS 0.1.")).toBeVisible();

  const { document } = await exportDocument(page);
  expect(validate(document).valid).toBe(true);
  expect(document.submission.submission_id).not.toBe(original.submission.submission_id);
  expect(document.player).toEqual(original.player);
  expect(document.provenance).toEqual(original.provenance);
});
