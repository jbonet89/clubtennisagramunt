"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type {
  MembershipApplication,
  MembershipSettings,
} from "@/lib/membership";
export type MembershipData = {
  settings: MembershipSettings;
  application: MembershipApplication | null;
  applications?: MembershipApplication[];
  memberActive?: boolean;
};
export function useMembershipData(initial?: MembershipData) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const r = await fetch("/api/membership", { cache: "no-store" });
    const result = await r.json();
    if (!r.ok) throw Error(result.error || "error");
    setData(result);
    return result as MembershipData;
  }, []);
  useEffect(() => {
    let mounted = true;
    const reload = () => {
      refresh().catch(() => {
        if (mounted) setError("error");
      });
    };
    reload();
    const supabase = createClient();
    const channel = supabase
      .channel(`membership-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "membership_settings" },
        reload,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "membership_applications" },
        reload,
      )
      .subscribe();
    const timer = setInterval(reload, 15000);
    window.addEventListener("focus", reload);
    return () => {
      mounted = false;
      clearInterval(timer);
      window.removeEventListener("focus", reload);
      void supabase.removeChannel(channel);
    };
  }, [refresh]);
  return { data, error, setError, refresh };
}
export async function membershipAction(payload: Record<string, unknown>) {
  const r = await fetch("/api/membership", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await r.json();
  if (!r.ok) throw Error(result.error || "error");
  return result;
}
