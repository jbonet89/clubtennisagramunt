import type { NextRequest } from "next/server";
import { json, sameOrigin } from "@/lib/api";
import {
  memberAdmin,
  memberFailure,
  adminBody,
  memberInput,
  MemberAdminError,
} from "@/lib/member-admin-server";
import { csvText } from "@/lib/member-directory";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const { supabase } = await memberAdmin();
    const p = request.nextUrl.searchParams;
    const q = (p.get("q") ?? "").trim().slice(0, 100);
    const status = p.get("status"),
      documents = p.get("documents"),
      quota = p.get("quota");
    const page = Math.max(
      1,
      Math.min(10000, Math.floor(Number(p.get("page")) || 1)),
    );
    const csv = p.get("format") === "csv";
    let query = supabase
      .from("admin_member_directory")
      .select("*", { count: "exact" });
    if (q)
      query = query.ilike("search_text", `%${q.replace(/[\\%_]/g, "\\$&")}%`);
    if (status) {
      if (!["active", "pending", "inactive"].includes(status))
        throw new MemberAdminError("invalidData");
      query = query.eq("status", status);
    }
    if (documents === "yes") query = query.gt("document_count", 0);
    if (documents === "no") query = query.eq("document_count", 0);
    if (quota) {
      if (!["paid", "pending", "returned", "unrecorded"].includes(quota))
        throw new MemberAdminError("invalidData");
      query = query.eq("quota_status", quota);
    }
    const { data, error, count } = await query
      .order("full_name")
      .order("id")
      .range(csv ? 0 : (page - 1) * 50, csv ? 999 : page * 50 - 1);
    if (error) throw error;
    if (csv) {
      if ((count ?? 0) > 10000) throw new MemberAdminError("exportLimit");
      const exported = [...(data ?? [])];
      for (let offset = exported.length; offset < (count ?? 0);) {
        const batch = await query.order("full_name").order("id").range(offset, Math.min(offset + 999, (count ?? 0) - 1));
        if (batch.error) throw batch.error;
        if (!batch.data?.length) throw new MemberAdminError("error", 503);
        exported.push(...batch.data);
        offset += batch.data.length;
      }
      return new Response(
        csvText([
          [
            "full_name",
            "email",
            "phone",
            "legacy_reference",
            "status",
            "document_count",
            "quota_status",
            "annual_fee_cents",
            "season",
          ],
          ...exported.map((m) => [
            m.full_name,
            m.email,
            m.phone,
            m.legacy_reference,
            m.status,
            m.document_count,
            m.quota_status,
            m.annual_fee_cents,
            m.season,
          ]),
        ]),
        {
          headers: {
            "Content-Type": "text/csv;charset=utf-8",
            "Content-Disposition": 'attachment; filename="socis-cta.csv"',
            "Cache-Control": "private, no-store",
          },
        },
      );
    }
    return json({ members: data, total: count ?? 0, page, pageSize: 50 });
  } catch (error) {
    return memberFailure(error);
  }
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  try {
    const { supabase } = await memberAdmin();
    const value = memberInput(await adminBody(request));
    const { data, error } = await supabase.rpc("admin_save_member", {
      p_data: value,
    });
    if (error) throw error;
    return json({ id: data }, 201);
  } catch (error) {
    return memberFailure(error);
  }
}
