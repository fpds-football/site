import { expect, type Page, test } from "@playwright/test";

const PAGES = [
  { path: "/", heading: "A player submission should say who claimed what." },
  { path: "/consult/", heading: "Help decide what goes into FPDS." },
  { path: "/consult/release-clauses/", heading: "Do release clauses and sell-on percentages belong in a player submission?" },
  { path: "/consult/medical-availability/", heading: "Does a player submission say whether the player is fit to play?" },
  { path: "/consult/wages/", heading: "Does a player submission include information about wages?" },
  { path: "/consult/privacy/", heading: "Privacy notice for consultations" },
];

function collectProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));
  return problems;
}

for (const { path, heading } of PAGES) {
  test(`${path} renders, hydrates and obeys its Content Security Policy`, async ({ page }) => {
    const problems = collectProblems(page);
    const response = await page.goto(path);

    expect(response?.status()).toBe(200);
    expect(response?.headers()["content-security-policy"]).toContain("script-src 'self' 'sha256-");
    expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);

    // TanStack Start removes $_TSR when hydration is complete.
    await expect.poll(() => page.evaluate(() => typeof (window as { $_TSR?: unknown }).$_TSR)).toBe("undefined");
    expect(problems).toEqual([]);
  });

  test(`${path} does not scroll sideways`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("each page has link preview tags and a canonical URL", async ({ page }) => {
  for (const { path } of PAGES) {
    await page.goto(path);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://fpds.football${path}`);
  }
});

test("a link to a consultation navigates without a full page load", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    (window as { marker?: string }).marker = "same-document";
  });
  await page.getByRole("link", { name: "Wages" }).first().click();
  await expect(page).toHaveURL("/consult/wages/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Does a player submission include information about wages?");
  expect(await page.evaluate(() => (window as { marker?: string }).marker)).toBe("same-document");
});

test("a path without a trailing slash redirects to the path with one", async ({ request }) => {
  const response = await request.get("/consult/wages", { maxRedirects: 0 });
  expect([301, 307, 308]).toContain(response.status());
  expect(response.headers().location).toMatch(/\/consult\/wages\/$/);
});

test("an unknown page shows the not found page", async ({ page }) => {
  await page.goto("/does-not-exist/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page does not exist.");
});
