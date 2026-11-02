import {getMemberSession} from "@/lib/member-server";
import {redirect} from "next/navigation";
import {AdminPanel} from "@/components/admin-panel";
export const metadata={title:"CTA · Administració",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function Administration(){
 const {profile}=await getMemberSession();
 if(!profile) redirect("/acces");
 if(profile.role!=="admin" || !profile.member_active) return <main><h1>AccÃ©s restringit</h1><a href="/socis">Tornar a socis</a></main>;
 return <AdminPanel/>;
}
