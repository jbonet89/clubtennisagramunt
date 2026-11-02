import {NextRequest} from "next/server";
import {getMemberSession} from "@/lib/member-server";
import {sameOrigin} from "@/lib/api";
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(){
 const {supabase,profile}=await getMemberSession();if(!profile)return reply({error:"Accés restringit"},401);
 const [results,details]=await Promise.all([supabase.from("member_results").select("booking_id,sets").eq("user_id",profile.id),supabase.from("profiles").select("full_name,phone").eq("id",profile.id).single()]);
 if(results.error||details.error)return reply({error:"No s’han pogut carregar les dades"},503);
 return reply({results:results.data,profile:details.data});
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return reply({error:"Accés restringit"},403);
 const {supabase,profile}=await getMemberSession();if(!profile)return reply({error:"Accés restringit"},401);
 try{
 const b=await request.json();
 if(b.action==="profile"){
 if(typeof b.full_name!=="string"||!b.full_name.trim()||b.full_name.length>100||typeof b.phone!=="string"||b.phone.length>40)return reply({error:"Revisa el nom i el telèfon"},400);
 const {error}=await supabase.from("profiles").update({full_name:b.full_name.trim(),phone:b.phone.trim()}).eq("id",profile.id);
 return error?reply({error:"No s’ha pogut desar"},400):reply({ok:true});
 }
 if(!profile.member_active||!["member","admin"].includes(profile.role))return reply({error:"Accés restringit"},403);
 if(!Array.isArray(b.sets)||b.sets.length<1||b.sets.length>5||!b.sets.every((s:unknown)=>Array.isArray(s)&&s.length===2&&s.every(n=>Number.isInteger(n)&&n>=0&&n<=7)&&((Math.max(...s)===6&&Math.min(...s)<=4)||(Math.max(...s)===7&&[5,6].includes(Math.min(...s))))))return reply({error:"Introdueix sets acabats: 6–0 a 6–4, 7–5 o 7–6."},400);
 const {error}=await supabase.from("member_results").upsert({booking_id:b.booking_id,user_id:profile.id,sets:b.sets,updated_at:new Date().toISOString()},{onConflict:"booking_id"});
 return error?reply({error:"Només pots desar resultats de les teves reserves finalitzades."},400):reply({ok:true});
 }catch{return reply({error:"Dades incorrectes"},400);}
}
