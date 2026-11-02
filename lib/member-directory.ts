export type MemberRecord = {
  id: string;
  profile_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  status: "active" | "pending" | "inactive";
  family_id: string | null;
  family_name: string | null;
  legacy_reference: string;
  category: "adult" | "junior" | null;
  annual_fee_cents: number | null;
  season: string | null;
  notes: string;
  source: string;
  invitation_status: string;
  invitation_sent_at: string | null;
  web_role: string | null;
  web_active: boolean | null;
  document_count: number;
  dues_count: number;
  paid_dues: number;
  outstanding_amount: number;
  quota_status: "paid" | "pending" | "returned" | "unrecorded";
  application_status: string | null;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
};
export type MemberDocument = {
  id: string;
  filename: string;
  kind: string;
  created_at: string;
  source: "manual" | "application";
};
export type MemberDue = {
  id: string;
  member_id: string;
  description: string;
  amount: number;
  due_date: string;
  status: "pending" | "paid" | "returned";
  season: string | null;
};
export type MemberDetail = {
  member: MemberRecord;
  documents: MemberDocument[];
  dues: MemberDue[];
};
export type DirectoryStats = {
  active_members: number;
  total_members: number;
  paid_dues: number;
  total_dues: number;
  total_families: number;
};

export function csvText(rows: unknown[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value ?? "");
            return (
              '"' +
              (/^[\s]*[=+@\-\t\r]/.test(text) ? "'" : "") +
              text.replaceAll('"', '""') +
              '"'
            );
          })
          .join(";"),
      )
      .join("\r\n")
  );
}
