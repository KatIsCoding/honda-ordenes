import React, { useState } from "react";

export function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError("Contraseña incorrecta");
        return;
      }

      onSuccess();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        className="animate-fade-up"
        style={{
          width: "100%",
          maxWidth: "380px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "28px",
              fontWeight: 600,
              color: "var(--chalk)",
              margin: 0,
            }}
          >
            Honda
          </h1>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              color: "var(--chalk-muted)",
              marginTop: "8px",
            }}
          >
            Gestión de Facturas
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              background: "var(--paper)",
              border: "1px solid var(--paper-lighter)",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                color: "var(--chalk-dim)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "var(--ink)",
                border: "1px solid var(--paper-lighter)",
                borderRadius: "8px",
                color: "var(--chalk)",
                fontFamily: "var(--font-mono)",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "var(--amber)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "var(--paper-lighter)")
              }
            />

            {error && (
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "var(--rust)",
                  marginTop: "10px",
                  marginBottom: 0,
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              style={{
                width: "100%",
                marginTop: "16px",
                padding: "10px",
                background: loading || !password ? "var(--paper-lighter)" : "var(--amber)",
                color: loading || !password ? "var(--chalk-muted)" : "var(--ink)",
                border: "none",
                borderRadius: "8px",
                fontFamily: "var(--font-display)",
                fontSize: "14px",
                fontWeight: 600,
                cursor: loading || !password ? "default" : "pointer",
                transition: "background 0.2s, color 0.2s",
              }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
