import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Plus,
  FileText,
  Image,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Trash2,
  Play,
  Square,
  Loader2,
  Check,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { ImageViewer } from "./ImageViewer";
import type { Factura } from "../types";

type OrderStatus = "idle" | "processing" | "complete" | "error";

interface DashboardProps {
  facturas: Factura[];
  onNewUpload: () => void;
  onDeleteFactura: (numeroFactura: string) => void;
}

export function Dashboard({ facturas, onNewUpload, onDeleteFactura }: DashboardProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(facturas.slice(0, 1).map((f) => f.numeroFactura))
  );
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Execution state: facturaId -> { running, queued, orderStatuses }
  const [executing, setExecuting] = useState<
    Record<string, { running: boolean; queued: boolean; statuses: Record<string, OrderStatus> }>
  >({});
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll task status from backend
  const pollTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) return;
      const tasks: {
        facturaId: string;
        status: "queued" | "running" | "done" | "cancelled";
        orders: { orderId: string; numeroOrden: string; status: OrderStatus; error?: string }[];
      }[] = await res.json();

      setExecuting((prev) => {
        const next: typeof prev = {};
        for (const task of tasks) {
          const statuses: Record<string, OrderStatus> = {};
          for (const order of task.orders) {
            statuses[order.orderId] = order.status;
          }
          next[task.facturaId] = {
            running: task.status === "queued" || task.status === "running",
            queued: task.status === "queued",
            statuses,
          };
        }
        return next;
      });

      // Stop polling if no active tasks
      const hasActive = tasks.some((t) => t.status === "queued" || t.status === "running");
      if (!hasActive && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    } catch {}
  }, []);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(pollTasks, 1500);
  }, [pollTasks]);

  // On mount, check for existing tasks
  useEffect(() => {
    pollTasks().then(() => {
      // If there are active tasks, start polling
      setExecuting((prev) => {
        const hasActive = Object.values(prev).some((e) => e.running);
        if (hasActive) startPolling();
        return prev;
      });
    });
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [pollTasks, startPolling]);

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const executeFactura = useCallback(async (factura: Factura) => {
    const numFactura = factura.numeroFactura;

    // Initialize optimistically
    const initialStatuses: Record<string, OrderStatus> = {};
    for (const img of factura.images) {
      initialStatuses[img.id] = "idle";
    }
    setExecuting((prev) => ({
      ...prev,
      [numFactura]: { running: true, queued: true, statuses: initialStatuses },
    }));

    setExpandedIds((prev) => new Set([...prev, numFactura]));

    try {
      await fetch(`/api/tasks/${encodeURIComponent(numFactura)}`, { method: "POST" });
    } catch {}

    startPolling();
  }, [startPolling]);

  const stopFactura = useCallback(async (numFactura: string) => {
    try {
      await fetch(`/api/tasks/${encodeURIComponent(numFactura)}`, { method: "DELETE" });
    } catch {}
    pollTasks();
  }, [pollTasks]);

  const filtered = facturas.filter(
    (f) =>
      f.numeroFactura.toLowerCase().includes(search.toLowerCase()) ||
      f.images.some((img) =>
        img.numeroOrden.toLowerCase().includes(search.toLowerCase())
      )
  );

  const totalImages = facturas.reduce((acc, f) => acc + f.images.length, 0);

  const getOrderStatus = (facturaId: string, orderId: string): OrderStatus => {
    return executing[facturaId]?.statuses?.[orderId] || "idle";
  };

  const isFacturaRunning = (facturaId: string): boolean => {
    return executing[facturaId]?.running || false;
  };

  const isFacturaQueued = (facturaId: string): boolean => {
    return executing[facturaId]?.queued || false;
  };

  const isFacturaDone = (facturaId: string): boolean => {
    const exec = executing[facturaId];
    if (!exec) return false;
    return !exec.running && Object.values(exec.statuses).every((s) => s === "complete" || s === "error");
  };

  const facturaHasErrors = (facturaId: string): boolean => {
    const exec = executing[facturaId];
    if (!exec) return false;
    return Object.values(exec.statuses).some((s) => s === "error");
  };

  return (
    <div className="animate-fade-up" style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 40,
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 32,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Facturas
          </h2>
          <p style={{ color: "var(--chalk-dim)", marginTop: 8, fontSize: 15 }}>
            {facturas.length} factura{facturas.length !== 1 ? "s" : ""} —{" "}
            {totalImages} imagen{totalImages !== 1 ? "es" : ""}
          </p>
        </div>

        <button
          onClick={onNewUpload}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-display)",
            background: "var(--amber)",
            color: "var(--ink)",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--amber-light)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "var(--amber)")
          }
        >
          <Plus size={18} />
          Nueva factura
        </button>
      </div>

      {/* Search */}
      {facturas.length > 0 && (
        <div
          className="delay-1 animate-fade-up"
          style={{ position: "relative", marginBottom: 28 }}
        >
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--chalk-muted)",
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por factura u orden..."
            style={{
              width: "100%",
              padding: "12px 14px 12px 40px",
              fontSize: 14,
              fontFamily: "var(--font-mono)",
              background: "var(--paper)",
              border: "1px solid var(--paper-lighter)",
              borderRadius: 8,
              color: "var(--chalk)",
              outline: "none",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--amber)";
              e.target.style.boxShadow = "0 0 0 3px var(--amber-glow)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--paper-lighter)";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>
      )}

      {/* Empty state */}
      {facturas.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "80px 24px",
            background: "var(--paper)",
            borderRadius: 12,
            border: "1px dashed var(--paper-lighter)",
          }}
        >
          <FileText
            size={48}
            style={{ color: "var(--chalk-muted)", marginBottom: 16 }}
          />
          <p
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: "var(--chalk)",
              margin: "0 0 8px",
            }}
          >
            Sin facturas
          </p>
          <p
            style={{
              fontSize: 14,
              color: "var(--chalk-muted)",
              margin: 0,
            }}
          >
            Sube imágenes y asigna órdenes para comenzar.
          </p>
        </div>
      )}

      {/* Factura list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((factura, fi) => {
          const isExpanded = expandedIds.has(factura.numeroFactura);
          const running = isFacturaRunning(factura.numeroFactura);
          const queued = isFacturaQueued(factura.numeroFactura);
          const done = isFacturaDone(factura.numeroFactura);
          const hasErrors = facturaHasErrors(factura.numeroFactura);
          return (
            <div
              key={factura.numeroFactura}
              className="animate-fade-up"
              style={{
                background: "var(--paper)",
                borderRadius: 12,
                border: `1px solid ${queued ? "rgb(147, 130, 220)" : running ? "var(--amber)" : "var(--paper-lighter)"}`,
                overflow: "hidden",
                animationDelay: `${fi * 0.06}s`,
                opacity: 0,
                animationFillMode: "forwards",
                transition: "border-color 0.3s",
              }}
            >
              {/* Factura header */}
              <button
                onClick={() => toggle(factura.numeroFactura)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "18px 20px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--paper-light)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "var(--amber-glow)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <FileText size={18} style={{ color: "var(--amber)" }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                        color: "var(--chalk)",
                        margin: 0,
                      }}
                    >
                      {factura.numeroFactura}
                    </p>
                    {queued ? (
                      <Clock size={14} style={{ color: "rgb(147, 130, 220)", flexShrink: 0 }} />
                    ) : running ? (
                      <Loader2 size={14} className="animate-spin" style={{ color: "var(--amber)", flexShrink: 0 }} />
                    ) : done ? (
                      hasErrors ? (
                        <AlertTriangle size={14} style={{ color: "var(--rust)", flexShrink: 0 }} />
                      ) : (
                        <Check size={14} style={{ color: "var(--success)", flexShrink: 0 }} />
                      )
                    ) : null}
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--chalk-muted)",
                      margin: "2px 0 0",
                    }}
                  >
                    {factura.images.length} imagen
                    {factura.images.length !== 1 ? "es" : ""} —{" "}
                    {new Date(factura.createdAt).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {/* Order badges */}
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                    maxWidth: 300,
                  }}
                >
                  {factura.images.slice(0, 4).map((img) => (
                    <span
                      key={img.id}
                      style={{
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        padding: "3px 8px",
                        background: "var(--paper-lighter)",
                        borderRadius: 4,
                        color: "var(--chalk-dim)",
                      }}
                    >
                      {img.numeroOrden}
                    </span>
                  ))}
                  {factura.images.length > 4 && (
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        padding: "3px 8px",
                        color: "var(--chalk-muted)",
                      }}
                    >
                      +{factura.images.length - 4}
                    </span>
                  )}
                </div>

                {/* Start / Stop button */}
                <div
                  role="button"
                  tabIndex={0}
                  title={running || queued ? "Detener" : "Ejecutar"}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (running || queued) {
                      stopFactura(factura.numeroFactura);
                    } else {
                      executeFactura(factura);
                    }
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                    background: running || queued
                      ? "rgba(194, 65, 12, 0.15)"
                      : "transparent",
                    border: "none",
                    color: running || queued
                      ? "var(--rust)"
                      : "var(--chalk-muted)",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (running || queued) {
                      e.currentTarget.style.color = "var(--rust)";
                      e.currentTarget.style.background = "rgba(194, 65, 12, 0.25)";
                    } else {
                      e.currentTarget.style.color = "var(--amber)";
                      e.currentTarget.style.background = "var(--amber-glow)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (running || queued) {
                      e.currentTarget.style.color = "var(--rust)";
                      e.currentTarget.style.background = "rgba(194, 65, 12, 0.15)";
                    } else {
                      e.currentTarget.style.color = "var(--chalk-muted)";
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {running || queued ? (
                    <Square size={13} />
                  ) : (
                    <Play size={15} />
                  )}
                </div>

                {/* Delete button */}
                <div
                  role="button"
                  tabIndex={0}
                  title="Eliminar factura"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(factura.numeroFactura);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                      setConfirmDelete(factura.numeroFactura);
                    }
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                    background: "transparent",
                    border: "none",
                    color: "var(--chalk-muted)",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--rust)";
                    e.currentTarget.style.background = "rgba(194, 65, 12, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--chalk-muted)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Trash2 size={15} />
                </div>

                <div
                  style={{
                    color: "var(--chalk-muted)",
                    transition: "transform 0.2s",
                    transform: isExpanded ? "rotate(0)" : "rotate(-90deg)",
                    flexShrink: 0,
                  }}
                >
                  <ChevronDown size={18} />
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div
                  className="animate-fade-in"
                  style={{
                    padding: "4px 20px 20px",
                    borderTop: "1px solid var(--paper-lighter)",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(160px, 1fr))",
                      gap: 14,
                      marginTop: 16,
                    }}
                  >
                    {factura.images.map((img, i) => {
                      const status = getOrderStatus(factura.numeroFactura, img.id);
                      return (
                        <div
                          key={img.id}
                          className="animate-fade-up"
                          style={{
                            background: "var(--ink)",
                            borderRadius: 10,
                            overflow: "hidden",
                            border: `1px solid ${
                              status === "processing"
                                ? "var(--amber)"
                                : status === "complete"
                                  ? "var(--success)"
                                  : status === "error"
                                    ? "var(--rust)"
                                    : "var(--paper-lighter)"
                            }`,
                            cursor: "pointer",
                            transition: "transform 0.2s, border-color 0.3s",
                            animationDelay: `${i * 0.04}s`,
                            opacity: 0,
                            animationFillMode: "forwards",
                            position: "relative",
                          }}
                          onClick={() => setLightbox(img.previewUrl)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            if (status === "idle")
                              e.currentTarget.style.borderColor = "var(--amber)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            if (status === "idle")
                              e.currentTarget.style.borderColor = "var(--paper-lighter)";
                          }}
                        >
                          {/* Status overlay */}
                          {status !== "idle" && (
                            <div
                              style={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                zIndex: 5,
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                background:
                                  status === "processing"
                                    ? "var(--amber)"
                                    : status === "error"
                                      ? "var(--rust)"
                                      : "var(--success)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {status === "processing" ? (
                                <Loader2
                                  size={14}
                                  className="animate-spin"
                                  style={{ color: "var(--ink)" }}
                                />
                              ) : status === "error" ? (
                                <AlertTriangle
                                  size={14}
                                  className="animate-stamp"
                                  style={{ color: "white" }}
                                />
                              ) : (
                                <Check
                                  size={14}
                                  className="animate-stamp"
                                  style={{ color: "white" }}
                                />
                              )}
                            </div>
                          )}

                          <div
                            style={{
                              aspectRatio: "4/3",
                              overflow: "hidden",
                            }}
                          >
                            <img
                              src={img.previewUrl}
                              alt={img.name}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                opacity: status === "processing" ? 0.6 : 1,
                                transition: "opacity 0.3s",
                              }}
                            />
                          </div>
                          <div style={{ padding: "10px 12px" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 4,
                              }}
                            >
                              <Image
                                size={12}
                                style={{
                                  color:
                                    status === "complete"
                                      ? "var(--success)"
                                      : status === "error"
                                        ? "var(--rust)"
                                        : "var(--amber)",
                                }}
                              />
                              <span
                                style={{
                                  fontSize: 13,
                                  fontFamily: "var(--font-mono)",
                                  fontWeight: 500,
                                  color:
                                    status === "complete"
                                      ? "var(--success)"
                                      : status === "error"
                                        ? "var(--rust)"
                                        : "var(--chalk)",
                                }}
                              >
                                {img.numeroOrden}
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: 11,
                                color: "var(--chalk-muted)",
                                margin: 0,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {status === "processing"
                                ? "Procesando..."
                                : status === "complete"
                                  ? "Completado"
                                  : status === "error"
                                    ? "Error"
                                    : img.name}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No results */}
      {search && filtered.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            color: "var(--chalk-muted)",
          }}
        >
          <Search size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: 15 }}>
            Sin resultados para "{search}"
          </p>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          className="animate-fade-in"
          onClick={() => setConfirmDelete(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            className="animate-fade-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--paper)",
              border: "1px solid var(--paper-lighter)",
              borderRadius: 14,
              padding: "32px 28px 24px",
              maxWidth: 400,
              width: "100%",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "rgba(194, 65, 12, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
              }}
            >
              <Trash2 size={22} style={{ color: "var(--rust)" }} />
            </div>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                fontWeight: 600,
                margin: "0 0 8px",
                color: "var(--chalk)",
              }}
            >
              Eliminar factura
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "var(--chalk-dim)",
                margin: "0 0 6px",
                lineHeight: 1.5,
              }}
            >
              ¿Estás seguro de eliminar la factura{" "}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--amber)",
                  fontWeight: 500,
                }}
              >
                {confirmDelete}
              </span>
              ? Se eliminarán todas las imágenes asociadas.
            </p>
            <p
              style={{
                fontSize: 12,
                color: "var(--chalk-muted)",
                margin: "0 0 24px",
                fontFamily: "var(--font-mono)",
              }}
            >
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  padding: "10px 18px",
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: "var(--font-display)",
                  background: "var(--paper-lighter)",
                  color: "var(--chalk)",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--paper-light)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "var(--paper-lighter)")
                }
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteFactura(confirmDelete);
                  setConfirmDelete(null);
                }}
                style={{
                  padding: "10px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "var(--font-display)",
                  background: "var(--rust)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#a93508")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "var(--rust)")
                }
              >
                <Trash2 size={14} />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="animate-fade-in"
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.92)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              background: "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: "50%",
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "white",
              zIndex: 110,
            }}
          >
            <X size={20} />
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "85vw",
              height: "85vh",
              maxWidth: 1200,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <ImageViewer src={lightbox} alt="Preview" minimal />
          </div>
        </div>
      )}
    </div>
  );
}
