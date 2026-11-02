import { type NextRequest } from "next/server";
import { getMemberSession } from "@/lib/member-server";
import { body, databaseError, json, sameOrigin } from "@/lib/api";
import { validIban } from "@/lib/membership";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { supabase, profile } = await getMemberSession();
    if (!profile) return json({ error: "unauthorized" }, 401);
    const admin = profile.role === "admin" && profile.member_active;
    const [settings, application, applications] = await Promise.all([
      supabase.from("membership_settings").select("*").single(),
      supabase
        .from("membership_applications")
        .select("*")
        .eq("user_id", profile.id)
        .maybeSingle(),
      admin
        ? supabase
            .from("membership_applications")
            .select(
              "*,applicant:profiles!membership_applications_user_id_fkey(full_name,email)",
            )
            .order("submitted_at", { ascending: false })
            .limit(200)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (settings.error || application.error || applications.error)
      return json({ error: "error" }, 503);
    return json({
      settings: settings.data,
      application: application.data,
      applications: applications.data,
      memberActive: profile.member_active,
    });
  } catch {
    return json({ error: "error" }, 503);
  }
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  try {
    const { supabase, profile } = await getMemberSession();
    if (!profile) return json({ error: "unauthorized" }, 401);
    const b = await body(request);
    const admin = profile.role === "admin" && profile.member_active;
    if (b.action === "submit") {
      if (
        typeof b.phone !== "string" ||
        typeof b.document !== "string" ||
        (b.receipt != null && typeof b.receipt !== "string") ||
        !["adult", "junior"].includes(String(b.category)) ||
        !["transfer", "direct_debit"].includes(String(b.method))
      )
        return json({ error: "invalidData" }, 400);
      const { data, error } = await supabase.rpc("submit_membership", {
        p_category: b.category,
        p_phone: b.phone,
        p_method: b.method,
        p_document: b.document,
        p_receipt: b.receipt || null,
      });
      return error ? databaseError(error) : json({ id: data });
    }
    if (b.action === "download") {
      if (
        typeof b.id !== "string" ||
        !["document", "receipt"].includes(String(b.kind))
      )
        return json({ error: "invalidData" }, 400);
      const app = await supabase
        .from("membership_applications")
        .select("document_path,receipt_path")
        .eq("id", b.id)
        .single();
      if (app.error) return json({ error: "forbidden" }, 403);
      const path =
        b.kind === "document" ? app.data.document_path : app.data.receipt_path;
      if (!path) return json({ error: "invalidData" }, 400);
      const result = await supabase.storage
        .from("membership-documents")
        .createSignedUrl(path, 60, { download: true });
      return result.error
        ? json({ error: "error" }, 400)
        : json({ url: result.data.signedUrl });
    }
    if (!admin) return json({ error: "forbidden" }, 403);
    if (b.action === "review") {
      if (
        typeof b.id !== "string" ||
        typeof b.note !== "string" ||
        !["approved", "changes_requested"].includes(String(b.status))
      )
        return json({ error: "invalidData" }, 400);
      const { error } = await supabase.rpc("review_membership", {
        p_id: b.id,
        p_status: b.status,
        p_note: b.note,
      });
      return error ? databaseError(error) : json({ ok: true });
    }
    if (b.action === "settings") {
      const text = (key: string, max: number) => {
        const v = b[key];
        if (typeof v !== "string" || v.length > max) throw Error();
        return v.trim();
      };
      const iban = text("iban", 34).replace(/\s/g, "").toUpperCase();
      const adult = Number(b.adult_fee_cents),
        junior = Number(b.junior_fee_cents);
      const url = new URL(text("form_url", 500));
      if (
        !validIban(iban) ||
        !Number.isInteger(adult) ||
        !Number.isInteger(junior) ||
        adult < 0 ||
        junior < 0 ||
        adult > 1000000 ||
        junior > 1000000 ||
        url.protocol !== "https:"
      )
        return json({ error: "invalidData" }, 400);
      const row = {
        adult_fee_cents: adult,
        junior_fee_cents: junior,
        season: text("season", 40),
        bank_name: text("bank_name", 100),
        iban,
        whatsapp: text("whatsapp", 15),
        form_url: url.toString(),
        note: text("note", 2000),
        updated_at: new Date().toISOString(),
      };
      if (!/^[0-9]{8,15}$/.test(row.whatsapp) || !row.season || !row.bank_name)
        return json({ error: "invalidData" }, 400);
      const { error } = await supabase
        .from("membership_settings")
        .update(row)
        .eq("id", true);
      return error ? databaseError(error) : json({ ok: true });
    }
    return json({ error: "invalidData" }, 400);
  } catch {
    return json({ error: "invalidData" }, 400);
  }
}
