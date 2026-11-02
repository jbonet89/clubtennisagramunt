"use client";
import { IconArrowUpRight } from "@tabler/icons-react";
import { useEffect, useState, type FormEvent } from "react";
import { IconDownload as Download, IconBrandWhatsapp as MessageCircle, IconShieldCheck as ShieldCheck } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { membershipMoney } from "@/lib/membership";
import { membershipCopy } from "@/messages/membership";
import {
  membershipAction,
  useMembershipData,
  type MembershipData,
} from "./membership-data";
export function MembershipOnboarding({
  locale,
  initial,
}: {
  locale: Locale;
  initial: MembershipData;
}) {
  const copy = membershipCopy(locale);
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
  return (
    <section
      className="membership-onboarding"
      aria-labelledby="membership-title"
      data-settings-updated-at={s.updated_at}
    >
      <p className="eyebrow">
        CTA · {copy.season} {s.season}
      </p>
      <h2 id="membership-title">{copy.title}</h2>
      <p>{copy.intro}</p>
      <h3>{copy.fees}</h3>
      <div className="membership-fees" data-testid="membership-fees">
        <article>
          <span>{copy.adult}</span>
          <strong>
            {membershipMoney(s.adult_fee_cents, locale)}{" "}
            <small>/ {copy.annual}</small>
          </strong>
        </article>
        <article>
          <span>{copy.junior}</span>
          <strong>
            {membershipMoney(s.junior_fee_cents, locale)}{" "}
            <small>/ {copy.annual}</small>
          </strong>
        </article>
      </div>
      <h3>{copy.payment}</h3>
      <div className="membership-bank">
        <strong>{s.bank_name}</strong>
        <p>
          <span>{copy.iban}: </span>
          <code>{s.iban.match(/.{1,4}/g)?.join(" ")}</code>
        </p>
        <p>{copy.concept}</p>
      </div>
      {s.note && <p className="membership-extra">{s.note}</p>}
      <a
        className="membership-whatsapp"
        href={`https://wa.me/${s.whatsapp}?text=${encodeURIComponent(copy.whatsapp)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle size={19} aria-hidden="true" />
        {copy.help}
      </a>
      {a && (
        <div className="membership-status" role="status">
          <h3>
            {a.status === "submitted"
              ? copy.sent
              : a.status === "changes_requested"
                ? copy.changes
                : copy.approved}
          </h3>
          <p>{copy.sentBody}</p>
          {a.review_note && <p>{a.review_note}</p>}
          <button type="button" onClick={() => refresh().catch(failed)}>
            {copy.refresh}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="form-error">
          {copy[error as keyof typeof copy] || copy.error}
        </p>
      )}
      {(!a || a.status === "changes_requested") && (
        <form className="membership-application" onSubmit={submit}>
          <fieldset disabled={busy || !ready}>
            <legend>{copy.documentStep}</legend>
            <a href={s.form_url} target="_blank" rel="noopener noreferrer">
              <Download size={18} aria-hidden="true" />
              {copy.form}
            </a>
            <p>{copy.formHelp}</p>
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
              <label>
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
            <p>{method === "transfer" ? copy.transferHelp : copy.debitHelp}</p>
            <p className="membership-total">
              {membershipMoney(amount, locale)} / {copy.annual}
            </p>
            <label>
              {copy.document}
              <input
                type="file"
                name="document"
                required
                accept="application/pdf,image/jpeg,image/png"
              />
            </label>
            <label>
              {copy.receipt}{" "}
              {method === "direct_debit" ? `(${copy.optional})` : ""}
              <input
                type="file"
                name="receipt"
                required={method === "transfer"}
                accept="application/pdf,image/jpeg,image/png"
              />
            </label>
            <p className="field-help">
              <ShieldCheck size={16} aria-hidden="true" /> {copy.fileHelp}
            </p>
            <button className="membership-primary" type="submit">
              {busy ? copy.sending : copy.submit}
            </button>
          </fieldset>
        </form>
      )}
      {a?.status === "approved" && (
        <Link href="/socis?section=reserve">{copy.approved} <IconArrowUpRight size={15} aria-hidden="true"/></Link>
      )}
    </section>
  );
}
