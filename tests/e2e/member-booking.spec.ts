import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import { existsSync } from "node:fs";
import {
  CLUB_ZONE,
  getWhatsAppMessage,
  type Booking,
} from "../../lib/bookings";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (existsSync(".env.e2e.local")) process.loadEnvFile(".env.e2e.local");
type User = { id: string; email: string; password: string; name: string };
const fixture = process.env.CTA_E2E_FIXTURE
  ? (JSON.parse(process.env.CTA_E2E_FIXTURE) as {
      run: string;
      users: Record<string, User>;
    })
  : null;
test.use({ trace: "off" });
test.setTimeout(60000);
test.describe.configure({ mode: "serial" });
test.beforeAll(() => {
  if (!fixture)
    throw new Error(
      "Prepare the isolated CTA member fixtures before running member-booking.spec.ts",
    );
});

async function login(page: Page, user: User) {
  await page.goto("/ca/acces");
  await page.getByLabel("Correu electrònic", { exact: true }).fill(user.email);
  await page.getByLabel("Contrasenya", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Entra", exact: true }).click();
  await expect(page).toHaveURL(/\/ca\/socis$/);
}
async function client(user: User) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const result = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (result.error) throw new Error("Test account authentication failed");
  return supabase;
}

test("soci: reserva real, persistència, text WhatsApp, cancel·lació i sortida", async ({
  page,
}, info) => {
  const user = fixture!.users.member;
  const supabase = await client(user);
  const { data: courts } = await supabase
    .from("courts")
    .select("id,name")
    .eq("surface", "hardcourt")
    .single();
  expect(courts).toBeTruthy();
  await login(page, user);
  await expect(page.getByRole("link", { name: "Socis", exact: true })).toHaveCount(0);
  const day = DateTime.now()
    .setZone(CLUB_ZONE)
    .plus({ days: info.project.name === "desktop" ? 1 : 2 })
    .toISODate()!;
  await page.locator('.court-options button').filter({hasText:courts!.name}).click();
  await page.getByLabel("Data de joc", { exact: true }).fill(day);
  await page.getByRole("combobox", { name: "Durada", exact: true }).selectOption("90");
  const time = page.locator('.time-picker-trigger');
  await expect(time).toBeEnabled();
  await time.click();
  const first = page.locator('.time-picker-blocks button:not(:disabled)').first();
  await expect(first).toBeVisible();
  const start = await first.getAttribute('data-start');
  await first.click();
  await expect(page.locator('.time-picker-blocks button[aria-pressed=true]')).toHaveCount(3);
  await page.getByRole('button',{name:'Confirmar hora',exact:true}).click();
  const guest = `CTA ${info.project.name} & Gener ${Date.now()}`;
  const players = `${user.name} · ${guest}`;
  await page.locator(".participant-row select").selectOption("guest");
  await page.getByLabel("Nom i cognoms del convidat", { exact: true }).fill(guest);
  await page
    .getByRole("button", { name: "Confirma la reserva gratuïta" })
    .click();
  const confirmation = page.getByTestId("booking-confirmation");
  await expect(confirmation).toContainText("Reserva confirmada i desada");
  const { data: rows, error } = await supabase
    .from("bookings")
    .select(
      "id,user_id,court_id,players,start_time,end_time,status,payment_status,source,access_code",
    )
    .eq("players", players)
    .eq("start_time", start!);
  expect(error).toBeNull();
  expect(rows).toHaveLength(1);
  const saved = rows![0];
  expect(saved.court_id).toBe(courts!.id);
  expect(saved.user_id).toBe(user.id);
  expect(saved.payment_status).toBe("free_member");
  expect(saved.source).toBe("web");
  expect(saved.access_code).toBeNull();
  const expected = getWhatsAppMessage(
    { ...saved, court_name: courts!.name } as Booking,
    "ca",
  );
  const href = await confirmation
    .getByRole("link", { name: "Compartir al grup de WhatsApp" })
    .getAttribute("href");
  expect(href).toBe(expected.url);
  expect(new URL(href!).searchParams.get("text")).toContain(
    "🎾 *CLUB TENNIS AGRAMUNT 1974* 🎾",
  );
  expect(expected.text).toContain("Claus de soci");
  expect(expected.text).toContain(players);
  await page.getByRole("link", { name: "Més", exact: true }).click();
  await page.getByRole("link", { name: "Les meves reserves", exact: true }).click();
  await expect(page).toHaveURL(/section=bookings$/);
  await page.reload();
  const card = page.getByTestId(`booking-${saved.id}`);
  await expect(card).toBeVisible();
  await expect(card).toContainText(players);
  expect(
    (await page.request.get("/ca/socis")).headers()["cache-control"],
  ).toMatch(/private|no-store/);
  await page.screenshot({
    path: `artifacts/member-${info.project.name}.png`,
    fullPage: true,
  });
  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "Cancel·la la reserva" }).click();
  await expect(card).toHaveCount(0);
  await page
    .getByRole("button", { name: "Historial i cancel·lacions", exact: true })
    .click();
  await expect(page.getByTestId(`booking-${saved.id}`)).toContainText(
    "Cancel·lada",
  );
  const cancelled = await supabase
    .from("bookings")
    .select("status")
    .eq("id", saved.id)
    .single();
  expect(cancelled.data?.status).toBe("cancelled");
  await page.getByRole("link", { name: "El meu compte", exact: true }).click();
  await page.getByRole("button", { name: "Tanca la sessió" }).click();
  await expect(page).toHaveURL(/\/ca\/acces$/);
  await page.goto("/ca/socis");
  await expect(page).toHaveURL(/\/ca\/acces$/);
});

