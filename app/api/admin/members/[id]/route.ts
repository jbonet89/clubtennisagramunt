import type { NextRequest } from "next/server";
import { json, sameOrigin } from "@/lib/api";
import {
  memberAdmin,
  memberFailure,
  memberId,
  adminBody,
  memberInput,
  MemberAdminError,
} from "@/lib/member-admin-server";
export const dynamic = "force-dynamic";
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase } = await memberAdmin();
    const id = memberId((await params).id);
    const result = await supabase
      .from("admin_member_directory")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) throw new MemberAdminError("notFound", 404);
    const member = result.data;
    const [dues, documents, application] = await Promise.all([
      supabase
        .from("club_dues")
        .select("id,member_id,description,amount,due_date,status,season")
        .eq("member_id", id)
        .order("due_date", { ascending: false }),
      supabase
        .from("club_member_documents")
        .select("id,filename,kind,created_at")
        .eq("member_id", id)
        .order("created_at", { ascending: false }),
      member.profile_id
        ? supabase
            .from("membership_applications")
            .select("id,document_path,receipt_path,submitted_at")
            .eq("user_id", member.profile_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (dues.error || documents.error || application.error)
      throw dues.error || documents.error || application.error;
    const files = (documents.data ?? []).map((d) => ({
      ...d,
      source: "manual",
    }));
    if (application.data?.document_path)
      files.push({
        id: "application-document",
        filename: "form",
        kind: "form",
        created_at: application.data.submitted_at,
        source: "application",
      });
    if (application.data?.receipt_path)
      files.push({
        id: "application-receipt",
        filename: "receipt",
        kind: "receipt",
        created_at: application.data.submitted_at,
        source: "application",
      });
    return json({ member, documents: files, dues: dues.data });
  } catch (error) {
    return memberFailure(error);
  }
}
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  try {
    const { supabase } = await memberAdmin();
    const id = memberId((await params).id);
    const value = memberInput(await adminBody(request));
    const { data, error } = await supabase.rpc("admin_save_member", {
      p_data: { ...value, id },
    });
    if (error) throw error;
    return json({ id: data });
  } catch (error) {
    return memberFailure(error);
  }
}
