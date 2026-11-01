import { test, expect } from "@playwright/test";
import {
  getAvailableSlots,
  getWhatsAppMessage,
  type Booking,
} from "../../lib/bookings";

test("Europe/Madrid: canvis d'hora i límits de solapament", () => {
  const settings = {
    opening_minute: 0,
    closing_minute: 1440,
    booking_horizon_days: 14,
  };
  const spring = getAvailableSlots("2027-03-28", 60, settings, [], "court");
  expect(spring).toHaveLength(45);
  expect(spring.some((slot) => slot.label.startsWith("02:"))).toBe(false);
  const autumn = getAvailableSlots("2027-10-31", 60, settings, [], "court");
  expect(autumn).toHaveLength(49);
  expect(autumn.filter((slot) => slot.label.startsWith("02:00"))).toHaveLength(
    2,
  );
  const normal = getAvailableSlots(
    "2027-06-01",
    60,
    { ...settings, opening_minute: 420, closing_minute: 1380 },
    [
      {
        court_id: "court",
        start_time: "2027-06-01T05:00:00Z",
        end_time: "2027-06-01T06:00:00Z",
      },
    ],
    "court",
  );
  expect(normal[0].label).toMatch(/^08:00/);
  expect(normal.at(-1)?.label).toMatch(/^22:00/);
});

test("WhatsApp conserva data local, accents, emojis i codificació", () => {
  const booking: Booking = {
    id: "test",
    court_id: "court",
    players: "Joan & Gener",
    start_time: "2027-07-01T22:30:00Z",
    end_time: "2027-07-02T00:00:00Z",
    status: "confirmed",
    payment_status: "free_member",
    court_name: "Pista 4 - Pista Blava / Quick",
  };
  const result = getWhatsAppMessage(booking, "ca");
  expect(result.text).toContain("2 de juliol");
  expect(result.text).toContain("00:30 - 02:00 h");
  expect(result.text).toContain("Joan & Gener");
  expect(new URL(result.url).searchParams.get("text")).toBe(result.text);
});
