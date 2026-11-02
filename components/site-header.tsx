"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { Button, buttonVariants } from "@/components/ui/button";

type Labels = {
  skip: string;
  courts: string;
  club: string;
  history: string;
  contact: string;
  join: string;
  language: string;
  open: string;
  close: string;
  home: string;
  access: string;
};

export function SiteHeader({
  locale,
  labels,
}: {
  locale: Locale;
  labels: Labels;
}) {
  const [open, setOpen] = useState(false);
  const links = [
    ["courts", labels.courts],
    ["club", labels.club],
    ["history", labels.history],
    ["contact", labels.contact],
  ];
  return (
    <>
      <a className="skip-link" href="#main">
        {labels.skip}
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" aria-label={labels.home} className="brand">
            <Image
              src="/images/club-logo.jpg"
              alt=""
              width={585}
              height={270}
              priority
            />
            <span>
              CLUB TENNIS
              <br />
              <strong>AGRAMUNT</strong>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Club">
            {links.slice(0, 3).map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
            <Link href="/socis">{labels.access}</Link>
          </nav>
          <div className="header-actions">
            <nav className="language-nav" aria-label={labels.language}>
              {routing.locales.map((language) => (
                <Link
                  key={language}
                  href="/"
                  locale={language}
                  lang={language}
                  hrefLang={language}
                  aria-current={locale === language ? "page" : undefined}
                  aria-label={
                    { ca: "Català", es: "Castellano", en: "English" }[language]
                  }
                >
                  {language.toUpperCase()}
                </Link>
              ))}
            </nav>
            <Link
              className={buttonVariants({
                size: "sm",
                className: "header-join",
              })}
              href="/acces?mode=signup"
            >
              {labels.join}
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <Button
              variant="outline"
              size="icon"
              className="menu-toggle"
              aria-label={open ? labels.close : labels.open}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen(!open)}
            >
              {open ? (
                <X size={19} aria-hidden="true" />
              ) : (
                <Menu size={19} aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
        {open ? (
          <nav
            id="mobile-menu"
            className="mobile-menu"
            aria-label="Club mobile"
          >
            <Link href="/socis" onClick={() => setOpen(false)}>
              {labels.access}
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
            {links.map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>
                {label}
                <ArrowUpRight size={20} aria-hidden="true" />
              </a>
            ))}
          </nav>
        ) : null}
      </header>
    </>
  );
}