test("compte pendent: sense reserva ni escalada de permisos", async ({
  page,
}) => {
  const pending = fixture!.users.pending;
  await login(page, pending);
  await expect(page.getByRole("link", { name: "Reserva pista", exact: true })).toHaveCount(0);
  await page.goto("/ca/socis?section=members");
  await expect(page).toHaveURL(/section=account$/);
  await expect(page.locator(".member-approval")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Compte pendent de validació" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirma la reserva gratuïta" }),
  ).toHaveCount(0);
  expect(
    (
      await page.request.get(
        `/api/bookings?day=${DateTime.now().setZone(CLUB_ZONE).toISODate()}`,
      )
    ).status(),
  ).toBe(403);
  const supabase = await client(pending);
  const own = await supabase
    .from("profiles")
    .select("role,member_active")
    .eq("id", pending.id)
    .single();
  expect(own.data).toEqual({ role: "guest", member_active: false });
  const escalate = await supabase
    .from("profiles")
    .update({ role: "admin", member_active: true })
    .eq("id", pending.id);
  expect(escalate.error?.code).toBe("42501");
  const approval = await supabase.rpc("set_member_active", {
    p_user_id: pending.id,
    p_active: true,
  });
  expect(approval.error?.code).toBe("42501");
  expect(
    (await supabase.rpc("grant_admin", { p_user_id: pending.id })).error?.code,
  ).toBe("42501");
  const { data: court } = await supabase
    .from("courts")
    .select("id")
    .limit(1)
    .single();
  const attempt = await supabase.rpc("create_member_booking", {
    p_court_id: court!.id,
    p_start_time: DateTime.now()
      .setZone(CLUB_ZONE)
      .plus({ days: 1 })
      .startOf("day")
      .set({ hour: 12 })
      .toISO(),
    p_duration: 60,
    p_players: "Unapproved account",
  });
  expect(attempt.error?.code).toBe("42501");
});

