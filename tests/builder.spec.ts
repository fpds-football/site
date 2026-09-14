import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validate } from "@fpds-football/fpds";
import { expect, type Page, test } from "@playwright/test";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

async function section(page: Page, name: string) {
  await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: new RegExp(`^${name},`) }).click();
  await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
}

/** Chooses an option in a Kumo Select. The trigger is a combobox button with the field label as its name. */
async function choose(page: Page, label: string, option: string | RegExp) {
  await selectTrigger(page, label).click();
  await page.getByRole("option", { name: option }).click();
}

function selectTrigger(page: Page, label: string) {
  return page.getByRole("combobox", { name: label, exact: true });
}

/** Searches a Kumo Combobox for a country and chooses it. */
async function chooseCountry(page: Page, label: string, search: string, option: RegExp) {
  // A Combobox takes its name from the field label, which includes the "Required" badge.
  await page.getByRole("combobox", { name: new RegExp(`^${label}\\b`) }).fill(search);
  await page.getByRole("option", { name: option }).click();
}

async function clearEverything(page: Page) {
  await page.getByRole("button", { name: "Clear everything" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Clear everything" }).click();
}

/** A free agent who sends their own profile: the smallest valid submission. */
async function fillFreeAgent(page: Page) {
  await section(page, "Submission");
  await page.getByRole("checkbox", { name: "Permanent transfer" }).check();
  await page.getByRole("checkbox", { name: "Trial" }).check();
  await choose(page, "Who sends this submission?", "The player");

  await section(page, "Player");
  await page.getByLabel("Full name").fill("Daniel Okoye");
  await page.getByLabel("Date of birth").fill("1997-11-02");
  await chooseCountry(page, "Nationalities", "Nigeria", /Nigeria \(NGA\)/);
  await chooseCountry(page, "Nationalities", "United Kingdom", /United Kingdom \(GBR\)/);

  await section(page, "Positions");
  await choose(page, "Primary position", /^CB:/);

  await section(page, "Contract");
  await choose(page, "Contract status", /^Free agent/);

  await section(page, "Consent");
  await choose(page, "Lawful basis for sharing this data", /^Consent$/);
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

test("a video link goes into the export, and a link that is not https shows the problem", async ({ page }) => {
  await fillFreeAgent(page);

  await section(page, "Video");
  await page.getByRole("button", { name: "Add a video" }).click();
  await choose(page, "Type of video", /^Full match$/);
  await page.getByLabel("Link").fill("http://video.example/okoye-v-leeds");
  await expect(page.locator('[data-field="/media/0/url"]')).toContainText("starts with https://");

  await page.getByLabel("Link").fill("https://video.example/okoye-v-leeds");
  await expect(page.locator('[data-field="/media/0/url"]')).not.toContainText("wrong format");

  const { document } = await exportDocument(page);
  expect(validate(document).issues).toEqual([]);
  expect(document.media).toEqual([{ type: "video", video_type: "full_match", url: "https://video.example/okoye-v-leeds" }]);
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
  await choose(page, "Who sends this submission?", "The player");
  await section(page, "Player");
  await page.getByLabel("Date of birth").fill("2010-03-08");

  await expect(page.getByTestId("minor-notice")).toBeVisible();
  await section(page, "Submission");
  const conflict = page.getByRole("alert").filter({ hasText: "A minor cannot send their own submission." });
  await expect(conflict).toBeVisible();

  // The builder does not change the sender without the user.
  await expect(selectTrigger(page, "Who sends this submission?")).toContainText("The player");
  await conflict.getByRole("button", { name: "Change the sender to intermediary" }).click();
  await expect(selectTrigger(page, "Who sends this submission?")).toContainText("An intermediary");

  await section(page, "Representation");
  await expect(page.getByLabel("Agent name")).toBeVisible();
  await expect(page.locator('[data-field="/representation/agent_name"]')).toHaveAttribute("data-state", "required");
});

test("a contract status hides fields that do not apply, and keeps their values out of the export", async ({ page }) => {
  await section(page, "Contract");
  await choose(page, "Contract status", /^Under contract/);
  await page.getByLabel("Contract expiry date").fill("2027-06-30");

  await choose(page, "Contract status", /^Free agent/);
  const expiry = page.locator('[data-field="/contract/expiry_date"]');
  await expect(expiry).toHaveAttribute("data-state", "not_applicable");
  await expect(expiry).toContainText("The builder keeps your value, but the export does not include it.");
  await expect(page.getByTestId("omitted")).toContainText("Contract expiry date");

  await choose(page, "Contract status", /^Under contract/);
  await expect(page.getByLabel("Contract expiry date")).toHaveValue("2027-06-30");
});

test("information only disables the other purposes", async ({ page }) => {
  await page.getByRole("checkbox", { name: "Information only" }).check();
  await expect(page.getByRole("checkbox", { name: "Loan" })).toBeDisabled();
  await page.getByRole("checkbox", { name: "Information only" }).uncheck();
  await page.getByRole("checkbox", { name: "Loan" }).check();
  await expect(page.getByRole("checkbox", { name: "Information only" })).toBeDisabled();
});

test("work survives a reload in the same tab, and Clear everything removes it", async ({ page }) => {
  await section(page, "Player");
  await page.getByLabel("Full name").fill("Liam Grealy");
  await page.reload();
  await section(page, "Player");
  await expect(page.getByLabel("Full name")).toHaveValue("Liam Grealy");

  await clearEverything(page);
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

  await clearEverything(page);
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

test("every form control has text of 16px or more, so iOS Safari does not zoom on focus", async ({ page }) => {
  // Make the conditional controls visible: source selectors, a season record and the agent fields.
  await choose(page, "Who sends this submission?", "An intermediary, for example an agent");
  await section(page, "Player");
  await page.getByLabel("Full name").fill("Daniel Okoye");
  await page.getByRole("button", { name: /^Source:/ }).first().click();
  await page.getByRole("menuitemradio", { name: "Verified" }).click();
  await expect(page.getByLabel("Verified against")).toBeVisible();
  await section(page, "Performance");
  await page.getByRole("button", { name: "Add a season" }).click();

  for (const name of ["Submission", "Player", "Positions", "Contract", "Representation", "Performance", "Consent"]) {
    await section(page, name);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("input:not([type=checkbox]):not([type=file]), select, textarea")]
        .filter((element) => (element as HTMLElement).offsetParent !== null)
        .map((element) => ({ label: element.getAttribute("aria-label") ?? element.id, size: Number.parseFloat(getComputedStyle(element).fontSize) }))
        .filter((control) => control.size < 16),
    );
    expect(small, name).toEqual([]);
  }
});

test("the country search finds the football nations of the United Kingdom", async ({ page }) => {
  await section(page, "Player");
  await chooseCountry(page, "Nationalities", "Scot", /Scotland \(SCO\)/);
  await expect(page.getByRole("list", { name: "Selected nationalities" })).toContainText("Scotland");
  // The search box is empty again, ready for the next country.
  await expect(page.getByRole("combobox", { name: /^Nationalities\b/ })).toHaveValue("");
});

test("the source of a value appears in its own label row, and a verified source asks what it was checked against", async ({ page }) => {
  await section(page, "Player");
  await page.getByLabel("Full name").fill("Daniel Okoye");

  const field = page.locator('[data-field="/player/full_name"]');
  const sourceButton = field.getByRole("button", { name: /^Source: Stated by agent/ });
  await expect(sourceButton).toBeVisible();

  // The source control shares a row with the label of its own field.
  const [labelBox, sourceBox] = await Promise.all([field.locator("label").first().boundingBox(), sourceButton.boundingBox()]);
  expect(Math.abs((labelBox?.y ?? 0) + (labelBox?.height ?? 0) / 2 - ((sourceBox?.y ?? 0) + (sourceBox?.height ?? 0) / 2))).toBeLessThan(8);

  await sourceButton.click();
  await page.getByRole("menuitemradio", { name: "Verified" }).click();
  await expect(field.getByRole("button", { name: /^Source: Verified/ })).toBeVisible();
  await expect(field.getByLabel("Verified against")).toBeVisible();
});

test("opening selects, menus, the country search and the dialog causes no Content Security Policy violation", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) violations.push(message.text());
  });

  await choose(page, "Who sends this submission?", "The player");
  await section(page, "Player");
  await page.getByLabel("Full name").fill("Daniel Okoye");
  await page.getByRole("button", { name: /^Source:/ }).first().click();
  await page.getByRole("menuitemradio", { name: "Data provider" }).click();
  await chooseCountry(page, "Nationalities", "Nigeria", /Nigeria \(NGA\)/);
  await page.getByRole("button", { name: "Clear everything" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();

  expect(violations).toEqual([]);
});
