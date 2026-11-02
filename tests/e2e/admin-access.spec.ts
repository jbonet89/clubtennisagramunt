import {test,expect} from "@playwright/test";
test("administration rejects anonymous reads and writes",async({request,page})=>{
 const read=await request.get("/api/admin");expect(read.status()).toBe(403);
 const write=await request.post("/api/admin",{data:{section:"socis",full_name:"Unauthorized"}});expect(write.status()).toBe(403);
 await page.goto("/administracio");await expect(page).toHaveURL(/acces/);
});
