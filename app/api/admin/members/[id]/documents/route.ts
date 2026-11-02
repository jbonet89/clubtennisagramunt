import type { NextRequest } from "next/server";
import { json, sameOrigin } from "@/lib/api";
import {
  memberAdmin,
  memberFailure,
  memberId,
  adminBody,
  MemberAdminError,
} from "@/lib/member-admin-server";
export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  try {
    const { supabase, profile } = await memberAdmin();
    const id = memberId((await params).id);
    const { data: member, error: memberError } = await supabase
      .from("club_members")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (memberError) throw memberError;
    if (!member) throw new MemberAdminError("notFound", 404);
    if (request.headers.get("content-type")?.includes("application/json")) {
      const b = await adminBody(request);
      let path: string | null = null;
      let bucket = "club-documents";
      if (
        b.documentId === "application-document" ||
        b.documentId === "application-receipt"
      ) {
        const { data: linked } = await supabase
          .from("club_members")
          .select("profile_id")
          .eq("id", id)
          .single();
        if (!linked?.profile_id) throw new MemberAdminError("notFound", 404);
        const { data: application, error } = await supabase
          .from("membership_applications")
          .select("document_path,receipt_path")
          .eq("user_id", linked.profile_id)
          .single();
        if (error) throw error;
        bucket = "membership-documents";
        path =
          b.documentId === "application-document"
            ? application.document_path
            : application.receipt_path;
      } else {
        const docId = memberId(String(b.documentId));
        const { data: document, error } = await supabase
          .from("club_member_documents")
          .select("storage_path")
          .eq("id", docId)
          .eq("member_id", id)
          .maybeSingle();
        if (error) throw error;
        path = document?.storage_path ?? null;
      }
      if (!path) throw new MemberAdminError("notFound", 404);
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60, { download: true });
      if (error) throw error;
      return json({ url: data.signedUrl });
    }
    if (Number(request.headers.get("content-length")) > 4 * 1024 * 1024)
      throw new MemberAdminError("fileError", 413);
    const form = await request.formData();
    const file = form.get("file");
    const kind = form.get("kind") ?? "other";
    if (
      !(file instanceof File) ||
      !file.size ||
      file.size > 3 * 1024 * 1024 ||
      !["form", "receipt", "mandate", "other"].includes(String(kind))
    )
      throw new MemberAdminError("fileError");
    const bytes = Buffer.from(await file.arrayBuffer());
    const format =
      bytes.subarray(0, 5).toString() === "%PDF-"
        ? ["pdf", "application/pdf"]
        : bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? ["png", "image/png"]
          : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            ? ["jpg", "image/jpeg"]
            : null;
    if (!format) throw new MemberAdminError("fileError");
    const path = `members/${id}/${crypto.randomUUID()}.${format[0]}`;
    const upload = await supabase.storage
      .from("club-documents")
      .upload(path, bytes, { contentType: format[1], upsert: false });
    if (upload.error) throw upload.error;
    const saved = await supabase
      .from("club_member_documents")
      .insert({
        member_id: id,
        storage_path: path,
        filename:
          file.name.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 200) ||
          `Document.${format[0]}`,
        kind,
        uploaded_by: profile.id,
      });
    if (saved.error) {
      await supabase.storage.from("club-documents").remove([path]);
      throw saved.error;
    }
    return json({ ok: true }, 201);
  } catch (error) {
    return memberFailure(error);
  }
}
