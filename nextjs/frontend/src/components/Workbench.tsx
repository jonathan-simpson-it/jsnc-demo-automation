"use client";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { fetchDocumentList, fetchProjects, uploadDocument } from "@/lib/api";
import type { DocumentInfo, Project } from "@/lib/types";
import CitationList from "@/components/CitationList";

function docKey(doc: DocumentInfo): string {
  return doc.id != null ? String(doc.id) : doc.filename;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.68rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-muted)",
  marginBottom: "0.3rem",
};

/* ---- WorkbenchPage: shared layout shell for workbench pages ---- */

export function WorkbenchPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: "56rem" }}>
        <span className="section-eyebrow">{eyebrow}</span>
        <h1
          style={{            fontSize: "clamp(1.4rem, 3.8vw, 2rem)",
            fontWeight: 400,
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
            marginBottom: "1rem",
          }}
        >
          {title}
        </h1>
        <p
          style={{
            color: "var(--color-muted)",
            fontSize: "0.95rem",
            maxWidth: "40rem",
            margin: "0 0 1.5rem 0",
          }}
        >
          {description}
        </p>
        {children}
      </div>
    </section>
  );
}

/* ---- DocumentPicker: project workspace + document + upload ---- */

export function DocumentPicker({
  onSelect,
}: {
  onSelect: (doc: DocumentInfo | null) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [docs, setDocs] = useState<DocumentInfo[]>([]);
  const [workspace, setWorkspace] = useState("");
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function loadDocs(projectId: number | null) {
    setBusy(true);
    fetchDocumentList(projectId ? { project_id: projectId } : undefined)
      .then((d) => setDocs(d.documents))
      .catch(() => setDocs([]))
      .finally(() => setBusy(false));
  }

  useEffect(() => {
    let alive = true;
    setBusy(true);
    fetchProjects()
      .then((p) => {
        if (alive) setProjects(p.projects);
      })
      .catch(() => {});
    fetchDocumentList()
      .then((d) => {
        if (alive) setDocs(d.documents);
      })
      .catch(() => setDocs([]))
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  function changeWorkspace(value: string) {
    setWorkspace(value);
    setSelected("");
    setUploadError("");
    onSelect(null);
    loadDocs(value ? Number(value) : null);
  }

  function changeDocument(value: string) {
    setSelected(value);
    const doc = docs.find((d) => docKey(d) === value) ?? null;
    onSelect(doc);
  }

  async function handleFile(file: File) {
    setUploadError("");
    setBusy(true);
    try {
      const uploaded = await uploadDocument(
        file,
        null,
        workspace ? Number(workspace) : null,
      );
      const fresh = await fetchDocumentList(
        workspace ? { project_id: Number(workspace) } : undefined,
      );
      setDocs(fresh.documents);
      const match =
        fresh.documents.find(
          (d) => d.id != null && uploaded.id != null && d.id === uploaded.id,
        ) ??
        fresh.documents.find((d) => d.filename === uploaded.filename) ??
        null;
      setSelected(match ? docKey(match) : "");
      onSelect(match);
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        padding: "1rem",
        border: "1px solid var(--color-line)",
        borderRadius: "var(--radius-lg)",
        background: "var(--color-surface)",
        marginBottom: "1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <div style={{ flexGrow: 1, minWidth: "12rem" }}>
          <span style={labelStyle}>Project workspace</span>
          <select
            aria-label="Project workspace"
            className="select"
            style={{ width: "100%" }}
            value={workspace}
            onChange={(e) => changeWorkspace(e.target.value)}
            disabled={busy}
          >
            <option value="">All documents</option>
            {projects.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.client_name ? `${p.client_name} / ${p.name}` : p.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flexGrow: 1, minWidth: "12rem" }}>
          <span style={labelStyle}>Document</span>
          <select
            aria-label="Document"
            className="select"
            style={{ width: "100%" }}
            value={selected}
            onChange={(e) => changeDocument(e.target.value)}
            disabled={busy}
          >
            <option value="">Select a document…</option>
            {docs.map((d) => (
              <option key={docKey(d)} value={docKey(d)}>
                {d.filename}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="button button--ghost button--small"
          style={{ flexShrink: 0 }}
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "Working…" : "Upload document"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.md,.docx,.xlsx"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void handleFile(f);
          }}
        />
      </div>
      {uploadError && (
        <div style={{ fontSize: "0.78rem", color: "var(--color-muted)" }}>
          {uploadError}
        </div>
      )}
      {docs.length === 0 && !busy && (
        <div style={{ fontSize: "0.78rem", color: "var(--color-muted)" }}>
          No documents yet. Upload one to get started.
        </div>
      )}
    </div>
  );
}

/* ---- ResultPanel: agent output, sources, confidence, copy ---- */

export function ResultPanel({
  resultText,
  citations,
  confidence,
  agentType,
}: {
  resultText: string;
  citations: string[];
  confidence: number;
  agentType: string;
}) {
  const [copied, setCopied] = useState(false);

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(resultText);
  } catch {
    parsed = null;
  }

  function copy() {
    navigator.clipboard?.writeText(resultText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const confidencePct = Math.round(confidence * 100);

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        borderRadius: "var(--radius-lg)",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.9rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "var(--color-accent-soft)",
              border: "1px solid var(--color-line)",
              borderRadius: 999,
              padding: "0.2rem 0.7rem",
              fontSize: "0.68rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-ink)",
            }}
          >
            {agentType.replace(/_/g, " ")}
          </span>
          <span
            style={{
              fontSize: "0.72rem",
              letterSpacing: "0.08em",
              color: "var(--color-muted)",
            }}
          >
            Confidence: {confidencePct}%
          </span>
        </div>
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={copy}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.82rem",
          lineHeight: 1.6,
          background: "var(--color-bg)",
          color: "var(--color-ink)",
          padding: "1.25rem",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-line)",
          overflowX: "auto",
          margin: 0,
          whiteSpace: "pre-wrap",
        }}
      >
        {parsed != null ? JSON.stringify(parsed, null, 2) : resultText}
      </pre>

      {citations.length > 0 && (
        <div style={{ borderTop: "1px solid var(--color-line)" }}>
          <span
            style={{
              fontSize: "0.68rem",
              color: "var(--color-muted)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Sources ({citations.length})
          </span>
          <div style={{ marginTop: "0.35rem" }}>
            <CitationList citations={citations} />
          </div>
        </div>
      )}
    </div>
  );
}
