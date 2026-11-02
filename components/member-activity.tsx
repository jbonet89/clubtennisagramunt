"use client";
import {useEffect,useState,type FormEvent} from "react";
import { IconTrophy, IconBallTennis, IconCalendar } from "@tabler/icons-react";
import { activityCopy } from "@/messages/activity";
import type { Locale } from "@/i18n/routing";
import type {Booking,Profile} from "@/lib/bookings";
type Result={booking_id:string;sets:number[][]};
async function post(value:unknown){const r=await fetch("/api/activity",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});const d=await r.json();if(!r.ok)throw Error(d.error);}
export function MemberActivity({bookings,locale="ca"}:{bookings:Booking[];locale?:Locale}) {
 const t=activityCopy[locale];
 const [search,setSearch]=useState("");
 const [format,setFormat]=useState("");
 const [results,setResults]=useState<Result[]>([]);
 const [message,setMessage]=useState("");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
   const controller=new AbortController();
   setLoading(true);
   fetch("/api/activity",{cache:"no-store",signal:controller.signal})
     .then(async r=>{if(!r.ok)throw Error();const d=await r.json();setResults(d.results);})
     .catch(()=>{if(!controller.signal.aborted)setMessage(t.error);})
     .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
   return ()=>controller.abort();
 },[t]);
 const eligible=bookings.filter(b=>b.status==="confirmed"&&new Date(b.end_time).getTime()<=Date.now());
 const shown=eligible.filter(b=>(!format||b.match_format===format)&&`${b.players} ${b.court_name}`.toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale)));
 const totals=results.reduce((a,r)=>{let own=0,other=0;r.sets.forEach(([x,y])=>{a.games+=x;a.totalGames+=x+y;if(x>y){own++;a.sets++;}else other++;a.totalSets++;});if(own>other)a.wins++;if(own!==other)a.matches++;return a;},{wins:0,matches:0,games:0,totalGames:0,sets:0,totalSets:0});
 async function submit(e:FormEvent<HTMLFormElement>) {
   e.preventDefault();setBusy(true);setMessage("");
   const fd=new FormData(e.currentTarget);
   const booking_id=String(fd.get("booking_id"));
   const sets=String(fd.get("score")).trim().split(/\s+/).map(s=>s.split("-").map(Number));
   try {await post({booking_id,sets});setResults(rs=>[...rs.filter(r=>r.booking_id!==booking_id),{booking_id,sets}]);setMessage(t.saved);}
   catch {setMessage(t.saveError);} finally {setBusy(false);}
 }
 return <section className="member-activity">
   <h2>{t.title}</h2><p>{t.intro}</p>
   {message&&<p role="status">{message}</p>}
   {loading?<p role="status">{t.loading}</p>:<div className="member-statistics">{[[t.wonMatches,totals.wins,totals.matches],[t.wonGames,totals.games,totals.totalGames],[t.wonSets,totals.sets,totals.totalSets]].map(([label,value,total])=><div key={label}><strong>{label}: {value} / {total}</strong><meter aria-label={String(label)} min={0} max={Number(total)||1} value={Number(value)}/></div>)}</div>}
   <p>{t.draws}</p>
   {!eligible.length?<p>{t.noMatches}</p>:<form onSubmit={submit} className="booking-form">
     <label>{t.match}<select name="booking_id" required>{eligible.map(b=><option key={b.id} value={b.id}>{new Date(b.start_time).toLocaleDateString(locale,{timeZone:"Europe/Madrid"})} · {b.players}</option>)}</select></label>
     <label>{t.score}<input name="score" required placeholder="6-4 3-6 7-5" pattern="[0-7]-[0-7]( [0-7]-[0-7]){0,4}"/></label>
     <p>{t.help}</p><button disabled={busy||loading}>{busy?t.saving:t.save}</button>
   </form>}
   <h3>{t.history}</h3>
   <div className="history-filters"><label>{t.search}<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label><label>{t.mode}<select value={format} onChange={e=>setFormat(e.target.value)}><option value="">{t.all}</option><option value="singles">{t.singles}</option><option value="doubles">{t.doubles}</option></select></label></div>
   <div className="match-history">{shown.map(b=>{const r=results.find(r=>r.booking_id===b.id);return <article key={b.id}><div><h4><IconBallTennis size={18} aria-hidden="true"/> {b.players}</h4><p><IconCalendar size={16} aria-hidden="true"/> {new Date(b.start_time).toLocaleDateString(locale,{timeZone:"Europe/Madrid"})} · {b.court_name}{b.match_format?` · ${t[b.match_format]}`:""}</p></div><strong>{loading?t.loading:r?<><IconTrophy size={17} aria-hidden="true"/> {r.sets.map(s=>s.join("–")).join(" · ")}</>:t.pending}</strong></article>})}{!shown.length&&<p>{t.noResults}</p>}</div>
 </section>;
}
export function MemberProfile({profile}:{profile:Profile}){
 const [name,setName]=useState(profile.full_name);const [phone,setPhone]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);const [minutes,setMinutes]=useState("30");
 useEffect(()=>{setMinutes(localStorage.getItem("cta-reminder-"+profile.id)??"30");fetch("/api/activity",{cache:"no-store"}).then(r=>r.json()).then(d=>{if(d.profile){setName(d.profile.full_name);setPhone(d.profile.phone??"");}}).catch(()=>setMessage("No s’ha pogut carregar el perfil."));},[profile.id]);
 return <section><h2>Perfil</h2><form className="booking-form" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await post({action:"profile",full_name:name,phone});setMessage("Dades desades.");}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}><label>Nom i cognoms<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label><label>Telèfon<input type="tel" maxLength={40} value={phone} onChange={e=>setPhone(e.target.value)}/></label><p>Correu del compte: {profile.email}</p><button disabled={busy}>Desar perfil</button></form>{message&&<p role="status">{message}</p>}<h2>Notificacions</h2><label>Recordatori de reserva<select value={minutes} onChange={e=>{setMinutes(e.target.value);localStorage.setItem("cta-reminder-"+profile.id,e.target.value);window.dispatchEvent(new Event("cta-reminder-change"));}}><option value="0">Desactivat</option><option value="30">30 minuts abans</option><option value="60">60 minuts abans</option></select></label><button onClick={async()=>{if(!("Notification" in window)){setMessage("Aquest navegador no admet avisos. Utilitza el calendari.");return;}const permission=await Notification.requestPermission();setMessage(permission==="granted"?"Avisos permesos mentre la web estigui oberta.":"Avisos no autoritzats. Revisa els permisos del navegador.");}}>Permetre avisos en aquest dispositiu</button><p>Preferència guardada en aquest navegador. Els avisos requereixen la web oberta; per rebre una alarma amb la web tancada, afegeix la reserva al calendari des de «Les meves reserves». Web Push en segon pla encara no està activat.</p></section>;
}
export function BookingReminders({bookings,userId}:{bookings:Booking[];userId:string}){
 const [notice,setNotice]=useState("");useEffect(()=>{const sent=new Set<string>();function check(){const minutes=Number(localStorage.getItem("cta-reminder-"+userId)??30);if(!minutes)return;for(const b of bookings){const remaining=new Date(b.start_time).getTime()-Date.now();const key=b.id+":"+minutes;if(b.status!=="confirmed"||remaining<=0||remaining>minutes*60000||sent.has(key))continue;sent.add(key);const text=`La teva reserva a ${b.court_name} comença a les ${new Date(b.start_time).toLocaleTimeString("ca-ES",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Madrid"})}.`;setNotice(text);if("Notification" in window&&Notification.permission==="granted")new Notification("Club Tennis Agramunt",{body:text,tag:key});}}check();const timer=setInterval(check,30000);window.addEventListener("cta-reminder-change",check);return()=>{clearInterval(timer);window.removeEventListener("cta-reminder-change",check);};},[bookings,userId]);return notice?<p className="member-reminder" role="status">{notice}</p>:null;
}
export function CalendarReminder({booking,userId}:{booking:Booking;userId:string}){return <button className="text-link" onClick={()=>{const minutes=Number(localStorage.getItem("cta-reminder-"+userId)??30);const stamp=(s:string)=>new Date(s).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");const text=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//CTA//Reserves//CA","BEGIN:VEVENT",`UID:${booking.id}@clubtennisagramunt`,`DTSTAMP:${stamp(new Date().toISOString())}`,`DTSTART:${stamp(booking.start_time)}`,`DTEND:${stamp(booking.end_time)}`,"SUMMARY:Reserva Club Tennis Agramunt",...(minutes?["BEGIN:VALARM",`TRIGGER:-PT${minutes}M`,"ACTION:DISPLAY","DESCRIPTION:Reserva de pista","END:VALARM"]:[]),"END:VEVENT","END:VCALENDAR"].join("\r\n");const url=URL.createObjectURL(new Blob([text],{type:"text/calendar;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="reserva-cta.ics";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Afegir al calendari amb recordatori</button>;}
