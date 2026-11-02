"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DateTime } from "luxon";
import { IconCheck, IconChevronDown, IconClock, IconX } from "@tabler/icons-react";
import { CLUB_ZONE, getAvailableSlots, type ClubSettings, type OccupiedSlot } from "@/lib/bookings";
import type { Locale } from "@/i18n/routing";

const copy = {
  ca: { title: "Tria l’hora del partit", choose: "Veure disponibilitat del dia", change: "Canviar hora", free: "Lliure", busy: "Ocupat", selected: "Seleccionat", unavailable: "Sense prou temps consecutiu", hint: "Tria l’inici. Marcarem automàticament els trams consecutius que necessites.", confirm: "Confirmar hora", close: "Tancar", empty: "No queden hores disponibles aquest dia.", start: "Inici", end: "Final", duration: "Durada", legend: "Disponibilitat", loading: "Carregant horaris…" },
  es: { title: "Elige la hora del partido", choose: "Ver disponibilidad del día", change: "Cambiar hora", free: "Libre", busy: "Ocupado", selected: "Seleccionado", unavailable: "Sin suficiente tiempo consecutivo", hint: "Elige el inicio. Marcaremos automáticamente los tramos consecutivos que necesitas.", confirm: "Confirmar hora", close: "Cerrar", empty: "No quedan horas disponibles este día.", start: "Inicio", end: "Final", duration: "Duración", legend: "Disponibilidad", loading: "Cargando horarios…" },
  en: { title: "Choose your match time", choose: "View day availability", change: "Change time", free: "Free", busy: "Booked", selected: "Selected", unavailable: "Not enough consecutive time", hint: "Choose a start. We’ll automatically select the consecutive blocks you need.", confirm: "Confirm time", close: "Close", empty: "No available times remain on this day.", start: "Start", end: "End", duration: "Duration", legend: "Availability", loading: "Loading times…" },
};

export function BookingTimePicker({ day, duration, settings, occupied, courtId, value, onChange, locale, disabled = false }: {
  day: string; duration: number; settings: ClubSettings; occupied: OccupiedSlot[] | null; courtId: string;
  value: string; onChange: (value: string) => void; locale: Locale; disabled?: boolean;
}) {
  const t = copy[locale];
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const starts = new Set(occupied ? getAvailableSlots(day, duration, settings, occupied, courtId).map(s => s.value) : []);
  const startOfDay = DateTime.fromISO(day, { zone: CLUB_ZONE });
  const endOfDay = startOfDay.plus({ minutes: settings.closing_minute });
  const now = DateTime.now();
  const blocks: { value: string; label: string; end: string; taken: boolean; canStart: boolean }[] = [];
  for (let start = startOfDay.plus({ minutes: settings.opening_minute }); start.plus({ minutes: 30 }) <= endOfDay; start = start.plus({ minutes: 30 })) {
    if (start <= now) continue;
    const end = start.plus({ minutes: 30 });
    const iso = start.toUTC().toISO()!;
    blocks.push({ value: iso, label: start.toFormat("HH:mm"), end: end.toFormat("HH:mm"), canStart: starts.has(iso), taken: !!occupied?.some(s => s.court_id === courtId && DateTime.fromISO(s.start_time) < end && DateTime.fromISO(s.end_time) > start) });
  }
  useEffect(() => { setOpen(false); setDraft(""); }, [day, courtId, duration]);
  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) element?.showModal();
    if (!open && element?.open) element.close();
  }, [open]);
  const label = (iso: string) => iso ? `${DateTime.fromISO(iso).setZone(CLUB_ZONE).toFormat("HH:mm")} – ${DateTime.fromISO(iso).setZone(CLUB_ZONE).plus({ minutes: duration }).toFormat("HH:mm")}` : "";
  const selectedStart = DateTime.fromISO(draft).toMillis();
  const selectedEnd = selectedStart + duration * 60000;
  function close() { setOpen(false); trigger.current?.focus(); }
  return <div className="time-picker">
    <button ref={trigger} className="time-picker-trigger" type="button" disabled={disabled || occupied === null} aria-haspopup="dialog" aria-expanded={open} onClick={() => { setDraft(starts.has(value) ? value : ""); setOpen(true); }}>
      <IconClock size={20} aria-hidden="true"/><span><strong>{occupied === null ? t.loading : value ? label(value) : t.choose}</strong><small>{value ? `${duration} min · ${t.change}` : `${duration} min · Europe/Madrid`}</small></span><IconChevronDown size={18} aria-hidden="true"/>
    </button>
    <dialog ref={dialog} className="time-picker-dialog" aria-labelledby={`${id}-title`} onCancel={close} onClose={close} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="time-picker-panel">
        <header><div><h2 id={`${id}-title`}>{t.title}</h2><p>{startOfDay.setLocale(locale).toLocaleString({weekday:"long", day:"numeric", month:"long"})} · {duration} min</p></div><button type="button" aria-label={t.close} onClick={close}><IconX size={22}/></button></header>
        <p className="time-picker-hint">{t.hint}</p>
        <div className="time-picker-legend" aria-label={t.legend}><span data-state="free">{t.free}</span><span data-state="busy">{t.busy}</span><span data-state="selected">{t.selected}</span></div>
        <div className="time-picker-blocks" role="group" aria-label={t.start}>
          {blocks.map(b => {
            const stamp = DateTime.fromISO(b.value).toMillis();
            const selected = stamp >= selectedStart && stamp < selectedEnd;
            return <button type="button" key={b.value} data-start={b.value} disabled={b.taken || !b.canStart} aria-pressed={selected} data-state={b.taken ? "busy" : selected ? "selected" : "free"} data-continuation={selected && b.value !== draft ? "true" : undefined} aria-label={`${b.label} – ${b.end} · ${b.taken ? t.busy : selected ? t.selected : !b.canStart ? t.unavailable : t.free}`} onClick={() => setDraft(b.value)}><strong>{b.label}</strong><small>{b.taken ? t.busy : selected ? <IconCheck size={15} aria-hidden="true"/> : "30 min"}</small></button>;
          })}
        </div>
        {!starts.size && <p role="status">{t.empty}</p>}
        <footer><div role="status"><strong>{draft ? label(draft) : t.choose}</strong><small>{draft ? `${duration / 30} × 30 min · ${duration} min` : t.hint}</small></div><button type="button" className="time-picker-confirm" disabled={!starts.has(draft)} onClick={() => { onChange(draft); close(); }}><IconCheck size={18} aria-hidden="true"/>{t.confirm}</button></footer>
      </div>
    </dialog>
  </div>;
}
