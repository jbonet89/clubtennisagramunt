// Browser fixtures only: no live accounts, uploads, approvals or payments.
import { chromium } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
const preview="app/[locale]/membership-verification";
const settings={id:true,adult_fee_cents:6500,junior_fee_cents:4000,season:"2026",bank_name:"Banc de prova · dades de demostració",iban:"ES9121000418450200051332",whatsapp:"34600000000",form_url:"https://example.test/formulari.pdf",note:"",updated_at:"2026-11-02T10:00:00Z"};
const application={id:"10000000-0000-4000-8000-000000000002",user_id:"10000000-0000-4000-8000-000000000001",category:"adult",phone:"600000000",payment_method:"transfer",fee_cents:6500,season:"2026",document_path:"test/form.pdf",receipt_path:"test/receipt.pdf",status:"submitted",review_note:"",submitted_at:"2026-11-02T10:00:00Z",applicant:{full_name:"Marta Solanes Puig",email:"marta@example.test"}};
const applications=[application,{...application,id:"10000000-0000-4000-8000-000000000003",payment_method:"direct_debit",receipt_path:null,applicant:{full_name:"Ferran Balcells Grau",email:"ferran@example.test"}},{...application,id:"10000000-0000-4000-8000-000000000004",category:"junior",fee_cents:4000,status:"changes_requested",review_note:"Cal una còpia llegible del formulari.",applicant:{full_name:"Pol Vilardell Pons",email:"pol@example.test"}}];
const adminData={sections:["resum","socis","families","documents","quotes","permisos","convidats"].map(id=>({id,enabled:true})),socis:[{id:"m1",full_name:"Jordi Coll Ramon",email:"jordi@example.test",phone:"600000001",family_id:"f1",status:"active"},{id:"m2",full_name:"Carme Balcells Puig",email:"carme@example.test",phone:"600000002",family_id:"f1",status:"active"},{id:"m3",full_name:"Pau Serra Font",email:"pau@example.test",phone:"600000003",family_id:"",status:"pending"}],families:[{id:"f1",name:"Família Coll Balcells"}],quotes:[{id:"q1",member_id:"m1",description:"Quota anual 2026",amount:"65",due_date:"2026-11-02",status:"paid"},{id:"q2",member_id:"m2",description:"Quota anual 2026",amount:"65",due_date:"2026-11-02",status:"paid"},{id:"q3",member_id:"m3",description:"Quota anual 2026",amount:"65",due_date:"2026-11-02",status:"pending"}],documents:[],profiles:[{id:"p1",full_name:"Compte pendent",email:"pending@example.test",role:"guest",member_active:false}],convidats:[]};
adminData.sections=adminData.sections.filter(s=>!["documents","quotes"].includes(s.id));
adminData.stats={active_members:2,total_members:3,total_dues:3,paid_dues:2,total_families:1};
adminData.socis=adminData.socis.map((m,i)=>({...m,document_count:i===1?2:0,quota_status:i===2?'pending':'paid',annual_fee_cents:6500,season:'2026',legacy_reference:'',profile_id:'p'+i,updated_at:'2026-11-02',invitation_status:'not_sent',outstanding_amount:i===2?65:0}));
let server,browser;
try{
 await mkdir(preview,{recursive:true});await mkdir("artifacts/membership-design",{recursive:true});
 await writeFile(`${preview}/page.tsx`,`import {BookingDashboard} from '@/components/booking-dashboard';
import {MemberShell} from '@/components/member-shell';import {getMemberCopy} from '@/messages/members';
export default async function Page({searchParams}:{searchParams:Promise<{view?:string;lang?:string}>}){const p=await searchParams;const view=p.view??'application';const locale=(p.lang??'ca') as 'ca'|'es'|'en';const profile={id:'10000000-0000-4000-8000-000000000001',full_name:'Marc Soler Puig',email:'marc@example.test',role:view==='admin'?'admin':view==='member'?'member':'guest',member_active:view==='admin'||view==='member'};const section=view==='admin'?'administration':view==='member'?'reserve':'account';const copy=getMemberCopy(locale);const settings=${JSON.stringify(settings)};const application=view==='submitted'?${JSON.stringify(application)}:view==='changes'?{...${JSON.stringify(application)},status:'changes_requested',review_note:'Aporta una còpia llegible.'}:null;return <MemberShell locale={locale} section="socis" copy={copy} memberName={profile.full_name}><BookingDashboard locale={locale} section={section} copy={copy} profile={profile} courts={[{id:'court',name:'Pista 1',surface:'clay',status:'active'}]} settings={{opening_minute:420,closing_minute:1380,booking_horizon_days:14}} initialBookings={[]} initialMembers={[]} membership={!profile.member_active?{settings,application:application as any}:undefined}/></MemberShell>;}`);
 server=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--hostname","127.0.0.1","--port","3109"],{stdio:"ignore",windowsHide:true});
 const url="http://127.0.0.1:3109/ca/membership-verification";
 for(let i=0;i<90;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,1000));}
 browser=await chromium.launch();
 for(const [size,width,height] of [["desktop",1440,1000],["mobile",390,844]]){
  for(const view of (process.env.MEMBER_DIRECTORY_ONLY ? ["admin"] : ["application","submitted","changes","admin","member"])){
   const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   let current=view==='submitted'?{...application}:view==='changes'?{...application,status:'changes_requested',review_note:'Aporta una còpia llegible.'}:null;
   let adminApplications=structuredClone(applications);let directory=structuredClone(adminData);let savedSubmission;
   await page.route('**/api/bookings?**',r=>r.fulfill({json:{occupied:[]}}));
   await page.route('**/api/admin',async route=>{if(route.request().method()==='GET')return route.fulfill({json:directory});const b=route.request().postDataJSON();if(b.section==='socis')directory.socis=directory.socis.map(r=>r.id===b.id?{...r,...b}:r);return route.fulfill({json:{ok:true}});});
   await page.route('**/api/admin/members**',async route=>{
    const u=new URL(route.request().url()),parts=u.pathname.split('/');const id=parts[4];
    if(!id){const q=(u.searchParams.get('q')||'').toLowerCase();const rows=directory.socis.filter(m=>(m.full_name+' '+m.email).toLowerCase().includes(q)&&(!u.searchParams.get('documents')||(u.searchParams.get('documents')==='yes'?m.document_count>0:m.document_count===0))&&(!u.searchParams.get('quota')||m.quota_status===u.searchParams.get('quota'))&&(!u.searchParams.get('status')||m.status===u.searchParams.get('status')));return route.fulfill({json:{members:rows,total:rows.length}});}
    if(route.request().method()==='PATCH'){const b=route.request().postDataJSON();directory.socis=directory.socis.map(m=>m.id===id?{...m,...b,updated_at:new Date().toISOString()}:m);return route.fulfill({json:{ok:true}});}
    const member=directory.socis.find(m=>m.id===id);return route.fulfill({json:{member,documents:[{id:'application-document',filename:'Formulari.pdf',kind:'form',source:'application',created_at:'2026-11-02'},{id:'manual-document',filename:'Mandat SEPA signat.pdf',kind:'mandate',source:'manual',created_at:'2026-11-02'}],dues:[{id:'due-1',member_id:id,description:'Quota anual 2026',amount:65,due_date:'2026-11-02',status:'paid',season:'2026'}]}});
   });
   await page.route('**/api/members',route=>{const b=route.request().postDataJSON();directory.profiles=directory.profiles.map(p=>p.id===b.userId?{...p,role:'member',member_active:b.active}:p);return route.fulfill({json:{ok:true}});});
   await page.route('**/api/membership/document',route=>route.fulfill({json:{path:'test/upload-'+Date.now()+'.pdf'}}));
   await page.route('**/api/membership',async route=>{
    if(route.request().method()==='GET')return route.fulfill({json:{settings,application:current,applications:view==='admin'?adminApplications:[],memberActive:view==='admin'||view==='member'}});
    const body=route.request().postDataJSON();
    if(body.action==='submit'){savedSubmission=body;current={...application,category:body.category,payment_method:body.method,phone:body.phone,receipt_path:body.receipt,document_path:body.document};}
    if(body.action==='review')adminApplications=adminApplications.map(a=>a.id===body.id?{...a,status:body.status,review_note:body.note}:a);
    if(body.action==='download')return route.fulfill({json:{url:'/api/test-document'}});
    return route.fulfill({json:{ok:true,id:application.id}});
   });
   await page.route('**/api/test-document',route=>route.fulfill({headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="document.pdf"'},body:'%PDF-1.4\n%%EOF'}));
   await page.goto(url+'?view='+view);
   await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
   if(view==='member'){
    if(await page.getByRole('link',{name:'Administració',exact:true}).count())throw Error('Member sees admin navigation');
   }else if(view==='admin'){
    await page.locator('.membership-review-grid article').first().waitFor();
    if(!await page.getByRole('link',{name:'Administració',exact:true}).isVisible())throw Error('Admin missing menu item');
    if(await page.locator('.member-admin-shortcut').count())throw Error('Legacy admin shortcut remains');
    await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:`artifacts/membership-design/admin-${size}.png`,fullPage:true});
    const card=page.getByTestId('application-'+application.id);await card.getByLabel('Missatge per al sol·licitant').fill('Revisa el document.');
    await card.getByRole('button',{name:'Demana una correcció',exact:true}).click();
    await card.getByText('Cal revisar la documentació',{exact:true}).waitFor();
    page.once('dialog',d=>d.accept());await card.getByRole('button',{name:'Valida el pagament i activa el soci',exact:true}).click();
    await page.getByRole('button',{name:'Totes les altes',exact:true}).click();
    await page.getByTestId('application-'+application.id).getByText('Alta aprovada',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Socis',exact:true}).click();
    await page.getByRole('searchbox').fill('Carme');
    await page.waitForFunction(()=>document.querySelectorAll('.directory-table tbody tr').length===1);
    await page.getByRole('button',{name:'Obrir fitxa · Carme Balcells Puig',exact:true}).click();
    await page.getByLabel('Telèfon',{exact:true}).fill('600123456');
    await page.getByRole('button',{name:'Desar',exact:true}).click();
    if(await page.getByLabel('Telèfon',{exact:true}).inputValue()!=='600123456')throw Error('Member edit failed');
    await page.locator('.member-document-upload').waitFor();
    await page.waitForFunction(()=>document.querySelector('.member-directory')?.getAttribute('aria-busy')==='false');
    await page.screenshot({path:`artifacts/membership-design/member-detail-${size}.png`,fullPage:true});
    await page.getByRole('button',{name:'Tornar al llistat',exact:true}).click();
    await page.getByRole('searchbox').fill('');
    await page.locator('.directory-filters select').nth(1).selectOption('yes');
    await page.waitForFunction(()=>document.querySelectorAll('.directory-table tbody tr').length===1);
    await page.screenshot({path:`artifacts/membership-design/member-directory-${size}.png`,fullPage:true});
    await page.getByRole('button',{name:'Permisos',exact:true}).click();
    await page.getByRole('button',{name:'Activar compte web',exact:true}).click();
    await page.getByText('Compte web actiu',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Desactivar compte web',exact:true}).click();
    await page.getByText('Compte web pendent o desactivat',{exact:true}).waitFor();
   }else if(view==='application'||view==='changes'){
    await page.getByRole('heading',{name:'Fes-te soci del CTA',exact:true}).waitFor();
    if(await page.getByRole('link',{name:'Administració',exact:true}).count())throw Error('Guest sees admin navigation');
    await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:`artifacts/membership-design/${view}-${size}.png`,fullPage:true});
    await page.getByRole('combobox',{name:'Forma de pagament',exact:true}).selectOption('direct_debit');
    if(await page.locator('input[name=receipt]').getAttribute('required')!==null)throw Error('SEPA receipt must be optional');
    await page.getByRole('combobox',{name:'Forma de pagament',exact:true}).selectOption('transfer');
    await page.getByLabel('Telèfon de contacte',{exact:true}).fill('600000000');
    for(const name of ['document','receipt'])await page.locator(`input[name=${name}]`).setInputFiles({name:name+'.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n%%EOF')});
    await page.getByRole('button',{name:'Envia la sol·licitud',exact:true}).click();
    await page.getByRole('heading',{name:'Sol·licitud enviada · pendent de validació',exact:true}).waitFor();
    if(!savedSubmission?.document||!savedSubmission?.receipt)throw Error('Missing submitted documents');
    if(await page.locator('.enrolment-application').count())throw Error('Completed form remains visible');
   }else{
    await page.getByRole('heading',{name:'Sol·licitud enviada · pendent de validació',exact:true}).waitFor();
    await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:`artifacts/membership-design/submitted-${size}.png`,fullPage:true});
    const downloaded=page.waitForEvent('download');
    await page.locator('.enrolment-documents>button').first().click();await downloaded;
    if(await page.locator('.enrolment-application').count())throw Error('Form still visible after submission');
   }
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow: '+view+' '+size);
   if(view==='application'||view==='submitted'||view==='admin'){
    for(const [lang,heading] of [["es",view==='admin'?"Administración de Socios y Cuotas":view==='submitted'?"Solicitud enviada · pendiente de validación":"Hazte socio del CTA"],["en",view==='admin'?"Members and Membership Fees":view==='submitted'?"Application submitted · awaiting approval":"Join CTA"]]){
     await page.goto(url+'?view='+view+'&lang='+lang);
     // Keep the mocked initial application state consistent after the submission check.
     if(view==='application'&&current)await page.getByRole('heading',{name:lang==='es'?"Solicitud enviada · pendiente de validación":"Application submitted · awaiting approval",exact:true}).waitFor();
     else await page.getByRole('heading',{name:heading,exact:true}).waitFor();
    }
   }
   if(errors.length)throw Error(errors.join('\n'));
   await page.close();
  }
  console.log(`${size}: admin-only menu, private application, receipt requirements, submitted summary, corrections, approval and census search OK`);
 }
}finally{
 await browser?.close();server?.kill();
 await rm(preview,{recursive:true,force:true});
 await rm('.next/types/app/[locale]/membership-verification',{recursive:true,force:true});
 spawnSync(process.execPath,['node_modules/next/dist/bin/next','typegen'],{stdio:'ignore',windowsHide:true});
}
