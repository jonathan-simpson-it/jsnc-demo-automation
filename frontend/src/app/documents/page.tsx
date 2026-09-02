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
    <div className="container py-12">
      <h1 className="text-3xl mb-2 font-serif">Document Manager</h1>
      <p className="text-sm text-muted mb-8">
        Upload and manage documents in the knowledge base.
      </p>
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
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors mb-6 ${dragOver ? "border-accent bg-accent-soft/30" : "border-line hover:border-accent"}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
        <p className="text-sm font-medium mb-1">
          Drop files here or click to upload
        </p>
        <p className="text-xs text-muted">Supports PDF, TXT, MD</p>
      </div>
      {uploads.length > 0 && (
        <div className="space-y-2 mb-8">
          {uploads.map((u, i) => (
            <div
              key={`${u.filename}-${i}`}
              className={`px-4 py-3 rounded-lg text-sm ${u.status === "success" ? "bg-green-50 text-green-800" : u.status === "error" ? "bg-red-50 text-red-800" : "bg-bg text-muted"}`}
              style={{
                borderLeftWidth: "3px",
                borderLeftColor:
                  u.status === "success"
                    ? "#22c55e"
                    : u.status === "error"
                      ? "#ef4444"
                      : "#5c5e56",
              }}
            >
              {u.status === "uploading"
                ? "Uploading: "
                : u.status === "success"
                  ? "Uploaded: "
                  : "Error: "}
              {u.filename}
              {u.message && ` -- ${u.message}`}
            </div>
          ))}
        </div>
      )}
      <h2 className="text-xl mb-4 font-serif">Knowledge Base</h2>
      {docs.length === 0 ? (
        <p className="text-sm text-muted text-center py-12">
          No documents yet. Upload some files above.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((d) => (
            <div key={d.collection} className="panel-card">
              <h3 className="text-sm font-medium mb-2">{d.filename}</h3>
              <p className="text-xs text-muted mb-2">
                {d.chunks} chunks{d.doc_type && ` -- ${d.doc_type}`}
              </p>
              {d.summary && (
                <p className="text-xs text-muted leading-relaxed">
                  {d.summary}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
