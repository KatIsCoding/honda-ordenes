/**
 * Oracle APEX `p` URL parameter parser and builder.
 *
 * The `p` parameter follows this colon-delimited structure:
 *   appId:pageId:session:request:debug:clearCache:itemNames:itemValues:printerFriendly
 *
 * Example:
 *   f?p=123:20:12351378808570:SAVE:YES:20,RP:P20_NAME,P20_AGE:John,30:YES
 */

export interface ApexParams {
	/** Application ID or alias (required) */
	appId: string;
	/** Page ID or alias */
	pageId: string;
	/** Session ID. Use "0" for public pages, "" to let APEX create a new session */
	session: string;
	/** Request keyword (e.g. "SAVE", "CREATE", "CSV") */
	request: string;
	/**
	 * Debug mode.
	 * "YES" | "NO" | "LEVEL1" … "LEVEL9" | "TEST" | "SQL_TRACE"
	 */
	debug: string;
	/**
	 * Clear cache — comma-separated page IDs, or keywords:
	 * "RP" (reset pagination), "APP" (all pages), "SESSION" (all apps in session),
	 * or a collection name.
	 */
	clearCache: string;
	/**
	 * Comma-separated list of page/application item names to set
	 * (e.g. "P1_NAME,P1_AGE")
	 */
	itemNames: string;
	/**
	 * Comma-separated list of values corresponding to itemNames
	 * (e.g. "John,30")
	 */
	itemValues: string;
	/** Printer-friendly mode. "YES" | "NO" | "" */
	printerFriendly: string;
}

const SEGMENT_COUNT = 9;

/**
 * Parse the value of the Oracle APEX `p` query parameter into its components.
 *
 * @param pValue - The raw value of the `p` param (everything after `p=`),
 *                 e.g. "123:20:12351378808570::::"
 *                 You can also pass a full URL and the function will extract
 *                 the `p` value automatically.
 */
export function parseApexParam(pValue: string): ApexParams {
	// If a full URL was passed, extract just the p= value
	let raw = pValue.trim();
	const urlMatch = raw.match(/[?&]p=([^&]+)/i);
	if (urlMatch) {
		raw = decodeURIComponent(urlMatch[1]!);
	}

	// Split on colons — there must always be exactly 9 segments (some may be empty)
	const parts = raw.split(":");

	// Pad or trim to exactly SEGMENT_COUNT segments
	while (parts.length < SEGMENT_COUNT) parts.push("");
	// If there are more than 9 parts it usually means a value contained a colon
	// (which is not supported by APEX itself), but we handle it gracefully.
	const segments = parts.slice(0, SEGMENT_COUNT);

	const [
		appId = "",
		pageId = "",
		session = "",
		request = "",
		debug = "",
		clearCache = "",
		itemNames = "",
		itemValues = "",
		printerFriendly = "",
	] = segments;

	return {
		appId,
		pageId,
		session,
		request,
		debug,
		clearCache,
		itemNames,
		itemValues,
		printerFriendly,
	};
}

/**
 * Build the Oracle APEX `p` parameter string from its components.
 * Trailing empty segments are trimmed for a cleaner URL, but at least
 * `appId` and `pageId` are always included.
 *
 * @param params - Full or partial ApexParams object (missing keys default to "")
 * @returns The colon-delimited `p` value, ready to append as `f?p=<result>`
 */
export function buildApexParam(params: Partial<ApexParams>): string {
	const segments: string[] = [
		params.appId ?? "",
		params.pageId ?? "",
		params.session ?? "",
		params.request ?? "",
		params.debug ?? "",
		params.clearCache ?? "",
		params.itemNames ?? "",
		params.itemValues ?? "",
		params.printerFriendly ?? "",
	];

	// Remove trailing empty segments (keep at least 2 — appId and pageId)
	let last = segments.length - 1;
	while (last > 1 && segments[last] === "") last--;

	return segments.slice(0, last + 1).join(":");
}

/**
 * Build a full APEX URL.
 *
 * @param base   - Base URL up to (and including) `f`, e.g. "https://example.com/ords/f"
 * @param params - APEX parameters
 * @returns Full URL string, e.g. "https://example.com/ords/f?p=123:1:0"
 */
export function buildApexUrl(
	base: string,
	params: Partial<ApexParams>,
): string {
	return `${base.replace(/\/$/, "")}?p=${buildApexParam(params)}`;
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/**
 * Parse itemNames / itemValues into a plain key→value record.
 *
 * @example
 *   parseItems("P1_NAME,P1_AGE", "John,30")
 *   // → { P1_NAME: "John", P1_AGE: "30" }
 */
export function parseItems(
	itemNames: string,
	itemValues: string,
): Record<string, string> {
	if (!itemNames) return {};
	const names = itemNames.split(",");
	const values = itemValues ? itemValues.split(",") : [];
	return Object.fromEntries(names.map((name, i) => [name, values[i] ?? ""]));
}

/**
 * Serialize a key→value record back into itemNames / itemValues strings.
 *
 * @example
 *   serializeItems({ P1_NAME: "John", P1_AGE: "30" })
 *   // → { itemNames: "P1_NAME,P1_AGE", itemValues: "John,30" }
 */
export function serializeItems(items: Record<string, string>): {
	itemNames: string;
	itemValues: string;
} {
	const entries = Object.entries(items);
	return {
		itemNames: entries.map(([k]) => k).join(","),
		itemValues: entries.map(([, v]) => v).join(","),
	};
}
