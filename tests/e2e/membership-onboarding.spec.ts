import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (existsSync(".env.e2e.local")) process.loadEnvFile(".env.e2e.local");
const fixture = process.env.CTA_E2E_FIXTURE
  ? JSON.parse(process.env.CTA_E2E_FIXTURE)
  : null;
test.use({ trace: "off" });
test.setTimeout(120000);
async function login(page: Page, user: { email: string; password: string }) {
  await page.goto("/ca/acces");
  await page.getByLabel("Correu electrònic", { exact: true }).fill(user.email);
  await page.getByLabel("Contrasenya", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Entra", exact: true }).click();
  await expect(page).toHaveURL(/\/ca\/socis$/, {timeout:20000});
}
test("alta privada: quotes en viu, documents, correcció i validació abans de reservar", async ({
  page,
  browser,
}, info) => {
  if (!fixture) throw Error("Prepare isolated member fixtures");
  const user =
    fixture.users[
      info.project.name === "desktop" ? "onboardingDesktop" : "onboardingMobile"
    ];
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  expect(
    (
      await client.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      })
    ).error,
  ).toBeNull();
  await page.goto("/ca");
  await expect(page.locator("body")).not.toContainText("ES13 3140");
  await expect(page.locator("body")).not.toContainText("65,00");
  await page
    .getByRole("link", { name: "Vull fer-me soci", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Crea el teu compte" }),
  ).toBeVisible();
  await login(page, user);
  await expect(
    page.getByRole("heading", { name: "Fes-te soci del CTA", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Reservar pista", exact: true }),
  ).toHaveCount(0);
  expect(
    (await page.request.get("/api/bookings?day=2026-11-03")).status(),
  ).toBe(403);
  const onboarding = page.locator(".membership-onboarding");
  const firstStamp = await onboarding.getAttribute("data-settings-updated-at");
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await login(admin, fixture.users.admin);
  await admin.goto("/ca/administracio/adhesions");
  await admin
    .getByText("Edita les quotes i les instruccions", { exact: true })
    .click();
  // Save the existing values to verify live propagation without changing real fees.
  await admin
    .getByRole("button", { name: "Desa la configuració", exact: true })
    .click();
  await expect(
    admin.getByText("Configuració desada. Ja es mostra als usuaris.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.bringToFront();
  await expect(onboarding).not.toHaveAttribute(
    "data-settings-updated-at",
    firstStamp!,
    { timeout: 12000 },
  );
  const current = (await (await page.request.get("/api/membership")).json())
    .settings;
  await expect(page.getByTestId("membership-fees")).toContainText(
    new Intl.NumberFormat("ca", { style: "currency", currency: "EUR" }).format(
      current.adult_fee_cents / 100,
    ),
  );
  const deniedUpdate = await client
    .from("membership_settings")
    .update({ adult_fee_cents: current.adult_fee_cents })
    .eq("id", true)
    .select("id");
  expect(deniedUpdate.error).toBeNull();
  expect(deniedUpdate.data).toEqual([]);
  // RLS filters the unauthorized UPDATE to zero rows, leaving the price intact.
  expect(
    (
      await client
        .from("membership_settings")
        .select("adult_fee_cents")
        .single()
    ).data?.adult_fee_cents,
  ).toBe(current.adult_fee_cents);
  await expect(
    page.getByRole("link", {
      name: "Tens dubtes? Parla amb el club per WhatsApp",
    }),
  ).toHaveAttribute(
    "href",
    new RegExp(`^https://wa.me/${current.whatsapp}\\?text=`),
  );
  const pdf = Buffer.from(
    "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF",
  );
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/v9sAAAAASUVORK5CYII=",
    "base64",
  );
  async function fillAndSend() {
    await page
      .getByLabel("Telèfon de contacte", { exact: true })
      .fill("600000000");
    await page
      .getByLabel("Formulari de soci emplenat", { exact: true })
      .setInputFiles({
        name: "formulari.pdf",
        mimeType: "application/pdf",
        buffer: pdf,
      });
    await page
      .getByLabel("Justificant de pagament", { exact: true })
      .setInputFiles({
        name: "justificant.png",
        mimeType: "image/png",
        buffer: png,
      });
    await page
      .getByRole("button", { name: "Envia la sol·licitud", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Sol·licitud enviada · pendent de validació",
      }),
    ).toBeVisible();
  }
  await fillAndSend();
  let app = (
    await client
      .from("membership_applications")
      .select("*")
      .eq("user_id", user.id)
      .single()
  ).data!;
  expect(app.fee_cents).toBe(current.adult_fee_cents);
  expect(app.status).toBe("submitted");
  expect(
    (
      await client.rpc("review_membership", {
        p_id: app.id,
        p_status: "approved",
        p_note: "",
      })
    ).error?.code,
  ).toBe("42501");
  expect(
    (
      await client
        .from("membership_applications")
        .update({ status: "approved" })
        .eq("id", app.id)
    ).error?.code,
  ).toBe("42501");
  const other = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  await other.auth.signInWithPassword(fixture.users.other);
  expect(
    (await other.from("membership_applications").select("*").eq("id", app.id))
      .data,
  ).toEqual([]);
  expect(
    (
      await other.storage
        .from("membership-documents")
        .download(app.document_path)
    ).error,
  ).toBeTruthy();
  expect(
    (
      await client.storage
        .from("membership-documents")
        .update(app.document_path, pdf, { contentType: "application/pdf" })
    ).error,
  ).toBeTruthy();
  const anon = await browser.newContext();
  const unauthorized = await anon.request.get("/api/membership");
  expect(unauthorized.status()).toBe(401);
  await anon.close();
  const row = admin.getByTestId(`application-${app.id}`);
  await expect(row).toBeVisible({ timeout: 20000 });
  const download = await admin.request.post("/api/membership", {
    headers: { Origin: new URL(admin.url()).origin },
    data: { action: "download", id: app.id, kind: "document" },
  });
  expect(download.status()).toBe(200);
  const url = (await download.json()).url;
  const downloaded = await admin.request.get(url);
  expect(downloaded.status()).toBe(200);
  expect(await downloaded.body()).toEqual(pdf);
  await row
    .getByLabel("Missatge per al sol·licitant")
    .fill("CTA E2E: cal una còpia llegible");
  await row
    .getByRole("button", { name: "Demana una correcció", exact: true })
    .click();
  await page.bringToFront();
  await expect(
    page.getByRole("heading", { name: "Cal revisar la documentació" }),
  ).toBeVisible({ timeout: 20000 });
  await fillAndSend();
  app = (
    await client
      .from("membership_applications")
      .select("*")
      .eq("user_id", user.id)
      .single()
  ).data!;
  await expect(row).toContainText("Sol·licitud enviada", { timeout: 20000 });
  await page.screenshot({
    path: `artifacts/onboarding-${info.project.name}.png`,
    fullPage: true,
  });
  admin.once("dialog", (d) => d.accept());
  await row
    .getByRole("button", {
      name: "Valida el pagament i activa el soci",
      exact: true,
    })
    .click();
  await admin.getByRole("button",{name:"Totes les altes",exact:true}).click();
  await expect(row).toContainText("Alta aprovada");
  await page.bringToFront();
  await expect(
    page.getByRole("heading", { name: "Reservar pista", exact: true }),
  ).toBeVisible({ timeout: 20000 });
  expect(
    (
      await client
        .from("profiles")
        .select("role,member_active")
        .eq("id", user.id)
        .single()
    ).data,
  ).toEqual({ role: "member", member_active: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await adminContext.close();
});
