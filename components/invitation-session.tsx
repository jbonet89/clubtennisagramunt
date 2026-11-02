"use client";
import { useEffect } from "react";
import type { Locale } from "@/i18n/routing";

// Admin invitations use email tokens rather than the sender browser's PKCE state.
export function InvitationSession({ locale }: { locale: Locale }) {
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    if (!fragment.has("access_token") && !fragment.has("error_description"))
      return;
    const access_token = fragment.get("access_token");
    const refresh_token = fragment.get("refresh_token");
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
    void (async () => {
      try {
        if (!access_token || !refresh_token) throw Error("expired");
        const [{ createBrowserClient }, { getSupabaseConfig }] =
          await Promise.all([
            import("@supabase/ssr"),
            import("@/utils/supabase/config"),
          ]);
        const { url, key } = getSupabaseConfig();
        const client = createBrowserClient(url, key, {
          isSingleton: false,
          auth: { detectSessionInUrl: false },
        });
        const session = await client.auth.setSession({
          access_token,
          refresh_token,
        });
        if (session.error) throw session.error;
        const verified = await client.auth.getUser();
        if (verified.error || !verified.data.user) throw Error("expired");
        const preferred = verified.data.user.user_metadata.cta_locale;
        const language = ["ca", "es", "en"].includes(preferred)
          ? preferred
          : locale;
        window.location.replace(`/${language}/acces?mode=setup`);
      } catch {
        window.location.replace(`/${locale}/acces?error=expired`);
      }
    })();
  }, [locale]);
  return null;
}
