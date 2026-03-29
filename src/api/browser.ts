import {
	chromium,
	type Browser,
	type BrowserContext,
	type Page,
} from "playwright";

export async function launchBrowser(url?: string) {
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		ignoreHTTPSErrors: true,
		
	});
	const page = await context.newPage();
	if (url) await page.goto(url);
	return { context, page, browser };
}

const sleep = (ms: number) => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

export async function executeOrder(
	orderNumber: string,
	browser: BrowserContext,
	imagePath: string,
) {
	const page = await browser.newPage();
	await page.goto(
		`https://sistemas.corp.cr:8443/ords/f?p=133:36:3927756649160:::36:P36_ORDEN:${orderNumber}`,
	);

	await page.waitForLoadState("networkidle");

	await page.type("#P101_USERNAME", "TAL-10");
	await page.type("#P101_PASSWORD", "VA1");
	await page.click("#P101_LOGIN");

	await page.waitForLoadState("networkidle");
	await page.waitForLoadState("domcontentloaded");

	await page.waitForSelector("#P36_FOTO_input");

	await page.waitForLoadState("networkidle");

	// Skip upload if the same file is already attached to this order
	const existingFile = await page.locator("#f04_0001").inputValue().catch(() => "");
	const imageFileName = imagePath.split("/").pop() ?? "";
	if (existingFile && existingFile === imageFileName) {
		console.info("Image for order ", orderNumber, "already existed, early exit")
		await page.close();
		return;
	}

	await page.locator("#P36_FOTO_input").setInputFiles(imagePath);

	await page.waitForLoadState("networkidle");

	await page.evaluate("apex.submit({request: 'GUARDAR'})");

	await page.waitForLoadState("networkidle");

	await page.waitForLoadState("domcontentloaded");

	await page.waitForSelector(
		"#body > table > tbody > tr > td.tbl-main > div > div > div.rc-body > div > div.rc-content-main > div.sErrorText > p > button",
	);

	await page.goBack();

	await page.waitForLoadState("networkidle");

	await page.waitForLoadState("domcontentloaded");

	await page.waitForSelector("#P36_FOTO_input");

	await page.close();
}
