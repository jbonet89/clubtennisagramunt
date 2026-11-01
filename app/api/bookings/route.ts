import type { NextRequest } from "next/server";
import { DateTime } from "luxon";
import { getMemberSession } from "@/lib/member-server";
import { body, databaseError, getLocale, json, sameOrigin } from "@/lib/api";
import { getWhatsAppMessage, validDay, type Booking } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { supabase, profile } = await getMemberSession();
    if (!profile) return json({ error: "unauthorized" }, 401);
    if (!profile.member_active || !["member", "admin"].includes(profile.role))
      return json({ error: "forbidden" }, 403);
    const day = request.nextUrl.searchParams.get("day") ?? "";
    if (!validDay(day)) return json({ error: "invalidData" }, 400);
    const { data, error } = await supabase.rpc("get_court_availability", {
      p_day: day,
    });
    return error ? databaseError(error) : json({ occupied: data });
  } catch {
    return json({ error: "error" }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  try {
    const { supabase, profile } = await getMemberSession();
    if (!profile) return json({ error: "unauthorized" }, 401);
    if (!profile.member_active || !["member", "admin"].includes(profile.role))
      return json({ error: "forbidden" }, 403);
    const input = await body(request);
    const { courtId, startTime, duration, players } = input;
    if (
      typeof courtId !== "string" ||
      !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(courtId) ||
      typeof startTime !== "string" ||
      !/(Z|[+-]\d\d:\d\d)$/.test(startTime) ||
      !DateTime.fromISO(startTime).isValid ||
      ![60, 90].includes(Number(duration)) ||
      typeof players !== "string" ||
      players.trim().length < 2 ||
      players.length > 160 ||
      /[\x00-\x1f\x7f]/.test(players)
    )
      return json({ error: "invalidData" }, 400);
    const { data: id, error } = await supabase.rpc("create_member_booking", {
      p_court_id: courtId,
      p_start_time: startTime,
      p_duration: Number(duration),
      p_players: players.trim(),
    });
    if (error) return databaseError(error);
    const [saved, court] = await Promise.all([
      supabase
        .from("bookings")
        .select("id,court_id,players,start_time,end_time,status,payment_status")
        .eq("id", id)
        .single(),
      supabase.from("courts").select("name").eq("id", courtId).single(),
    ]);
    if (saved.error || court.error) return json({ error: "error" }, 503);
    const booking: Booking = { ...saved.data, court_name: court.data.name };
    return json(
      {
        booking,
        whatsapp: getWhatsAppMessage(booking, getLocale(input.locale)),
      },
      201,
    );
  } catch {
    return json({ error: "invalidData" }, 400);
  }
}
