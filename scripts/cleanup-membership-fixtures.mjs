// Delete only this test run's application rows using MCP, then remove its files via Storage API.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
process.loadEnvFile(".env.e2e.local");
const fixture = JSON.parse(process.env.CTA_E2E_FIXTURE);
if (!/^[0-9a-f-]{36}$/.test(fixture.run)) throw Error("Invalid run");
if (process.argv.includes("--sql") || process.argv.includes("--reset-sql")) {
  process.stdout.write(
    `delete from public.membership_applications a using auth.users u where a.user_id=u.id and u.raw_app_meta_data->>'cta_e2e_run'='${fixture.run}' and u.email like 'cta-e2e-%@example.test';`,
  );
  if(process.argv.includes('--reset-sql')){
   const ids=['onboardingDesktop','onboardingMobile'].map(key=>{const id=fixture.users[key].id;if(!/^[0-9a-f-]{36}$/.test(id))throw Error('Invalid user');return `'${id}'`;});
   process.stdout.write(`update public.profiles p set role='guest',member_active=false from auth.users u where p.id=u.id and u.raw_app_meta_data->>'cta_e2e_run'='${fixture.run}' and u.email like 'cta-e2e-%@example.test' and u.id in (${ids.join(',')});`);
  }
} else {
  for (const key of ["onboardingDesktop", "onboardingMobile"]) {
    const user = fixture.users[key];
    if (!/^[0-9a-f-]{36}$/.test(user.id)) throw Error("Invalid test user");
    const s = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const login = await s.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });
    if (login.error) throw Error("Test cleanup login failed");
    const listed = await s.storage
      .from("membership-documents")
      .list(user.id, { limit: 1000 });
    if (listed.error) throw Error("Test cleanup list failed");
    const paths = listed.data.map((item) => `${user.id}/${item.name}`);
    if (paths.length) {
      const removed = await s.storage
        .from("membership-documents")
        .remove(paths);
      if (removed.error) throw Error("Test cleanup removal failed");
    }
    await s.auth.signOut({ scope: "local" });
  }
  process.stdout.write("Test membership files removed.");
}
