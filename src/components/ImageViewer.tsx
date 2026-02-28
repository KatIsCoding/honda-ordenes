import React, { useState, useRef, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface ImageViewerProps {
  src: string;
  alt?: string;
  /** Extra class applied to the outer wrapper */
  className?: string;
  /** If true, shows a minimal toolbar (for lightbox usage) */
  minimal?: boolean;
  /** Controlled zoom — if provided, zoom is managed externally */
  zoom?: number;
  /** Called when zoom changes (required if zoom is controlled) */
  onZoomChange?: (zoom: number) => void;
  /** Controlled pan — if provided, pan is managed externally */
  pan?: { x: number; y: number };
  /** Called when pan changes (required if pan is controlled) */
  onPanChange?: (pan: { x: number; y: number }) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.5;

export function ImageViewer({
  src,
  alt = "",
  className,
  minimal,
  zoom: controlledZoom,
  onZoomChange,
  pan: controlledPan,
  onPanChange,
}: ImageViewerProps) {
  const [internalZoom, setInternalZoom] = useState(1);
  const zoomControlled = controlledZoom !== undefined;
  const zoom = zoomControlled ? controlledZoom : internalZoom;
  const setZoom = zoomControlled
    ? (v: number | ((prev: number) => number)) => {
        const next = typeof v === "function" ? v(zoom) : v;
        onZoomChange?.(next);
      }
    : setInternalZoom;

  const [internalPan, setInternalPan] = useState({ x: 0, y: 0 });
  const panControlled = controlledPan !== undefined;
  const pan = panControlled ? controlledPan : internalPan;
  const setPan = panControlled
    ? (v: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => {
        const next = typeof v === "function" ? v(pan) : v;
        onPanChange?.(next);
      }
    : setInternalPan;

  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // In uncontrolled mode, reset everything when image changes
  useEffect(() => {
    if (!panControlled) setInternalPan({ x: 0, y: 0 });
    if (!zoomControlled) setInternalZoom(1);
  }, [src, panControlled, zoomControlled]);

  const applyZoom = useCallback((next: number) => {
    const clamped = Math.min(Math.max(next, MIN_ZOOM), MAX_ZOOM);
    setZoom(clamped);
    if (clamped === 1) setPan({ x: 0, y: 0 });
  }, [zoom, pan]);

  const zoomIn = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    applyZoom(zoom + ZOOM_STEP);
  }, [zoom, applyZoom]);

  const zoomOut = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    applyZoom(zoom - ZOOM_STEP);
  }, [zoom, applyZoom]);

  const resetZoom = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      applyZoom(zoom + (e.deltaY < 0 ? ZOOM_STEP * 0.5 : -ZOOM_STEP * 0.5));
    },
    [zoom, applyZoom]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (zoom <= 1) return;
      e.preventDefault();
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      panStart.current = { ...pan };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [zoom, pan]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({
        x: panStart.current.x + dx,
        y: panStart.current.y + dy,
      });
    },
    [dragging]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Double-click to toggle zoom
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (zoom > 1) {
        resetZoom();
      } else {
        setZoom(2.5);
      }
    },
    [zoom, resetZoom]
  );

  const zoomPercent = Math.round(zoom * 100);
  const isZoomed = zoom > 1;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        cursor: isZoomed ? (dragging ? "grabbing" : "grab") : "zoom-in",
        userSelect: "none",
        touchAction: "none",
      }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transition: dragging ? "none" : "transform 0.2s ease-out",
          pointerEvents: "none",
        }}
      />

      {/* Zoom controls */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: minimal ? 16 : 12,
          left: minimal ? 16 : 12,
          display: "flex",
          alignItems: "center",
          gap: 2,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(8px)",
          borderRadius: 8,
          padding: 3,
          zIndex: 10,
        }}
      >
        <ControlButton onClick={zoomOut} disabled={zoom <= MIN_ZOOM} title="Alejar">
          <ZoomOut size={15} />
        </ControlButton>

        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: isZoomed ? "var(--amber)" : "var(--chalk-dim)",
            minWidth: 40,
            textAlign: "center",
            userSelect: "none",
            transition: "color 0.15s",
          }}
        >
          {zoomPercent}%
        </span>

        <ControlButton onClick={zoomIn} disabled={zoom >= MAX_ZOOM} title="Acercar">
          <ZoomIn size={15} />
        </ControlButton>

        {isZoomed && (
          <ControlButton onClick={resetZoom} title="Resetear">
            <RotateCcw size={13} />
          </ControlButton>
        )}
      </div>
    </div>
  );
}

function ControlButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 30,
        height: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        borderRadius: 6,
        color: disabled ? "var(--chalk-muted)" : "var(--chalk)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "background 0.15s, opacity 0.15s",
        padding: 0,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = "rgba(255,255,255,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}
