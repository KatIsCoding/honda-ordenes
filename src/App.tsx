import React, { useEffect, useState } from "react";
import { UploadView } from "./components/UploadView";
import { AssignView } from "./components/AssignView";
import { Dashboard } from "./components/Dashboard";
import { LoginPage } from "./components/LoginPage";
import { Navbar } from "./components/Navbar";
import type { AppView, Factura } from "./types";
import "./index.css";

export function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [view, setView] = useState<AppView>("dashboard");
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [pendingFactura, setPendingFactura] = useState<string>("");
  const [pendingImageIds, setPendingImageIds] = useState<string[]>([]);
  const [pendingFileNames, setPendingFileNames] = useState<string[]>([]);

  // Check auth on mount
  useEffect(() => {
    fetch("/api/auth/check")
      .then((res) => res.json())
      .then((data) => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  // Load invoices once authenticated
  useEffect(() => {
    if (!authenticated) return;
    fetch("/api/invoices")
      .then((res) => res.json())
      .then((data) => setFacturas(data))
      .catch(console.error);
  }, [authenticated]);

  // Loading state
  if (authenticated === null) return null;

  // Show login page
  if (!authenticated) {
    return <LoginPage onSuccess={() => setAuthenticated(true)} />;
  }

  const handleUploadNext = (
    numeroFactura: string,
    imageIds: string[],
    fileNames: string[],
  ) => {
    setPendingFactura(numeroFactura);
    setPendingImageIds(imageIds);
    setPendingFileNames(fileNames);
    setView("assign");
  };

  const handleAssignComplete = (assignments: Record<string, string>) => {
    const newFactura: Factura = {
      numeroFactura: pendingFactura,
      createdAt: Date.now(),
      images: pendingImageIds.map((id, i) => ({
        id,
        name: pendingFileNames[i] || "",
        numeroOrden: assignments[id] || "",
        previewUrl: `/api/image/${id}`,
      })),
    };

    // Save to server, then update local state
    fetch("/api/invoice/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newFactura),
    }).catch(console.error);

    setFacturas((prev) => [newFactura, ...prev]);
    setPendingFactura("");
    setPendingImageIds([]);
    setPendingFileNames([]);
    setView("dashboard");
  };

  const handleNewUpload = () => {
    setPendingFactura("");
    setPendingImageIds([]);
    setPendingFileNames([]);
    setView("upload");
  };

  const handleRemoveImage = (index: number) => {
    setPendingImageIds((prev) => prev.filter((_, i) => i !== index));
    setPendingFileNames((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteFactura = (numeroFactura: string) => {
    fetch(`/api/invoices/${encodeURIComponent(numeroFactura)}`, {
      method: "DELETE",
    }).catch(console.error);

    setFacturas((prev) => prev.filter((f) => f.numeroFactura !== numeroFactura));
  };

  const handleBackToUpload = () => {
    setView("upload");
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar view={view} facturaCount={facturas.length} />

      <main style={{ padding: "48px 24px 80px" }}>
        {view === "upload" && <UploadView onNext={handleUploadNext} />}

        {view === "assign" && (
          <AssignView
            imageIds={pendingImageIds}
            fileNames={pendingFileNames}
            numeroFactura={pendingFactura}
            onComplete={handleAssignComplete}
            onBack={handleBackToUpload}
            onRemoveImage={handleRemoveImage}
          />
        )}

        {view === "dashboard" && (
          <Dashboard facturas={facturas} onNewUpload={handleNewUpload} onDeleteFactura={handleDeleteFactura} />
        )}
      </main>
    </div>
  );
}

export default App;
