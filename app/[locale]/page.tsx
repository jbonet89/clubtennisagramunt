import type { Metadata } from "next";
import Image from "next/image";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUpRight, MapPin, MoveUpRight } from "lucide-react";
import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/site-header";
import { CourtDrawing } from "@/components/court-drawing";
import { CourtSelector } from "@/components/court-selector";
import { buttonVariants } from "@/components/ui/button";

const origin = "https://clubtennisagramunt.vercel.app";
type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "meta" });
  const url = `${origin}/${locale}`;
  return {
    metadataBase: new URL(origin),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: url,
      languages: {
        ca: `${origin}/ca`,
        es: `${origin}/es`,
        en: `${origin}/en`,
        "x-default": `${origin}/ca`,
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url,
      type: "website",
      siteName: "Club Tennis Agramunt",
      locale: { ca: "ca_ES", es: "es_ES", en: "en_GB" }[locale],
      images: [
        {
          url: "/images/club-logo.jpg",
          width: 585,
          height: 270,
          alt: "Club Tennis Agramunt",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: t("title"),
      description: t("description"),
    },
  };
}

export default async function Home({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  const nav = {
    skip: t("nav.skip"),
    courts: t("nav.courts"),
    club: t("nav.club"),
    history: t("nav.history"),
    contact: t("nav.contact"),
    join: t("nav.join"),
    language: t("nav.language"),
    open: t("nav.open"),
    close: t("nav.close"),
    home: t("nav.home"),
    access: t("nav.access"),
  };
  const courtLabels = {
    selector: t("courts.selector"),
    clay: t("courts.clay"),
    quick: t("courts.quick"),
    clayTag: t("courts.clayTag"),
    quickTag: t("courts.quickTag"),
    clayTitle: t("courts.clayTitle"),
    quickTitle: t("courts.quickTitle"),
    clayBody: t("courts.clayBody"),
    quickBody: t("courts.quickBody"),
    duration: t("courts.duration"),
    member: t("courts.member"),
    ask: t("courts.ask"),
    notice: t("courts.notice"),
    illustration: t("courts.illustration"),
  };
  const joinMail = `mailto:clubtennisagramunt1974@gmail.com?subject=${encodeURIComponent(t("contact.subject"))}`;
  const guestMail = `mailto:clubtennisagramunt1974@gmail.com?subject=${encodeURIComponent(t("contact.guestSubject"))}`;
  return (
    <>
      <SiteHeader locale={locale} labels={nav} />
      <main id="main">
        <section className="hero" aria-labelledby="welcome">
          <div className="hero-copy">
            <p className="eyebrow">{t("hero.eyebrow")}</p>
            <h1 id="welcome">
              {t("hero.title1")}
              <br />
              <span>{t("hero.title2")}</span>
            </h1>
            <p className="hero-intro">{t("hero.intro")}</p>
            <div className="hero-links">
              <a
                className={buttonVariants({ variant: "secondary" })}
                href="#courts"
              >
                {t("hero.primary")}
                <ArrowDown size={17} aria-hidden="true" />
              </a>
              <a className="hero-secondary" href="#contact">
                {t("hero.secondary")}
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
            </div>
            <div className="hero-footnote">
              <span className="ball-mark" aria-hidden="true" />
              {t("hero.caption")}
            </div>
          </div>
          <div className="hero-visual">
            <span className="hero-year" aria-hidden="true">
              1974
            </span>
            <CourtDrawing decorative label={t("hero.diagram")} />
            <div className="hero-visual-caption">
              <span>CTA</span>
              <span>
                {t("hero.diagram")}
                <MoveUpRight size={15} aria-hidden="true" />
              </span>
            </div>
          </div>
        </section>
        <div className="club-ribbon" aria-hidden="true">
          <span>CLUB TENNIS AGRAMUNT</span>
          <span className="ribbon-star">✳</span>
          <span>{t("hero.bottom")}</span>
          <span className="ribbon-star">✳</span>
          <span>1974</span>
        </div>
        <section
          id="courts"
          className="section courts-section"
          aria-labelledby="courts-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("courts.eyebrow")}</p>
              <h2 id="courts-title">{t("courts.title")}</h2>
            </div>
            <p className="section-intro">{t("courts.intro")}</p>
          </div>
          <CourtSelector labels={courtLabels} />
        </section>
        <section
          id="club"
          className="club-section section"
          aria-labelledby="club-title"
        >
          <div className="club-copy">
            <p className="eyebrow">{t("club.eyebrow")}</p>
            <h2 id="club-title">{t("club.title")}</h2>
            <p>{t("club.body")}</p>
            <ul className="club-details">
              <li>
                <MapPin size={18} aria-hidden="true" />
                {t("club.location")}
              </li>
              <li>{t("club.surface")}</li>
              <li>{t("club.community")}</li>
            </ul>
          </div>
          <figure className="club-photo">
            <div className="archive-photo">
              <Image
                src="/images/club-archive.jpg"
                alt={t("club.photo")}
                fill
                sizes="(max-width: 800px) 100vw, 45vw"
              />
            </div>
            <figcaption>
              {t("club.photo")}
              <span>CTA ↗</span>
            </figcaption>
          </figure>
        </section>
        <section
          id="history"
          className="section history-section"
          aria-labelledby="history-title"
        >
          <div className="history-heading">
            <p className="eyebrow">{t("history.eyebrow")}</p>
            <h2 id="history-title">{t("history.title")}</h2>
            <a
              className="text-link"
              href="https://tennisagramunt.wordpress.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("history.archive")}
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </div>
          <ol className="timeline">
            {(
              [
                ["1974", "first"],
                ["2018", "second"],
                [t("history.thirdYear"), "third"],
              ] as const
            ).map(([year, key]) => (
              <li key={key}>
                <span className="timeline-dot" />
                <p className="timeline-year">{year}</p>
                <h3>{t(`history.${key}Title`)}</h3>
                <p>{t(`history.${key}Body`)}</p>
              </li>
            ))}
          </ol>
        </section>
        <aside className="archive-note section" aria-labelledby="archive-title">
          <p className="eyebrow">{t("history.archiveLabel")}</p>
          <div>
            <h3 id="archive-title">{t("history.article")}</h3>
            <p>{t("history.articleBody")}</p>
          </div>
          <a
            className="text-link"
            href="https://tennisagramunt.wordpress.com/2018/04/01/the-journey-begins/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("history.read")}
            <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        </aside>
        <section
          id="contact"
          className="contact-section section"
          aria-labelledby="contact-title"
        >
          <div>
            <p className="eyebrow">{t("contact.eyebrow")}</p>
            <h2 id="contact-title">{t("contact.title")}</h2>
          </div>
          <div className="contact-copy">
            <p>{t("contact.body")}</p>
            <a
              className={buttonVariants({ variant: "secondary" })}
              href={joinMail}
            >
              {t("contact.join")}
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
            <a className="text-link guest-link" href={guestMail}>
              {t("contact.guest")}
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
            <p className="contact-note">{t("contact.guestNote")}</p>
            <a
              className="contact-email"
              href="mailto:clubtennisagramunt1974@gmail.com"
            >
              clubtennisagramunt1974@gmail.com
            </a>
          </div>
          <div className="contact-location">
            <p>
              <MapPin size={18} aria-hidden="true" />
              {t("contact.address")}
            </p>
            <a
              className="text-link"
              href="https://www.google.com/maps/search/?api=1&query=Club+Tennis+Agramunt+Carretera+de+Cervera+10"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("contact.directions")}
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div>
          <strong>CLUB TENNIS AGRAMUNT</strong>
          <p>{t("footer.tagline")}</p>
        </div>
        <span>
          © {new Date().getUTCFullYear()} {t("footer.copyright")}
        </span>
        <a href="#main">{t("footer.back")} ↑</a>
      </footer>
    </>
  );
}
