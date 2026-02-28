import { launchBrowser } from "@/api/browser";
import { buildApexParam, parseApexParam } from "@/api/utils";

const orden = "755451";
const { browser, context, page } = await launchBrowser(
	`https://sistemas.corp.cr:8443/ords/f?p=133:36:3927756649160:::36:P36_ORDEN:${orden}`,
);

await page.waitForLoadState("networkidle");

await page.type("#P101_USERNAME", "TAL-10");
await page.type("#P101_PASSWORD", "VA1");
await page.click("#P101_LOGIN");

await page.waitForNavigation();

await page.waitForSelector("#P36_FOTO_input");

await page.waitForLoadState("networkidle");

await page
	.locator("#P36_FOTO_input")
	.setInputFiles("/home/fabrizio/Downloads/ultima.jpeg");

await page.waitForLoadState("networkidle");

await page.evaluate("apex.submit({request: 'GUARDAR'})");

await page.waitForLoadState("networkidle");
