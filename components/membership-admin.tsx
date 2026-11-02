"use client";
import { useState, type FormEvent } from "react";
import type { Locale } from "@/i18n/routing";
import { membershipCopy } from "@/messages/membership";
import { membershipMoney, type MembershipApplication } from "@/lib/membership";
import { membershipAction, useMembershipData } from "./membership-data";
export function MembershipAdmin({ locale }: { locale: Locale }) {
  const copy = membershipCopy(locale),
    { data, error, setError, refresh } = useMembershipData();
  const [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  async function action(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const r = await membershipAction(payload);
      await refresh();
      return r;
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    const fd = new FormData(event.currentTarget);
    const value = Object.fromEntries(fd.entries());
    if (
      await action({
        ...value,
        action: "settings",
        adult_fee_cents: Math.round(Number(value.adult) * 100),
        junior_fee_cents: Math.round(Number(value.junior) * 100),
      })
    )
      setSaved(true);
  }
  async function download(a: MembershipApplication, kind: string) {
    const result = await action({ action: "download", id: a.id, kind });
    if (result?.url) window.location.assign(result.url);
  }
  return (
    <section
      className="membership-admin"
      aria-labelledby="membership-admin-title"
    >
      <h2 id="membership-admin-title">{copy.admin}</h2>
      {error && (
        <p className="form-error" role="alert">
          {copy[error as keyof typeof copy] || copy.error}
        </p>
      )}
      {!data ? (
        <p>{copy.loading}</p>
      ) : (
        <>
          <details className="membership-settings">
            <summary>{copy.settings}</summary>
            <form onSubmit={save} key={data.settings.updated_at}>
              <fieldset disabled={busy}>
                <div className="membership-form-grid">
                  <label>
                    {copy.adultFee}
                    <input
                      name="adult"
                      type="number"
                      min="0"
                      max="10000"
                      step="0.01"
                      required
                      defaultValue={data.settings.adult_fee_cents / 100}
                    />
                  </label>
                  <label>
                    {copy.juniorFee}
                    <input
                      name="junior"
                      type="number"
                      min="0"
                      max="10000"
                      step="0.01"
                      required
                      defaultValue={data.settings.junior_fee_cents / 100}
                    />
                  </label>
                  {(
                    [
                      "season",
                      "bank_name",
                      "iban",
                      "whatsapp",
                      "form_url",
                    ] as const
                  ).map((key) => (
                    <label key={key}>
                      {
                        {
                          season: copy.season,
                          bank_name: copy.bank,
                          iban: copy.iban,
                          whatsapp: copy.whatsappNumber,
                          form_url: copy.formUrl,
                        }[key]
                      }
                      <input
                        name={key}
                        required
                        defaultValue={data.settings[key]}
                        type={key === "form_url" ? "url" : "text"}
                        maxLength={
                          key === "form_url"
                            ? 500
                            : key === "iban"
                              ? 34
                              : key === "whatsapp"
                                ? 15
                                : 100
                        }
                      />
                    </label>
                  ))}
                </div>
                <label>
                  {copy.note}
                  <textarea
                    name="note"
                    maxLength={2000}
                    defaultValue={data.settings.note}
                  />
                </label>
                <button type="submit" className="membership-primary">
                  {copy.save}
                </button>
              </fieldset>
            </form>
          </details>
          {saved && <p role="status">{copy.saved}</p>}
          <h3>{copy.applications}</h3>
          <p>{copy.reviewHelp}</p>
          {!data.applications?.length ? (
            <p>{copy.empty}</p>
          ) : (
            data.applications.map((a) => (
              <article
                className="membership-review"
                key={a.id}
                data-testid={`application-${a.id}`}
              >
                <h3>{a.applicant?.full_name}</h3>
                <p>
                  {a.applicant?.email} · {a.phone}
                </p>
                <p>
                  {a.category === "adult" ? copy.adult : copy.junior} ·{" "}
                  {membershipMoney(a.fee_cents, locale)} · {a.season} ·{" "}
                  {a.payment_method === "transfer" ? copy.transfer : copy.debit}
                </p>
                <strong>
                  {a.status === "approved"
                    ? copy.approved
                    : a.status === "changes_requested"
                      ? copy.changes
                      : copy.sent}
                </strong>
                <div className="membership-review-actions">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => download(a, "document")}
                  >
                    {copy.downloadDocument}
                  </button>
                  {a.receipt_path && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => download(a, "receipt")}
                    >
                      {copy.downloadReceipt}
                    </button>
                  )}
                </div>
                {a.status !== "approved" && (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      const native = event.nativeEvent as SubmitEvent;
                      const status = (native.submitter as HTMLButtonElement)
                        ?.value;
                      if (
                        status === "approved" &&
                        !window.confirm(copy.approveConfirm)
                      )
                        return;
                      const fd = new FormData(event.currentTarget);
                      void action({
                        action: "review",
                        id: a.id,
                        status,
                        note: fd.get("note") || "",
                      });
                    }}
                  >
                    <label>
                      {copy.reviewNote}
                      <textarea
                        name="note"
                        maxLength={1000}
                        defaultValue={a.review_note}
                      />
                    </label>
                    <div className="membership-review-actions">
                      <button
                        className="membership-primary"
                        value="approved"
                        disabled={busy}
                      >
                        {copy.approve}
                      </button>
                      <button value="changes_requested" disabled={busy}>
                        {copy.askChanges}
                      </button>
                    </div>
                  </form>
                )}
              </article>
            ))
          )}
        </>
      )}
    </section>
  );
}
