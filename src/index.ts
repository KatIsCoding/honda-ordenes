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
		"/*": index,

		"/api/invoice/new": {
			async POST(req) {
				const body = await req.json();
				await storage.SaveInvoice(body);
				return Response.json({ ok: true });
			},
		},

		"/api/invoices/:id": {
			async DELETE(r) {
				await storage.DeleteInvoice(r.params.id);
				// TODO: Delete the images from disk too
				return Response.json({ ok: true });
			},
		},

		"/api/invoices": {
			async GET() {
				const invoices = await storage.GetInvoices();
				return Response.json(invoices);
			},
		},

		"/api/invoice/execute/:id": {
			async GET(req) {
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
							send("error", { message: `Browser launch failed: ${message}` });
						} finally {
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
