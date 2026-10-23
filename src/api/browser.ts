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
	const imageFileName = imagePath.split("/").pop() ?? "";
	const orderUrl = `https://sistemas.corp.cr:8443/ords/f?p=133:36:3927756649160:::36:P36_ORDEN:${orderNumber}`;

	// Filenames of the photos APEX has stored for this order.
	// This returns instantly (empty array) on orders without photos.
	const attachedPhotos = () =>
		page
			.locator('input[name="f04"]')
			.evaluateAll((elements) =>
				elements.map((el) => (el as HTMLInputElement).value).filter(Boolean),
			);

	try {
		let ts = Date.now();

		await page.goto(orderUrl);
		t("goto", ts); ts = Date.now();

		await page.waitForLoadState("networkidle");
		t("waitForLoadState(networkidle) after goto", ts); ts = Date.now();

		await page.type("#P101_USERNAME", "TAL-10");
		await page.type("#P101_PASSWORD", "VA1");
		await page.click("#P101_LOGIN");
		t("login form submit", ts); ts = Date.now();

		await page.waitForSelector("#P36_FOTO_input");
		const orderPageUrl = page.url();
		t("waitForSelector(#P36_FOTO_input) after login", ts); ts = Date.now();

		// Skip upload if the same file is already attached to this order
		const existingPhotos = await attachedPhotos();
		t("existing photo check", ts); ts = Date.now();
		if (existingPhotos.includes(imageFileName)) {
			console.info("Image for order ", orderNumber, "already existed, early exit");
			return;
		}

		await page.locator("#P36_FOTO_input").setInputFiles(imagePath);
		t("setInputFiles", ts); ts = Date.now();

		await Promise.all([
			page.waitForNavigation({ waitUntil: "load" }),
			page.evaluate("apex.submit({request: 'GUARDAR'})"),
		]);
		t("apex.submit", ts); ts = Date.now();

		// The confirmation dialog is not a reliable success signal: on some
		// orders it never shows up and waiting for it burns the full 30s
		// timeout. Reload the order and check the photo really was persisted.
		const resultPage = (await page.locator("body").innerText().catch(() => ""))
			.replace(/\s+/g, " ")
			.trim()
			.slice(0, 300);

		await page.goto(orderPageUrl);
		await page.waitForSelector("#P36_FOTO_input");
		const savedPhotos = await attachedPhotos();
		t("verify saved photo", ts);

		if (!savedPhotos.includes(imageFileName)) {
			throw new Error(
				`Photo "${imageFileName}" was not saved for order ${orderNumber}. ` +
					`Attached: ${savedPhotos.join(", ") || "none"}. ` +
					`Result page: ${resultPage}`,
			);
		}
	} finally {
		await page.close();
	}
}
