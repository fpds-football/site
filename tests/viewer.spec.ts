import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validate } from "@fpds-football/fpds";
import { expect, type Page, test } from "@playwright/test";

const fixture = (name: string) => readFileSync(join(import.meta.dirname, "fixtures", name));

async function openFile(page: Page, name: string, buffer = fixture(name)) {
  await page.getByTestId("open-file").setInputFiles({ name, mimeType: "application/json", buffer });
}

/** The source badges in the row of a term in the submission card. */
function row(page: Page, term: string) {
  return page.getByRole("article", { name: "Submission preview" }).locator("dl > div").filter({ has: page.getByRole("term").filter({ hasText: new RegExp(`^${term}$`) }) });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/view/");
  await expect(page.getByTestId("drop-zone")).toBeVisible();
  await expect(page.getByText("This file never leaves your browser.")).toBeVisible();
});

test("a valid file renders with no banner, and its source badges match its provenance", async ({ page }) => {
  await openFile(page, "midfielder-under-contract.fpds.json");
  const card = page.getByRole("article", { name: "Submission preview" });

  await expect(card).toContainText("Tomasz Andrzej Wojcik");
  await expect(page.getByTestId("invalid-banner")).toHaveCount(0);
  await expect(page.getByTestId("warnings")).toHaveCount(0);
  await expect(page.getByText("The viewer found no problems in the structure of this file.")).toBeVisible();
  await expect(page.getByTestId("minor-badge")).toHaveCount(0);
  await expect(page.getByTestId("structure-note")).toHaveText("FPDS checks the structure of this file. It does not check that the information is true.");
  await expect(page.getByText(/Verified by FPDS/i)).toHaveCount(0);

  // Provenance entries: expiry date verified against FIFA TMS, minutes and goals of the first season from Wyscout.
  await expect(row(page, "Contract expires")).toContainText("Verified · FIFA TMS");
  // A value without an entry has the sender as its source (§11.1).
  await expect(row(page, "Date of birth")).toContainText("Stated by agent");
  await expect(row(page, "Representation")).toContainText("Stated by agent");

  const seasons = card.getByRole("region", { name: "Performance" }).getByRole("listitem").filter({ hasText: "Ekstraklasa" });
  const first = seasons.filter({ hasText: "2025/26" });
  await expect(first.getByRole("list", { name: "Other sources" })).toContainText("Mins, GoalsData provider · Wyscout");
  // The other values of the season have the sender as their source, in one badge next to the season.
  await expect(first.getByRole("list", { name: "Other sources" })).not.toContainText("Stated by agent");
  await expect(first).toContainText("Stated by agent");
  // The second season has no entries, so one badge shows the sender.
  const second = seasons.filter({ hasText: "2024/25" });
  await expect(second.getByRole("list", { name: "Other sources" })).toHaveCount(0);
  await expect(second).toContainText("Stated by agent");

  await expect(card.getByRole("region", { name: "About this file" })).toContainText("b7f3c2e1-4a9d-4f11-9c3e-2a1d5f8b0c44");
});

test("video links open in a new tab only when the reader selects them", async ({ page }) => {
  await openFile(page, "midfielder-under-contract.fpds.json");
  const video = page.getByRole("article", { name: "Submission preview" }).getByRole("region", { name: "Video" });

  const items = video.getByRole("listitem");
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText("Highlights");
  await expect(items.nth(1)).toContainText("Full match");
  await expect(items.nth(0)).toContainText("Stated by agent");

  const link = video.getByRole("link", { name: "https://video.example/wojcik-highlights-2025-26" });
  await expect(link).toHaveAttribute("href", "https://video.example/wojcik-highlights-2025-26");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
});

test("a media URL that is not https is not a link, and shows the problem", async ({ page }) => {
  const document = JSON.parse(fixture("midfielder-under-contract.fpds.json").toString());
  document.media[0].url = "javascript:alert(1)";
  await openFile(page, "script-link.fpds.json", Buffer.from(JSON.stringify(document)));

  const first = page.getByRole("region", { name: "Video" }).getByRole("listitem").first();
  await expect(first).toContainText("javascript:alert(1)");
  await expect(first.getByRole("link")).toHaveCount(0);
  await expect(first.getByTestId("issue-notes")).toContainText("Media link 1: URL has the wrong format.");
});

