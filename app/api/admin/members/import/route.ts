import type { NextRequest } from "next/server";
import { json, sameOrigin } from "@/lib/api";
import {
  memberAdmin,
  memberFailure,
  adminBody,
  memberInput,
  MemberAdminError,
} from "@/lib/member-admin-server";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  try {
    const { supabase } = await memberAdmin();
    const input = await adminBody(request, 2500000);
    if (
      !Array.isArray(input.rows) ||
      !input.rows.length ||
      input.rows.length > 500
    )
      throw new MemberAdminError("invalidData");
    const rows = input.rows.map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row))
        throw new MemberAdminError("invalidData");
      // Validate a complete shape, but retain only supplied columns on updates.
      const checked = memberInput({
        ...row,
        status: row.status ?? "active",
        source: "historical",
      });
      if (!checked.email && !checked.legacy_reference)
        throw new MemberAdminError("importIdRequired");
      const filtered = Object.fromEntries(
        Object.entries(checked).filter(
          ([key]) => Object.hasOwn(row, key) || key === "full_name",
        ),
      );
      if (
        row.dues_status &&
        !["paid", "pending", "returned"].includes(row.dues_status)
      )
        throw new MemberAdminError("invalidData");
      return {
        ...filtered,
        ...(row.dues_status ? { dues_status: row.dues_status } : {}),
      };
    });
    const result = await supabase.rpc("admin_import_members", { p_rows: rows });
    if (result.error) throw result.error;
    return json({ imported: result.data });
  } catch (error) {
    return memberFailure(error);
  }
}
