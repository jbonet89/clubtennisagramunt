import {test,expect} from "@playwright/test";
import {existsSync} from "node:fs";
if(existsSync(".env.e2e.local"))process.loadEnvFile(".env.e2e.local");
const fixture=process.env.CTA_E2E_FIXTURE?JSON.parse(process.env.CTA_E2E_FIXTURE):null;
test.use({trace:"off"});
test("member navigation, profile, reminders and empty results",async({page},info)=>{
 test.skip(!fixture,"Requires isolated member fixtures");
 const user=fixture.users.member;
 await page.goto("/ca/acces");await page.getByLabel("Correu electrònic",{exact:true}).fill(user.email);await page.getByLabel("Contrasenya",{exact:true}).fill(user.password);await page.getByRole("button",{name:"Entra",exact:true}).click();await expect(page).toHaveURL(/socis/);
 const nav=page.getByRole("navigation",{name:"Navegació de socis"});
 await expect(nav.getByRole("link")).toHaveCount(5);
 await nav.getByRole("link",{name:"Partits"}).click();await expect(page.getByRole("heading",{name:"Partits i estadístiques"})).toBeVisible();await expect(page.locator("meter")).toHaveCount(3);
 await nav.getByRole("link",{name:"El meu compte"}).click();await expect(page.getByRole("heading",{name:"Notificacions",exact:true})).toBeVisible();await page.getByLabel("Recordatori de reserva").selectOption("60");await expect(page.getByLabel("Recordatori de reserva")).toHaveValue("60");
 await page.getByLabel("Telèfon",{exact:true}).fill("600000000");await page.getByRole("button",{name:"Desar perfil",exact:true}).click();await expect(page.getByRole("status")).toHaveText("Dades desades.");
 if(info.project.name==="mobile"){const box=await nav.boundingBox();expect(box!.y+box!.height).toBeGreaterThan(page.viewportSize()!.height-2);}
 await page.screenshot({path:`test-results/member-profile-${info.project.name}.png`,fullPage:true});
 const response=await page.request.post("/api/activity",{headers:{Origin:new URL(page.url()).origin},data:{booking_id:"00000000-0000-0000-0000-000000000000",sets:[[9,1]]}});expect(response.status()).toBe(400);
});

test("administrator has a direct administration link",async({page})=>{
 test.skip(!fixture,"Requires isolated member fixtures");
 const user=fixture.users.admin;
 await page.goto("/ca/acces");await page.getByLabel("Correu electrònic",{exact:true}).fill(user.email);await page.getByLabel("Contrasenya",{exact:true}).fill(user.password);await page.getByRole("button",{name:"Entra",exact:true}).click();
 await page.locator(".member-admin-shortcut").click();await expect(page).toHaveURL(/administracio/);await expect(page.getByRole("heading",{name:"Resum",exact:true})).toBeVisible();
});
