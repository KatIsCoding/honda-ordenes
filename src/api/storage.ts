import { Database } from "bun:sqlite";
import { join } from "path";
import type { Factura, ImageEntry } from "@/types";

export interface StorageAdapter {
	SaveInvoice(invoice: Factura): Promise<void>;
	GetInvoices(): Promise<Array<Factura>>;
	DeleteInvoice(invoiceID: string): Promise<void>;
}

const DB_PATH = join(import.meta.dir, "..", "..","/data", "data.db");
console.log("Reading DB on path", DB_PATH)

export class SQLiteStorage implements StorageAdapter {
	private db: Database;

	constructor() {
		this.db = new Database(DB_PATH);
		this.db.exec("PRAGMA journal_mode = WAL");
		this.db.exec("PRAGMA foreign_keys = ON");

		this.db.exec(`
			CREATE TABLE IF NOT EXISTS invoices (
				numero_factura TEXT PRIMARY KEY,
				created_at INTEGER NOT NULL
			)
		`);

		this.db.exec(`
			CREATE TABLE IF NOT EXISTS images (
				id TEXT PRIMARY KEY,
				numero_factura TEXT NOT NULL,
				name TEXT NOT NULL,
				numero_orden TEXT NOT NULL,
				preview_url TEXT NOT NULL,
				FOREIGN KEY (numero_factura) REFERENCES invoices(numero_factura) ON DELETE CASCADE
			)
		`);
	}

	async SaveInvoice(invoice: Factura): Promise<void> {
		const insertInvoice = this.db.prepare(
			"INSERT OR REPLACE INTO invoices (numero_factura, created_at) VALUES (?, ?)",
		);
		const insertImage = this.db.prepare(
			"INSERT OR REPLACE INTO images (id, numero_factura, name, numero_orden, preview_url) VALUES (?, ?, ?, ?, ?)",
		);

		const transaction = this.db.transaction((inv: Factura) => {
			insertInvoice.run(inv.numeroFactura, inv.createdAt);
			for (const img of inv.images) {
				insertImage.run(
					img.id,
					inv.numeroFactura,
					img.name,
					img.numeroOrden,
					img.previewUrl,
				);
			}
		});

		transaction(invoice);
	}

	async GetInvoices(): Promise<Array<Factura>> {
		const invoices = this.db
			.query(
				"SELECT numero_factura, created_at FROM invoices ORDER BY created_at DESC",
			)
			.all() as Array<{ numero_factura: string; created_at: number }>;

		const imageQuery = this.db.prepare(
			"SELECT id, name, numero_orden, preview_url FROM images WHERE numero_factura = ?",
		);

		return invoices.map((row) => {
			const images = imageQuery.all(row.numero_factura) as Array<{
				id: string;
				name: string;
				numero_orden: string;
				preview_url: string;
			}>;

			return {
				numeroFactura: row.numero_factura,
				createdAt: row.created_at,
				images: images.map((img) => ({
					id: img.id,
					name: img.name,
					numeroOrden: img.numero_orden,
					previewUrl: img.preview_url,
				})),
			};
		});
	}

	async DeleteInvoice(invoiceID: string): Promise<void> {
		const deletedImages = this.db.run(
			"DELETE FROM images WHERE numero_factura = ?",
			[invoiceID],
		); // Delete the image entries

		const deletedInvoice = this.db.run(
			"DELETE FROM invoices WHERE numero_factura = ?",
			[invoiceID],
		);

		console.log(
			"Deleted Images\n",
			deletedImages,
			"\ndeletedInvoices\n",
			deletedInvoice,
		);
	}
}