test("a dropped file opens", async ({ page }) => {
  const contents = fixture("free-agent-minimal.fpds.json").toString();
  const dataTransfer = await page.evaluateHandle((text) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([text], "free-agent.fpds.json", { type: "application/json" }));
    return transfer;
  }, contents);
  await page.dispatchEvent("[data-testid=drop-zone]", "dragenter", { dataTransfer });
  await expect(page.getByTestId("drop-zone")).toHaveAttribute("data-dragging", "true");
  await page.dispatchEvent("[data-testid=drop-zone]", "drop", { dataTransfer });

  await expect(page.getByTestId("file-name")).toHaveText("free-agent.fpds.json");
  await expect(page.getByRole("article", { name: "Submission preview" })).toBeVisible();
});

test("an invalid file shows the submission under a red banner, with the problem in plain English", async ({ page }) => {
  await openFile(page, "invalid-missing-expiry.fpds.json");
  const banner = page.getByTestId("invalid-banner");
  await expect(banner).toContainText("Not a valid FPDS submission");
  await expect(banner).toContainText("Contract expiry date is required when the player is under contract or on loan.");
  await expect(page.getByRole("article", { name: "Submission preview" })).toContainText("Tomasz Andrzej Wojcik");
  await expect(page.getByTestId("structure-note")).toBeVisible();
  await expect(page.getByText("The viewer found no problems")).toHaveCount(0);

  // The missing value has a row, with the problem next to it.
  const expiry = row(page, "Contract expires");
  await expect(expiry).toContainText("Not in the file");
  await expect(expiry.getByTestId("issue-notes")).toContainText("Contract expiry date is required");

  // The problem in the banner is a link to that row.
  await banner.getByRole("button", { name: /Contract expiry date is required/ }).click();
  await expect(expiry).toBeFocused();
  await expect(expiry).toBeInViewport();
});

test("a minor status that does not agree with the date of birth shows the calculated status and age", async ({ page }) => {
  await openFile(page, "minor-mismatch.fpds.json");
  const message = "This file says that the player is not a minor. From the date of birth, the player was 16 on the date of the submission.";
  await expect(page.getByTestId("invalid-banner")).toContainText(message);
  // Safeguarding wins over the file: the badge shows, with the calculated status next to it.
  await expect(page.getByTestId("minor-badge")).toBeVisible();
  await expect(page.getByTestId("minor-note")).toHaveText("The file says: not a minor. The date of birth says: a minor, age 16 on the date of the submission.");
});

test("a valid file about a minor shows the minor badge", async ({ page }) => {
  await openFile(page, "academy-prospect-minor.fpds.json");
  await expect(page.getByTestId("minor-badge")).toBeVisible();
  await expect(page.getByTestId("minor-note")).toHaveCount(0);
  await expect(page.getByTestId("invalid-banner")).toHaveCount(0);
});

test("an unsupported version is refused and the fields do not show", async ({ page }) => {
  await openFile(page, "unsupported-version.fpds.json");
  const refusal = page.getByTestId("refusal");
  await expect(refusal).toContainText("This viewer cannot show this file.");
  await expect(refusal).toContainText("This document has version 0.2.0. This software supports FPDS 0.1.");
  await expect(page.getByRole("article", { name: "Submission preview" })).toHaveCount(0);
  await expect(page.getByText("Tomasz")).toHaveCount(0);
});

test("a draft file is refused, and Open in builder continues the draft", async ({ page }) => {
  const draft = { fpds_draft: { format: 1, saved_at: "2026-09-14T10:00:00.000Z" }, draft: { player: { full_name: "Mateo Silva Ferreira" } } };
  await openFile(page, "mateo.fpds-draft.json", Buffer.from(JSON.stringify(draft)));

  await expect(page.getByTestId("refusal")).toContainText("This is a draft from the builder, not a submission.");
  await expect(page.getByRole("article", { name: "Submission preview" })).toHaveCount(0);

  await page.getByRole("button", { name: "Open in builder" }).click();
  await expect(page).toHaveURL(/\/build\/$/);
  await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: /^Player,/ }).click();
  await expect(page.getByLabel("Full name")).toHaveValue("Mateo Silva Ferreira");
});

