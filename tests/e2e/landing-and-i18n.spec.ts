import { expect, test } from "@playwright/test";

test("el català és el predeterminat, també amb navegador anglès", async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ca");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "El tennis",
  );
  await expect(
    page.getByRole("link", { name: "Català", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("canvi complet CA → ES → EN → CA", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Castellano", exact: true }).click();
  await expect(page).toHaveURL(/\/es$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "El tenis",
  );
  await expect(page).toHaveTitle(/El tenis nos une/);
  await page.getByRole("link", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Tennis brings",
  );
  await expect(
    page.getByRole("heading", { name: "There's a place for you." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Català", exact: true }).click();
  await expect(page).toHaveURL(/\/ca$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ca");
});

for (const [path, locale, title] of [
  ["/", "ca", "El tennis"],
  ["/es", "es", "El tenis"],
  ["/en", "en", "Tennis brings"],
]) {
  test(`metadades i contingut directe ${locale}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(new RegExp(title));
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://clubtennisagramunt.vercel.app${path === "/" ? "/ca" : path}`,
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /Club Tennis Agramunt/,
    );
    await expect(
      page.locator('link[rel="alternate"][hreflang="en"]'),
    ).toHaveAttribute("href", "https://clubtennisagramunt.vercel.app/en");
  });
}

test("el selector canvia Quick i terra batuda amb teclat", async ({ page }) => {
  await page.goto("/");
  const clay = page.getByRole("button", { name: "Terra batuda", exact: true });
  const quick = page.getByRole("button", {
    name: "Pista Blava · Quick",
    exact: true,
  });
  await expect(clay).toHaveAttribute("aria-pressed", "true");
  await quick.focus();
  await page.keyboard.press("Space");
  await expect(quick).toHaveAttribute("aria-pressed", "true");
  await expect(clay).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("heading", { name: "Deixa que el joc agafi ritme." }),
  ).toBeVisible();
  await expect(
    page.locator(".explorer-visual .court-photo-quick img"),
  ).toBeVisible();
  await clay.click();
  await expect(
    page.locator(".explorer-visual .court-photo-clay img"),
  ).toBeVisible();
});

test("navegació, consulta per correu i contingut d'arxiu", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    const menu = page.getByRole("button", { name: "Obre el menú" });
    await menu.click();
    await expect(
      page.getByRole("button", { name: "Tanca el menú" }),
    ).toHaveAttribute("aria-expanded", "true");
    await page
      .locator("#mobile-menu")
      .getByRole("link", { name: "Les pistes" })
      .click();
    await expect(page.locator("#mobile-menu")).toHaveCount(0);
  } else {
    await page
      .locator(".desktop-nav")
      .getByRole("link", { name: "Les pistes" })
      .click();
  }
  await expect(page).toHaveURL(/#courts$/);
  await expect(page.locator(".booking-notice")).toContainText("socis actius");
  const guest = page.getByRole("link", { name: "Reserva pista com a no soci" });
  await expect(guest).toHaveAttribute(
    "href",
    /^mailto:clubtennisagramunt1974@gmail\.com\?subject=/,
  );
  await expect(
    page.getByRole("link", { name: "Vull fer-me soci", exact: true }),
  ).toHaveAttribute("href", /\/ca\/acces\?mode=signup$/);
  await expect(page.locator(".archive-note")).toContainText("2018");
  await expect(page.locator('meta[name="viewport"]')).not.toHaveAttribute(
    "content",
    /user-scalable=no|maximum-scale=1/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Control+Home");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({
    path: `artifacts/hero-${testInfo.project.name}.png`,
  });
  await page.screenshot({
    path: `artifacts/landing-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("respecta el moviment reduït i el contingut continua accessible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("#history").scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("heading", { name: "El primer servei" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
  await expect(page.locator(".court-photo img").first()).toHaveCSS(
    "transform",
    "none",
  );
});

test("sitemap, robots i rutes desconegudes", async ({ request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain(
    "https://clubtennisagramunt.vercel.app/es",
  );
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Sitemap:");
  expect((await request.get("/fr/inexistent")).status()).toBe(404);
});
