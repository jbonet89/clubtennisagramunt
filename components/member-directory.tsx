"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  IconArrowLeft,
  IconArrowUpRight,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconFileText,
  IconMail,
  IconPlus,
  IconUpload,
} from "@tabler/icons-react";
import type { Locale } from "@/i18n/routing";
import { administrationCopy } from "@/messages/administration";
import { memberManagementCopy } from "@/messages/member-management";
import { membershipMoney } from "@/lib/membership";
import { clubToday } from "@/lib/bookings";
import {
  csvText,
  type MemberRecord,
  type MemberDetail,
  type MemberDue,
} from "@/lib/member-directory";
import { parseMemberCsv, type ImportRow } from "@/lib/member-import";

type Family = { id: string; name: string };
function memberPayload(form: HTMLFormElement) {
  const values = Object.fromEntries(new FormData(form));
  const euros = String(values.annual_fee ?? "").trim();
  return {
    ...values,
    annual_fee_cents: euros ? Math.round(Number(euros) * 100) : null,
  };
}
function MemberFields({
  member,
  families,
  locale,
  invitation = false,
}: {
  member?: Partial<MemberRecord>;
  families: Family[];
  locale: Locale;
  invitation?: boolean;
}) {
  const t = administrationCopy[locale],
    m = memberManagementCopy[locale];
  return (
    <div className="member-fields">
      <label>
        {t.name}
        <input
          name="full_name"
          required
          minLength={2}
          maxLength={100}
          defaultValue={member?.full_name}
        />
      </label>
      <label>
        {t.email}
        <input
          name="email"
          type="email"
          required={invitation}
          readOnly={!!member?.profile_id}
          maxLength={254}
          defaultValue={member?.email}
        />
        {member?.profile_id && <small>{m.linkedEmail}</small>}
      </label>
      <label>
        {t.phone}
        <input
          name="phone"
          type="tel"
          maxLength={40}
          defaultValue={member?.phone}
        />
      </label>
      <label>
        {t.status}
        <select
          name="status"
          defaultValue={invitation ? "pending" : (member?.status ?? "active")}
        >
          {["active", "pending", "inactive"].map((s) => (
            <option value={s} key={s}>
              {s === "active"
                ? t.activeStatus
                : s === "pending"
                  ? t.pendingStatus
                  : t.inactiveStatus}
            </option>
          ))}
        </select>
      </label>
      <label>
        {m.reference}
        <input
          name="legacy_reference"
          maxLength={80}
          defaultValue={member?.legacy_reference}
        />
      </label>
      <label>
        {t.family}
        <select name="family_id" defaultValue={member?.family_id ?? ""}>
          <option value="">{t.noFamily}</option>
          {families.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {m.category}
        <select name="category" defaultValue={member?.category ?? ""}>
          <option value="">—</option>
          <option value="adult">
            {locale === "en" ? "Adult" : locale === "es" ? "Adulto" : "Adult"}
          </option>
          <option value="junior">
            {locale === "en" ? "Junior" : "Infantil"}
          </option>
        </select>
      </label>
      <label>
        {m.annualFee}
        <input
          name="annual_fee"
          type="number"
          min={0}
          max={10000}
          step="0.01"
          defaultValue={
            member?.annual_fee_cents != null
              ? member.annual_fee_cents / 100
              : ""
          }
        />
      </label>
      <label>
        {m.season}
        <input
          name="season"
          maxLength={40}
          defaultValue={member?.season ?? ""}
        />
      </label>
      <label className="member-notes">
        {m.notes}
        <textarea
          name="notes"
          maxLength={4000}
          rows={3}
          defaultValue={member?.notes}
        />
      </label>
    </div>
  );
}

export function MemberDirectory({
  locale,
  families,
  onChanged,
  initialMemberId = "",
  invitationsEnabled = false,
}: {
  locale: Locale;
  families: Family[];
  onChanged: () => Promise<void>;
  initialMemberId?: string;
  invitationsEnabled?: boolean;
}) {
  const t = administrationCopy[locale],
    m = memberManagementCopy[locale];
  const [view, setView] = useState<"list" | "new" | "detail" | "import">(
    initialMemberId ? "detail" : "list",
  );
  const [selected, setSelected] = useState(initialMemberId),
    [detail, setDetail] = useState<MemberDetail>();
  const [members, setMembers] = useState<MemberRecord[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1);
  const [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [documents, setDocuments] = useState(""),
    [quota, setQuota] = useState("");
  const [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0),
    [newMode, setNewMode] = useState<"invitation" | "historical">("invitation");
  const [imported, setImported] = useState<{
      rows: ImportRow[];
      ignored: string[];
    } | null>(null),
    [dueEditor, setDueEditor] = useState<MemberDue | null | undefined>();
  const heading = useRef<HTMLHeadingElement>(null);
  const params = new URLSearchParams({
    q,
    status,
    documents,
    quota,
    page: String(page),
  }).toString();
  const text = (code: unknown) => {
    const key = String(code);
    return m[key as keyof typeof m] ?? m.error;
  };
  const statusText = (s: string) =>
    s === "active"
      ? t.activeStatus
      : s === "pending"
        ? t.pendingStatus
        : s === "inactive"
          ? t.inactiveStatus
          : s === "paid"
            ? t.paidStatus
            : s === "returned"
              ? t.returnedStatus
              : m.noFee;
  async function request(url: string, options?: RequestInit) {
    const r = await fetch(url, { cache: "no-store", ...options });
    const result = await r.json();
    if (!r.ok) throw Error(result.error ?? "error");
    return result;
  }
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [view, selected]);
  useEffect(() => {
    if (view !== "list") return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(
      () =>
        request(`/api/admin/members?${params}`, { signal: controller.signal })
          .then((d) => {
            setMembers(d.members);
            setTotal(d.total);
          })
          .catch((e) => {
            if (!controller.signal.aborted) setError(text(e.message));
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          }),
      200,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [params, revision, view]);
  useEffect(() => {
    if (view !== "detail" || !selected) return;
    const controller = new AbortController();
    setDetail(undefined);
    setLoading(true);
    setError("");
    request(`/api/admin/members/${selected}`, { signal: controller.signal })
      .then(setDetail)
      .catch((e) => {
        if (!controller.signal.aborted) setError(text(e.message));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [selected, view, revision]);
  function navigate(next: typeof view) {
    setView(next);
    setError("");
    setNotice("");
    setDueEditor(undefined);
  }
  async function changed() {
    setRevision((n) => n + 1);
    await onChanged();
  }
  async function action(run: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await run();
    } catch (e) {
      setError(text((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  const post = (url: string, body: unknown, method = "POST") =>
    request(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = memberPayload(event.currentTarget);
    await action(async () => {
      const saved = await post("/api/admin/members", {
        ...payload,
        source: newMode,
      });
      setSelected(saved.id);
      setView("detail");
      setNotice(m.inviteSaved);
      await changed();
      if (newMode === "invitation" && invitationsEnabled) {
        await post(`/api/admin/members/${saved.id}/invite`, { locale });
        setNotice(m.inviteSent);
        await changed();
      }
    });
  }
  async function exportResults() {
    await action(async () => {
      const r = await fetch(`/api/admin/members?${params}&format=csv`);
      if (!r.ok) throw Error((await r.json()).error ?? "error");
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "socis-cta.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  function saveTemplate() {
    const url = URL.createObjectURL(
      new Blob(
        [
          csvText([
            [
              "full_name",
              "email",
              "phone",
              "legacy_reference",
              "status",
              "category",
              "annual_fee_cents",
              "season",
              "dues_status",
              "notes",
            ],
          ]),
        ],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-socis.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section
      className="member-directory"
      id="member-directory"
      aria-busy={loading || busy}
    >
      <header className="member-directory-heading">
        <div>
          {view !== "list" && (
            <button
              type="button"
              className="member-back"
              onClick={() => navigate("list")}
              disabled={busy}
            >
              <IconArrowLeft size={16} />
              {m.back}
            </button>
          )}
          <h2 ref={heading} tabIndex={-1}>
            {view === "list"
              ? t.members
              : view === "detail"
                ? (detail?.member.full_name ?? m.detail)
                : view === "new"
                  ? m.addMember
                  : m.importTitle}
          </h2>
        </div>
        {view === "list" && (
          <div className="member-toolbar">
            <button type="button" disabled={busy} onClick={exportResults}>
              <IconDownload size={16} />
              {m.exporting}
            </button>
            <button
              type="button"
              onClick={() => {
                setImported(null);
                navigate("import");
              }}
            >
              <IconUpload size={16} />
              {m.importAction}
            </button>
            <button
              type="button"
              className="admin-primary"
              onClick={() => navigate("new")}
            >
              <IconPlus size={16} />
              {m.addMember}
            </button>
          </div>
        )}
      </header>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="form-success" role="status">
          {notice}
        </p>
      )}
      {view === "list" && (
        <>
          <div className="directory-filters">
            <label>
              {t.search}
              <input
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder={t.searchHelp}
              />
            </label>
            <label>
              {t.status}
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">{t.all}</option>
                {["active", "pending", "inactive"].map((s) => (
                  <option key={s} value={s}>
                    {statusText(s)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {m.documents}
              <select
                value={documents}
                onChange={(e) => {
                  setDocuments(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">{m.allDocuments}</option>
                <option value="yes">{m.withDocs}</option>
                <option value="no">{m.withoutDocs}</option>
              </select>
            </label>
            <label>
              {m.feeStatus}
              <select
                value={quota}
                onChange={(e) => {
                  setQuota(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">{m.allFees}</option>
                {["paid", "pending", "returned", "unrecorded"].map((s) => (
                  <option value={s} key={s}>
                    {statusText(s)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {loading ? (
            <p role="status">{m.loading}</p>
          ) : (
            <>
              <div className="directory-table-wrap">
                <table className="directory-table">
                  <thead>
                    <tr>
                      <th>{t.name}</th>
                      <th>{t.contact}</th>
                      <th>{m.documents}</th>
                      <th>{m.fees}</th>
                      <th>{t.status}</th>
                      <th>{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id}>
                        <td data-label={t.name}>
                          <strong>{member.full_name}</strong>
                          <small>
                            {member.legacy_reference ||
                              member.family_name ||
                              ""}
                          </small>
                        </td>
                        <td data-label={t.contact}>
                          <span>{member.email || "—"}</span>
                          <small>{member.phone}</small>
                        </td>
                        <td data-label={m.documents}>
                          <span className="directory-count">
                            <IconFileText size={15} aria-hidden="true" />
                            {member.document_count}
                          </span>
                        </td>
                        <td data-label={m.fees}>
                          <span
                            className="admin-status"
                            data-status={member.quota_status}
                          >
                            {statusText(member.quota_status)}
                          </span>
                          {member.annual_fee_cents != null && (
                            <small>
                              {membershipMoney(member.annual_fee_cents, locale)}
                              {member.season ? ` · ${member.season}` : ""}
                            </small>
                          )}
                        </td>
                        <td data-label={t.status}>
                          <span
                            className="admin-status"
                            data-status={member.status}
                          >
                            {statusText(member.status)}
                          </span>
                        </td>
                        <td data-label={t.actions}>
                          <button
                            type="button"
                            aria-label={`${m.open} · ${member.full_name}`}
                            onClick={() => {
                              setSelected(member.id);
                              navigate("detail");
                            }}
                          >
                            <IconArrowUpRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!members.length && <p className="admin-empty">{t.noRows}</p>}
            </>
          )}
          <footer className="directory-pagination">
            <span>
              {total
                ? `${(page - 1) * 50 + 1}–${Math.min(page * 50, total)}`
                : "0"}{" "}
              {m.of} {total} {m.showing}
            </span>
            <div>
              <button
                type="button"
                disabled={page === 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                <IconChevronLeft size={15} />
                {m.previous}
              </button>
              <button
                type="button"
                disabled={page * 50 >= total || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                {m.next}
                <IconChevronRight size={15} />
              </button>
            </div>
          </footer>
        </>
      )}
      {view === "new" && (
        <>
          <div
            className="member-create-modes"
            role="group"
            aria-label={m.addMember}
          >
            {(["invitation", "historical"] as const).map((mode) => (
              <button
                type="button"
                key={mode}
                aria-pressed={newMode === mode}
                onClick={() => setNewMode(mode)}
              >
                <strong>
                  {mode === "invitation" ? m.inviteMode : m.historyMode}
                </strong>
                <span>
                  {mode === "invitation"
                    ? invitationsEnabled
                      ? m.inviteHelp
                      : m.smtpPending
                    : m.historyHelp}
                </span>
              </button>
            ))}
          </div>
          <form onSubmit={create} key={newMode}>
            <fieldset disabled={busy}>
              <MemberFields
                locale={locale}
                families={families}
                invitation={newMode === "invitation"}
              />
              <button type="submit" className="admin-primary">
                {newMode === "invitation" ? (
                  <IconMail size={16} />
                ) : (
                  <IconCheck size={16} />
                )}{" "}
                {busy
                  ? t.saving
                  : newMode === "invitation"
                    ? invitationsEnabled
                      ? m.confirmInvite
                      : m.savePrepared
                    : m.confirmHistory}
              </button>
            </fieldset>
          </form>
        </>
      )}
      {view === "import" && (
        <div className="member-import">
          <p>{m.importHelp}</p>
          <button type="button" onClick={saveTemplate}>
            <IconDownload size={16} />
            {m.template}
          </button>
          <label>
            {m.importAction}
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={async (e) => {
                setImported(null);
                setError("");
                setNotice("");
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 2 * 1024 * 1024) throw Error("csvError");
                  setImported(parseMemberCsv(await file.text()));
                } catch (reason) {
                  const code = (reason as Error).message;
                  setError(
                    code.startsWith("csvRow:")
                      ? `${m.csvRow} ${code.split(":")[1]}`
                      : text(code),
                  );
                }
              }}
            />
          </label>
          {imported && (
            <>
              <h3>
                {m.preview} · {imported.rows.length}
              </h3>
              {imported.ignored.length > 0 && (
                <p>
                  {m.importIgnored}: {imported.ignored.join(", ")}
                </p>
              )}
              <div className="directory-table-wrap">
                <table className="directory-table">
                  <thead>
                    <tr>
                      <th>{t.name}</th>
                      <th>{t.email}</th>
                      <th>{m.reference}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {imported.rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        <td>{row.full_name}</td>
                        <td>{row.email || "—"}</td>
                        <td>{row.legacy_reference || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>{m.importNote}</p>
              <button
                type="button"
                disabled={busy}
                className="admin-primary"
                onClick={() =>
                  action(async () => {
                    const result = await post("/api/admin/members/import", {
                      rows: imported.rows,
                    });
                    setNotice(`${m.importDone}: ${result.imported}`);
                    setImported(null);
                    await changed();
                  })
                }
              >
                {busy ? t.saving : m.importConfirm}
              </button>
            </>
          )}
        </div>
      )}
      {view === "detail" && (loading || !detail)
        ? loading && <p role="status">{m.loading}</p>
        : view === "detail" &&
          detail && (
            <div className="member-detail-layout">
              <div className="member-detail-main">
                <section className="member-detail-section">
                  <h3>{m.personal}</h3>
                  <form
                    key={detail.member.updated_at}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const payload = memberPayload(e.currentTarget);
                      await action(async () => {
                        await post(
                          `/api/admin/members/${selected}`,
                          payload,
                          "PATCH",
                        );
                        setNotice(m.saved);
                        await changed();
                      });
                    }}
                  >
                    <fieldset disabled={busy}>
                      <MemberFields
                        member={detail.member}
                        families={families}
                        locale={locale}
                      />
                      <button type="submit" className="admin-primary">
                        <IconCheck size={16} />
                        {busy ? t.saving : t.save}
                      </button>
                    </fieldset>
                  </form>
                </section>
                <section className="member-detail-section">
                  <header>
                    <h3>{m.documents}</h3>
                    <span>{detail.documents.length}</span>
                  </header>
                  {!detail.documents.length && <p>{m.noDocuments}</p>}
                  <ul className="member-document-list">
                    {detail.documents.map((doc) => (
                      <li key={doc.id}>
                        <IconFileText size={20} aria-hidden="true" />
                        <div>
                          <strong>
                            {doc.source === "application"
                              ? doc.kind === "form"
                                ? m.form
                                : m.receipt
                              : doc.filename}
                          </strong>
                          <small>
                            {m[
                              doc.kind as
                                "form" | "receipt" | "mandate" | "other"
                            ] ?? m.other}{" "}
                            ·{" "}
                            {new Date(doc.created_at).toLocaleDateString(
                              locale,
                              { timeZone: "Europe/Madrid" },
                            )}
                          </small>
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          aria-label={`${m.open} · ${doc.filename}`}
                          onClick={() =>
                            action(async () => {
                              const result = await post(
                                `/api/admin/members/${selected}/documents`,
                                { documentId: doc.id },
                              );
                              window.location.assign(result.url);
                            })
                          }
                        >
                          <IconDownload size={17} />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <form
                    className="member-document-upload"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const payload = new FormData(form);
                      await action(async () => {
                        await request(
                          `/api/admin/members/${selected}/documents`,
                          { method: "POST", body: payload },
                        );
                        form.reset();
                        setNotice(m.uploaded);
                        await changed();
                      });
                    }}
                  >
                    <fieldset disabled={busy}>
                      <label>
                        {m.documentKind}
                        <select name="kind">
                          <option value="other">{m.other}</option>
                          <option value="form">{m.form}</option>
                          <option value="receipt">{m.receipt}</option>
                          <option value="mandate">{m.mandate}</option>
                        </select>
                      </label>
                      <label>
                        {m.upload}
                        <input
                          name="file"
                          type="file"
                          required
                          accept="application/pdf,image/jpeg,image/png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.setCustomValidity(
                              file && file.size > 3145728 ? m.fileError : "",
                            );
                          }}
                        />
                      </label>
                      <p>{m.fileHelp}</p>
                      <button type="submit">
                        <IconUpload size={16} />
                        {m.upload}
                      </button>
                    </fieldset>
                  </form>
                </section>
                <section className="member-detail-section">
                  <header>
                    <h3>{m.fees}</h3>
                    <button type="button" onClick={() => setDueEditor(null)}>
                      <IconPlus size={16} />
                      {m.addFee}
                    </button>
                  </header>
                  <p>{m.feeHelp}</p>
                  {detail.dues.length ? (
                    <div className="member-dues-list">
                      {detail.dues.map((due) => (
                        <article key={due.id}>
                          <div>
                            <strong>{due.description}</strong>
                            <small>
                              {due.season ?? ""} · {due.due_date}
                            </small>
                          </div>
                          <strong>
                            {membershipMoney(Number(due.amount) * 100, locale)}
                          </strong>
                          <span
                            className="admin-status"
                            data-status={due.status}
                          >
                            {statusText(due.status)}
                          </span>
                          <button
                            type="button"
                            aria-label={`${m.editFee} · ${due.description}`}
                            onClick={() => setDueEditor(due)}
                          >
                            <IconArrowUpRight size={16} />
                          </button>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p>{m.noFees}</p>
                  )}
                  {dueEditor !== undefined && (
                    <form
                      key={dueEditor?.id ?? "new"}
                      className="member-due-editor"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const payload = Object.fromEntries(
                          new FormData(e.currentTarget),
                        );
                        await action(async () => {
                          await post(`/api/admin/members/${selected}/dues`, {
                            ...payload,
                            id: dueEditor?.id,
                          });
                          setDueEditor(undefined);
                          setNotice(m.feeSaved);
                          await changed();
                        });
                      }}
                    >
                      <fieldset disabled={busy}>
                        <div className="member-fields">
                          <label>
                            {t.concept}
                            <input
                              name="description"
                              required
                              minLength={2}
                              maxLength={160}
                              defaultValue={dueEditor?.description}
                            />
                          </label>
                          <label>
                            {t.amount}
                            <input
                              name="amount"
                              type="number"
                              required
                              min="0.01"
                              max="10000"
                              step="0.01"
                              defaultValue={
                                dueEditor?.amount ??
                                (detail.member.annual_fee_cents
                                  ? detail.member.annual_fee_cents / 100
                                  : "")
                              }
                            />
                          </label>
                          <label>
                            {m.season}
                            <input
                              name="season"
                              maxLength={40}
                              defaultValue={
                                dueEditor?.season ?? detail.member.season ?? ""
                              }
                            />
                          </label>
                          <label>
                            {t.dueDate}
                            <input
                              name="due_date"
                              type="date"
                              required
                              defaultValue={dueEditor?.due_date ?? clubToday()}
                            />
                          </label>
                          <label>
                            {t.status}
                            <select
                              name="status"
                              defaultValue={dueEditor?.status ?? "pending"}
                            >
                              {["pending", "paid", "returned"].map((s) => (
                                <option value={s} key={s}>
                                  {statusText(s)}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="member-form-actions">
                          <button type="submit" className="admin-primary">
                            {t.save}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDueEditor(undefined)}
                          >
                            {t.cancel}
                          </button>
                        </div>
                      </fieldset>
                    </form>
                  )}
                </section>
              </div>
              <aside className="member-detail-aside">
                <section>
                  <h3>{detail.member.profile_id ? m.linked : m.noAccount}</h3>
                  <span
                    className="admin-status"
                    data-status={detail.member.status}
                  >
                    {statusText(detail.member.status)}
                  </span>
                  {!invitationsEnabled && <p>{m.smtpPending}</p>}
                  <p>
                    {detail.member.invitation_status === "failed"
                      ? m.inviteFailed
                      : detail.member.invitation_status === "sent"
                        ? m.inviteSent
                        : m.invitePending}
                  </p>
                  {detail.member.invitation_sent_at && (
                    <small>
                      {new Date(
                        detail.member.invitation_sent_at,
                      ).toLocaleString(locale, { timeZone: "Europe/Madrid" })}
                    </small>
                  )}
                  <button
                    type="button"
                    disabled={
                      busy || !detail.member.email || !invitationsEnabled
                    }
                    className="admin-primary"
                    onClick={() =>
                      action(async () => {
                        await post(`/api/admin/members/${selected}/invite`, {
                          locale,
                        });
                        setNotice(m.inviteSent);
                        await changed();
                      })
                    }
                  >
                    <IconMail size={16} />
                    {m.resendInvite}
                  </button>
                  {!detail.member.email && <p>{m.emailRequired}</p>}
                </section>
                <section>
                  <h3>{m.quotaDue}</h3>
                  <strong className="member-outstanding">
                    {membershipMoney(
                      Number(detail.member.outstanding_amount) * 100,
                      locale,
                    )}
                  </strong>
                  <p>{statusText(detail.member.quota_status)}</p>
                  <span className="directory-count">
                    <IconFileText size={17} />
                    {detail.member.document_count} · {m.documents}
                  </span>
                </section>
              </aside>
            </div>
          )}
    </section>
  );
}
