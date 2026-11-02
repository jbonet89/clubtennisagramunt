import { redirect, notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getMemberSession } from "@/lib/member-server";
export const dynamic="force-dynamic";
export const metadata={title:"CTA · Administració",robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{locale:string}>}) {
 const {locale}=await params;
 if(!hasLocale(routing.locales,locale))notFound();
 const {profile}=await getMemberSession();
 if(!profile)redirect(`/${locale}/acces`);
 if(profile.role!=="admin"||!profile.member_active)redirect(`/${locale}/socis`);
 redirect(`/${locale}/socis?section=administration`);
}
