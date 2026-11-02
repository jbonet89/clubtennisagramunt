"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DateTime } from "luxon";
import {
  CalendarDays,
  Check,
  Copy,
  LogOut,
  MessageCircle,
  Plus,
  RefreshCw,
  Users,
  UserRound,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { MemberCopy } from "@/messages/members";
import {
  CLUB_ZONE,
  clubToday,
  formatBooking,
  getAvailableSlots,
  getWhatsAppMessage,
  type Booking,
  type ClubSettings,
  type Court,
  type OccupiedSlot,
  type Profile,
} from "@/lib/bookings";
import {
  MemberActivity,
  MemberProfile,
  BookingReminders,
  CalendarReminder,
} from "./member-activity";
import { Button, buttonVariants } from "./ui/button";
import dynamic from "next/dynamic";
const MembershipOnboarding = dynamic(() =>
  import("./membership-onboarding").then((m) => m.MembershipOnboarding),
);
const MembershipAdmin = dynamic(() =>
  import("./membership-admin").then((m) => m.MembershipAdmin),
);
import type { MembershipData } from "./membership-data";

function RacketIcon({ size = 21 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <ellipse cx="14" cy="8" rx="6" ry="7" transform="rotate(35 14 8)" />
      <path d="m10 14-6 8-2-2 6-8M10 4l8 6M8 7l8 6M14 2l-5 10M18 4l-5 10" />
    </svg>
  );
}

export function BookingDashboard({
  section,
  locale,
  copy,
  profile,
  courts,
  settings,
  initialBookings,
  initialMembers,
  membership,
}: {
  section: "reserve" | "bookings" | "members" | "account" | "matches" | "more";
  locale: Locale;
  copy: MemberCopy;
  profile: Profile;
  courts: Court[];
  settings: ClubSettings;
  initialBookings: Booking[];
  initialMembers: Profile[];
  membership?: MembershipData;
}) {
  const active =
    profile.member_active && ["member", "admin"].includes(profile.role);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [bookings, setBookings] = useState(initialBookings);
  const [members, setMembers] = useState(initialMembers);
  useEffect(() => setMembers(initialMembers), [initialMembers]);
  const [day, setDay] = useState(clubToday);
  const [courtId, setCourtId] = useState(
    courts.find((court) => court.status === "active")?.id ?? "",
  );
  const [duration, setDuration] = useState(60);
  const [startTime, setStartTime] = useState("");
  const [players, setPlayers] = useState(profile.full_name);
  const [occupied, setOccupied] = useState<OccupiedSlot[] | null>(null);
  const [availabilityError, setAvailabilityError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<Booking | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    setOccupied(null);
    setAvailabilityError(false);
    setStartTime("");
    fetch(`/api/bookings?day=${encodeURIComponent(day)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Availability unavailable");
        return response.json();
      })
      .then((data) => setOccupied(data.occupied))
      .catch((reason) => {
        if (reason.name !== "AbortError") setAvailabilityError(true);
      });
    return () => controller.abort();
  }, [day, refresh, active]);

  const slots = occupied
    ? getAvailableSlots(day, duration, settings, occupied, courtId)
    : [];
  const validSlot = slots.some((slot) => slot.value === startTime);
  const maxDay = DateTime.now()
    .setZone(CLUB_ZONE)
    .plus({ days: settings.booking_horizon_days })
    .toISODate()!;
  const now = DateTime.now().toMillis();
  const shown = bookings.filter((booking) =>
    tab === "upcoming"
      ? booking.status === "confirmed" &&
        DateTime.fromISO(booking.start_time).toMillis() > now
      : booking.status === "cancelled" ||
        DateTime.fromISO(booking.start_time).toMillis() <= now,
  );
  const whatsapp = confirmation
    ? getWhatsAppMessage(confirmation, locale)
    : null;
  function apiError(value: unknown) {
    setError(copy[String(value) as keyof MemberCopy] ?? copy.error);
  }
  async function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("booking");
    setError("");
    setConfirmation(null);
    setCopyStatus("");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courtId, startTime, duration, players, locale }),
      });
      const data = await response.json();
      if (!response.ok) {
        apiError(data.error);
        if (response.status === 409) setRefresh((value) => value + 1);
        return;
      }
      setConfirmation(data.booking);
      setBookings((current) => [data.booking, ...current]);
      setRefresh((value) => value + 1);
      setTab("upcoming");
    } catch {
      setError(copy.error);
    } finally {
      setBusy("");
    }
  }
  async function cancel(booking: Booking) {
    if (!window.confirm(copy.cancelConfirm)) return;
    setBusy(booking.id);
    setError("");
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        apiError(data.error);
        return;
      }
      setBookings((current) =>
        current.map((row) =>
          row.id === booking.id ? { ...row, status: "cancelled" } : row,
        ),
      );
      if (confirmation?.id === booking.id) setConfirmation(null);
      setRefresh((value) => value + 1);
    } catch {
      setError(copy.error);
    } finally {
      setBusy("");
    }
  }
  async function changeMember(member: Profile, makeAdmin = false) {
    if (
      makeAdmin &&
      !window.confirm(copy.grantAdminConfirm.replace("{email}", member.email))
    )
      return;
    setBusy(member.id);
    setError("");
    try {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: member.id,
          ...(makeAdmin
            ? { action: "grant_admin" }
            : { active: !member.member_active }),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        apiError(data.error);
        return;
      }
      setMembers((current) =>
        current.map((row) =>
          row.id === member.id
            ? {
                ...row,
                role: makeAdmin ? "admin" : "member",
                member_active: makeAdmin || !member.member_active,
              }
            : row,
        ),
      );
    } catch {
      setError(copy.error);
    } finally {
      setBusy("");
    }
  }
  async function logout() {
    setBusy("logout");
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error();
      window.location.assign(`/${locale}/acces`);
    } catch {
      setError(copy.error);
      setBusy("");
    }
  }
  const minuteLabel = (value: number) =>
    `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

  const navigation = [
    { id: "reserve", label: copy.reserveNav, icon: CalendarDays },
    {
      id: "matches",
      label:
        locale === "es" ? "Partidos" : locale === "en" ? "Matches" : "Partits",
      icon: RacketIcon,
    },
    {
      id: "more",
      label: locale === "es" ? "Más" : locale === "en" ? "More" : "Més",
      icon: Plus,
    },
    { id: "account", label: copy.accountNav, icon: UserRound },
  ];
  return (
    <div className="member-workspace">
      <BookingReminders bookings={bookings} userId={profile.id} />
      {profile.role === "admin" && profile.member_active && (
        <Link href="/administracio" className="member-admin-shortcut">
          Administració ↗
        </Link>
      )}
      <nav className="member-navigation" aria-label={copy.navigation}>
        {navigation
          .filter((item) => active || item.id === "account")
          .map(({ id, label, icon: Icon }) => (
            <Link
              key={id}
              href={`/socis?section=${id}`}
              aria-current={section === id ? "page" : undefined}
            >
              <Icon size={21} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
      </nav>
      <div className="member-content" key={section}>
        <h1 className="member-section-heading">
          {navigation.find((item) => item.id === section)?.label}
        </h1>
        {section === "matches" && active && (
          <MemberActivity bookings={bookings} />
        )}
        {section === "more" && (
          <section className="member-more">
            <h2>{locale === "es" ? "Más opciones" : "Més opcions"}</h2>
            <Link href="/socis?section=bookings">{copy.bookingsNav}</Link>
            {profile.role === "admin" && profile.member_active && (
              <>
                <Link href="/administracio">Administració</Link>
                <Link href="/socis?section=members">{copy.membersNav}</Link>
              </>
            )}
          </section>
        )}
        {section === "account" && !active && membership && (
          <MembershipOnboarding locale={locale} initial={membership} />
        )}
        {section === "account" && <MemberProfile profile={profile} />}
        {section === "account" ? (
          <div className="member-welcome">
            <div>
              <h2>{profile.full_name}</h2>
              <p>{profile.email}</p>
              <p>{active ? copy.active : copy.pending}</p>
            </div>
            <Button variant="outline" onClick={logout} disabled={Boolean(busy)}>
              <LogOut size={16} aria-hidden="true" />
              {copy.logout}
            </Button>
          </div>
        ) : null}
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        {!active && section === "account" ? (
          <section className="member-notice">
            <h2>{copy.pending}</h2>
            <p>{copy.pendingBody}</p>
            <a href="mailto:clubtennisagramunt1974@gmail.com">
              clubtennisagramunt1974@gmail.com ↗
            </a>
          </section>
        ) : null}
        {section === "reserve" && confirmation && whatsapp ? (
          <section
            className="booking-confirmation"
            data-testid="booking-confirmation"
          >
            <p className="confirmation-heading" role="status">
              <Check size={19} aria-hidden="true" />
              {copy.bookingSuccess}
            </p>
            <h2>{confirmation.court_name}</h2>
            <p>
              {formatBooking(confirmation, locale).date} ·{" "}
              {formatBooking(confirmation, locale).time}
            </p>
            <p>
              {confirmation.players} · {copy.free}
            </p>
            <div className="share-actions">
              <a
                className={buttonVariants({ variant: "default" })}
                href={whatsapp.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={18} aria-hidden="true" />
                {copy.share}
              </a>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(whatsapp.text);
                    setCopyStatus(copy.copied);
                  } catch {
                    setCopyStatus(copy.copyFailed);
                  }
                }}
              >
                <Copy size={16} aria-hidden="true" />
                {copy.copy}
              </Button>
            </div>
            {copyStatus ? <p role="status">{copyStatus}</p> : null}
            <details>
              <summary>{copy.whatsappText}</summary>
              <textarea
                aria-label={copy.whatsappText}
                readOnly
                value={whatsapp.text}
                rows={10}
              />
            </details>
          </section>
        ) : null}
        {active && section === "reserve" ? (
          <section
            className="member-booking-section"
            aria-labelledby="new-booking-title"
          >
            <div className="booking-section-title">
              <div>
                <h2 id="new-booking-title">
                  <Plus size={24} aria-hidden="true" />
                  {copy.newBooking}
                </h2>
              </div>
              <p>
                {copy.opening}: {minuteLabel(settings.opening_minute)} –{" "}
                {minuteLabel(settings.closing_minute)}
                <br />
                {copy.horizon.replace(
                  "{days}",
                  String(settings.booking_horizon_days),
                )}
                <br />
                {copy.zone}
              </p>
            </div>
            <form onSubmit={book} className="booking-form">
              <fieldset disabled={!ready || Boolean(busy)}>
                <div className="booking-fields">
                  <label>
                    {copy.court}
                    <select
                      value={courtId}
                      onChange={(event) => {
                        setCourtId(event.target.value);
                        setStartTime("");
                      }}
                    >
                      {courts.map((court) => (
                        <option
                          key={court.id}
                          value={court.id}
                          disabled={court.status !== "active"}
                        >
                          {court.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {copy.date}
                    <input
                      type="date"
                      required
                      value={day}
                      min={clubToday()}
                      max={maxDay}
                      onChange={(event) => {
                        if (event.target.value) setDay(event.target.value);
                      }}
                    />
                  </label>
                  <label>
                    {copy.duration}
                    <select
                      value={duration}
                      onChange={(event) => {
                        setDuration(Number(event.target.value));
                        setStartTime("");
                      }}
                    >
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                    </select>
                  </label>
                  <label>
                    {copy.time}
                    <select
                      required
                      value={startTime}
                      disabled={occupied === null || availabilityError}
                      onChange={(event) => setStartTime(event.target.value)}
                    >
                      <option value="">
                        {occupied === null ? copy.loading : copy.chooseTime}
                      </option>
                      {slots.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="players-field">
                    {copy.players}
                    <input
                      value={players}
                      onChange={(event) => setPlayers(event.target.value)}
                      required
                      minLength={2}
                      maxLength={160}
                    />
                  </label>
                </div>
                {availabilityError ? (
                  <p role="alert" className="form-error">
                    {copy.availabilityError}
                  </p>
                ) : occupied && !slots.length ? (
                  <p role="status" className="field-help">
                    {copy.noSlots}
                  </p>
                ) : null}
                <div className="booking-form-actions">
                  <Button
                    type="submit"
                    disabled={
                      !validSlot || availabilityError || !players.trim()
                    }
                  >
                    {busy === "booking" ? copy.loading : copy.confirm}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setRefresh((value) => value + 1)}
                  >
                    <RefreshCw size={16} aria-hidden="true" />
                    {copy.refresh}
                  </Button>
                </div>
              </fieldset>
            </form>
          </section>
        ) : null}
        {section === "bookings" ? (
          <section
            className="member-reservations"
            aria-labelledby="reservations-title"
          >
            <h2 id="reservations-title">
              <CalendarDays size={24} aria-hidden="true" />
              {copy.upcoming}
            </h2>
            <div className="member-tabs" role="group" aria-label={copy.area}>
              <Button
                variant={tab === "upcoming" ? "default" : "outline"}
                aria-pressed={tab === "upcoming"}
                onClick={() => setTab("upcoming")}
              >
                {copy.upcoming}
              </Button>
              <Button
                variant={tab === "past" ? "default" : "outline"}
                aria-pressed={tab === "past"}
                onClick={() => setTab("past")}
              >
                {copy.past}
              </Button>
            </div>
            {!shown.length ? (
              <p className="empty-bookings">{copy.empty}</p>
            ) : (
              <div className="booking-list">
                {shown.map((booking) => {
                  const formatted = formatBooking(booking, locale);
                  const share = getWhatsAppMessage(booking, locale);
                  return (
                    <article
                      className="booking-card"
                      key={booking.id}
                      data-testid={`booking-${booking.id}`}
                    >
                      <div>
                        <span className={`booking-badge ${booking.status}`}>
                          {booking.status === "confirmed"
                            ? copy.confirmed
                            : copy.cancelled}
                        </span>
                        <h3>{booking.court_name}</h3>
                        <p>{formatted.date}</p>
                        <strong>{formatted.time}</strong>
                        <p>{booking.players}</p>
                        <span className="field-help">{copy.free}</span>
                      </div>
                      {tab === "upcoming" ? (
                        <div className="booking-card-actions">
                          <CalendarReminder
                            booking={booking}
                            userId={profile.id}
                          />
                          <a
                            className="text-link"
                            href={share.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle size={17} aria-hidden="true" />
                            {copy.share}
                          </a>
                          <Button
                            variant="outline"
                            disabled={Boolean(busy)}
                            onClick={() => cancel(booking)}
                          >
                            {busy === booking.id ? copy.loading : copy.cancel}
                          </Button>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}
        {section === "members" &&
          profile.role === "admin" &&
          profile.member_active && <MembershipAdmin locale={locale} />}
        {section === "members" &&
        profile.role === "admin" &&
        profile.member_active ? (
          <section className="member-approval" aria-labelledby="approval-title">
            <h2 id="approval-title">{copy.admin}</h2>
            <p>{copy.approvalHelp}</p>
            {!members.length ? (
              <p className="empty-bookings">{copy.noMembers}</p>
            ) : (
              <ul>
                {members.map((member) => (
                  <li key={member.id}>
                    <div>
                      <strong>{member.full_name}</strong>
                      <p>{member.email}</p>
                      <span className="field-help">
                        {member.role === "admin"
                          ? copy.adminRole
                          : member.member_active
                            ? copy.active
                            : copy.inactive}
                      </span>
                    </div>
                    {member.role !== "admin" ? (
                      <div className="booking-card-actions">
                        <Button
                          variant="outline"
                          disabled={!ready || Boolean(busy)}
                          onClick={() => changeMember(member)}
                        >
                          {busy === member.id
                            ? copy.loading
                            : member.member_active
                              ? copy.deactivate
                              : copy.activate}
                        </Button>
                        <Button
                          variant="outline"
                          disabled={!ready || Boolean(busy)}
                          onClick={() => changeMember(member, true)}
                        >
                          {copy.grantAdmin}
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
