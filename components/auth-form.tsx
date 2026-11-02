"use client";

import { useState, type FormEvent } from "react";
import type { Locale } from "@/i18n/routing";
import type { MemberCopy } from "@/messages/members";
import { Button } from "./ui/button";

export function AuthForm({
  locale,
  copy,
  initialMode = "login",
  initialError = false,
}: {
  locale: Locale;
  copy: MemberCopy;
  initialMode?: "login" | "reset" | "signup";
  initialError?: boolean;
}) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">(
    initialMode,
  );
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
      (mode === "signup" || mode === "reset") &&
      data.get("password") !== data.get("repeat")
    ) {
      setError(copy.mismatch);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          email: data.get("email"),
          password: data.get("password"),
          name: data.get("name"),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(copy[result.error as keyof MemberCopy] ?? copy.error);
        return;
      }
      if (mode === "login" || mode === "reset") {
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
        {mode === "login"
          ? copy.login
          : mode === "signup"
            ? copy.signup
            : mode === "forgot"
              ? copy.recovery
              : copy.reset}
      </h1>
      {mode === "signup" ? (
        <p className="form-intro">{copy.signupIntro}</p>
      ) : null}
      <form onSubmit={submit} key={mode} className="member-form">
        {mode === "signup" ? (
          <label>
            {copy.name}
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
            />
          </label>
        ) : null}
        {mode !== "reset" ? (
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
        {mode === "signup" || mode === "reset" ? (
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
