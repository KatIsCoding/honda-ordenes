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
	const t = (label: string, since: number) =>
		console.debug(`[${orderNumber}] ${label} — ${Date.now() - since}ms`);

	const page = await browser.newPage();
	try {
		let ts = Date.now();

		await page.goto(
			`https://sistemas.corp.cr:8443/ords/f?p=133:36:3927756649160:::36:P36_ORDEN:${orderNumber}`,
		);
		t("goto", ts); ts = Date.now();

		await page.waitForLoadState("networkidle");
		t("waitForLoadState(networkidle) after goto", ts); ts = Date.now();

		await page.type("#P101_USERNAME", "TAL-10");
		await page.type("#P101_PASSWORD", "VA1");
		await page.click("#P101_LOGIN");
		t("login form submit", ts); ts = Date.now();

		await page.waitForSelector("#P36_FOTO_input");
		t("waitForSelector(#P36_FOTO_input) after login", ts); ts = Date.now();

		// Skip upload if the same file is already attached to this order.
		// #f04_0001 only exists when a photo is already attached, so check
		// count() first: inputValue() on a missing locator would wait the
		// full 30s action timeout on every fresh order.
		const imageFileName = imagePath.split("/").pop() ?? "";
		const existingFile =
			(await page.locator("#f04_0001").count()) > 0
				? await page.locator("#f04_0001").inputValue().catch(() => "")
				: "";
		t("existing file check", ts); ts = Date.now();

		if (existingFile && existingFile === imageFileName) {
			console.info("Image for order ", orderNumber, "already existed, early exit");
			return;
		}

		await page.locator("#P36_FOTO_input").setInputFiles(imagePath);
		t("setInputFiles", ts); ts = Date.now();

		await page.evaluate("apex.submit({request: 'GUARDAR'})");
		t("apex.submit", ts); ts = Date.now();

		await page.waitForSelector(
			"#body > table > tbody > tr > td.tbl-main > div > div > div.rc-body > div > div.rc-content-main > div.sErrorText > p > button",
		);
		t("waitForSelector(success button)", ts); ts = Date.now();

		await page.goBack();
		t("goBack", ts); ts = Date.now();

		await page.waitForSelector("#P36_FOTO_input");
		t("waitForSelector(#P36_FOTO_input) after goBack", ts);
	} finally {
		await page.close();
	}
}
