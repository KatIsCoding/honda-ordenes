import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Tag, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { ImageViewer } from "./ImageViewer";

interface AssignViewProps {
  imageIds: string[];
  fileNames: string[];
  numeroFactura: string;
  onComplete: (assignments: Record<string, string>) => void;
  onBack: () => void;
  onRemoveImage: (index: number) => void;
}

export function AssignView({
  imageIds,
  fileNames,
  numeroFactura,
  onComplete,
  onBack,
  onRemoveImage,
}: AssignViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const currentId = imageIds[currentIndex]!;
  const total = imageIds.length;
  const assignedCount = Object.keys(assignments).length;
  const allAssigned = assignedCount === total;

  const assignCurrent = () => {
    if (!inputValue.trim()) return;
    setAssignments((prev) => ({ ...prev, [currentId]: inputValue.trim() }));
    setInputValue("");

    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      assignCurrent();
    }
  };

  const goTo = (index: number) => {
    if (index >= 0 && index < total) {
      setCurrentIndex(index);
      setInputValue(assignments[imageIds[index]!] || "");
    }
  };

  const removeImage = (index: number) => {
    const id = imageIds[index]!;
    // Clean up assignment for this image
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    // Adjust currentIndex if needed
    if (total <= 1) {
      onBack();
      return;
    }
    if (currentIndex >= total - 1) {
      setCurrentIndex(Math.max(0, total - 2));
    } else if (currentIndex > index) {
      setCurrentIndex(currentIndex - 1);
    }
    onRemoveImage(index);
  };

  return (
    <div className="animate-fade-up" style={{ maxWidth: 860, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "var(--amber)",
              margin: 0,
            }}
          >
            Paso 2 de 2
          </p>
          <button
            onClick={onBack}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              color: "var(--chalk-muted)",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              padding: 0,
            }}
          >
            <ArrowLeft size={14} />
            Volver
          </button>
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 32,
            fontWeight: 700,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Asignar órdenes
        </h2>
        <p style={{ color: "var(--chalk-dim)", marginTop: 8, fontSize: 15 }}>
          Factura{" "}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--amber)",
              fontWeight: 500,
            }}
          >
            {numeroFactura}
          </span>{" "}
          — Asigna un número de orden a cada imagen.
        </p>
      </div>

      {/* Progress bar */}
      <div
        className="delay-1 animate-fade-up"
        style={{
          background: "var(--paper)",
          borderRadius: 4,
          height: 4,
          marginBottom: 32,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(assignedCount / total) * 100}%`,
            background: allAssigned
              ? "var(--success)"
              : "var(--amber)",
            borderRadius: 4,
            transition: "width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
      </div>

      {/* Main content */}
      <div
        className="delay-2 animate-fade-up"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 32,
          alignItems: "start",
        }}
      >
        {/* Image preview */}
        <div>
          <div
            style={{
              position: "relative",
              background: "var(--paper)",
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid var(--paper-lighter)",
              aspectRatio: "4/3",
            }}
          >
            <ImageViewer
              src={`/api/image/${currentId}`}
              alt={fileNames[currentIndex]}
              zoom={zoom}
              onZoomChange={setZoom}
              pan={pan}
              onPanChange={setPan}
            />

            {/* Navigation overlay */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "24px 16px 12px",
                background:
                  "linear-gradient(transparent, rgba(0,0,0,0.85))",
              }}
            >
              <button
                onClick={() => goTo(currentIndex - 1)}
                disabled={currentIndex === 0}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: 6,
                  color: currentIndex === 0 ? "var(--chalk-muted)" : "white",
                  cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                  padding: "6px 8px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <ChevronLeft size={18} />
              </button>

              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  color: "var(--chalk-dim)",
                }}
              >
                {currentIndex + 1} / {total}
              </span>

              <button
                onClick={() => goTo(currentIndex + 1)}
                disabled={currentIndex === total - 1}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: 6,
                  color:
                    currentIndex === total - 1
                      ? "var(--chalk-muted)"
                      : "white",
                  cursor:
                    currentIndex === total - 1 ? "not-allowed" : "pointer",
                  padding: "6px 8px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Assigned stamp */}
            {assignments[currentId] && (
              <div
                className="animate-stamp"
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  background: "var(--success)",
                  color: "white",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Check size={12} />
                {assignments[currentId]}
              </div>
            )}
          </div>

          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--chalk-muted)",
              marginTop: 10,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {fileNames[currentIndex]}
          </p>
        </div>

        {/* Assignment panel */}
        <div>
          {/* Input */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--chalk-dim)",
                marginBottom: 10,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              <Tag size={13} style={{ color: "var(--amber)" }} />
              Número de Orden
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ej. ORD-001"
                autoFocus
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  fontSize: 16,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 500,
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
              <button
                onClick={assignCurrent}
                disabled={!inputValue.trim()}
                style={{
                  padding: "0 14px",
                  background: inputValue.trim()
                    ? "var(--amber)"
                    : "var(--paper-lighter)",
                  color: inputValue.trim()
                    ? "var(--ink)"
                    : "var(--chalk-muted)",
                  border: "none",
                  borderRadius: 8,
                  cursor: inputValue.trim() ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.2s",
                }}
              >
                <Check size={18} />
              </button>
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--chalk-muted)",
                marginTop: 8,
                fontFamily: "var(--font-mono)",
              }}
            >
              Enter para asignar y avanzar
            </p>
          </div>

          {/* Thumbnails list */}
          <div>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "var(--chalk-muted)",
                marginBottom: 12,
              }}
            >
              Imágenes ({assignedCount}/{total} asignadas)
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 340,
                overflowY: "auto",
              }}
            >
              {imageIds.map((id, i) => {
                const isActive = i === currentIndex;
                const isAssigned = !!assignments[id];
                return (
                  <button
                    key={id}
                    onClick={() => goTo(i)}
                    className="animate-slide-in"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      background: isActive
                        ? "var(--paper-light)"
                        : "transparent",
                      border: isActive
                        ? "1px solid var(--amber)"
                        : "1px solid transparent",
                      borderRadius: 8,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                      animationDelay: `${i * 0.03}s`,
                    }}
                  >
                    <img
                      src={`/api/image/${id}`}
                      alt=""
                      style={{
                        width: 40,
                        height: 40,
                        objectFit: "cover",
                        borderRadius: 4,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--chalk)",
                          margin: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {fileNames[i]}
                      </p>
                      {isAssigned ? (
                        <p
                          style={{
                            fontSize: 11,
                            fontFamily: "var(--font-mono)",
                            color: "var(--success)",
                            margin: 0,
                          }}
                        >
                          {assignments[id]}
                        </p>
                      ) : (
                        <p
                          style={{
                            fontSize: 11,
                            color: "var(--chalk-muted)",
                            margin: 0,
                          }}
                        >
                          Sin asignar
                        </p>
                      )}
                    </div>
                    {isAssigned && (
                      <Check
                        size={14}
                        style={{ color: "var(--success)", flexShrink: 0 }}
                      />
                    )}
                    <div
                      role="button"
                      tabIndex={0}
                      title="Eliminar imagen"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(i);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          removeImage(i);
                        }
                      }}
                      style={{
                        width: 26,
                        height: 26,
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
                      <Trash2 size={13} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Finish button */}
          <button
            onClick={() => onComplete(assignments)}
            disabled={!allAssigned}
            style={{
              width: "100%",
              padding: "14px 24px",
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "var(--font-display)",
              background: allAssigned ? "var(--amber)" : "var(--paper)",
              color: allAssigned ? "var(--ink)" : "var(--chalk-muted)",
              border: allAssigned
                ? "none"
                : "1px dashed var(--paper-lighter)",
              borderRadius: 8,
              cursor: allAssigned ? "pointer" : "not-allowed",
              marginTop: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "all 0.3s ease",
            }}
          >
            {allAssigned ? (
              <>
                Guardar factura
                <ArrowRight size={18} />
              </>
            ) : (
              `Asigna las ${total - assignedCount} restantes`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
