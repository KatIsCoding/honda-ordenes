import { serve } from "bun";
import { join } from "path";
import { mkdir } from "fs/promises";
import index from "./index.html";
import { SQLiteStorage } from "./api/storage";
import { launchBrowser, executeOrder } from "./api/browser";

const UPLOADS_DIR = join(import.meta.dir, "..", "uploads");

// Ensure uploads directory exists
await mkdir(UPLOADS_DIR, { recursive: true });

const storage = new SQLiteStorage();

// ─── Auth ───
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || "honda123";
const AUTH_SECRET = process.env.AUTH_SECRET || crypto.randomUUID();

async function makeToken(): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(AUTH_SECRET),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode("authenticated"),
	);
	return Buffer.from(sig).toString("hex");
}

const VALID_TOKEN = await makeToken();

function getAuthCookie(req: Request): string | null {
	const cookie = req.headers.get("cookie") || "";
	const match = cookie.match(/(?:^|;\s*)auth=([^\s;]+)/);
	return match ? match[1] ?? null : null;
}

// ─── Rate Limit ───
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function getClientIP(req: Request): string {
	return (
		req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		req.headers.get("x-real-ip") ||
		"unknown"
	);
}

function checkLoginRateLimit(req: Request): Response | null {
	const ip = getClientIP(req);
	const now = Date.now();
	const entry = loginAttempts.get(ip);

	if (entry && now < entry.resetAt) {
		if (entry.count >= MAX_LOGIN_ATTEMPTS) {
			const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
			return Response.json(
				{ error: "Demasiados intentos. Intenta de nuevo en un momento." },
				{ status: 429, headers: { "Retry-After": String(retryAfter) } },
			);
		}
		entry.count++;
	} else {
		loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
	}

	return null;
}

// ─── Execution Queue ───
let executionQueue = Promise.resolve();

function checkAuth(req: Request): Response | null {
	if (getAuthCookie(req) !== VALID_TOKEN) {
		return Response.redirect("/login", 302);
	}
	return null;
}

function extFromMime(mime: string): string {
	const map: Record<string, string> = {
		"image/jpeg": ".jpg",
		"image/png": ".png",
		"image/gif": ".gif",
		"image/webp": ".webp",
		"image/svg+xml": ".svg",
		"image/bmp": ".bmp",
		"image/tiff": ".tiff",
	};
	return map[mime] || ".bin";
}

async function resolveImagePath(imageId: string): Promise<string | null> {
	const glob = new Bun.Glob(`${imageId}.*`);
	for await (const match of glob.scan(UPLOADS_DIR)) {
		return join(UPLOADS_DIR, match);
	}
	return null;
}

const server = serve({
	routes: {
		"/login": index,
		"/*": index,

		"/api/auth/login": {
			async POST(req) {
				const limited = checkLoginRateLimit(req);
				if (limited) return limited;
				const { password } = await req.json();
				if (password !== AUTH_PASSWORD) {
					return Response.json({ error: "Wrong password" }, { status: 401 });
				}
				return new Response(JSON.stringify({ ok: true }), {
					headers: {
						"Content-Type": "application/json",
						"Set-Cookie": `auth=${VALID_TOKEN}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${2 * 24 * 60 * 60}`,
					},
				});
			},
		},

		"/api/auth/check": {
			GET(req) {
				const authed = getAuthCookie(req) === VALID_TOKEN;
				return Response.json({ authenticated: authed });
			},
		},

		"/api/invoice/new": {
			async POST(req) {
				const denied = checkAuth(req);
				if (denied) return denied;
				const body = await req.json();
				await storage.SaveInvoice(body);
				return Response.json({ ok: true });
			},
		},

		"/api/invoices/:id": {
			async DELETE(r: Request & { params: { id: string } }) {
				const denied = checkAuth(r);
				if (denied) return denied;
				await storage.DeleteInvoice(r.params.id);
				// TODO: Delete the images from disk too
				return Response.json({ ok: true });
			},
		},

		"/api/invoices": {
			async GET(req) {
				const denied = checkAuth(req);
				if (denied) return denied;
				const invoices = await storage.GetInvoices();
				return Response.json(invoices);
			},
		},

		"/api/invoice/execute/:id": {
			async GET(req) {
				const denied = checkAuth(req);
				if (denied) return denied;
				const numeroFactura = decodeURIComponent(req.params.id);
				const invoices = await storage.GetInvoices();
				const invoice = invoices.find((i) => i.numeroFactura === numeroFactura);
				if (!invoice) {
					return new Response("Not found", { status: 404 });
				}

				const stream = new ReadableStream({
					async start(controller) {
						const encoder = new TextEncoder();
						const send = (event: string, data: object) => {
							controller.enqueue(
								encoder.encode(
									`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
								),
							);
						};

						// Wait for our turn in the queue
						let resolveQueue!: () => void;
						const myTurn = executionQueue;
						executionQueue = new Promise((resolve) => {
							resolveQueue = resolve;
						});

						send("queued", { numeroFactura });
						await myTurn; // Queued immediately, but wait for its turn

						send("start", { numeroFactura, total: invoice.images.length });

						let browserCtx;
						try {
							const { context, browser } = await launchBrowser();
							browserCtx = { context, browser };

							for (const img of invoice.images) {
								send("processing", {
									orderId: img.id,
									numeroOrden: img.numeroOrden,
								});

								try {
									const imagePath = await resolveImagePath(img.id);
									if (!imagePath) {
										send("error", {
											orderId: img.id,
											numeroOrden: img.numeroOrden,
											message: "Image file not found",
										});
										continue;
									}

									await executeOrder(img.numeroOrden, context, imagePath);
									send("complete", {
										orderId: img.id,
										numeroOrden: img.numeroOrden,
									});
								} catch (err) {
									const message =
										err instanceof Error ? err.message : String(err);
									console.error("Task encountered an error\n", message);
									send("error", {
										orderId: img.id,
										numeroOrden: img.numeroOrden,
										message,
									});
								}
							}

							send("done", { numeroFactura });
						} catch (err) {
							const message = err instanceof Error ? err.message : String(err);
							console.error("Error browser exec found", message)
							send("error", { message: `Browser launch failed: ${message}` });
						} finally {
							resolveQueue();
							await browserCtx?.browser.close().catch(() => {});
							controller.close();
						}
					},
				});

				return new Response(stream, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
					},
				});
			},
		},

		"/api/upload": {
			async POST(req) {
				const denied = checkAuth(req);
				if (denied) return denied;
				const formData = await req.formData();
				const files = formData.getAll("images");
				const ids: string[] = [];

				for (const file of files) {
					if (file instanceof File) {
						const id = crypto.randomUUID();
						const ext = extFromMime(file.type);
						const filename = `${id}${ext}`;
						await Bun.write(join(UPLOADS_DIR, filename), file);
						ids.push(id);
					}
				}

				return Response.json({ ids });
			},
		},

		"/api/image/:id": {
			async GET(req) {
				const denied = checkAuth(req);
				if (denied) return denied;
				// Find the file by UUID prefix (extension may vary)
				const glob = new Bun.Glob(`${req.params.id}.*`);
				for await (const match of glob.scan(UPLOADS_DIR)) {
					const file = Bun.file(join(UPLOADS_DIR, match));
					return new Response(file);
				}
				return new Response("Not found", { status: 404 });
			},
		},
	},

	development: process.env.NODE_ENV !== "production" && {
		hmr: false,
		console: true,
	},
});

console.log(`🚀 Server running at ${server.url}`);
