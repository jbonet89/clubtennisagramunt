import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getMemberCopy } from "@/messages/members";
import { getMemberSession } from "@/lib/member-server";
import { MemberShell } from "@/components/member-shell";
import { BookingDashboard } from "@/components/booking-dashboard";
import type { Booking, ClubSettings, Court, Profile } from "@/lib/bookings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "CTA · Socis / Socios / Members",
  robots: { index: false, follow: false },
};
export default async function MemberPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const { supabase, profile } = await getMemberSession();
  if (!profile) redirect(`/${locale}/acces`);
  const [courts, settings, saved, members] = await Promise.all([
    supabase.from("courts").select("id,name,surface,status").order("name"),
    supabase
      .from("club_settings")
      .select("opening_minute,closing_minute,booking_horizon_days")
      .single(),
    supabase
      .from("bookings")
      .select("id,court_id,players,start_time,end_time,status,payment_status")
      .eq("user_id", profile.id)
      .order("start_time", { ascending: false })
      .limit(100),
    profile.role === "admin" && profile.member_active
      ? supabase
          .from("profiles")
          .select("id,full_name,email,role,member_active")
          .neq("role", "admin")
          .order("created_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (courts.error || settings.error || saved.error || members.error)
    throw new Error("Unable to load member area");
  const courtList = courts.data as Court[];
  const bookings = (saved.data as Omit<Booking, "court_name">[]).map(
    (booking) => ({
      ...booking,
      court_name:
        courtList.find((court) => court.id === booking.court_id)?.name ?? "",
    }),
  );
  const copy = getMemberCopy(locale);
  return (
    <MemberShell locale={locale} section="socis" copy={copy}>
      <BookingDashboard
        locale={locale}
        copy={copy}
        profile={profile}
        courts={courtList}
        settings={settings.data as ClubSettings}
        initialBookings={bookings}
        initialMembers={members.data as Profile[]}
      />
    </MemberShell>
  );
}
