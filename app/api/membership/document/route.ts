import { type NextRequest } from "next/server";
import { getMemberSession } from "@/lib/member-server";
import { json, sameOrigin, body } from "@/lib/api";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  try {
    const { supabase, profile } = await getMemberSession();
    if (!profile) return json({ error: "unauthorized" }, 401);
    if (profile.member_active) return json({ error: "forbidden" }, 403);
    if (Number(request.headers.get("content-length") || 0) > 3300000)
      return json({ error: "fileError" }, 413);
    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File) || file.size < 5 || file.size > 3145728)
      return json({ error: "fileError" }, 400);
    const bytes = Buffer.from(await file.arrayBuffer());
    const pdf = bytes.subarray(0, 5).toString() === "%PDF-";
    const png = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const mime = pdf
      ? "application/pdf"
      : png
        ? "image/png"
        : jpg
          ? "image/jpeg"
          : null;
    if (!mime || file.type !== mime) return json({ error: "fileError" }, 400);
    const path = `${profile.id}/${crypto.randomUUID()}.${pdf ? "pdf" : png ? "png" : "jpg"}`;
    const { error } = await supabase.storage
      .from("membership-documents")
      .upload(path, bytes, {
        contentType: mime,
        upsert: false,
        cacheControl: "0",
      });
    return error ? json({ error: "fileError" }, 400) : json({ path }, 201);
  } catch {
    return json({ error: "fileError" }, 400);
  }
}
export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  try {
    const { supabase, profile } = await getMemberSession();
    if (!profile) return json({ error: "unauthorized" }, 401);
    const { path } = await body(request);
    if (
      typeof path !== "string" ||
      !path.startsWith(`${profile.id}/`) ||
      !/^\w[\w/-]+\.(pdf|png|jpg)$/.test(path)
    )
      return json({ error: "forbidden" }, 403);
    const { error } = await supabase.storage
      .from("membership-documents")
      .remove([path]);
    return error ? json({ error: "error" }, 400) : json({ ok: true });
  } catch {
    return json({ error: "invalidData" }, 400);
  }
}
