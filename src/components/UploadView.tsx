import React, { useCallback, useRef, useState } from "react";
import { Upload, FileImage, X, ArrowRight, Hash } from "lucide-react";

interface UploadViewProps {
  onNext: (numeroFactura: string, imageIds: string[], fileNames: string[]) => void;
}

export function UploadView({ onNext }: UploadViewProps) {
  const [numeroFactura, setNumeroFactura] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const imageFiles = Array.from(newFiles).filter((f) =>
      f.type.startsWith("image/")
    );
    if (imageFiles.length === 0) return;

    setFiles((prev) => [...prev, ...imageFiles]);

    for (const file of imageFiles) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleSubmit = async () => {
    if (!numeroFactura.trim() || files.length === 0) return;
    setUploading(true);

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("images", file);
      }

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      const fileNames = files.map((f) => f.name);
      onNext(numeroFactura.trim(), data.ids, fileNames);
    } catch (err) {
      console.error("Upload failed:", err);
      setUploading(false);
    }
  };

  const canSubmit = numeroFactura.trim().length > 0 && files.length > 0;

  return (
    <div className="animate-fade-up" style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Header */}
      <div className="delay-1 animate-fade-up" style={{ marginBottom: 48 }}>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: "var(--amber)",
            marginBottom: 8,
          }}
        >
          Paso 1 de 2
        </p>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 32,
            fontWeight: 700,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Subir imágenes
        </h2>
        <p style={{ color: "var(--chalk-dim)", marginTop: 8, fontSize: 15 }}>
          Ingresa el número de factura y sube las imágenes correspondientes.
        </p>
      </div>

      {/* Numero de factura */}
      <div className="delay-2 animate-fade-up" style={{ marginBottom: 32 }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--chalk-dim)",
            marginBottom: 10,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          <Hash size={14} style={{ color: "var(--amber)" }} />
          Número de Factura
        </label>
        <input
          type="text"
          value={numeroFactura}
          onChange={(e) => setNumeroFactura(e.target.value)}
          placeholder="Ej. FAC-2026-001"
          style={{
            width: "100%",
            padding: "14px 16px",
            fontSize: 18,
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
      </div>

      {/* Drop zone */}
      <div
        className="delay-3 animate-fade-up"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "var(--amber)" : "var(--paper-lighter)"}`,
          borderRadius: 12,
          padding: files.length > 0 ? "24px" : "56px 24px",
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? "var(--amber-glow)" : "var(--paper)",
          transition: "all 0.25s ease",
          marginBottom: 32,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />

        {files.length === 0 ? (
          <div>
            <Upload
              size={40}
              style={{
                color: dragOver ? "var(--amber)" : "var(--chalk-muted)",
                marginBottom: 16,
                transition: "color 0.2s",
              }}
            />
            <p
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: "var(--chalk)",
                margin: "0 0 6px",
              }}
            >
              Arrastra imágenes aquí
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--chalk-muted)",
                margin: 0,
              }}
            >
              o haz clic para seleccionar archivos
            </p>
          </div>
        ) : (
          <div>
            {/* Thumbnail grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                gap: 12,
                marginBottom: 16,
              }}
            >
              {previews.map((src, i) => (
                <div
                  key={i}
                  className="animate-stamp"
                  style={{
                    position: "relative",
                    aspectRatio: "1",
                    borderRadius: 8,
                    overflow: "hidden",
                    border: "1px solid var(--paper-lighter)",
                    animationDelay: `${i * 0.05}s`,
                  }}
                >
                  <img
                    src={src}
                    alt={files[i]?.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.7)",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                  >
                    <X size={12} />
                  </button>
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: "16px 6px 4px",
                      background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
                      fontSize: 10,
                      fontFamily: "var(--font-mono)",
                      color: "var(--chalk-dim)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {files[i]?.name}
                  </div>
                </div>
              ))}
            </div>

            <p
              style={{
                fontSize: 13,
                color: "var(--chalk-muted)",
                margin: 0,
              }}
            >
              <FileImage
                size={14}
                style={{
                  display: "inline",
                  verticalAlign: "middle",
                  marginRight: 6,
                }}
              />
              {files.length} imagen{files.length !== 1 ? "es" : ""} — clic
              para agregar más
            </p>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="delay-4 animate-fade-up">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || uploading}
          style={{
            width: "100%",
            padding: "14px 24px",
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "var(--font-display)",
            background: canSubmit ? "var(--amber)" : "var(--paper-lighter)",
            color: canSubmit ? "var(--ink)" : "var(--chalk-muted)",
            border: "none",
            borderRadius: 8,
            cursor: canSubmit ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transition: "all 0.25s ease",
            opacity: uploading ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (canSubmit)
              e.currentTarget.style.background = "var(--amber-light)";
          }}
          onMouseLeave={(e) => {
            if (canSubmit) e.currentTarget.style.background = "var(--amber)";
          }}
        >
          {uploading ? (
            <>
              <span
                style={{ animation: "pulse 1.5s ease-in-out infinite" }}
              >
                Subiendo...
              </span>
            </>
          ) : (
            <>
              Continuar
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
