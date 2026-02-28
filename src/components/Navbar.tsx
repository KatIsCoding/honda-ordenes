import React from "react";
import { FileText, LayoutDashboard } from "lucide-react";
import type { AppView } from "../types";

interface NavbarProps {
  view: AppView;
  facturaCount: number;
}

export function Navbar({ view, facturaCount }: NavbarProps) {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 32px",
        borderBottom: "1px solid var(--paper-lighter)",
        background: "rgba(12, 10, 9, 0.8)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            background:
              "linear-gradient(135deg, var(--amber) 0%, var(--rust) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FileText size={16} style={{ color: "white" }} />
        </div>
        <div>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Honda
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--chalk-muted)",
              marginLeft: 8,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Gestión de Facturas
          </span>
        </div>
      </div>

      {facturaCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--chalk-muted)",
          }}
        >
          <LayoutDashboard size={14} />
          {facturaCount} factura{facturaCount !== 1 ? "s" : ""}
        </div>
      )}
    </nav>
  );
}
