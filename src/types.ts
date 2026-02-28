export interface ImageEntry {
  id: string;
  name: string;
  numeroOrden: string;
  previewUrl: string;
}

export interface Factura {
  numeroFactura: string;
  images: ImageEntry[];
  createdAt: number;
}

export type AppView = "upload" | "assign" | "dashboard";
