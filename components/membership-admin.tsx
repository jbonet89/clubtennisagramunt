"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  IconFileText,
  IconCheck,
  IconArrowUpRight,
  IconClock,
} from "@tabler/icons-react";
import { administrationCopy } from "@/messages/administration";
import type { MembershipData } from "./membership-data";
import type { Locale } from "@/i18n/routing";
import { membershipCopy } from "@/messages/membership";
import { membershipMoney, type MembershipApplication } from "@/lib/membership";
import { membershipAction, useMembershipData } from "./membership-data";
export function MembershipAdmin({
  locale,
  compact = false,
  onDataChange,
}: {
  locale: Locale;
  compact?: boolean;
  onDataChange?: (data: MembershipData | undefined) => void;
}) {
  const t = administrationCopy[locale];
  const [allApplications, setAllApplications] = useState(false);
  const copy = membershipCopy(locale),
    { data, error, setError, refresh } = useMembershipData();
  useEffect(() => {
    onDataChange?.(data);
  }, [data, onDataChange]);
  const shownApplications =
    data?.applications?.filter(
      (a) => !compact || allApplications || a.status !== "approved",
    ) ?? [];
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
      className={`membership-admin ${compact ? "membership-admin-queue" : ""}`}
      aria-labelledby="membership-admin-title"
    >
      <div className="membership-queue-heading">
        <h2 id="membership-admin-title">
          {compact ? t.reviewQueue : copy.admin}
        </h2>
        {compact && (
          <span>
            {data?.applications?.filter((a) => a.status !== "approved")
              .length ?? "…"}
          </span>
        )}
      </div>
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
          {!compact && <h3>{copy.applications}</h3>}
          <p className="membership-review-help">{copy.reviewHelp}</p>
          {compact && (
            <div
              className="membership-queue-filters"
              role="group"
              aria-label={copy.applications}
            >
              <button
                type="button"
                aria-pressed={!allApplications}
                onClick={() => setAllApplications(false)}
              >
                {t.pendingApplications}
              </button>
              <button
                type="button"
                aria-pressed={allApplications}
                onClick={() => setAllApplications(true)}
              >
                {t.allApplications}
              </button>
            </div>
          )}
          {!shownApplications.length ? (
            <p>{copy.empty}</p>
          ) : (
            <div className="membership-review-grid">
              {shownApplications.map((a) => (
                <article
                  className="membership-review"
                  key={a.id}
                  data-testid={`application-${a.id}`}
                >
                  <div className="membership-review-identity">
                    <span>
                      {a.category === "adult" ? copy.adult : copy.junior}
                    </span>
                    <h3>{a.applicant?.full_name}</h3>
                    <small>
                      {new Date(a.submitted_at).toLocaleDateString(locale, {
                        timeZone: "Europe/Madrid",
                      })}
                    </small>
                  </div>
                  <p>
                    {a.applicant?.email} · {a.phone}
                  </p>
                  <p>
                    {a.category === "adult" ? copy.adult : copy.junior} ·{" "}
                    {membershipMoney(a.fee_cents, locale)} · {a.season} ·{" "}
                    {a.payment_method === "transfer"
                      ? copy.transfer
                      : copy.debit}
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
                      <IconFileText size={15} aria-hidden="true" />
                      {copy.downloadDocument}
                      <IconArrowUpRight size={14} aria-hidden="true" />
                    </button>
                    {a.receipt_path && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => download(a, "receipt")}
                      >
                        <IconFileText size={15} aria-hidden="true" />
                        {copy.downloadReceipt}
                        <IconArrowUpRight size={14} aria-hidden="true" />
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
                          <IconCheck size={15} aria-hidden="true" />
                          {copy.approve}
                        </button>
                        <button value="changes_requested" disabled={busy}>
                          <IconClock size={15} aria-hidden="true" />
                          {copy.askChanges}
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
