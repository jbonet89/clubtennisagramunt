"use client";
import {
  IconArrowUpRight,
  IconCheck,
  IconCircleCheck,
  IconClock,
  IconCopy,
  IconFileText,
  IconInfoCircle,
  IconKey,
  IconBulb,
  IconUser,
  IconChevronRight,
} from "@tabler/icons-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  IconDownload as Download,
  IconBrandWhatsapp as MessageCircle,
  IconShieldCheck as ShieldCheck,
} from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { membershipMoney } from "@/lib/membership";
import { enrolmentCopy } from "@/messages/enrolment";
import { membershipCopy } from "@/messages/membership";
import {
  membershipAction,
  useMembershipData,
  type MembershipData,
} from "./membership-data";
export function MembershipOnboarding({
  locale,
  initial,
  profile,
}: {
  locale: Locale;
  initial: MembershipData;
  profile?: { full_name: string; email: string };
}) {
  const copy = membershipCopy(locale);
  const t = enrolmentCopy[locale];
  const [clipboardStatus, setClipboardStatus] = useState("");
  const { data, error, setError, refresh } = useMembershipData(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [busy, setBusy] = useState(false),
    [category, setCategory] = useState<string>(
      initial.application?.category || "adult",
    ),
    [method, setMethod] = useState<string>(
      initial.application?.payment_method || "transfer",
    );
  useEffect(() => {
    if (data?.memberActive) window.location.assign(`/${locale}/socis`);
  }, [data?.memberActive, locale]);
  if (!data) return <p>{copy.loading}</p>;
  const s = data.settings,
    a = data.application;
  const amount = category === "adult" ? s.adult_fee_cents : s.junior_fee_cents;
  const failed = (reason: unknown) =>
    setError(reason instanceof Error ? reason.message : "error");
  async function upload(file: File) {
    if (file.size > 3145728) throw Error("fileError");
    const fd = new FormData();
    fd.set("file", file);
    const r = await fetch("/api/membership/document", {
      method: "POST",
      body: fd,
    });
    const result = await r.json();
    if (!r.ok) throw Error(result.error || "fileError");
    return result.path as string;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    const uploaded: string[] = [];
    try {
      const doc = fd.get("document") as File,
        receipt = fd.get("receipt") as File;
      const document = await upload(doc);
      uploaded.push(document);
      let proof: string | null = null;
      if (receipt?.size) {
        proof = await upload(receipt);
        uploaded.push(proof);
      }
      await membershipAction({
        action: "submit",
        category,
        method,
        phone: fd.get("phone"),
        document,
        receipt: proof,
      });
      await refresh();
    } catch (reason) {
      failed(reason);
      await Promise.allSettled(
        uploaded.map((path) =>
          fetch("/api/membership/document", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path }),
          }),
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  const sent = !!a && a.status !== "changes_requested";
  const current = a?.status === "approved" ? 3 : sent ? 2 : 0;
  const support = (
    <a
      className="enrolment-whatsapp"
      href={`https://wa.me/${s.whatsapp}?text=${encodeURIComponent(copy.whatsapp)}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <MessageCircle size={18} aria-hidden="true" />
      {copy.help}
      <IconArrowUpRight size={15} aria-hidden="true" />
    </a>
  );
  async function download(kind: "document" | "receipt") {
    if (!a) return;
    setBusy(true);
    setError("");
    try {
      const result = await membershipAction({
        action: "download",
        id: a.id,
        kind,
      });
      window.location.assign(result.url);
    } catch (reason) {
      failed(reason);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={`membership-onboarding enrolment ${sent ? "enrolment-submitted" : "enrolment-form-state"}`}
      aria-labelledby="membership-title"
      data-settings-updated-at={s.updated_at}
    >
      <ol className="enrolment-progress" aria-label={t.stepTitle}>
        {[t.details, sent ? t.documentsSent : t.documents, t.review].map(
          (label, i) => (
            <li
              key={label}
              data-state={
                i < current ? "complete" : i === current ? "current" : "waiting"
              }
              aria-current={i === current ? "step" : undefined}
            >
              <span>
                {i < current ? (
                  <IconCheck size={16} aria-hidden="true" />
                ) : (
                  i + 1
                )}
              </span>
              <div>
                <strong>{label}</strong>
                <small>
                  {i < current
                    ? i === 1
                      ? t.received
                      : t.completed
                    : i === 2 && sent
                      ? t.pending
                      : ""}
                </small>
              </div>
            </li>
          ),
        )}
      </ol>
      {error && (
        <p role="alert" className="form-error">
          {copy[error as keyof typeof copy] || copy.error}
        </p>
      )}
      {sent && a ? (
        <>
          <header className="enrolment-received" role="status">
            <IconCircleCheck size={32} aria-hidden="true" />
            <div>
              <h1 id="membership-title">
                {a.status === "approved" ? copy.approved : copy.sent}
              </h1>
              <p>{copy.sentBody}</p>
            </div>
            <span className="enrolment-season">
              {copy.season} {a.season}
            </span>
          </header>
          <div className="enrolment-layout">
            <div className="enrolment-main">
              <section className="enrolment-summary">
                <h2>{t.submitted}</h2>
                <dl>
                  <div>
                    <dt>{t.reference}</dt>
                    <dd>CTA-{a.id.slice(0, 8).toUpperCase()}</dd>
                  </div>
                  <div>
                    <dt>{t.entered}</dt>
                    <dd>
                      {new Date(a.submitted_at).toLocaleString(locale, {
                        timeZone: "Europe/Madrid",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt>{copy.category}</dt>
                    <dd>{a.category === "adult" ? copy.adult : copy.junior}</dd>
                  </div>
                  <div>
                    <dt>{copy.method}</dt>
                    <dd>
                      {a.payment_method === "transfer"
                        ? copy.transfer
                        : copy.debit}
                    </dd>
                  </div>
                  <div>
                    <dt>{t.total}</dt>
                    <dd>
                      {membershipMoney(a.fee_cents, locale)} / {copy.annual}
                    </dd>
                  </div>
                  <div>
                    <dt>{t.stepTitle}</dt>
                    <dd>
                      <span className="enrolment-status-tag">
                        {a.status === "approved" ? copy.approved : t.pending}
                      </span>
                    </dd>
                  </div>
                </dl>
                <p className="enrolment-reference-note">{t.referenceNote}</p>
                <div className="enrolment-documents">
                  <h3>
                    <IconFileText size={17} aria-hidden="true" />
                    {t.signed}
                    <span>
                      {a.receipt_path ? 2 : 1} · {t.documentsSent}
                    </span>
                  </h3>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => download("document")}
                  >
                    <IconFileText size={18} aria-hidden="true" />
                    <span>
                      {copy.document}
                      <small>{t.received}</small>
                    </span>
                    <IconArrowUpRight size={16} aria-hidden="true" />
                  </button>
                  {a.receipt_path && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => download("receipt")}
                    >
                      <IconFileText size={18} aria-hidden="true" />
                      <span>
                        {copy.receipt}
                        <small>{t.received}</small>
                      </span>
                      <IconArrowUpRight size={16} aria-hidden="true" />
                    </button>
                  )}
                  <p>{t.completePay}</p>
                </div>
                {a.review_note && (
                  <div className="enrolment-review-note">
                    <IconInfoCircle size={18} />
                    <p>{a.review_note}</p>
                  </div>
                )}
                <button
                  className="enrolment-refresh"
                  type="button"
                  disabled={busy}
                  onClick={() => refresh().catch(failed)}
                >
                  <IconClock size={16} aria-hidden="true" />
                  {copy.refresh}
                </button>
              </section>
              <section className="enrolment-waiting">
                <h2>{t.waiting}</h2>
                <p>{t.waitingBody}</p>
                <div className="enrolment-light-notice">
                  <IconBulb size={21} aria-hidden="true" />
                  <p>{t.lights}</p>
                </div>
              </section>
            </div>
            <aside className="enrolment-aside enrolment-next">
              <h2>{t.next}</h2>
              <ol>
                {[
                  [t.reviewTitle, t.reviewBody],
                  [t.activateTitle, t.activateBody],
                  [t.reserveTitle, t.reserveBody],
                ].map(([title, body], i) => (
                  <li key={title}>
                    <span>{i + 1}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <section className="enrolment-support">
                <h3>{t.helpTitle}</h3>
                {support}
              </section>
            </aside>
          </div>
        </>
      ) : (
        <>
          <div className="enrolment-access-notice">
            <IconInfoCircle size={21} aria-hidden="true" />
            <div>
              <strong>{t.access}</strong>
              <p>{t.accessBody}</p>
            </div>
            <span>
              {copy.season} {s.season}
            </span>
          </div>
          {a?.status === "changes_requested" && (
            <div className="enrolment-change-notice" role="status">
              <h2>{copy.changes}</h2>
              <p>{a.review_note || t.change}</p>
            </div>
          )}
          <div className="enrolment-layout">
            <div className="enrolment-main">
              <form
                className="membership-application enrolment-application"
                onSubmit={submit}
              >
                <fieldset disabled={busy || !ready}>
                  <header>
                    <h1 id="membership-title">{copy.title}</h1>
                    <p>{copy.intro}</p>
                  </header>
                  <div
                    className="enrolment-fee-choices"
                    data-testid="membership-fees"
                    role="group"
                    aria-label={copy.fees}
                  >
                    {(["adult", "junior"] as const).map((c) => (
                      <button
                        type="button"
                        key={c}
                        aria-pressed={category === c}
                        onClick={() => setCategory(c)}
                      >
                        <span>
                          {c === "adult" ? copy.adult : copy.junior}
                          <IconCircleCheck size={16} aria-hidden="true" />
                        </span>
                        <strong>
                          {membershipMoney(
                            c === "adult"
                              ? s.adult_fee_cents
                              : s.junior_fee_cents,
                            locale,
                          )}
                          <small>/ {copy.annual}</small>
                        </strong>
                        <small>
                          {copy.season} {s.season}
                        </small>
                      </button>
                    ))}
                  </div>
                  <section className="enrolment-bank-step">
                    <h2>
                      <IconKey size={18} aria-hidden="true" />
                      {copy.payment}
                    </h2>
                    <div className="membership-bank">
                      <strong>{s.bank_name}</strong>
                      <div>
                        <code>{s.iban.match(/.{1,4}/g)?.join(" ")}</code>
                        <button
                          type="button"
                          aria-label={t.copy}
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(s.iban);
                              setClipboardStatus(t.copied);
                            } catch {
                              setClipboardStatus(t.copyError);
                            }
                          }}
                        >
                          <IconCopy size={16} aria-hidden="true" />
                          {t.copy}
                        </button>
                      </div>
                      <p>{copy.concept}</p>
                      {clipboardStatus && (
                        <p role="status">{clipboardStatus}</p>
                      )}
                    </div>
                  </section>
                  <section className="enrolment-document-step">
                    <h2>
                      <IconFileText size={19} aria-hidden="true" />
                      {copy.documentStep}
                    </h2>
                    <a
                      className="enrolment-download"
                      href={s.form_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download size={19} aria-hidden="true" />
                      <span>
                        <strong>{copy.form}</strong>
                        <small>{copy.formHelp}</small>
                      </span>
                      <IconArrowUpRight size={16} aria-hidden="true" />
                    </a>
                    <div className="membership-form-grid">
                      <label>
                        {copy.category}
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        >
                          <option value="adult">{copy.adult}</option>
                          <option value="junior">{copy.junior}</option>
                        </select>
                      </label>
                      <label>
                        {copy.phone}
                        <input
                          name="phone"
                          type="tel"
                          required
                          minLength={6}
                          maxLength={30}
                          autoComplete="tel"
                          defaultValue={a?.phone}
                        />
                      </label>
                      <label className="enrolment-method">
                        {copy.method}
                        <select
                          value={method}
                          onChange={(e) => setMethod(e.target.value)}
                        >
                          <option value="transfer">{copy.transfer}</option>
                          <option value="direct_debit">{copy.debit}</option>
                        </select>
                      </label>
                    </div>
                    <p className="enrolment-method-help">
                      {method === "transfer"
                        ? copy.transferHelp
                        : copy.debitHelp}
                    </p>
                    <div className="membership-total">
                      <span>{t.total}</span>
                      <strong>
                        {membershipMoney(amount, locale)} / {copy.annual}
                      </strong>
                    </div>
                    <label className="enrolment-upload">
                      {copy.document}
                      <input
                        type="file"
                        name="document"
                        required
                        accept="application/pdf,image/jpeg,image/png"
                      />
                    </label>
                    <label className="enrolment-upload">
                      {copy.receipt}
                      {method === "direct_debit" ? ` (${copy.optional})` : ""}
                      <input
                        type="file"
                        name="receipt"
                        required={method === "transfer"}
                        accept="application/pdf,image/jpeg,image/png"
                      />
                    </label>
                    <p className="field-help">
                      <ShieldCheck size={16} aria-hidden="true" />
                      {copy.fileHelp}
                    </p>
                  </section>
                  <button className="membership-primary" type="submit">
                    {busy ? copy.sending : copy.submit}
                    <IconChevronRight size={17} aria-hidden="true" />
                  </button>
                  {profile && (
                    <section className="enrolment-account">
                      <h2>
                        <IconUser size={17} aria-hidden="true" />
                        {t.account}
                      </h2>
                      <dl>
                        <div>
                          <dt>{t.name}</dt>
                          <dd>{profile.full_name}</dd>
                        </div>
                        <div>
                          <dt>{t.email}</dt>
                          <dd>{profile.email}</dd>
                        </div>
                      </dl>
                    </section>
                  )}
                </fieldset>
              </form>
            </div>
            <aside className="enrolment-aside">
              <section>
                <h2>{t.benefits}</h2>
                <ul>
                  {[t.benefitCourt, t.benefitClub, t.benefitDocs].map(
                    (text) => (
                      <li key={text}>
                        <IconCheck size={16} aria-hidden="true" />
                        {text}
                      </li>
                    ),
                  )}
                </ul>
              </section>
              <section>
                <h2>{t.how}</h2>
                <ol>
                  {[t.choose, t.pay, t.send, t.wait].map((text, i) => (
                    <li key={text}>
                      <span>{i + 1}</span>
                      {text}
                    </li>
                  ))}
                </ol>
              </section>
              <section className="enrolment-light-notice">
                <IconBulb size={23} aria-hidden="true" />
                <div>
                  <h2>{t.lights.split(".")[0]}.</h2>
                  <p>{t.lights.split(".").slice(1).join(".")}</p>
                </div>
              </section>
              {s.note && (
                <section>
                  <p className="membership-extra">{s.note}</p>
                </section>
              )}
              <section className="enrolment-support">
                <h2>{t.helpTitle}</h2>
                {support}
              </section>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
