// Isolated browser check with mocked API responses. No live accounts or bookings.
import { chromium } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { DateTime } from "luxon";
const preview = "app/[locale]/portal-verification";
const port = 3107;
let server;
let browser;
try {
  await mkdir(preview, { recursive: true });
  await mkdir("artifacts/portal", { recursive: true });
  await writeFile(`${preview}/page.tsx`, `import {BookingDashboard} from '@/components/booking-dashboard';
import {MemberShell} from '@/components/member-shell';
import {getMemberCopy} from '@/messages/members';
import {AdminPanel} from '@/components/admin-panel';
export default async function Preview({searchParams}:{searchParams:Promise<{section?:string;lang?:string}>}){const p=await searchParams;if(p.section==='admin')return <AdminPanel/>;const locale=(p.lang??'ca') as 'ca'|'es'|'en';const copy=getMemberCopy(locale);const profile={id:'10000000-0000-4000-8000-000000000001',full_name:'Anna Soler',email:'preview@example.test',role:'member',member_active:true};return <MemberShell locale={locale} section="socis" copy={copy}><BookingDashboard section={(p.section??'reserve') as 'reserve'} locale={locale} copy={copy} profile={profile} courts={[{id:'20000000-0000-4000-8000-000000000001',name:'Pista 1',surface:'clay',status:'active'},{id:'20000000-0000-4000-8000-000000000002',name:'Pista 2',surface:'clay',status:'active'},{id:'20000000-0000-4000-8000-000000000003',name:'Pista 3',surface:'hardcourt',status:'active'}]} settings={{opening_minute:480,closing_minute:1380,booking_horizon_days:14}} initialMembers={[]} initialBookings={[{id:'historical',court_id:'court',court_name:'Pista 1',players:'Anna Soler · Marta Rius',start_time:'2025-10-03T08:00:00Z',end_time:'2025-10-03T09:00:00Z',status:'confirmed',payment_status:'free_member',match_format:'singles',participants:[{kind:'member',member_id:profile.id,name:profile.full_name},{kind:'guest',name:'Marta Rius'}]}]}/></MemberShell>;}`);
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)], { stdio: "ignore", windowsHide: true });
  const url=`http://127.0.0.1:${port}/ca/portal-verification`;
  for(let i=0;i<90;i++) { try { if((await fetch(url)).ok) break; } catch {} await new Promise(r=>setTimeout(r,1000)); }
  browser=await chromium.launch();
  for(const [name,width,height] of [["desktop",1440,1000],["mobile",390,844]]) {
    const page=await browser.newPage({viewport:{width,height}});
    const errors=[]; page.on("pageerror",e=>errors.push(e.message)); page.on("console",m=>{if(m.type()==="error") console.log("Browser console:",m.text());});
    let submitted;
    await page.route("**/api/bookings**",async route=>{
      if(route.request().method()==="GET") return route.fulfill({json:{occupied:[]}});
      submitted=route.request().postDataJSON();
      return route.fulfill({status:201,json:{booking:{id:"new-booking",court_id:submitted.courtId,court_name:"Pista 1",players:"Anna Soler · Joan Puig · Marta Rius · Pau Vila",start_time:submitted.startTime,end_time:DateTime.fromISO(submitted.startTime).plus({minutes:submitted.duration}).toISO(),status:"confirmed",payment_status:"free_member",match_format:submitted.matchFormat,participants:submitted.participants}}});
    });
    await page.route("**/api/members?**",route=>route.fulfill({json:{members:[{id:"30000000-0000-4000-8000-000000000001",full_name:"Joan Puig"}]}}));
    await page.route("**/api/admin",route=>route.fulfill({json:{sections:[{id:"resum",enabled:true},{id:"convidats",enabled:true}],convidats:[{name:"Marta Rius",appearances:3,last_played:"2026-10-30T08:00:00Z"}]}}));
    await page.route("**/api/activity",route=>route.fulfill({json:{results:[{booking_id:"historical",sets:[[6,4],[6,3]]}]}}));
    await page.goto(url);
    await page.locator('input[type=date]').fill(DateTime.now().setZone("Europe/Madrid").plus({days:1}).toISODate());
    await page.getByRole("button",{name:"Dobles · 4",exact:true}).click();
    if(await page.locator('.participant-row').count()!==3) throw Error("Doubles needs three additional players");
    await page.getByLabel("Cerca un soci pel nom").nth(0).fill("Joan");
    await page.getByRole("button",{name:"Joan Puig",exact:true}).click();
    for(const [i,guest] of [[1,"Marta Rius"],[2,"Pau Vila"]]) {
      const row=page.locator('.participant-row').nth(i);
      await row.locator('select').selectOption('guest');
      await row.locator('input').fill(guest);
    }
    await page.locator('.slot-options button').first().click();
    await page.evaluate(()=>document.fonts.ready);
    await page.addStyleTag({content:"nextjs-portal{display:none!important}"}); await page.evaluate(()=>window.scrollTo(0,0)); await page.screenshot({path:`artifacts/portal/reserve-${name}.png`,fullPage:true});
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw Error(`Overflow ${name}`);
    await page.getByRole('button',{name:'Confirma la reserva gratuïta'}).click();
    await page.getByTestId('booking-confirmation').waitFor();
    if(submitted.matchFormat!=="doubles" || submitted.participants.filter(p=>p.kind==='guest').length!==2 || !submitted.participants[0].member_id) throw Error('Wrong participant payload');
    await page.goto(url+'?section=bookings');
    await page.getByRole('button',{name:'Historial i cancel·lacions',exact:true}).click();
    await page.getByTestId('booking-historical').waitFor();
    await page.addStyleTag({content:"nextjs-portal{display:none!important}"}); await page.evaluate(()=>window.scrollTo(0,0)); await page.screenshot({path:`artifacts/portal/bookings-${name}.png`,fullPage:true});
    await page.goto(url+'?section=matches');
    await page.getByText('6–4 · 6–3',{exact:false}).waitFor();
    await page.addStyleTag({content:"nextjs-portal{display:none!important}"}); await page.evaluate(()=>window.scrollTo(0,0)); await page.screenshot({path:`artifacts/portal/matches-${name}.png`,fullPage:true});
    for(const [lang,title] of [["es","Partidos y estadísticas"],["en","Matches and statistics"]]) {
      await page.goto(url+'?section=matches&lang='+lang);
      await page.getByRole('heading',{name:title,exact:true}).waitFor();
    }
    await page.goto(url+'?section=admin');
    await page.getByRole('button',{name:'Jugadors convidats',exact:true}).click();
    await page.getByText('Marta Rius',{exact:true}).waitFor();
    const downloadPromise=page.waitForEvent('download');
    await page.getByRole('button',{name:'Exportar CSV',exact:true}).click();
    const download=await downloadPromise;
    if(download.suggestedFilename()!=='convidats-cta.csv')throw Error('CSV export failed');
    await page.addStyleTag({content:"nextjs-portal{display:none!important}"});
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:`artifacts/portal/guests-${name}.png`,fullPage:true});
    if(errors.length) throw Error(errors.join('\n'));
    console.log(`${name}: doubles, member search, guests, confirmation, booking history, results, overflow OK`);
    await page.close();
  }
} finally {
  await browser?.close();
  server?.kill();
  await rm(preview,{recursive:true,force:true});
  // Remove only this temporary route's generated types, then refresh the route map.
  await rm(".next/types/app/[locale]/portal-verification",{recursive:true,force:true});
  spawnSync(process.execPath,["node_modules/next/dist/bin/next","typegen"],{stdio:"ignore",windowsHide:true});
}


