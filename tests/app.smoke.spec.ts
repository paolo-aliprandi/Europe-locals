import { expect, test } from "@playwright/test";

test("renders the Europe map MVP without 404 resources", async ({ page }) => {
  const failedResponses: string[] = [];
  const pageErrors: string[] = [];

  page.on("response", (response) => {
    if (response.status() === 404) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await page.goto("/european-locals-map/");

  await expect(page).toHaveTitle("European Locals Map");
  await expect(page.getByText("European Locals Map")).toBeVisible();
  await expect(page.getByText("Germany")).toBeVisible();
  await expect(page.getByText("Metric", { exact: true })).toBeVisible();
  await expect(page.getByText("Top origin groups", { exact: true })).toBeVisible();
  await expect(page.getByText("Migration trend over time", { exact: true })).toBeVisible();
  await expect(page.locator("main")).toHaveClass(/app-shell-eu/);
  await page.getByLabel("Dark mode").click();
  await expect(page.locator("main")).toHaveClass(/app-shell-dark/);
  await expect(page.getByText("Eurostat").first()).toBeVisible();
  await expect(page.getByText("Irregular-presence detections", { exact: true })).toBeVisible();
  await page.getByLabel("Include irregular-presence detections").click();
  await expect(page.getByText("Aggregation is enabled")).toBeVisible();
  await page.getByPlaceholder("Try Germany, France, Spain...").fill("France");
  await expect(page.getByText("France", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Show Algérie flag" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Show Maroc flag" })).toBeVisible();
  await page.getByLabel("Show Algérie flag").hover();
  await expect(page.getByText("🇩🇿")).toBeVisible();
  await page.getByPlaceholder("Try Germany, France, Spain...").fill("United Kingdom");
  await expect(page.getByText("United Kingdom", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Show India flag" })).toBeVisible();
  await page.getByLabel("Showing percentages").click();
  await expect(page.getByText("Showing absolute numbers")).toBeVisible();
  await page.getByLabel("Granularity").selectOption("nuts2");
  await expect(page.getByText("NUTS 2 view")).toBeVisible();
  await expect(page.getByText("Origin groups unavailable for this regional view.")).toBeVisible();
  await expect.poll(async () => {
    return page.locator('[aria-label="Interactive demographic map of Europe"]').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return Math.round(rect.height);
    });
  }).toBeGreaterThan(700);
  await page.waitForTimeout(3_000);

  expect(pageErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
});