test("la junta activa, revoca i delega administradors amb correu confirmat", async ({
  page,
}, info) => {
  await login(page, fixture!.users.admin);
  await page.getByRole("navigation",{name:"Navegació de socis"}).getByRole("link",{name:"Administració",exact:true}).click();
  await page.getByRole("button",{name:"Permisos",exact:true}).click();
  const target =
    fixture!.users[
      info.project.name === "desktop" ? "approvalDesktop" : "approvalMobile"
    ];
  const row = page
    .locator(".admin-list article")
    .filter({ hasText: target.email });
  await row.getByRole("button", { name: "Activar compte web" }).click();
  await expect(row).toContainText("Compte web actiu");
  const admin = await client(fixture!.users.admin);
  const saved = await admin
    .from("profiles")
    .select("role,member_active")
    .eq("id", target.id)
    .single();
  expect(saved.data).toEqual({ role: "member", member_active: true });
  await row.getByRole("button", { name: "Desactivar compte web" }).click();
  await expect(row).toContainText("Compte web pendent o desactivat");
  const deactivated = await client(target);
  expect(
    (
      await deactivated.rpc("get_court_availability", {
        p_day: DateTime.now().setZone(CLUB_ZONE).toISODate(),
      })
    ).error?.code,
  ).toBe("42501");
  const ordinary = await client(fixture!.users.member);
  expect(
    (await ordinary.rpc("grant_admin", { p_user_id: target.id })).error?.code,
  ).toBe("42501");
  expect(
    (
      await admin.rpc("grant_admin", {
        p_user_id: fixture!.users.unconfirmed.id,
      })
    ).error?.code,
  ).toBe("22023");
  page.once("dialog", (dialog) => dialog.accept());
  await row
    .getByRole("button", { name: "Fer administrador", exact: true })
    .click();
  await expect(row.getByText("admin", { exact: true })).toBeVisible();
  await expect(row.getByRole("button")).toHaveCount(0);
  const promoted = await client(target);
  const next =
    fixture!.users[
      info.project.name === "desktop" ? "delegationDesktop" : "delegationMobile"
    ];
  expect(
    (await promoted.rpc("grant_admin", { p_user_id: next.id })).error,
  ).toBeNull();
  expect(
    (
      await promoted
        .from("profiles")
        .select("role,member_active")
        .eq("id", next.id)
        .single()
    ).data,
  ).toEqual({ role: "admin", member_active: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/admin-${info.project.name}.png`,
    fullPage: true,
  });
});

test("doble reserva simultània i privadesa a la base de dades", async ({}, info) => {
  const a = await client(fixture!.users.member);
  const b = await client(fixture!.users.other);
  const { data: court } = await a
    .from("courts")
    .select("id")
    .eq("surface", "clay")
    .single();
  const start = DateTime.now()
    .setZone(CLUB_ZONE)
    .plus({ days: info.project.name === "desktop" ? 3 : 4 })
    .startOf("day")
    .set({ hour: 15 })
    .toUTC()
    .toISO();
  const args = {
    p_court_id: court!.id,
    p_start_time: start,
    p_duration: 60,
    p_players: `CTA concurrency ${info.project.name}`,
  };
  const responses = await Promise.all([
    a.rpc("create_member_booking", args),
    b.rpc("create_member_booking", args),
  ]);
  expect(responses.filter((r) => !r.error)).toHaveLength(1);
  // Concurrent exclusion checks can abort the loser with a deadlock instead.
  // Both outcomes must leave exactly one committed booking.
  expect(["23P01", "40P01"]).toContain(
    responses.find((r) => r.error)?.error?.code,
  );
  const winner = responses[0].error ? b : a;
  const loser = responses[0].error ? a : b;
  const id = responses.find((r) => !r.error)!.data;
  const hidden = await loser.from("bookings").select("*").eq("id", id);
  expect(hidden.error).toBeNull();
  expect(hidden.data).toEqual([]);
  const availability = await loser.rpc("get_court_availability", {
    p_day: DateTime.fromISO(start!).setZone(CLUB_ZONE).toISODate(),
  });
  expect(availability.error).toBeNull();
  expect(
    availability.data.some(
      (slot: Record<string, unknown>) =>
        DateTime.fromISO(String(slot.start_time)).toMillis() ===
        DateTime.fromISO(start!).toMillis(),
    ),
  ).toBe(true);
  expect(Object.keys(availability.data[0]).sort()).toEqual([
    "court_id",
    "end_time",
    "start_time",
  ]);
  const cancelOther = await loser.rpc("cancel_member_booking", {
    p_booking_id: id,
  });
  expect(cancelOther.error?.code).toBe("42501");
  const direct = await a.from("bookings").insert({
    court_id: court!.id,
    user_id: fixture!.users.other.id,
    players: "Spoofed",
    start_time: start,
    end_time: DateTime.fromISO(start!).plus({ minutes: 60 }).toISO(),
  });
  expect(direct.error?.code).toBe("42501");
  const midnight = DateTime.fromISO(start!)
    .setZone(CLUB_ZONE)
    .startOf("day")
    .toUTC()
    .toISO();
  const outOfHours = await a.rpc("create_member_booking", {
    ...args,
    p_start_time: midnight,
  });
  expect(outOfHours.error?.code).toBe("22023");
  expect(
    (await winner.rpc("cancel_member_booking", { p_booking_id: id })).error,
  ).toBeNull();
});
