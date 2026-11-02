"use client";
import { useEffect, useState } from "react";
import { IconSearch, IconUser, IconUsers } from "@tabler/icons-react";
import type { Participant } from "@/lib/bookings";
import type { Locale } from "@/i18n/routing";

export const participantCopy = {
  ca: { mode: "Modalitat del partit", singles: "Individual", doubles: "Dobles", participants: "Participants", member: "Soci", guest: "Convidat · no soci", search: "Cerca un soci pel nom", name: "Nom i cognoms del convidat", choose: "Selecciona un soci dels resultats.", empty: "No s’han trobat socis.", error: "No s’ha pogut cercar. Torna-ho a provar.", player: "Jugador", you: "Tu", summary: "Resum de la reserva", history: "Els meus partits", filter: "Cerca per pista o jugador", all: "Totes les modalitats" },
  es: { mode: "Modalidad del partido", singles: "Individual", doubles: "Dobles", participants: "Participantes", member: "Socio", guest: "Invitado · no socio", search: "Busca un socio por nombre", name: "Nombre y apellidos del invitado", choose: "Selecciona un socio de los resultados.", empty: "No se han encontrado socios.", error: "No se ha podido buscar. Vuelve a intentarlo.", player: "Jugador", you: "Tú", summary: "Resumen de la reserva", history: "Mis partidos", filter: "Busca por pista o jugador", all: "Todas las modalidades" },
  en: { mode: "Match format", singles: "Singles", doubles: "Doubles", participants: "Participants", member: "Member", guest: "Guest · non-member", search: "Search members by name", name: "Guest’s full name", choose: "Select a member from the results.", empty: "No members found.", error: "Search failed. Please try again.", player: "Player", you: "You", summary: "Booking summary", history: "My matches", filter: "Search court or player", all: "All formats" },
};

function Player({ value, onChange, excluded, locale, index }: { value: Participant; onChange: (p: Participant) => void; excluded: string[]; locale: Locale; index: number }) {
  const t = participantCopy[locale];
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{id: string; full_name: string}[]>([]);
  const [status, setStatus] = useState("");
  useEffect(() => {
    setResults([]); setStatus("");
    if (value.kind !== "member" || value.member_id || query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("…");
      try {
        const r = await fetch(`/api/members?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal, cache: "no-store" });
        if (!r.ok) throw Error();
        const d = await r.json(); setResults(d.members); setStatus(d.members.length ? "" : t.empty);
      } catch { if (!controller.signal.aborted) setStatus(t.error); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, value.kind, value.member_id, t]);
  return <div className="participant-row">
    <label>{t.player} {index + 2}<select aria-label={`${t.player} ${index + 2} · ${t.mode}`} value={value.kind} onChange={e => { setQuery(""); onChange({kind: e.target.value as Participant["kind"], name: ""}); }}><option value="member">{t.member}</option><option value="guest">{t.guest}</option></select></label>
    {value.kind === "guest" ? <label>{t.name}<input required maxLength={100} minLength={2} value={value.name} onChange={e => onChange({kind: "guest", name: e.target.value})}/></label> : <div className="member-search"><label><IconSearch size={16} aria-hidden="true"/>{t.search}<input type="search" autoComplete="off" value={value.member_id ? value.name : query} onChange={e => {setQuery(e.target.value); onChange({kind:"member",name:""});}}/></label>{!value.member_id && <><p className="field-help">{t.choose}</p>{results.filter(r => !excluded.includes(r.id)).map(r => <button type="button" key={r.id} onClick={() => onChange({kind:"member", member_id:r.id, name:r.full_name})}><IconUser size={16} aria-hidden="true"/>{r.full_name}</button>)}</>}<p role="status" className="field-help">{status}</p></div>}
  </div>;
}

export function BookingParticipants({locale, mode, setMode, participants, onChange, name, userId}: {locale: Locale; mode: "singles" | "doubles"; setMode: (m:"singles"|"doubles")=>void; participants: Participant[]; onChange:(p:Participant[])=>void; name:string; userId:string}) {
  const t=participantCopy[locale];
  return <div className="booking-players"><h3><IconUsers size={22} aria-hidden="true"/>{t.participants}</h3><div className="format-control" role="group" aria-label={t.mode}>{(["singles","doubles"] as const).map(m=><button type="button" key={m} aria-pressed={mode===m} onClick={()=>{setMode(m);onChange(Array.from({length:m==="singles"?1:3},(_,i)=>participants[i]??{kind:"member",name:""}));}}>{t[m]} · {m==="singles"?2:4}</button>)}</div><p className="participant-self"><IconUser size={18} aria-hidden="true"/>{name} · {t.you}</p>{participants.map((p,i)=><Player key={i} value={p} index={i} locale={locale} excluded={[userId,...participants.filter((_,j)=>j!==i).map(p=>p.member_id??"")]} onChange={v=>onChange(participants.map((p,j)=>i===j?v:p))}/>)}</div>;
}