test("a file that is not JSON is refused", async ({ page }) => {
  await openFile(page, "notes.fpds.json", Buffer.from("Good lad, 10 goals, plays centre mid."));
  await expect(page.getByTestId("refusal")).toContainText("This file is not JSON.");
  await expect(page.getByRole("article", { name: "Submission preview" })).toHaveCount(0);
});

test("JSON that is not an FPDS document is refused", async ({ page }) => {
  await openFile(page, "package.json", Buffer.from(JSON.stringify({ name: "something-else" })));
  await expect(page.getByTestId("refusal")).toContainText("This file is not an FPDS document.");
});

test("extensions appear in a closed section by prefix, and a possible medical extension gives a warning only", async ({ page }) => {
  await openFile(page, "with-extensions.fpds.json");
  await expect(page.getByTestId("invalid-banner")).toHaveCount(0);
  await expect(page.getByTestId("warnings")).toContainText("Extension uk.co.example/injury_history can contain medical information.");

  const extensions = page.getByTestId("extensions");
  await expect(extensions).not.toHaveAttribute("open");
  // The closed section says that it contains a warning.
  await expect(extensions.locator("summary")).toContainText("1 warning");
  await expect(extensions.getByText("B+")).toBeHidden();
  await extensions.getByText("Extra information from other software").click();
  await expect(extensions.getByRole("region", { name: "com.example" })).toContainText("scouting_grade");
  await expect(extensions.getByRole("region", { name: "com.example" })).toContainText("B+");
  await expect(extensions.getByRole("region", { name: "uk.co.example" })).toContainText('"gbe_points": 15');
  // No source marks inside the section.
  await expect(extensions.getByText(/Stated by|Verified|Data provider/)).toHaveCount(0);
  // The warning shows next to the extension that it is about.
  await expect(extensions.locator('[data-anchor="/extensions/uk.co.example~1injury_history"]')).toContainText("can contain medical information");
});

test("the link on a warning opens the closed extensions section at that extension", async ({ page }) => {
  await openFile(page, "with-extensions.fpds.json");
  await page.getByTestId("warnings").getByRole("button", { name: /injury_history/ }).click();
  await expect(page.getByTestId("extensions")).toHaveAttribute("open");
  await expect(page.locator('[data-anchor="/extensions/uk.co.example~1injury_history"]')).toBeFocused();
});

test("the example opens without a file", async ({ page }) => {
  await page.getByRole("button", { name: "Open an example" }).click();
  await expect(page.getByTestId("file-name")).toHaveText("example-tomasz-wojcik.fpds.json");
  await expect(page.getByTestId("invalid-banner")).toHaveCount(0);
  await expect(row(page, "Contract expires")).toContainText("Verified · FIFA TMS");
});

test("each refusal names the file", async ({ page }) => {
  await openFile(page, "notes.txt", Buffer.from("not json"));
  await expect(page.getByTestId("refused-file")).toHaveText("notes.txt");
  await openFile(page, "unsupported-version.fpds.json");
  await expect(page.getByTestId("refused-file")).toHaveText("unsupported-version.fpds.json");
});

test("the minor badge does not look like a source badge", async ({ page }) => {
  await openFile(page, "academy-prospect-minor.fpds.json");
  const background = (locator: ReturnType<Page["locator"]>) => locator.evaluate((element) => getComputedStyle(element).backgroundColor);
  const minor = await background(page.getByTestId("minor-badge").locator(":scope > *"));
  const stated = await background(row(page, "Nationalities").getByText(/^Stated by/));
  expect(minor).not.toBe(stated);
});

test("the toolbar buttons fit on one line, also on a phone", async ({ page }) => {
  await openFile(page, "midfielder-under-contract.fpds.json");
  const toolbar = page.getByTestId("toolbar");
  expect((await toolbar.boundingBox())?.height ?? 0).toBeLessThan(48);
  // The full label stays the accessible name when a phone shows a short label.
  await expect(toolbar.getByRole("button", { name: "Print or save as PDF" })).toBeVisible();
});

