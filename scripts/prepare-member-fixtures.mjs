// Temporary, isolated test accounts. Output is SQL for the trusted Supabase MCP;
// credentials stay in the ignored .env.e2e.local file and must not be logged.
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { hashSync } from "bcryptjs";

if (
  process.argv.includes("--cleanup-sql") ||
  process.argv.includes("--reset-delegation-sql")
) {
  const raw = readFileSync(".env.e2e.local", "utf8").trim();
  const saved = JSON.parse(raw.slice("CTA_E2E_FIXTURE='".length, -1));
  if (!/^[0-9a-f-]{36}$/.test(saved.run))
    throw new Error("Invalid fixture run");
  const ids = Object.values(saved.users).map((user) => {
    if (!/^[0-9a-f-]{36}$/.test(user.id))
      throw new Error("Invalid fixture user");
    return `'${user.id}'`;
  });
  if (process.argv.includes("--reset-delegation-sql")) {
    const targets = [
      "approvalDesktop",
      "approvalMobile",
      "delegationDesktop",
      "delegationMobile",
    ].map((key) => `'${saved.users[key].id}'`);
    process.stdout.write(
      `update public.profiles p set role='guest',member_active=false from auth.users u where p.id=u.id and u.raw_app_meta_data->>'cta_e2e_run'='${saved.run}' and u.email like 'cta-e2e-%@example.test' and u.id in (${targets.join(",")});`,
    );
    process.stdout.write(
      `update public.bookings b set status='cancelled' from auth.users u where b.user_id=u.id and u.raw_app_meta_data->>'cta_e2e_run'='${saved.run}' and u.email like 'cta-e2e-%@example.test' and u.id in (${ids.join(",")}) and b.status='confirmed';`,
    );
    process.exit(0);
  }
  process.stdout.write(
    `with removed as (delete from auth.users where raw_app_meta_data->>'cta_e2e_run'='${saved.run}' and email like 'cta-e2e-%@example.test' and id in (${ids.join(",")}) returning id) select count(*)::int as removed_test_users from removed;`,
  );
  process.exit(0);
}
if (existsSync(".env.e2e.local"))
  throw new Error(
    "Clean up the existing isolated fixture before creating a new one",
  );

const run = randomUUID();
const fixture = { run, users: {} };
const sql = ["begin;"];
for (const key of [
  "member",
  "other",
  "pending",
  "admin",
  "approvalDesktop",
  "approvalMobile",
  "delegationDesktop",
  "delegationMobile",
  "unconfirmed",
  "onboardingDesktop",
  "onboardingMobile",
]) {
  const id = randomUUID();
  const email = `cta-e2e-${run}-${key.toLowerCase()}@example.test`;
  const password = randomBytes(32).toString("hex");
  const passwordHash = hashSync(password, 10);
  const name = `CTA E2E ${key}`;
  fixture.users[key] = { id, email, password, name };
  const app = JSON.stringify({
    provider: "email",
    providers: ["email"],
    cta_e2e_run: run,
  });
  const metadata = JSON.stringify({
    full_name: name,
    role: "admin",
    member_active: true,
  });
  sql.push(
    `insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change,email_change_token_current,reauthentication_token,is_sso_user,is_anonymous) values ('00000000-0000-0000-0000-000000000000','${id}','authenticated','authenticated','${email}','${passwordHash}',${key === "unconfirmed" ? "null" : "now()"},'${app}'::jsonb,'${metadata}'::jsonb,now(),now(),'','','','','','',false,false);`,
  );
  sql.push(
    `insert into auth.identities(id,user_id,provider_id,identity_data,provider,created_at,updated_at) values('${randomUUID()}','${id}','${id}',jsonb_build_object('sub','${id}','email','${email}','email_verified',true,'phone_verified',false),'email',now(),now());`,
  );
  if (["member", "other", "admin"].includes(key))
    sql.push(
      `update public.profiles set role='${key === "admin" ? "admin" : "member"}',member_active=true where id='${id}';`,
    );
}
sql.push("commit;");
writeFileSync(
  ".env.e2e.local",
  `CTA_E2E_FIXTURE='${JSON.stringify(fixture)}'\n`,
  { mode: 0o600 },
);
process.stdout.write(sql.join("\n"));
