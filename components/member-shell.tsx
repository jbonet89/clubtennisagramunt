import { IconArrowUpRight, IconUser } from "@tabler/icons-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import type { MemberCopy } from "@/messages/members";

export function MemberShell({
  children,
  locale,
  section,
  memberSection,
  copy,
  memberName,
}: {
  children: React.ReactNode;
  locale: Locale;
  section: "acces" | "socis";
  memberSection?: string;
  copy: MemberCopy;
  memberName?: string;
}) {
  return (
    <div className="member-app">
      <header className="member-topbar">
        <Link href="/" className="brand" aria-label="Club Tennis Agramunt">
          <Image src="/images/club-logo.jpg" width={585} height={270} alt="" />
          <span>
            CLUB TENNIS
            <br />
            <strong>AGRAMUNT</strong>
          </span>
        </Link>
        <div className="member-topbar-links">
          {memberName && <Link className="portal-member-name" href="/socis?section=account"><span>{memberName}</span><IconUser size={18} aria-hidden="true"/></Link>}
          <Link href="/">{copy.home} <IconArrowUpRight size={15} aria-hidden="true"/></Link>
          <nav className="language-nav" aria-label="CA / ES / EN">
            {routing.locales.map((language) => (
              <Link
                key={language}
                locale={language}
                href={`/${section}${memberSection ? `?section=${memberSection}` : ""}`}
                lang={language}
                aria-current={locale === language ? "page" : undefined}
              >
                {language.toUpperCase()}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="member-main">{children}</main>
      <footer className="member-footer">
        Club Tennis Agramunt · 1974 · {copy.zone}
      </footer>
    </div>
  );
}
