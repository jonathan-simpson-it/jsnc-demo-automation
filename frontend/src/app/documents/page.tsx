"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { uploadDocument, fetchDocumentStats } from "@/lib/api";
import type { DocumentInfo } from "@/lib/types";

interface UploadStatus {
  filename: string;
  status: "uploading" | "success" | "error";
  message?: string;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentInfo[]>([]);
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const s = await fetchDocumentStats();
      setDocs(s.documents);
    } catch {
      setDocs([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFiles(files: FileList) {
    for (const file of Array.from(files)) {
      setUploads((p) => [...p, { filename: file.name, status: "uploading" }]);
      try {
        const r = await uploadDocument(file);
        setUploads((p) =>
          p.map((u) =>
            u.filename === file.name && u.status === "uploading"
              ? {
                  filename: file.name,
                  status: "success",
                  message: `${r.chunks_ingested} chunks`,
                }
              : u,
          ),
        );
      } catch (err: unknown) {
        setUploads((p) =>
          p.map((u) =>
            u.filename === file.name && u.status === "uploading"
              ? {
                  filename: file.name,
                  status: "error",
                  message: err instanceof Error ? err.message : "Failed",
                }
              : u,
          ),
        );
      }
    }
    load();
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section-intro">
          <span className="section-eyebrow">Documents</span>
          <h2>Knowledge base.</h2>
          <p>
            Upload and manage documents. Supported formats: PDF, TXT, MD.
          </p>
        </div>

        {/* Upload Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "var(--color-accent)" : "var(--color-line)"}`,
            background: dragOver ? "var(--color-accent-soft)" : "transparent",
            borderRadius: "var(--radius-lg)",
            padding: "3rem 2rem",
            textAlign: "center",
            cursor: "pointer",
            transition: "all var(--transition-fast)",
            marginBottom: "2rem",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
          <p style={{ fontSize: "0.88rem", fontWeight: 500, marginBottom: "0.25rem" }}>
            Drop files here or click to upload
          </p>
          <p style={{ fontSize: "0.78rem", color: "var(--color-muted)" }}>
            PDF, TXT, MD
          </p>
        </div>

        {/* Upload Status */}
        {uploads.length > 0 && (
          <div className="space-y-2" style={{ marginBottom: "2rem" }}>
            {uploads.map((u, i) => (
              <div
                key={`${u.filename}-${i}`}
                className="panel-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background:
                      u.status === "success"
                        ? "#22c55e"
                        : u.status === "error"
                          ? "#ef4444"
                          : "var(--color-muted)",
                  }}
                />
                <span style={{ fontSize: "0.85rem", flex: 1 }}>
                  {u.filename}
                  {u.message && (
                    <span style={{ color: "var(--color-muted)" }}>
                      {" "}
                      -- {u.message}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Document List */}
        <div className="section-intro" style={{ marginTop: docs.length > 0 ? "2rem" : 0 }}>
          <span className="section-eyebrow">Loaded</span>
          <h2>Document inventory.</h2>
        </div>

        {docs.length === 0 ? (
          <p
            style={{
              color: "var(--color-muted)",
              textAlign: "center",
              padding: "3rem 0",
              fontSize: "0.88rem",
            }}
          >
            No documents yet. Upload some files above.
          </p>
        ) : (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
            }}
          >
            {docs.map((d) => (
              <div key={d.collection} className="panel-card">
                <h3 style={{ fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  {d.filename}
                </h3>
                <p style={{ fontSize: "0.78rem", color: "var(--color-muted)", marginBottom: "0.5rem" }}>
                  {d.chunks} chunks
                  {d.doc_type && (
                    <>
                      {" "}
                      <span className="chip" style={{ marginLeft: "0.25rem" }}>
                        {d.doc_type}
                      </span>
                    </>
                  )}
                </p>
                {d.summary && (
                  <p style={{ fontSize: "0.82rem", color: "var(--color-muted)", lineHeight: 1.6 }}>
                    {d.summary}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