test("Edit in builder opens the document in the builder, and the export has a new submission ID", async ({ page }) => {
  const original = JSON.parse(fixture("midfielder-under-contract.fpds.json").toString());
  await openFile(page, "midfielder-under-contract.fpds.json");
  await page.getByRole("button", { name: "Edit in builder" }).click();

  await expect(page).toHaveURL(/\/build\/$/);
  await expect(page.getByText("The file is valid against FPDS 0.1.")).toBeVisible();
  const draft = await page.evaluate(() => JSON.parse(sessionStorage.getItem("fpds-builder-draft") ?? "{}"));
  expect(draft.fpds_version).toBeUndefined();
  expect(draft.submission.submission_id).toBeUndefined();
  expect(draft.submission.submitted_at).toBeUndefined();
  expect(draft.consent.is_minor).toBeUndefined();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export submission" }).click();
  const exported = JSON.parse(readFileSync(await (await download).path(), "utf8"));
  expect(validate(exported).valid).toBe(true);
  expect(exported.submission.submission_id).not.toBe(original.submission.submission_id);
  expect(exported.player).toEqual(original.player);
});

test("Edit in builder asks before it replaces unfinished work in the builder", async ({ page }) => {
  await page.evaluate(() => sessionStorage.setItem("fpds-builder-draft", JSON.stringify({ player: { full_name: "Daniel Okoye" } })));
  await openFile(page, "midfielder-under-contract.fpds.json");
  await page.getByRole("button", { name: "Edit in builder" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Replace the work in the builder?");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page).toHaveURL(/\/view\/$/);
  expect(await page.evaluate(() => sessionStorage.getItem("fpds-builder-draft"))).toContain("Daniel Okoye");

  await page.getByRole("button", { name: "Edit in builder" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Replace and open the builder" }).click();
  await expect(page).toHaveURL(/\/build\/$/);
  expect(await page.evaluate(() => sessionStorage.getItem("fpds-builder-draft"))).toContain("Tomasz Andrzej Wojcik");
});

test("opening a file sends no request that is not a static file from this site", async ({ page, baseURL }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(`${request.method()} ${request.url()}`));

  for (const name of ["midfielder-under-contract.fpds.json", "invalid-missing-expiry.fpds.json", "with-extensions.fpds.json", "unsupported-version.fpds.json"]) {
    await openFile(page, name);
    await expect(page.getByTestId("file-name").or(page.getByTestId("refusal"))).toBeVisible();
  }

  const unexpected = requests.filter(
    (request) => !request.startsWith(`GET ${baseURL}/`) && !request.startsWith("GET blob:") && !request.startsWith("GET data:"),
  );
  expect(unexpected).toEqual([]);
  expect(requests.some((request) => /wojcik|widzew|b7f3c2e1/i.test(request))).toBe(false);
});

test("using the viewer causes no Content Security Policy violation", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) violations.push(message.text());
  });

  await openFile(page, "not-json.txt", Buffer.from("not json"));
  await expect(page.getByTestId("refusal")).toBeVisible();
  await openFile(page, "with-extensions.fpds.json");
  await page.getByText("Extra information from other software").click();
  await page.evaluate(() => sessionStorage.setItem("fpds-builder-draft", JSON.stringify({ player: { full_name: "Daniel Okoye" } })));
  await page.getByRole("button", { name: "Edit in builder" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await page.emulateMedia({ media: "print" });
  await page.emulateMedia({ media: "screen" });

  expect(violations).toEqual([]);
});

test("a value in the submission card is never narrower than its source badge", async ({ page }) => {
  await openFile(page, "midfielder-under-contract.fpds.json");
  const value = row(page, "Contract expires").getByText("30 June 2027");
  const box = await value.boundingBox();
  // "30 June 2027" on one line. In a squeezed column it wraps to one character on each line.
  expect(box?.height ?? 0).toBeLessThan(32);
});

test("a long submission does not scroll sideways on a small screen", async ({ page }) => {
  await openFile(page, "with-extensions.fpds.json");
  await page.getByText("Extra information from other software").click();
  await openFile(page, "invalid-missing-expiry.fpds.json");
  await expect(page.getByTestId("invalid-banner")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("print hides the controls and keeps the banner, the note and the source badges", async ({ page }) => {
  await openFile(page, "invalid-missing-expiry.fpds.json");
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Edit in builder" })).toBeHidden();
  await expect(page.getByRole("banner")).toBeHidden();
  await expect(page.getByTestId("invalid-banner")).toBeVisible();
  await expect(page.getByTestId("structure-note")).toBeVisible();
  await expect(row(page, "Date of birth")).toContainText("Stated by agent");
  const adjust = await page.evaluate(() => getComputedStyle(document.body).printColorAdjust);
  expect(adjust).toBe("exact");
});
