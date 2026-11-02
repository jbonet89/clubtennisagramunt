export type MembershipSettings = {
  id: boolean;
  adult_fee_cents: number;
  junior_fee_cents: number;
  season: string;
  bank_name: string;
  iban: string;
  whatsapp: string;
  form_url: string;
  note: string;
  updated_at: string;
};
export type MembershipApplication = {
  id: string;
  user_id: string;
  category: "adult" | "junior";
  phone: string;
  payment_method: "transfer" | "direct_debit";
  fee_cents: number;
  season: string;
  document_path: string;
  receipt_path: string | null;
  status: "submitted" | "approved" | "changes_requested";
  review_note: string;
  submitted_at: string;
  applicant?: { full_name: string; email: string };
};
export function validIban(value: string) {
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(value)) return false;
  const expanded = (value.slice(4) + value.slice(0, 4)).replace(/[A-Z]/g, (c) =>
    String(c.charCodeAt(0) - 55),
  );
  let remainder = 0;
  for (const digit of expanded)
    remainder = (remainder * 10 + Number(digit)) % 97;
  return remainder === 1;
}
export function membershipMoney(cents: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
