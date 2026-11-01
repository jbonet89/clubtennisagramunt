import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import type { MemberCopy } from "@/messages/members";

export function MemberShell({
  children,
  locale,
  section,
  copy,
}: {
  children: React.ReactNode;
  locale: Locale;
  section: "acces" | "socis";
  copy: MemberCopy;
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
          <Link href="/">{copy.home} ↗</Link>
          <nav className="language-nav" aria-label="CA / ES / EN">
            {routing.locales.map((language) => (
              <Link
                key={language}
                locale={language}
                href={`/${section}`}
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
