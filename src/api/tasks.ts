import { launchBrowser, executeOrder } from "./browser";
import type { SQLiteStorage } from "./storage";

export type OrderStatus = "idle" | "processing" | "complete" | "error";

export interface TaskOrderStatus {
	orderId: string;
	numeroOrden: string;
	status: OrderStatus;
	error?: string;
}

export interface Task {
	facturaId: string;
	status: "queued" | "running" | "done" | "cancelled";
	orders: TaskOrderStatus[];
	createdAt: number;
}

interface QueuedTask {
	facturaId: string;
	images: { id: string; numeroOrden: string; imagePath: string }[];
}

export class TaskManager {
	private tasks = new Map<string, Task>();
	private queue: QueuedTask[] = [];
	private processing = false;
	private abortControllers = new Map<string, AbortController>();
	private storage: SQLiteStorage;

	constructor(storage: SQLiteStorage) {
		this.storage = storage;
		// Load persisted tasks from DB
		for (const task of storage.GetTasks()) {
			this.tasks.set(task.facturaId, task);
		}
	}

	getAll(): Task[] {
		return Array.from(this.tasks.values());
	}

	get(facturaId: string): Task | undefined {
		return this.tasks.get(facturaId);
	}

	create(
		facturaId: string,
		images: { id: string; numeroOrden: string; imagePath: string }[],
	): Task {
		// Don't create duplicate tasks
		const existing = this.tasks.get(facturaId);
		if (existing && (existing.status === "queued" || existing.status === "running")) {
			return existing;
		}

		const task: Task = {
			facturaId,
			status: "queued",
			orders: images.map((img) => ({
				orderId: img.id,
				numeroOrden: img.numeroOrden,
				status: "idle",
			})),
			createdAt: Date.now(),
		};

		this.tasks.set(facturaId, task);
		this.storage.SaveTask(task);
		this.queue.push({ facturaId, images });
		this.processQueue();
		return task;
	}

	stop(facturaId: string): boolean {
		const task = this.tasks.get(facturaId);
		if (!task) return false;

		if (task.status === "queued") {
			task.status = "cancelled";
			this.queue = this.queue.filter((q) => q.facturaId !== facturaId);
			this.storage.SaveTask(task);
			return true;
		}

		if (task.status === "running") {
			const controller = this.abortControllers.get(facturaId);
			if (controller) {
				controller.abort();
			}
			task.status = "cancelled";
			this.storage.SaveTask(task);
			return true;
		}

		return false;
	}

	private async processQueue() {
		if (this.processing) return;
		this.processing = true;

		while (this.queue.length > 0) {
			const queued = this.queue.shift()!;
			const task = this.tasks.get(queued.facturaId);
			if (!task || task.status === "cancelled") continue;

			const controller = new AbortController();
			this.abortControllers.set(queued.facturaId, controller);

			task.status = "running";
			this.storage.SaveTask(task);

			let browserCtx: Awaited<ReturnType<typeof launchBrowser>> | undefined;
			try {
				browserCtx = await launchBrowser();
				const { context } = browserCtx;

				for (const img of queued.images) {
					if (controller.signal.aborted) break;

					const order = task.orders.find((o) => o.orderId === img.id);
					if (order) order.status = "processing";

					try {
						await executeOrder(img.numeroOrden, context, img.imagePath);
						if (order) order.status = "complete";
					} catch (err) {
						if (order) {
							order.status = "error";
							order.error = err instanceof Error ? err.message : String(err);
						}
						console.error("Task order error:", err);
					}

					// Persist after each order completes
					this.storage.SaveTask(task);
				}

				if (task.status === "running") {
					task.status = "done";
				}
			} catch (err) {
				console.error("Browser launch failed:", err);
				if (task.status === "running") {
					task.status = "done";
				}
			} finally {
				this.abortControllers.delete(queued.facturaId);
				this.storage.SaveTask(task);
				await browserCtx?.browser.close().catch(() => {});
			}
		}

		this.processing = false;
	}
}
