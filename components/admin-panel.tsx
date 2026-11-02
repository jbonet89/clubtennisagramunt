"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  IconUsers,
  IconUserPlus,
  IconCash,
  IconHome,
  IconFileText,
  IconShield,
  IconSearch,
  IconPlus,
  IconPencil,
  IconDownload,
  IconSettings,
  IconArrowUpRight,
} from "@tabler/icons-react";
import { adminSections, type AdminSection } from "@/lib/admin";
import type { Locale } from "@/i18n/routing";
import { membershipCopy } from "@/messages/membership";
import { administrationCopy } from "@/messages/administration";
import { MembershipAdmin } from "./membership-admin";
import type { MembershipData } from "./membership-data";
import "@/app/admin.css";

type Row = Record<string, string>;
type Data = {
  sections: { id: AdminSection; enabled: boolean }[];
  socis?: Row[];
  families?: Row[];
  quotes?: Row[];
  documents?: Row[];
  profiles?: Row[];
  convidats?: { name: string; appearances: number; last_played: string }[];
};
function exportCsv(rows: unknown[][], filename: string) {
  const csv =
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((item) => {
            const value = String(item ?? "");
            return (
              '"' +
              (/^[=+@\-\t\r]/.test(value) ? "'" : "") +
              value.replaceAll('"', '""') +
              '"'
            );
          })
          .join(";"),
      )
      .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function AdminPanel({ locale = "ca" }: { locale?: Locale }) {
  const t = administrationCopy[locale];
  const [data, setData] = useState<Data>();
  const [membership, setMembership] = useState<MembershipData>();
  const [section, setSection] = useState<AdminSection>("resum");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [edit, setEdit] = useState<Row | null>(null);
  const [composer, setComposer] = useState(false);
  const labels: Record<AdminSection, string> = {
    resum: t.summary,
    socis: t.members,
    families: t.families,
    documents: t.documents,
    quotes: t.dues,
    permisos: t.permissions,
    convidats: t.guests,
  };
  const icons = {
    resum: IconHome,
    socis: IconUsers,
    families: IconHome,
    documents: IconFileText,
    quotes: IconCash,
    permisos: IconShield,
    convidats: IconUserPlus,
  };
  async function refresh() {
    const r = await fetch("/api/admin", { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw Error(t.error);
    setData(d);
  }
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);
  async function save(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw Error(t.saveError);
      if (d.url) window.location.assign(d.url);
      await refresh();
      setEdit(null);
      setComposer(false);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t.saveError);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function toggleAccount(row: Row) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: row.id,
          active: String(row.member_active) !== "true",
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(
          result.error === "confirmedAccount"
            ? membershipCopy(locale).confirmedAccount
            : t.saveError,
        );
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.saveError);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    await save({ ...values, section, id: edit?.id });
  }
  function navigate(value: AdminSection) {
    setSection(value);
    setEdit(null);
    setComposer(false);
    setSearch("");
    setStatusFilter("");
  }
  const enabled = data?.sections.some((s) => s.id === section && s.enabled);
  const statusName = (status: string) =>
    ({
      active: t.activeStatus,
      pending: t.pendingStatus,
      inactive: t.inactiveStatus,
      paid: t.paidStatus,
      returned: t.returnedStatus,
    })[status] ?? status;
  const memberName = (id: string) =>
    data?.socis?.find((m) => m.id === id)?.full_name ?? id;
  const familyName = (id: string) =>
    data?.families?.find((f) => f.id === id)?.name ?? t.noFamily;
  const filter = (row: Row) =>
    (!statusFilter || row.status === statusFilter) &&
    Object.values(row).some((v) =>
      String(v)
        .toLocaleLowerCase(locale)
        .includes(search.toLocaleLowerCase(locale)),
    );
  const memberRows = (data?.socis ?? []).filter(filter);
  const sectionRows =
    (section === "permisos"
      ? data?.profiles
      : section === "documents"
        ? data?.documents
        : section === "families"
          ? data?.families
          : section === "quotes"
            ? data?.quotes
            : []) ?? [];
  const stats = [
    {
      label: t.active,
      value: data?.socis?.filter((m) => m.status === "active").length ?? "—",
      icon: IconUsers,
    },
    {
      label: t.pending,
      value:
        membership?.applications?.filter((a) => a.status !== "approved")
          .length ?? "…",
      icon: IconUserPlus,
    },
    {
      label: t.paid,
      value: data?.quotes?.length
        ? `${Math.round((data.quotes.filter((q) => q.status === "paid").length / data.quotes.length) * 100)}%`
        : "—",
      icon: IconCash,
    },
    {
      label: t.familyCount,
      value: data?.families?.length ?? "—",
      icon: IconHome,
    },
  ];
  function register(rows: Row[]) {
    return (
      <div className="admin-table-wrap">
        <table className="admin-register">
          <thead>
            <tr>
              <th>{t.name}</th>
              <th>{t.contact}</th>
              <th>{t.family}</th>
              <th>{t.status}</th>
              <th>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} data-status={row.status}>
                <td>
                  <div className="admin-person">
                    <span>
                      {row.full_name
                        ?.split(/\s+/)
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")}
                    </span>
                    <div>
                      <strong>{row.full_name}</strong>
                      <small>
                        {t.memberRecord} {row.id.slice(0, 6).toUpperCase()}
                      </small>
                    </div>
                  </div>
                </td>
                <td>
                  <a href={`mailto:${row.email}`}>{row.email}</a>
                  <small>{row.phone}</small>
                </td>
                <td>
                  <span className="admin-family-tag">
                    {row.family_id ? familyName(row.family_id) : t.noFamily}
                  </span>
                </td>
                <td>
                  <span className="admin-status" data-status={row.status}>
                    {statusName(row.status)}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    aria-label={`${t.edit} · ${row.full_name}`}
                    onClick={() => {
                      setSection("socis");
                      setEdit(row);
                      setComposer(true);
                    }}
                  >
                    <IconPencil size={17} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="admin-empty">{t.noRows}</p>}
      </div>
    );
  }
  return (
    <section className="admin-app internal-administration" aria-label={t.title}>
      <header className="admin-overview-heading">
        <div>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
        {data?.socis && (
          <button
            type="button"
            onClick={() =>
              exportCsv(
                [
                  [t.name, t.email, t.phone, t.status],
                  ...data.socis!.map((r) => [
                    r.full_name,
                    r.email,
                    r.phone,
                    statusName(r.status),
                  ]),
                ],
                "socis-cta.csv",
              )
            }
          >
            <IconDownload size={16} aria-hidden="true" />
            {t.export}
          </button>
        )}
      </header>
      <nav className="admin-section-navigation" aria-label={t.title}>
        {Object.keys(adminSections).map((key) => {
          const id = key as AdminSection;
          const Icon = icons[id];
          return (
            data?.sections.some((s) => s.id === id && s.enabled) && (
              <button
                type="button"
                key={id}
                aria-current={section === id ? "page" : undefined}
                onClick={() => navigate(id)}
              >
                <Icon size={16} aria-hidden="true" />
                {labels[id]}
              </button>
            )
          );
        })}
      </nav>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">{t.loading}</p>}
      {data && !enabled && <p className="admin-empty">{t.disabled}</p>}
      {data && enabled && (
        <div className="admin-section-content">
          {section === "resum" ? (
            <>
              <div className="admin-stat-cards">
                {stats.map(({ label, value, icon: Icon }, i) => (
                  <div key={label} data-stat={i}>
                    <span>
                      {label}
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <p className="admin-data-note">{t.loaded}</p>
              <MembershipAdmin
                locale={locale}
                compact
                onDataChange={setMembership}
              />
              {data.socis && (
                <section className="admin-register-section">
                  <header>
                    <h3>{t.register}</h3>
                    <button type="button" onClick={() => navigate("socis")}>
                      {t.viewAll}
                      <IconArrowUpRight size={15} aria-hidden="true" />
                    </button>
                  </header>
                  {register(data.socis.slice(0, 8))}
                </section>
              )}
            </>
          ) : section === "convidats" ? (
            <section className="admin-register-section">
              <header>
                <h3>{t.guests}</h3>
                <button
                  type="button"
                  onClick={() =>
                    exportCsv(
                      [
                        [t.name, t.appearances, t.last],
                        ...(data.convidats ?? []).map((r) => [
                          r.name,
                          r.appearances,
                          new Date(r.last_played).toLocaleDateString(locale, {
                            timeZone: "Europe/Madrid",
                          }),
                        ]),
                      ],
                      "convidats-cta.csv",
                    )
                  }
                >
                  <IconDownload size={16} aria-hidden="true" />
                  {t.export}
                </button>
              </header>
              <p>{t.guestsHelp}</p>
              <label className="admin-search">
                <IconSearch size={16} aria-hidden="true" />
                {t.search}
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <div className="admin-list">
                {data.convidats
                  ?.filter((r) =>
                    r.name
                      .toLocaleLowerCase(locale)
                      .includes(search.toLocaleLowerCase(locale)),
                  )
                  .map((r) => (
                    <article key={r.name}>
                      <strong>{r.name}</strong>
                      <p>
                        {r.appearances}{" "}
                        {t.appearances.toLocaleLowerCase(locale)} ·{" "}
                        {new Date(r.last_played).toLocaleDateString(locale, {
                          timeZone: "Europe/Madrid",
                        })}
                      </p>
                    </article>
                  ))}
                {!data.convidats?.length && <p>{t.noRows}</p>}
              </div>
            </section>
          ) : (
            <>
              <section className="admin-register-section">
                <header>
                  <h3>{labels[section]}</h3>
                  {["socis", "families", "quotes"].includes(section) && (
                    <button
                      type="button"
                      className="admin-primary"
                      onClick={() => {
                        setEdit(null);
                        setComposer((v) => !v);
                      }}
                    >
                      <IconPlus size={16} aria-hidden="true" />
                      {t.add}
                    </button>
                  )}
                </header>
                {section === "quotes" && <p>{t.duesHelp}</p>}
                {section === "documents" && <p>{t.privateHelp}</p>}
                {section === "permisos" && <p>{t.permissionsHelp}</p>}
                {composer && (
                  <form
                    className="admin-editor"
                    onSubmit={submit}
                    key={section + (edit?.id ?? "new")}
                  >
                    <h4>{edit ? t.edit : t.add}</h4>
                    {section === "families" ? (
                      <label>
                        {t.familyName}
                        <input
                          name="name"
                          required
                          maxLength={120}
                          defaultValue={edit?.name}
                        />
                      </label>
                    ) : section === "socis" ? (
                      <>
                        <label>
                          {t.name}
                          <input
                            name="full_name"
                            required
                            maxLength={100}
                            defaultValue={edit?.full_name}
                          />
                        </label>
                        <label>
                          {t.email}
                          <input
                            name="email"
                            type="email"
                            maxLength={254}
                            defaultValue={edit?.email}
                          />
                        </label>
                        <label>
                          {t.phone}
                          <input
                            name="phone"
                            maxLength={40}
                            defaultValue={edit?.phone}
                          />
                        </label>
                        <label>
                          {t.family}
                          <select
                            name="family_id"
                            defaultValue={edit?.family_id ?? ""}
                          >
                            <option value="">{t.noFamily}</option>
                            {data.families?.map((f) => (
                              <option value={f.id} key={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          {t.status}
                          <select
                            name="status"
                            defaultValue={edit?.status ?? "pending"}
                          >
                            {["pending", "active", "inactive"].map((status) => (
                              <option value={status} key={status}>
                                {statusName(status)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    ) : (
                      <>
                        <label>
                          {t.member}
                          <select
                            name="member_id"
                            required
                            defaultValue={edit?.member_id}
                          >
                            <option value="">{t.selectMember}</option>
                            {data.socis?.map((m) => (
                              <option value={m.id} key={m.id}>
                                {m.full_name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          {t.concept}
                          <input
                            name="description"
                            required
                            maxLength={160}
                            defaultValue={edit?.description}
                          />
                        </label>
                        <label>
                          {t.amount}
                          <input
                            name="amount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            defaultValue={edit?.amount}
                          />
                        </label>
                        <label>
                          {t.dueDate}
                          <input
                            name="due_date"
                            type="date"
                            required
                            defaultValue={edit?.due_date}
                          />
                        </label>
                        <label>
                          {t.status}
                          <select
                            name="status"
                            defaultValue={edit?.status ?? "pending"}
                          >
                            {["pending", "paid", "returned"].map((status) => (
                              <option value={status} key={status}>
                                {statusName(status)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    )}
                    <div className="admin-editor-actions">
                      <button className="admin-primary" disabled={busy}>
                        {busy ? t.saving : t.save}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEdit(null);
                          setComposer(false);
                        }}
                      >
                        {t.cancel}
                      </button>
                    </div>
                  </form>
                )}
                {section === "documents" && (
                  <form
                    className="admin-editor"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const fd = new FormData(form);
                      const file = fd.get("file") as File;
                      if (file.size > 10485760) {
                        setError(t.tooLarge);
                        return;
                      }
                      const bytes = new Uint8Array(await file.arrayBuffer());
                      let raw = "";
                      for (const byte of bytes)
                        raw += String.fromCharCode(byte);
                      if (
                        await save({
                          section,
                          action: "upload",
                          memberId: fd.get("memberId"),
                          content: btoa(raw),
                        })
                      )
                        form.reset();
                    }}
                  >
                    <label>
                      {t.member}
                      <select name="memberId" required>
                        <option value="">{t.selectMember}</option>
                        {data.socis?.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.full_name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t.pdf}
                      <input
                        type="file"
                        name="file"
                        accept="application/pdf"
                        required
                      />
                    </label>
                    <button disabled={busy} className="admin-primary">
                      {t.save}
                    </button>
                  </form>
                )}
                <div className="admin-table-filters">
                  <label>
                    {t.search}
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t.searchHelp}
                    />
                  </label>
                  {["socis", "quotes"].includes(section) && (
                    <label>
                      {t.status}
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="">{t.all}</option>
                        {(section === "socis"
                          ? ["active", "pending", "inactive"]
                          : ["pending", "paid", "returned"]
                        ).map((status) => (
                          <option value={status} key={status}>
                            {statusName(status)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                {section === "socis" ? (
                  register(memberRows)
                ) : (
                  <div className="admin-list">
                    {sectionRows.filter(filter).map((row) => (
                      <article key={row.id ?? row.name}>
                        <div>
                          <strong>
                            {row.full_name ?? row.name ?? row.description}
                          </strong>
                          <p>
                            {section === "quotes"
                              ? `${memberName(row.member_id)} · ${row.amount} € · ${row.due_date}`
                              : row.email}
                          </p>
                          {row.status && (
                            <span
                              className="admin-status"
                              data-status={row.status}
                            >
                              {statusName(row.status)}
                            </span>
                          )}
                          {section === "permisos" && (
                            <>
                              <span className="admin-status">{row.role}</span>
                              <span
                                className="admin-status"
                                data-status={
                                  String(row.member_active) === "true"
                                    ? "active"
                                    : "pending"
                                }
                              >
                                {String(row.member_active) === "true"
                                  ? t.webActive
                                  : t.webInactive}
                              </span>
                            </>
                          )}
                        </div>
                        {section === "documents" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              save({
                                section,
                                action: "download",
                                name: row.name,
                              })
                            }
                          >
                            {t.open}
                          </button>
                        ) : section === "permisos" ? (
                          row.role !== "admin" && (
                            <div className="admin-account-actions">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => toggleAccount(row)}
                              >
                                {String(row.member_active) === "true"
                                  ? t.deactivate
                                  : t.activate}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `${t.grantConfirm} ${row.full_name}?`,
                                    )
                                  )
                                    void save({
                                      section,
                                      action: "grant_admin",
                                      userId: row.id,
                                    });
                                }}
                              >
                                {t.grant}
                              </button>
                            </div>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEdit(row);
                              setComposer(true);
                            }}
                          >
                            {t.edit}
                          </button>
                        )}
                      </article>
                    ))}
                    {!sectionRows.filter(filter).length && <p>{t.noRows}</p>}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}
      {data && (
        <details className="admin-section-settings">
          <summary>
            <IconSettings size={16} aria-hidden="true" />
            {t.settings}
          </summary>
          <p>{t.settingsHelp}</p>
          <div>
            {data.sections.map((s) => (
              <label key={s.id}>
                <input
                  type="checkbox"
                  checked={s.enabled}
                  disabled={busy}
                  onChange={(e) =>
                    save({
                      section: s.id,
                      action: "toggle",
                      enabled: e.target.checked,
                    })
                  }
                />
                {labels[s.id]}
              </label>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
