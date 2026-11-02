import { DateTime } from "luxon";
import type { Locale } from "@/i18n/routing";

export const CLUB_ZONE = "Europe/Madrid";
export type Court = {
  id: string;
  name: string;
  surface: string;
  status: string;
};
export type ClubSettings = {
  opening_minute: number;
  closing_minute: number;
  booking_horizon_days: number;
};
export type OccupiedSlot = {
  court_id: string;
  start_time: string;
  end_time: string;
};
export type Participant = { kind: "member" | "guest"; member_id?: string; name: string };
export type Booking = {
  match_format?: "singles" | "doubles" | null;
  participants?: Participant[];
  id: string;
  court_id: string;
  players: string;
  start_time: string;
  end_time: string;
  status: "confirmed" | "cancelled";
  payment_status: string;
  court_name: string;
};
export type Profile = {
  phone?: string | null;
  id: string;
  full_name: string;
  email: string;
  role: string;
  member_active: boolean;
};

export function clubToday() {
  return DateTime.now().setZone(CLUB_ZONE).toISODate()!;
}
export function validDay(day: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    DateTime.fromISO(day, { zone: CLUB_ZONE }).isValid
  );
}
export function formatBooking(booking: Booking, locale: Locale) {
  const start = DateTime.fromISO(booking.start_time)
    .setZone(CLUB_ZONE)
    .setLocale(locale);
  const end = DateTime.fromISO(booking.end_time)
    .setZone(CLUB_ZONE)
    .setLocale(locale);
  return {
    date: start.toLocaleString({
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    time: `${start.toFormat("HH:mm")} - ${end.toFormat("HH:mm")} h`,
  };
}
export function getWhatsAppMessage(booking: Booking, locale: Locale) {
  const words = {
    ca: {
      date: "Data",
      time: "Horari",
      court: "Pista",
      players: "Jugadors",
      access: "Accés",
      keys: "Claus de soci",
      confirmed: "Reserva confirmada des de la web oficial del CTA",
    },
    es: {
      date: "Fecha",
      time: "Horario",
      court: "Pista",
      players: "Jugadores",
      access: "Acceso",
      keys: "Llaves de socio",
      confirmed: "Reserva confirmada desde la web oficial del CTA",
    },
    en: {
      date: "Date",
      time: "Time",
      court: "Court",
      players: "Players",
      access: "Access",
      keys: "Member keys",
      confirmed: "Booking confirmed on the official CTA website",
    },
  }[locale];
  const { date, time } = formatBooking(booking, locale);
  const text = [
    "🎾 *CLUB TENNIS AGRAMUNT 1974* 🎾",
    "━━━━━━━━━━━━━━━━━━━━━━",
    `📅 *${words.date}:* ${date}`,
    `⏰ *${words.time}:* ${time}`,
    `📍 *${words.court}:* ${booking.court_name}`,
    `👥 *${words.players}:* ${booking.players}`,
    `🔒 *${words.access}:* ${words.keys}`,
    "━━━━━━━━━━━━━━━━━━━━━━",
    `✅ _${words.confirmed}_`,
  ].join("\n");
  return { text, url: `https://wa.me/?text=${encodeURIComponent(text)}` };
}
export function getAvailableSlots(
  day: string,
  duration: number,
  settings: ClubSettings,
  occupied: OccupiedSlot[],
  courtId: string,
) {
  if (!validDay(day)) return [];
  const startOfDay = DateTime.fromISO(day, { zone: CLUB_ZONE });
  const open = startOfDay.set({
    hour: Math.floor(settings.opening_minute / 60),
    minute: settings.opening_minute % 60,
  });
  const close =
    settings.closing_minute === 1440
      ? startOfDay.plus({ days: 1 })
      : startOfDay.set({
          hour: Math.floor(settings.closing_minute / 60),
          minute: settings.closing_minute % 60,
        });
  const now = DateTime.now();
  const result: { value: string; label: string }[] = [];
  for (
    let start = open;
    start.plus({ minutes: duration }) <= close;
    start = start.plus({ minutes: 30 })
  ) {
    const end = start.plus({ minutes: duration });
    if (
      start <= now ||
      occupied.some(
        (slot) =>
          slot.court_id === courtId &&
          DateTime.fromISO(slot.start_time) < end &&
          DateTime.fromISO(slot.end_time) > start,
      )
    )
      continue;
    result.push({
      value: start.toUTC().toISO()!,
      label: `${start.toFormat("HH:mm")} – ${end.toFormat("HH:mm")} (${start.toFormat("ZZ")})`,
    });
  }
  return result;
}
