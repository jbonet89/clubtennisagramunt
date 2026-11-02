"use client";
import {useEffect,useState,type FormEvent} from "react";
import { IconTrophy, IconBallTennis, IconCalendar, IconArrowUpRight, IconPlus, IconCheck, IconChartBar } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { portalCopy } from "@/messages/portal";
import { activityCopy } from "@/messages/activity";
import type { Locale } from "@/i18n/routing";
import type {Booking,Profile} from "@/lib/bookings";
type Result={booking_id:string;sets:number[][]};
async function post(value:unknown){const r=await fetch("/api/activity",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});const d=await r.json();if(!r.ok)throw Error(d.error);}
export function MemberActivity({bookings,locale="ca"}:{bookings:Booking[];locale?:Locale}) {
 const t=activityCopy[locale];
 const portal=portalCopy[locale];
 const [chosenBooking,setChosenBooking]=useState("");
 const [scoreSets,setScoreSets]=useState<string[][]>([["",""],["",""],["",""]]);
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
 useEffect(()=>{
   const existing=results.find(r=>r.booking_id===(chosenBooking||eligible[0]?.id));
   const rows=existing?.sets.map(pair=>pair.map(String))??[];
   setScoreSets(Array.from({length:Math.max(3,rows.length)},(_,i)=>rows[i]??["",""]));
 },[chosenBooking,results]);
 const totals=results.reduce((a,r)=>{let own=0,other=0;r.sets.forEach(([x,y])=>{a.games+=x;a.totalGames+=x+y;if(x>y){own++;a.sets++;}else other++;a.totalSets++;});if(own>other)a.wins++;if(own!==other)a.matches++;return a;},{wins:0,matches:0,games:0,totalGames:0,sets:0,totalSets:0});
 async function submit(e:FormEvent<HTMLFormElement>) {
   e.preventDefault();setBusy(true);setMessage("");
   const fd=new FormData(e.currentTarget);
   const booking_id=String(fd.get("booking_id"));
   const sets=scoreSets.filter(pair=>pair.some(Boolean)).map(pair=>pair.map(Number));
   try {await post({booking_id,sets});setResults(rs=>[...rs.filter(r=>r.booking_id!==booking_id),{booking_id,sets}]);setMessage(t.saved);}
   catch {setMessage(t.saveError);} finally {setBusy(false);}
 }
 const stats=[[t.wonMatches,totals.wins,totals.matches],[t.wonGames,totals.games,totals.totalGames],[t.wonSets,totals.sets,totals.totalSets]] as const;
 const outcome=(r:Result)=>{const won=r.sets.filter(([a,b])=>a>b).length;const lost=r.sets.length-won;return won>lost?"win":won<lost?"loss":"draw";};
 return <div className="activity-layout">
  <div className="activity-primary">
   <header className="activity-heading"><p>{t.intro}</p></header>
   {message&&<p className="activity-message" role="status">{message}</p>}
   {loading?<p role="status">{t.loading}</p>:<div className="match-stat-cards">{stats.map(([label,value,total],i)=><section key={label} data-stat={i}><header><h3>{label}</h3>{i===0?<IconTrophy size={17}/>:i===1?<IconBallTennis size={17}/>:<IconChartBar size={17}/>}</header><div className="stat-fraction"><strong>{value}</strong><span>/ {total}</span><small>{total?Math.round(value/total*100):0}%</small></div><meter aria-label={label} min={0} max={total||1} value={value}/></section>)}</div>}
   <p className="activity-note">{t.draws}</p>
   <section className="result-editor"><header><h3><IconPlus size={20} aria-hidden="true"/>{portal.resultForm}</h3><span>{portal.noCost}</span></header>
   {!eligible.length?<p>{t.noMatches}</p>:<form onSubmit={submit} className="result-form">
     <label className="result-match">{t.match}<select name="booking_id" required value={chosenBooking||eligible[0]?.id||""} onChange={e=>setChosenBooking(e.target.value)}>{eligible.map(b=><option key={b.id} value={b.id}>{new Date(b.start_time).toLocaleDateString(locale,{timeZone:"Europe/Madrid"})} · {b.court_name} · {b.players}</option>)}</select></label>
     <fieldset className="set-entry"><legend>{t.score}</legend><div className="set-inputs">{scoreSets.map((pair,i)=><div className="set-input" key={i}><span>{portal.set} {i+1}</span><div>{pair.map((n,j)=><label key={j}><span className="sr-only">{portal.set} {i+1} · {j===0?portal.yourScore:portal.rivalScore}</span><input type="number" inputMode="numeric" min={0} max={7} required={i===0||pair.some(Boolean)} value={n} placeholder="–" onChange={e=>setScoreSets(rows=>rows.map((row,k)=>k===i?row.map((v,l)=>l===j?e.target.value:v):row))}/></label>)}</div></div>)}</div>{scoreSets.length<5&&<button type="button" className="add-set" onClick={()=>setScoreSets(rows=>[...rows,["",""]])}><IconPlus size={14} aria-hidden="true"/>{portal.addSet}</button>}</fieldset>
     <div className="result-form-footer"><p>{t.help}</p><button type="submit" disabled={busy||loading}><IconCheck size={17} aria-hidden="true"/>{busy?t.saving:t.save}</button></div>
   </form>}
   </section>
   <section className="result-history"><header><h3>{t.history}</h3><span>{eligible.length}</span></header>
   <div className="history-filters"><label>{t.search}<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label><label>{t.mode}<select value={format} onChange={e=>setFormat(e.target.value)}><option value="">{t.all}</option><option value="singles">{t.singles}</option><option value="doubles">{t.doubles}</option></select></label></div>
   <div className="match-history">{shown.map(b=>{const r=results.find(r=>r.booking_id===b.id);const state=r?outcome(r):"pending";const date=new Date(b.start_time);return <article key={b.id}><time className="match-date" dateTime={b.start_time}><span>{date.toLocaleDateString(locale,{month:"short",timeZone:"Europe/Madrid"})}</span><strong>{date.toLocaleDateString(locale,{day:"2-digit",timeZone:"Europe/Madrid"})}</strong></time><div className="match-info"><h4>{b.players}</h4><p>{b.court_name}{b.match_format?` · ${t[b.match_format]}`:""}</p><span>{date.toLocaleTimeString(locale,{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Madrid"})}</span></div><div className="match-score" aria-label={t.score}>{r?.sets.map((pair,i)=><span key={i}><strong>{pair[0]}</strong><span>{pair[1]}</span></span>)}</div><div className="match-result"><span data-outcome={state}>{loading?t.loading:r?portal[state as "win"|"loss"|"draw"]:t.pending}</span><button type="button" aria-label={`${portal.resultForm} · ${b.players}`} onClick={()=>{setChosenBooking(b.id);document.querySelector('.result-editor')?.scrollIntoView({behavior:"smooth",block:"center"});}}><IconArrowUpRight size={17} aria-hidden="true"/></button></div></article>})}{!shown.length&&<p>{t.noResults}</p>}</div>
   </section>
  </div>
  <aside className="activity-aside">
   <section className="personal-record"><h3><IconTrophy size={19} aria-hidden="true"/>{portal.record}</h3><div><strong>{totals.wins}<small> / {totals.matches}</small></strong><span>{t.wonMatches}</span></div><p>{results.length} {portal.matches}</p><ul>{results.slice(-4).reverse().map(r=><li key={r.booking_id}><span>{bookings.find(b=>b.id===r.booking_id)?.court_name??t.match}</span><strong>{r.sets.map(s=>s.join("–")).join(" · ")}</strong></li>)}</ul></section>
   <section className="play-again"><IconBallTennis size={24} aria-hidden="true"/><h3>{portal.play}</h3><p>{portal.playBody}</p><Link href="/socis?section=reserve">{portal.reserve}<IconArrowUpRight size={17} aria-hidden="true"/></Link></section>
  </aside>
 </div>;
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
