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
    loading: "bg-yellow-400",
    healthy: "bg-green-500",
    error: "bg-red-400",
  }[status];
  const label = {
    loading: "Checking...",
    healthy: "System Ready",
    error: "Offline",
  }[status];

  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}
