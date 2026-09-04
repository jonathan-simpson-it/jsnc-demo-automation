"use client";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { WorkbenchPage } from "@/components/Workbench";
import { fetchDocumentList, fetchProjects, uploadDocument } from "@/lib/api";
import type { DocumentInfo, Project } from "@/lib/types";

interface UploadRow {
  filename: string;
  status: "uploading" | "success" | "error";
  message?: string;
}

const labelCell: CSSProperties = {
  fontSize: "0.72rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-muted)",
  margin: 0,
};

const fieldLabel: CSSProperties = {
  display: "block",
  fontSize: "0.68rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-muted)",
  marginBottom: "0.3rem",
};

function shortError(err: unknown): string {
  const text = err instanceof Error ? err.message : "";
  if (!text.trim()) return "Upload failed";
  const cleaned = text.replace(/^Upload \d+:?\s*/i, "").trim();
  return cleaned.length > 72
    ? `${cleaned.slice(0, 69).trimEnd()}…`
    : cleaned;
}

export default function FilingCabinetPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspace, setWorkspace] = useState("");
  const [docs, setDocs] = useState<DocumentInfo[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Transient success flash on the dropzone after a batch finishes.
  const [flash, setFlash] = useState<{ ok: boolean; label: string } | null>(
    null,
  );
  const [flashLeaving, setFlashLeaving] = useState(false);
  const flashTimer = useRef<number | null>(null);

  const uploading = uploads.some((u) => u.status === "uploading");

  useEffect(() => {
    return () => {
      if (flashTimer.current != null) window.clearTimeout(flashTimer.current);
    };
  }, []);

  async function reload(projectId: number | null) {
    setDocsLoading(true);
    try {
      const res = await fetchDocumentList(
        projectId ? { project_id: projectId } : undefined,
      );
      setDocs(res.documents);
    } catch {
      setDocs([]);
    } finally {
      setDocsLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    fetchProjects()
      .then((p) => {
        if (alive) setProjects(p.projects);
      })
      .catch(() => {});
    setDocsLoading(true);
    fetchDocumentList()
      .then((r) => {
        if (alive) setDocs(r.documents);
      })
      .catch(() => {
        if (alive) setDocs([]);
      })
      .finally(() => {
        if (alive) setDocsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  function changeWorkspace(value: string) {
    setWorkspace(value);
    void reload(value ? Number(value) : null);
  }

  async function handleFiles(files: FileList) {
    if (uploading) return;
    const names = Array.from(files);
    if (names.length === 0) return;
    // A new batch supersedes any lingering success flash.
    if (flashTimer.current != null) window.clearTimeout(flashTimer.current);
    setFlash(null);
    setFlashLeaving(false);
    let failed = 0;
    for (const file of names) {
      setUploads((p) => [...p, { filename: file.name, status: "uploading" }]);
      try {
        const res = await uploadDocument(
          file,
          null,
          workspace ? Number(workspace) : null,
        );
        setUploads((p) =>
          p.map((u) =>
            u.filename === file.name && u.status === "uploading"
              ? {
                  filename: file.name,
                  status: "success",
                  message: `${res.chunks_ingested} chunks ingested`,
                }
              : u,
          ),
        );
      } catch (err) {
        failed += 1;
        setUploads((p) =>
          p.map((u) =>
            u.filename === file.name && u.status === "uploading"
              ? {
                  filename: file.name,
                  status: "error",
                  message: `Upload failed: ${shortError(err)}`,
                }
              : u,
          ),
        );
      }
    }
    // Success flash mirrors the Documents page dropzone. Set it BEFORE the
    // reload so the dropzone never flashes a one-frame idle state in between.
    const ok = failed === 0;
    const done = names.length - failed;
    setFlash({
      ok,
      label: ok
        ? names.length > 1
          ? `${names.length} files uploaded`
          : "Upload complete"
        : `${done} of ${names.length} uploaded`,
    });
    setFlashLeaving(false);
    window.setTimeout(() => setFlashLeaving(true), 1900);
    flashTimer.current = window.setTimeout(() => {
      setFlash(null);
      setFlashLeaving(false);
      flashTimer.current = null;
    }, 2450);
    await reload(workspace ? Number(workspace) : null);
  }

  return (
    <WorkbenchPage
      eyebrow="Operations"
      title="Filing cabinet."
      description="Ingest target-company files into project workspaces. Each document gets its own vector collection with auto-generated keyword signals, so large files never dilute smaller ones during retrieval."
    >
      <div style={{ marginBottom: "1.5rem" }}>
        <span style={fieldLabel}>Project workspace</span>
        <select
          aria-label="Project workspace"
          className="select"
          value={workspace}
          onChange={(e) => changeWorkspace(e.target.value)}
          style={{ width: "100%", maxWidth: "26rem" }}
        >
          <option value="">No project (Global)</option>
          {projects.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.client_name ? `${p.client_name} / ${p.name}` : p.name}
            </option>
          ))}
        </select>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.md,.docx,.xlsx"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) void handleFiles(files);
          e.target.value = "";
        }}
        aria-label="Upload PDF, TXT, MD, DOCX, or XLSX files"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
          border: 0,
          pointerEvents: "none",
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (uploading) {
            e.dataTransfer.dropEffect = "none";
            return;
          }
          e.dataTransfer.dropEffect = "copy";
          setDragOver(true);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!uploading) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setDragOver(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          if (uploading) return;
          void handleFiles(e.dataTransfer.files);
        }}
        style={{
          width: "100%",
          border: `2px dashed ${dragOver ? "var(--color-accent)" : "var(--color-line)"}`,
          background: dragOver ? "var(--color-accent-soft)" : "transparent",
          borderRadius: "var(--radius-lg)",
          padding: "1.75rem 1rem",
          textAlign: "center",
          cursor: uploading ? "default" : "pointer",
          transition: "all 220ms ease",
          marginBottom: "1.5rem",
        }}
      >
        {flash ? (
          <span
            role="status"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.55rem",
              opacity: flashLeaving ? 0 : 1,
              transition: "opacity 450ms ease",
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 26 26"
              aria-hidden="true"
              className="upload-success-pop"
            >
              <circle
                cx="13"
                cy="13"
                r="12"
                fill="none"
                stroke={flash.ok ? "var(--color-accent)" : "var(--color-muted)"}
                strokeWidth="1.6"
                opacity="0.35"
              />
              <path
                className="upload-check-path"
                d="M7.5 13.5l3.8 3.8 7.2-8.2"
                fill="none"
                stroke={flash.ok ? "var(--color-accent)" : "var(--color-muted)"}
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontSize: "0.88rem",
                fontWeight: 500,
                color: flash.ok ? "var(--color-accent)" : "var(--color-muted)",
              }}
            >
              {flash.label}
            </span>
          </span>
        ) : (
          <>
            <p style={{ fontSize: "0.88rem", fontWeight: 500, marginBottom: "0.25rem" }}>
              {uploading ? "Uploading…" : "Drop files here or click to upload"}
            </p>
            <p style={{ fontSize: "0.78rem", color: "var(--color-muted)", margin: 0 }}>
              PDF, TXT, MD, DOCX, XLSX
            </p>
          </>
        )}
      </button>

      {uploads.length > 0 && (
        <div className="space-y-2" style={{ marginBottom: "1.5rem" }}>
          {uploads.map((u, i) => (
            <div
              key={`${u.filename}-${i}`}
              className="panel-card"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.6rem 1rem",
              }}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full"
                style={{
                  background:
                    u.status === "success"
                      ? "var(--color-accent)"
                      : u.status === "error"
                        ? "var(--color-error)"
                        : "var(--color-muted)",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: "0.85rem", flex: 1 }}>
                {u.filename}
                <span
                  style={{
                    color:
                      u.status === "error"
                        ? "var(--color-error)"
                        : "var(--color-muted)",
                  }}
                >
                  {" "}
                  ·{" "}
                  {u.status === "uploading"
                    ? "Uploading…"
                    : u.message || (u.status === "success" ? "Ingested" : "Failed")}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      <h4 style={{ ...labelCell, marginBottom: "0.75rem" }}>Routed documents</h4>

      {docsLoading ? (
        <p
          style={{
            color: "var(--color-muted)",
            padding: "1.5rem 0",
            fontSize: "0.85rem",
          }}
        >
          Loading documents…
        </p>
      ) : docs.length === 0 ? (
        <p
          style={{
            color: "var(--color-muted)",
            textAlign: "center",
            padding: "2.5rem 0",
            fontSize: "0.88rem",
          }}
        >
          No routed documents yet. Upload files above to start a project
          collection.
        </p>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div
              key={d.id ?? d.filename}
              className="panel-card"
              style={{ padding: "0.75rem 1rem" }}
            >
              <div
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 500,
                  color: "var(--color-ink)",
                  overflowWrap: "anywhere",
                }}
              >
                {d.filename}
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "0.4rem",
                  marginTop: "0.4rem",
                }}
              >
                <span
                  className="chip"
                  style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}
                >
                  {d.chunks} chunks
                </span>
                {d.source && (
                  <span
                    className="chip"
                    style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}
                  >
                    source: {d.source}
                  </span>
                )}
                {d.project_name ? (
                  <span
                    className="chip"
                    style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}
                  >
                    {d.project_name}
                  </span>
                ) : (
                  <span style={{ fontSize: "0.72rem", color: "var(--color-muted)" }}>
                    not assigned
                  </span>
                )}
              </div>
              {d.summary && d.summary.trim().length > 0 && (
                <p
                  style={{
                    margin: "0.5rem 0 0 0",
                    fontSize: "0.78rem",
                    color: "var(--color-muted)",
                    lineHeight: 1.5,
                  }}
                >
                  {d.summary.length > 120
                    ? `${d.summary.slice(0, 120).trimEnd()}…`
                    : d.summary}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div
        className="panel-card"
        style={{ marginTop: "1.5rem", padding: "1rem 1.25rem" }}
      >
        <h4 style={labelCell}>How routing works</h4>
        <ul
          style={{
            margin: "0.6rem 0 0 0",
            paddingLeft: "1.2rem",
            display: "grid",
            gap: "0.45rem",
            fontSize: "0.85rem",
            color: "var(--color-muted)",
            lineHeight: 1.55,
          }}
        >
          <li>
            Each file is embedded into its own Chroma collection tied to the
            project workspace you chose, so retrieval stays scoped to the
            documents in that workspace.
          </li>
          <li>
            TF-IDF keyword signals are generated automatically at ingest and
            stored with the collection, letting matching documents surface
            before any embedding query runs.
          </li>
          <li>
            At query time chunks are sampled fairly across the documents in
            scope, so a large data room deck can never crowd out a small
            investment memo.
          </li>
        </ul>
      </div>
    </WorkbenchPage>
  );
}
