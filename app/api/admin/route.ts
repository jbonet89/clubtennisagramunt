import {NextRequest} from "next/server";
import {getMemberSession} from "@/lib/member-server";
import {sameOrigin} from "@/lib/api";
import {adminTables} from "@/lib/admin";
export const dynamic="force-dynamic";
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(){
 const {supabase,profile}=await getMemberSession();
 if(!profile || profile.role!=="admin" || !profile.member_active)return reply({error:"Accés restringit"},403);
 const settings=await supabase.from("admin_sections").select("*");
 if(settings.error)return reply({error:"Cal aplicar la migració d’administració."},503);
 const enabled=(id:string)=>settings.data.some(s=>s.id===id&&s.enabled);
 const data:Record<string,unknown>={sections:settings.data};
 for(const [section,table] of Object.entries(adminTables)){
 if(enabled(section)){const r=await supabase.from(table).select("*").order(section==="families"?"name":"created_at",{ascending:false}).limit(500);if(r.error)return reply({error:"No s’han pogut carregar les dades."},500);data[section]=r.data;}}
 if(enabled("permisos")){const r=await supabase.from("profiles").select("id,full_name,email,role,member_active").limit(500);if(r.error)return reply({error:"No s’han pogut carregar els permisos."},500);data.profiles=r.data;}
 if(enabled("documents")){const r=await supabase.storage.from("club-documents").list("mandats",{limit:500});if(r.error)return reply({error:"No s’han pogut carregar els documents."},500);data.documents=r.data;}
 return reply(data);
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return reply({error:"Accés restringit"},403);
 const {supabase,profile}=await getMemberSession();
 if(!profile || profile.role!=="admin" || !profile.member_active)return reply({error:"Accés restringit"},403);
 try{
 const b=await request.json();
 const section=String(b.section);
 const setting=await supabase.from("admin_sections").select("enabled").eq("id",section).single();
 if(setting.error || (!setting.data.enabled && b.action!=="toggle"))return reply({error:"Secció deshabilitada"},403);
 let error;
 if(b.action==="toggle"){
 if(typeof b.enabled!=="boolean")throw Error();
 ({error}=await supabase.from("admin_sections").update({enabled:b.enabled}).eq("id",section));
 }else if(section==="documents" && b.action==="download"){
 if(typeof b.name!=="string" || !/^[a-zA-Z0-9_.-]+$/.test(b.name))throw Error();
 const r=await supabase.storage.from("club-documents").createSignedUrl("mandats/"+b.name,60);
 return r.error?reply({error:"No s’ha pogut obrir el document"},400):reply({url:r.data.signedUrl});
 }else if(section==="documents" && b.action==="upload"){
 if(typeof b.content!=="string" || b.content.length>14000000 || typeof b.memberId!=="string")throw Error();
 const member=await supabase.from("club_members").select("id").eq("id",b.memberId).single();if(member.error)throw Error();
 const bytes=Buffer.from(b.content,"base64");if(bytes.length>10485760 || bytes.subarray(0,5).toString()!=="%PDF-")throw Error();
 ({error}=await supabase.storage.from("club-documents").upload("mandats/"+member.data.id+"_"+crypto.randomUUID()+".pdf",bytes,{contentType:"application/pdf",upsert:false}));
 }else if(section==="permisos"){
 if(b.action!=="grant_admin")throw Error();
 ({error}=await supabase.rpc("grant_admin",{p_user_id:b.userId}));
 }else if(section in adminTables){
 const table=adminTables[section as keyof typeof adminTables];
 const text=(key:string,max:number)=>{const value=String(b[key]??"").trim();if(value.length>max)throw Error();return value;};
 let row;
 if(section==="socis")row={full_name:text("full_name",100),email:text("email",254),phone:text("phone",40),status:text("status",20),family_id:b.family_id||null};
 else if(section==="families")row={name:text("name",120)};
 else {const amount=Number(b.amount);if(!Number.isFinite(amount)||amount<=0)throw Error();row={member_id:b.member_id,description:text("description",160),amount,due_date:b.due_date,status:text("status",20)};}
 ({error}=b.id?await supabase.from(table).update(row).eq("id",b.id):await supabase.from(table).insert(row));
 }else throw Error();
 return error?reply({error:"No s’ha pogut desar. Revisa les dades i els permisos."},400):reply({ok:true});
 }catch{return reply({error:"Dades incorrectes. Revisa el formulari."},400);}
}
