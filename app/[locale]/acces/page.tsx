import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getMemberCopy } from "@/messages/members";
import { getMemberSession } from "@/lib/member-server";
import { MemberShell } from "@/components/member-shell";
import { AuthForm } from "@/components/auth-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "CTA · Accés / Acceso / Member access",
  robots: { index: false, follow: false },
};
export default async function AccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string; error?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!hasLocale(routing.locales, locale)) notFound();
  const { profile } = await getMemberSession();
  if (profile && query.mode !== "reset") redirect(`/${locale}/socis`);
  const copy = getMemberCopy(locale);
  return (
    <MemberShell locale={locale} section="acces" copy={copy}>
      <AuthForm
        locale={locale}
        copy={copy}
        initialMode={query.mode === "reset" && profile ? "reset" : "login"}
        initialError={query.error === "expired"}
      />
    </MemberShell>
  );
}
