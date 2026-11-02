"use client";

import { useState, type FormEvent } from "react";
import type { Locale } from "@/i18n/routing";
import type { MemberCopy } from "@/messages/members";
import { memberManagementCopy } from "@/messages/member-management";
import { Button } from "./ui/button";

export function AuthForm({
  locale,
  copy,
  initialMode = "login",
  initialError = false,
  initialProfile,
}: {
  locale: Locale;
  copy: MemberCopy;
  initialMode?: "login" | "reset" | "signup" | "setup";
  initialProfile?: { full_name: string; email: string; phone?: string | null };
  initialError?: boolean;
}) {
  const [mode, setMode] = useState<
    "login" | "signup" | "forgot" | "reset" | "setup"
  >(initialMode);
  const setup = memberManagementCopy[locale];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ? copy.expired : "");
  const [message, setMessage] = useState("");
  function changeMode(next: typeof mode) {
    setMode(next);
    setError("");
    setMessage("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    setMessage("");
    if (
      (mode === "signup" || mode === "reset" || mode === "setup") &&
      data.get("password") !== data.get("repeat")
    ) {
      setError(copy.mismatch);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(
        `/api/auth/${mode === "setup" ? "reset" : mode}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale,
            email: data.get("email"),
            password: data.get("password"),
            name: data.get("name"),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        setError(copy[result.error as keyof MemberCopy] ?? copy.error);
        return;
      }
      if (mode === "setup") {
        const saved = await fetch("/api/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "profile",
            full_name: data.get("name"),
            phone: data.get("phone"),
          }),
        });
        if (!saved.ok) {
          setError(copy.error);
          return;
        }
      }
      if (mode === "login" || mode === "reset" || mode === "setup") {
        window.location.assign(`/${locale}/socis`);
        return;
      }
      setMessage(mode === "signup" ? copy.emailSent : copy.recoverySent);
    } catch {
      setError(copy.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-card">
      <p className="eyebrow">CTA · {copy.area}</p>
      <h1>
        {mode === "setup"
          ? setup.setup
          : mode === "login"
            ? copy.login
            : mode === "signup"
              ? copy.signup
              : mode === "forgot"
                ? copy.recovery
                : copy.reset}
      </h1>
      {mode === "setup" && <p className="form-intro">{setup.setupHelp}</p>}
      {mode === "signup" ? (
        <p className="form-intro">{copy.signupIntro}</p>
      ) : null}
      <form onSubmit={submit} key={mode} className="member-form">
        {mode === "signup" || mode === "setup" ? (
          <label>
            {copy.name}
            <input
              defaultValue={initialProfile?.full_name}
              name="name"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
            />
          </label>
        ) : null}
        {mode === "setup" && (
          <label>
            {locale === "es"
              ? "Teléfono"
              : locale === "en"
                ? "Phone"
                : "Telèfon"}
            <input
              name="phone"
              type="tel"
              maxLength={40}
              defaultValue={initialProfile?.phone ?? ""}
            />
          </label>
        )}
        {mode !== "reset" && mode !== "setup" ? (
          <label>
            {copy.email}
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              maxLength={254}
            />
          </label>
        ) : null}
        {mode !== "forgot" ? (
          <label>
            {copy.password}
            <input
              name="password"
              type="password"
              required
              minLength={mode === "login" ? 1 : 10}
              maxLength={128}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
            {mode !== "login" ? (
              <span className="field-help">{copy.passwordHint}</span>
            ) : null}
          </label>
        ) : null}
        {mode === "signup" || mode === "reset" || mode === "setup" ? (
          <label>
            {copy.repeatPassword}
            <input
              name="repeat"
              type="password"
              required
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
        ) : null}
        {error ? (
          <p role="alert" className="form-error">
            {error}
          </p>
        ) : null}
        {message ? (
          <div role="status" className="form-success">
            <p>{message}</p>
            <p>{copy.emailHelp}</p>
          </div>
        ) : null}
        <Button type="submit" disabled={busy}>
          {busy
            ? copy.loading
            : mode === "setup"
              ? setup.setupSave
              : mode === "login"
                ? copy.enter
                : mode === "signup"
                  ? copy.register
                  : mode === "forgot"
                    ? copy.sendRecovery
                    : copy.savePassword}
        </Button>
      </form>
      <div className="auth-links">
        {mode === "login" ? (
          <>
            <button onClick={() => changeMode("forgot")}>{copy.forgot}</button>
            <p>
              {copy.noAccount}{" "}
              <button onClick={() => changeMode("signup")}>
                {copy.signup}
              </button>
            </p>
          </>
        ) : (
          <button onClick={() => changeMode("login")}>{copy.backLogin}</button>
        )}
      </div>
      <a
        className="member-contact-link"
        href="mailto:clubtennisagramunt1974@gmail.com"
      >
        clubtennisagramunt1974@gmail.com
      </a>
    </section>
  );
}
