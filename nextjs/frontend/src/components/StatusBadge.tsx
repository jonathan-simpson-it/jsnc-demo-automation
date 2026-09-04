"use client";
import { useEffect, useState } from "react";
import { fetchHealth } from "@/lib/api";

export default function StatusBadge() {
  const [status, setStatus] = useState<"loading" | "healthy" | "error">(
    "loading",
  );
  useEffect(() => {
    fetchHealth()
      .then((h) => setStatus(h.status === "healthy" ? "healthy" : "error"))
      .catch(() => setStatus("error"));
  }, []);

  const color = {
    loading: "var(--color-muted)",
    healthy: "var(--color-ok)",
    error: "var(--color-error)",
  }[status];
  const label = {
    loading: "Checking...",
    healthy: "System Ready",
    error: "Offline",
  }[status];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "0.72rem",
        color: "var(--color-muted)",
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: color, flexShrink: 0 }}
      />
      <span>{label}</span>
    </div>
  );
}
