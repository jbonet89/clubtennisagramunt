"use client";
import Image from "next/image";
import { IconArrowUpRight, IconCalendarEvent, IconCheck, IconKey, IconLeaf, IconUsers } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { formatBooking, type Booking } from "@/lib/bookings";
import { portalCopy } from "@/messages/portal";
import type { Locale } from "@/i18n/routing";
import type { MemberCopy } from "@/messages/members";
import { CalendarReminder } from "./member-activity";

export function MemberBookingAside({bookings,locale,userId,copy,onCancel,busy}:{bookings:Booking[];locale:Locale;userId:string;copy:MemberCopy;onCancel:(booking:Booking)=>void;busy:boolean}) {
  const t=portalCopy[locale];
  const next=bookings.filter(b=>b.status==="confirmed"&&new Date(b.start_time).getTime()>Date.now()).sort((a,b)=>a.start_time.localeCompare(b.start_time))[0];
  return <aside className="booking-aside">
    <section className="next-match"><header><h2><IconCalendarEvent size={18} aria-hidden="true"/>{t.next}</h2>{next&&<span className="booking-badge"><IconCheck size={12} aria-hidden="true"/>{copy.confirmed}</span>}</header>
      {next ? <><h3>{new Date(next.start_time).toLocaleTimeString(locale,{timeZone:"Europe/Madrid",hour:"2-digit",minute:"2-digit"})}</h3><p>{formatBooking(next,locale).date}</p><div className="next-match-detail"><strong>{next.court_name}</strong><p>{formatBooking(next,locale).time}</p><p><IconUsers size={15} aria-hidden="true"/>{next.players}</p></div><div className="next-match-actions"><CalendarReminder booking={next} userId={userId}/><button type="button" disabled={busy} onClick={()=>onCancel(next)}>{copy.cancel}</button></div></> : <p className="next-match-empty">{t.none}</p>}
      <Link href="/socis?section=bookings">{t.view}<IconArrowUpRight size={16} aria-hidden="true"/></Link>
    </section>
    <section className="portal-rules"><h2><IconLeaf size={19} aria-hidden="true"/>{t.rules}</h2><ul><li><IconKey size={17} aria-hidden="true"/>{t.keys}</li><li><IconCalendarEvent size={17} aria-hidden="true"/>{t.cancellation}</li><li><IconCheck size={17} aria-hidden="true"/>{t.maintenance}</li></ul></section>
  </aside>;
}

export function CourtCare({locale}:{locale:Locale}) {
  const t=portalCopy[locale];
  return <section className="court-care"><Image src="/images/pista-terra-original.png" alt="" width={200} height={160}/><div><h2>{t.care}</h2><p>{t.careBody}</p></div></section>;
}
