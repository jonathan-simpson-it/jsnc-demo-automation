"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchDocumentList,
  uploadDocument,
  fetchClients,
  createClient,
  deleteClient,
  fetchProjects,
  createProject,
  deleteProject,
  fetchTags,
  createTag,
  assignDocument,
  addDocumentTag,
  removeDocumentTag,
  reindexDocument,
  deleteDocument,
  documentDownloadUrl,
  fetchOneDriveStatus,
  fetchOneDriveFiles,
  importFromOneDrive,
  connectOneDrive,
} from "@/lib/api";
import type {
  Client,
  DocumentInfo,
  OneDriveFile,
  Project,
  Tag,
} from "@/lib/types";

type Tab = "local" | "onedrive";

/* ================= Helpers ================= */

function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s || "na";
}

/** Display label for the per-project RAG namespace, e.g. "acme_series_a". */
function namespaceLabel(clientName: string | null, projectName: string): string {
  return clientName
    ? `${slugify(clientName)}_${slugify(projectName)}`
    : slugify(projectName);
}

function fileExt(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1).toUpperCase() : "FILE";
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusOf(doc: DocumentInfo): { label: string; color: string } {
  if (doc.chunks > 0) return { label: "Vectorized", color: "var(--color-accent)" };
  return { label: "Processing", color: "var(--color-muted)" };
}

/* ================= Icons (inline, project-consistent) ================= */

type IconProps = { size?: number; color?: string };

function ChevronIcon({ size = 14, color = "var(--color-muted)" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function FolderIcon({ size = 18, color = "var(--color-accent)" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

function FileIcon({ size = 18, color = "var(--color-accent)" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

function LockIcon({ size = 13, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function PlusIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function TrashIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function DownloadIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  );
}

function RefreshIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

/* ================= Small building blocks ================= */

const labelStyle: React.CSSProperties = {
  fontSize: "0.68rem",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-muted)",
};

function CountBadge({ n }: { n: number }) {
  return (
    <span
      style={{
        marginLeft: "auto",
        fontSize: "0.66rem",
        color: "var(--color-muted)",
        background: "var(--color-bg)",
        border: "1px solid var(--color-line)",
        borderRadius: 999,
        padding: "0.05rem 0.5rem",
        flexShrink: 0,
      }}
    >
      {n}
    </span>
  );
}

function NsChip({ ns }: { ns: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        background: "var(--color-accent-soft)",
        border: "1px solid var(--color-line)",
        borderRadius: 999,
        padding: "0.25rem 0.8rem",
        fontSize: "0.7rem",
        color: "var(--color-ink)",
        whiteSpace: "nowrap",
      }}
    >
      <LockIcon size={12} color="var(--color-accent)" />
      <span>
        Isolated RAG namespace:{" "}
        <code style={{ fontSize: "0.68rem", background: "transparent", padding: 0 }}>
          {ns}
        </code>
      </span>
    </span>
  );
}

/* ================= Page ================= */

export default function DocumentsPage() {
  // Data
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [allDocs, setAllDocs] = useState<DocumentInfo[]>([]); // counts only
  const [docs, setDocs] = useState<DocumentInfo[]>([]); // active scope

  // Tree + scope
  const [expanded, setExpanded] = useState<number[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const didInitExpand = useRef(false);

  // Source tabs
  const [activeTab, setActiveTab] = useState<Tab>("local");
  const [odConnected, setOdConnected] = useState(false);
  const [odFiles, setOdFiles] = useState<OneDriveFile[]>([]);
  const [odPath, setOdPath] = useState("/");
  const [odLoading, setOdLoading] = useState(false);

  // Live per-file import rows (same treatment as local uploads below).
  const [odImports, setOdImports] = useState<
    { fileId: string; filename: string; status: string; message?: string }[]
  >([]);
  const odImportingIds = new Set(
    odImports.filter((r) => r.status === "importing").map((r) => r.fileId),
  );

  // Upload
  const [uploads, setUploads] = useState<
    { filename: string; status: string; message?: string; progress?: number }[]
  >([]);
  const [dragOver, setDragOver] = useState(false);
  const [busyDocId, setBusyDocId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploading = uploads.some((u) => u.status === "uploading");
  const uploadingFile = uploads.find((u) => u.status === "uploading")?.filename;
  // Queue progress (the list IS the active batch — handleFiles resets it).
  const queueTotal = uploads.length;
  const queueDone = uploads.filter(
    (u) => u.status !== "queued" && u.status !== "uploading",
  ).length;
  const queueActiveIdx = uploads.findIndex((u) => u.status === "uploading");
  const queueActivePct =
    queueActiveIdx >= 0 ? (uploads[queueActiveIdx]?.progress ?? 0) : 0;
  // Overall % = rows already finished plus the active row's own live progress,
  // so the top bar moves as bytes stream / chunks land instead of jumping in
  // whole-file steps.
  const queuePct =
    queueTotal > 0
      ? Math.round((queueDone + queueActivePct / 100) / queueTotal * 100)
      : 0;
  // Transient success/partial flash shown on the dropzone after a batch.
  const [flash, setFlash] = useState<{ ok: boolean; label: string } | null>(
    null,
  );
  const [flashLeaving, setFlashLeaving] = useState(false);
  const flashTimer = useRef<number | null>(null);
  // Per-row estimator tickers that keep the bar moving while the server
  // embeds (no event arrives between "bytes sent" and "response headers").
  const estTimers = useRef<number[]>([]);
  // Highest REAL progress (from XHR events) seen per row of the active batch,
  // so the estimator only nudges the bar after the send phase has actually
  // finished instead of racing ahead of the byte counters.
  const uploadRealPct = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      if (flashTimer.current != null) window.clearTimeout(flashTimer.current);
      estTimers.current.forEach((t) => window.clearInterval(t));
    };
  }, []);
  // Page-level drag tracking: dragenter/dragleave fire for every element
  // boundary crossed (they don't bubble), so a depth counter tells us whether
  // a file drag is still over the window.
  const dragDepth = useRef(0);
  const handleFilesRef = useRef<(files: FileList | File[]) => void>(
    () => undefined,
  );

  // Inline creation
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newProjectFor, setNewProjectFor] = useState<number | "none" | null>(
    null,
  );
  const [newProjectName, setNewProjectName] = useState("");
  const projectInputRef = useRef<HTMLInputElement>(null);
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  // Assign (move) modal
  const [assignDoc, setAssignDoc] = useState<DocumentInfo | null>(null);
  const [assignProjectId, setAssignProjectId] = useState<number | "">("");
  const assignRef = useRef<HTMLDivElement>(null);

  const activeProject =
    projects.find((p) => p.id === activeProjectId) ?? null;
  const activeClient = activeProject
    ? clients.find((c) => c.id === activeProject.client_id) ?? null
    : null;
  const activeNs = activeProject
    ? namespaceLabel(
        activeClient?.name ?? null,
        activeProject.name,
      )
    : null;

  // Counts across all documents (for sidebar badges)
  const countByProject = useCallback(() => {
    const m = new Map<number | null, number>();
    for (const d of allDocs) {
      const k = d.project_id ?? null;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [allDocs]);
  const counts = countByProject();
  const countByClient = useCallback(() => {
    const m = new Map<number | null, number>();
    for (const d of allDocs) {
      const k = d.client_id ?? null;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [allDocs]);
  const clientCounts = countByClient();

  const totalChunks = docs.reduce((s, d) => s + (d.chunks || 0), 0);

  /* ---- Loading ---- */

  const bump = useCallback(() => setRefreshTick((t) => t + 1), []);

  const loadBase = useCallback(async () => {
    try {
      const [cr, pr, tr, dr] = await Promise.all([
        fetchClients(),
        fetchProjects(),
        fetchTags(),
        fetchDocumentList(),
      ]);
      setClients(cr.clients);
      setProjects(pr.projects);
      setTags(tr.tags);
      setAllDocs(dr.documents);
    } catch {
      /* backend offline: leave empty states visible */
    }
  }, []);

  useEffect(() => {
    loadBase();
  }, [loadBase, refreshTick]);

  // Expand every client the first time the list arrives
  useEffect(() => {
    if (!didInitExpand.current && clients.length > 0) {
      didInitExpand.current = true;
      setExpanded(clients.map((c) => c.id));
    }
  }, [clients]);

  // Drop the scope if its project disappears after a delete
  useEffect(() => {
    if (
      activeProjectId != null &&
      !projects.some((p) => p.id === activeProjectId)
    ) {
      setActiveProjectId(null);
    }
  }, [projects, activeProjectId]);

  // Scope-scoped document list (strict project + optional tag filter)
  useEffect(() => {
    let alive = true;
    if (activeProjectId == null) {
      setDocs([]);
      return () => {
        alive = false;
      };
    }
    const params: { project_id: number; tag_id?: number } = {
      project_id: activeProjectId,
    };
    if (selectedTagId != null) params.tag_id = selectedTagId;
    fetchDocumentList(params)
      .then((r) => {
        if (alive) setDocs(r.documents);
      })
      .catch(() => {
        if (alive) setDocs([]);
      });
    return () => {
      alive = false;
    };
  }, [activeProjectId, selectedTagId, refreshTick]);

  useEffect(() => {
    fetchOneDriveStatus()
      .then((s) => setOdConnected(s.connected))
      .catch(() => {});
  }, []);

  /* ---- Modal: focus, Escape to close ---- */

  useEffect(() => {
    if (!assignDoc) return;
    setAssignProjectId(assignDoc.project_id ?? "");
    assignRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAssignDoc(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [assignDoc]);

  useEffect(() => {
    if (newProjectFor != null && newProjectFor !== "none") {
      projectInputRef.current?.focus();
    }
  }, [newProjectFor]);

  /* ---- Selection & tree ---- */

  function selectProject(id: number) {
    setActiveProjectId(id);
    setSelectedTagId(null);
    setUploads([]);
  }

  function toggleClient(id: number) {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  /* ---- Uploads (strictly project-scoped) ---- */

  async function handleFiles(files: FileList | File[]) {
    if (activeProjectId == null) return;
    const names = Array.from(files);
    if (names.length === 0) return;
    const outcomes: boolean[] = [];
    // A new batch supersedes any lingering success flash and resets the
    // queue display (rows keep their final status until the next batch).
    if (flashTimer.current != null) window.clearTimeout(flashTimer.current);
    setFlash(null);
    setFlashLeaving(false);
    setUploads(names.map((f) => ({ filename: f.name, status: "queued" })));
    uploadRealPct.current = new Array(names.length).fill(0);
    estTimers.current.forEach((t) => window.clearInterval(t));
    estTimers.current = [];

    for (let i = 0; i < names.length; i += 1) {
      const file = names[i];
      // This batch's rows are in the exact order of `names`, so updating by
      // index (not filename) stays correct even with duplicate names.
      setUploads((p) =>
        p.map((u, j) => (j === i ? { ...u, status: "uploading" } : u)),
      );
      // Tiny estimator: real XHR events cover sending the bytes (0..~40) and
      // the tail end of the response (88..100), but between "body fully sent"
      // and "response headers received" the server is embedding/vectorizing
      // with zero network events. Ease the bar asymptotically through that
      // gap (never reaching 88, the next real milestone) so it keeps moving.
      const ticker = window.setInterval(() => {
        const real = uploadRealPct.current[i] ?? 0;
        if (real < 40) return; // send events still reporting live — stand back
        setUploads((p) =>
          p.map((u, j) => {
            if (j !== i || u.status !== "uploading") return u;
            const cur = Math.max(u.progress ?? 0, real);
            const next = Math.min(cur + (87 - cur) * 0.06 + 0.25, 87);
            return { ...u, progress: next };
          }),
        );
      }, 160);
      estTimers.current.push(ticker);
      try {
        const r = await uploadDocument(
          file,
          activeProject?.client_id ?? null,
          activeProjectId,
          (p) => {
            // Genuine XHR progress (send / headers-received / body) always
            // wins over the estimator: record the real value and write it
            // straight into the row.
            uploadRealPct.current[i] = Math.max(
              uploadRealPct.current[i] ?? 0,
              p.percent,
            );
            setUploads((prev) =>
              prev.map((u, j) =>
                j === i ? { ...u, progress: p.percent } : u,
              ),
            );
          },
        );
        const ok = r.chunks_ingested > 0;
        outcomes.push(ok);
        window.clearInterval(ticker);
        setUploads((p) =>
          p.map((u, j) =>
            j === i
              ? {
                  filename: file.name,
                  status: ok ? "success" : "partial",
                  progress: 100,
                  message: ok
                    ? `${r.chunks_ingested} chunks ingested`
                    : "file saved but no text could be vectorized",
                }
              : u,
          ),
        );
      } catch (err: unknown) {
        outcomes.push(false);
        window.clearInterval(ticker);
        setUploads((p) =>
          p.map((u, j) =>
            j === i
              ? {
                  filename: file.name,
                  status: "error",
                  progress: 100,
                  message:
                    err instanceof Error ? err.message : "Upload failed",
                }
              : u,
          ),
        );
      }
    }
    // No live tickers past the end of the batch.
    estTimers.current.forEach((t) => window.clearInterval(t));
    estTimers.current = [];
    bump();

    if (outcomes.length === 0) return;
    const okCount = outcomes.filter(Boolean).length;
    const allOk = okCount === outcomes.length;
    setFlash({
      ok: allOk,
      label: allOk
        ? outcomes.length > 1
          ? `${outcomes.length} files uploaded`
          : "Upload complete"
        : `${okCount} of ${outcomes.length} uploaded`,
    });
    setFlashLeaving(false);
    window.setTimeout(() => setFlashLeaving(true), 1900);
    flashTimer.current = window.setTimeout(() => {
      setFlash(null);
      setFlashLeaving(false);
      flashTimer.current = null;
    }, 2450);
  }
  // Keep the page-level drop layer calling the freshest upload handler.
  handleFilesRef.current = handleFiles;

  /* ---- Page-level drag & drop ----
     Dropping a file ANYWHERE on the page routes to the selected project's
     upload (Local tab) instead of only over the small dropzone, and the
     dropzone highlight syncs to any in-flight file drag. dragenter/dragleave
     don't bubble, so we listen in the capture phase and count depth; dragover
     and drop bubble, so plain window listeners suffice for those.
  ------------------------------------------------------------------------ */
  useEffect(() => {
    const canUpload =
      activeTab === "local" &&
      activeProjectId != null &&
      !uploading &&
      assignDoc == null;

    const isFileDrag = (e: DragEvent) =>
      !!e.dataTransfer &&
      Array.from(e.dataTransfer.types).includes("Files");

    const onDragEnter = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      dragDepth.current += 1;
      setDragOver(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      // Always cancel the default so the browser never shows the forbidden-
      // drop cursor or tries to navigate when released outside the dropzone.
      e.preventDefault();
      e.dataTransfer!.dropEffect = canUpload ? "copy" : "none";
      setDragOver(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragOver(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragOver(false);
      if (!canUpload) return;
      handleFilesRef.current(e.dataTransfer!.files);
    };

    window.addEventListener("dragenter", onDragEnter, true);
    window.addEventListener("dragleave", onDragLeave, true);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter, true);
      window.removeEventListener("dragleave", onDragLeave, true);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [activeProjectId, activeTab, uploading, assignDoc]);

  /* ---- OneDrive (imports scoped to active project) ---- */

  async function loadOdFiles(path: string) {
    setOdLoading(true);
    try {
      const r = await fetchOneDriveFiles(path);
      setOdFiles(r.files);
      setOdPath(r.path);
    } catch {
      setOdFiles([]);
    } finally {
      setOdLoading(false);
    }
  }

  async function handleOdImport(file: OneDriveFile) {
    if (activeProjectId == null) return;
    if (odImportingIds.has(file.id)) return; // already importing
    setOdImports((prev) => [
      ...prev,
      { fileId: file.id, filename: file.name, status: "importing" },
    ]);
    try {
      const res = await importFromOneDrive(
        file.id,
        file.name,
        activeProject?.client_id ?? null,
        activeProjectId,
      );
      const chunks = res?.chunks_ingested ?? 0;
      setOdImports((prev) =>
        prev.map((row) =>
          row.fileId === file.id && row.status === "importing"
            ? {
                ...row,
                status: "success",
                message: `${chunks} chunk${chunks !== 1 ? "s" : ""} ingested`,
              }
            : row,
        ),
      );
      bump();
    } catch (err: unknown) {
      const detail =
        err instanceof Error ? err.message.replace(/^Import \d+:?\s*/i, "") : "";
      setOdImports((prev) =>
        prev.map((row) =>
          row.fileId === file.id && row.status === "importing"
            ? {
                ...row,
                status: "error",
                message: `Import failed${detail ? `: ${detail}` : ""}`.slice(0, 140),
              }
            : row,
        ),
      );
    }
  }

  /* ---- Client / Project CRUD ---- */

  async function handleCreateClient() {
    if (!newClientName.trim()) return;
    await createClient(newClientName.trim());
    setNewClientName("");
    setShowNewClient(false);
    bump();
  }

  async function handleCreateProject() {
    if (!newProjectName.trim()) return;
    const clientId = newProjectFor === "none" ? null : newProjectFor;
    const created = await createProject(newProjectName.trim(), clientId);
    setNewProjectName("");
    setNewProjectFor(null);
    const parentId = created.client_id;
    if (parentId != null) {
      setExpanded((prev) =>
        prev.includes(parentId) ? prev : [...prev, parentId],
      );
    }
    setActiveProjectId(created.id);
    bump();
  }

  async function handleDeleteClient(client: Client) {
    if (
      window.confirm(
        `Delete client "${client.name}"? Its projects and documents keep their records but lose the client link.`,
      )
    ) {
      try {
        await deleteClient(client.id);
        bump();
      } catch {
        /* skip */
      }
    }
  }

  async function handleDeleteProject(project: Project) {
    if (
      window.confirm(
        `Delete project "${project.name}"? Documents assigned to it are removed from its isolated RAG namespace but their files stay on disk.`,
      )
    ) {
      try {
        await deleteProject(project.id);
        bump();
      } catch {
        /* skip */
      }
    }
  }

  /* ---- Tags ---- */

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (!name) return;
    await createTag(name);
    setNewTagName("");
    setShowNewTag(false);
    bump();
  }

  async function handleTagDoc(docId: number, tagId: number) {
    await addDocumentTag(docId, tagId);
    bump();
  }

  async function handleUntagDoc(docId: number, tagId: number) {
    await removeDocumentTag(docId, tagId);
    bump();
  }

  /* ---- Document row actions ---- */

  async function handleReindex(doc: DocumentInfo) {
    if (!doc.id) return;
    setBusyDocId(doc.id);
    try {
      await reindexDocument(doc.id);
    } catch {
      window.alert("Re-indexing failed — the source file may be missing.");
    } finally {
      setBusyDocId(null);
      bump();
    }
  }

  async function handleDeleteDoc(doc: DocumentInfo) {
    if (!doc.id) return;
    if (
      !window.confirm(
        `Delete "${doc.filename}" from the knowledge base? Its vector chunks and record are removed.`,
      )
    ) {
      return;
    }
    setBusyDocId(doc.id);
    try {
      await deleteDocument(doc.id);
    } finally {
      setBusyDocId(null);
      bump();
    }
  }

  async function handleAssign(doc: DocumentInfo) {
    if (!doc.id) return;
    const project =
      assignProjectId !== ""
        ? projects.find((p) => p.id === Number(assignProjectId)) ?? null
        : null;
    await assignDocument(doc.id, project?.client_id ?? null, project?.id ?? null);
    setAssignDoc(null);
    bump();
  }

  /* ---- Derived tree data ---- */

  const byClient = useCallback(
    (clientId: number | null): Project[] =>
      projects
        .filter((p) => (p.client_id ?? null) === clientId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [projects],
  );

  const sortedClients = [...clients].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const unassigned = byClient(null);
  const tagFilterOptions = tags.filter((t) =>
    docs.some((d) => d.tags?.some((dt) => dt.id === t.id)),
  );

  /* ---- Render helpers ---- */

  function renderClientRow(client: Client) {
    const isOpen = expanded.includes(client.id);
    const count = clientCounts.get(client.id) ?? 0;
    return (
      <div key={client.id}>
        <div
          className="doc-tree-row"
          style={{ padding: "0.05rem 0" }}
        >
          <button
            type="button"
            className="doc-tree-main"
            onClick={() => toggleClient(client.id)}
            aria-expanded={isOpen}
            aria-label={`${client.name} — ${count} documents`}
          >
            <ChevronIcon
              size={13}
              color={isOpen ? "var(--color-ink)" : "var(--color-muted)"}
            />
            <span style={{ display: "grid", placeItems: "center", flexShrink: 0 }}>
              <FolderIcon size={15} />
            </span>
            <span
              style={{
                fontWeight: 500,
                fontSize: "0.82rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {client.name}
            </span>
            <CountBadge n={count} />
          </button>
          <button
            type="button"
            className="doc-tree-act"
            title={`Add project under ${client.name}`}
            aria-label={`Add project under ${client.name}`}
            onClick={() => {
              setNewProjectFor(client.id);
              setNewProjectName("");
            }}
          >
            <PlusIcon size={13} />
          </button>
          <button
            type="button"
            className="doc-tree-act doc-tree-act--danger"
            title={`Delete client ${client.name}`}
            aria-label={`Delete client ${client.name}`}
            onClick={() => handleDeleteClient(client)}
          >
            <TrashIcon size={13} />
          </button>
        </div>

        {newProjectFor === client.id && (
          <div
            style={{
              display: "flex",
              gap: "0.3rem",
              padding: "0.25rem 0.5rem 0.5rem 1.7rem",
            }}
          >
            <input
              ref={projectInputRef}
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
              onBlur={() => setNewProjectFor(null)}
              placeholder="New project name"
              aria-label={`Project name for ${client.name}`}
              className="input"
              style={{ fontSize: "0.76rem", padding: "0.3rem 0.5rem", flex: 1 }}
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreateProject}
              className="button button--solid button--small"
              style={{ minHeight: "1.9rem", padding: "0 0.7rem", fontSize: "0.66rem" }}
            >
              Add
            </button>
          </div>
        )}

        {isOpen &&
          byClient(client.id).map((p) => renderProjectRow(p, client))}
        {isOpen && byClient(client.id).length === 0 && (
          <div
            style={{
              padding: "0.2rem 0.5rem 0.5rem 1.7rem",
              fontSize: "0.7rem",
              color: "var(--color-muted)",
            }}
          >
            No projects yet — click + to create one.
          </div>
        )}
      </div>
    );
  }

  function renderProjectRow(project: Project, client: Client | null) {
    const count = counts.get(project.id) ?? 0;
    const isActive = activeProjectId === project.id;
    const ns = namespaceLabel(client?.name ?? null, project.name);
    return (
      <div key={project.id}>
        <div
          className={`doc-tree-row${isActive ? " is-active" : ""}`}
          style={{ padding: "0.05rem 0" }}
        >
          <button
            type="button"
            className="doc-tree-main"
            style={{ paddingLeft: "1.7rem" }}
            onClick={() => selectProject(project.id)}
            aria-pressed={isActive}
            aria-label={`${project.name} — ${count} documents`}
          >
            <span style={{ color: "var(--color-accent)", display: "inline-flex" }}>
              <LockIcon size={12} />
            </span>
            <span
              style={{
                fontSize: "0.8rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {project.name}
            </span>
            <span
              style={{
                fontSize: "0.64rem",
                color: "var(--color-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "7rem",
              }}
              title={`namespace: ${ns}`}
            >
              {ns}
            </span>
            <CountBadge n={count} />
          </button>
          <button
            type="button"
            className="doc-tree-act doc-tree-act--danger"
            title={`Delete project ${project.name}`}
            aria-label={`Delete project ${project.name}`}
            onClick={() => handleDeleteProject(project)}
          >
            <TrashIcon size={13} />
          </button>
        </div>
      </div>
    );
  }

  /* ---- Render ---- */

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 3.5rem)" }}>
      {/* ============ Sidebar: Client -> Project tree ============ */}
      <aside
        style={{
          width: "17.5rem",
          flexShrink: 0,
          borderRight: "1px solid var(--color-line)",
          background: "var(--color-surface)",
          padding: "1.25rem 0.75rem",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 0.4rem 0.6rem",
          }}
        >
          <h4 style={{ ...labelStyle, margin: 0 }}>Workspaces</h4>
          <button
            type="button"
            onClick={() => setShowNewClient((v) => !v)}
            aria-expanded={showNewClient}
            aria-label={showNewClient ? "Hide new client form" : "Add client"}
            className="doc-tree-act"
            style={{ opacity: 1 }}
          >
            <PlusIcon size={14} />
          </button>
        </div>

        {showNewClient && (
          <div
            style={{
              display: "flex",
              gap: "0.3rem",
              padding: "0 0.4rem 0.6rem",
            }}
          >
            <input
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateClient()}
              placeholder="Client name"
              aria-label="New client name"
              className="input"
              style={{ fontSize: "0.78rem", padding: "0.35rem 0.5rem", flex: 1 }}
            />
            <button
              type="button"
              onClick={handleCreateClient}
              className="button button--solid button--small"
              style={{ minHeight: "2rem", padding: "0 0.7rem", fontSize: "0.66rem" }}
            >
              Add
            </button>
          </div>
        )}

        <div style={{ display: "grid", gap: "0.15rem" }}>
          {sortedClients.map(renderClientRow)}
        </div>

        {/* Unassigned projects */}
        {unassigned.length > 0 && (
          <>
            <div
              style={{
                margin: "1rem 0 0.35rem",
                padding: "0 0.4rem",
                fontSize: "0.68rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-muted)",
              }}
            >
              No client
            </div>
            {unassigned.map((p) => renderProjectRow(p, null))}
          </>
        )}

        {/* Add an unassigned (client-less) project */}
        <div style={{ padding: "0.75rem 0.4rem 0" }}>
          {newProjectFor === "none" ? (
            <div style={{ display: "flex", gap: "0.3rem" }}>
              <input
                ref={projectInputRef}
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                onBlur={() => setNewProjectFor(null)}
                placeholder="Project name"
                aria-label="New project name"
                className="input"
                style={{ fontSize: "0.76rem", padding: "0.3rem 0.5rem", flex: 1 }}
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCreateProject}
                className="button button--solid button--small"
                style={{ minHeight: "1.9rem", padding: "0 0.7rem", fontSize: "0.66rem" }}
              >
                Add
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNewProjectFor("none");
                setNewProjectName("");
              }}
              className="doc-tree-main"
              style={{
                color: "var(--color-muted)",
                fontSize: "0.76rem",
                gap: "0.4rem",
                paddingLeft: "0.4rem",
              }}
            >
              <PlusIcon size={12} />
              Add project without a client
            </button>
          )}
        </div>

        <p
          style={{
            fontSize: "0.68rem",
            color: "var(--color-muted)",
            lineHeight: 1.5,
            borderTop: "1px solid var(--color-line)",
            margin: "1rem 0.4rem 0",
            paddingTop: "0.75rem",
          }}
        >
          Clients group projects; documents are ingested and retrieved strictly
          inside the selected project&apos;s namespace.
        </p>
      </aside>

      {/* ============ Main panel ============ */}
      <div style={{ flex: 1, padding: "1.5rem 2rem 2.5rem", overflowY: "auto" }}>
        {/* Scope header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
            flexWrap: "wrap",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <span className="section-eyebrow">Documents</span>
            {activeProject && activeClient ? (
              <>
                <h1
                  style={{
                    fontSize: "clamp(1.4rem, 3.8vw, 2rem)",
                    fontFamily: "var(--font-display)",
                    fontWeight: 400,
                    lineHeight: 1.15,
                    letterSpacing: "-0.01em",
                    margin: 0,
                  }}
                >
                  {activeClient.name}{" "}
                  <span style={{ color: "var(--color-muted)" }}>/</span>{" "}
                  {activeProject.name}
                </h1>
                <p style={{ color: "var(--color-muted)", fontSize: "0.86rem", margin: "0.35rem 0 0" }}>
                  {docs.length} document{docs.length !== 1 ? "s" : ""} ·{" "}
                  {totalChunks} vectorized chunk{totalChunks !== 1 ? "s" : ""}
                </p>
              </>
            ) : (
              <>
                <h1
                  style={{
                    fontSize: "clamp(1.4rem, 3.8vw, 2rem)",
                    fontFamily: "var(--font-display)",
                    fontWeight: 400,
                    lineHeight: 1.15,
                    letterSpacing: "-0.01em",
                    margin: 0,
                  }}
                >
                  Knowledge base
                </h1>
                <p style={{ color: "var(--color-muted)", fontSize: "0.86rem", margin: "0.35rem 0 0" }}>
                  {allDocs.length} document{allDocs.length !== 1 ? "s" : ""} across{" "}
                  {projects.length} project{projects.length !== 1 ? "s" : ""}
                </p>
              </>
            )}
          </div>

          {/* Source toggle */}
          <div style={{ display: "flex", gap: "0.3rem", flexShrink: 0 }}>
            {(["local", "onedrive"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setActiveTab(t);
                  if (t === "onedrive" && odConnected) loadOdFiles("/");
                }}
                className={`button button--small ${
                  activeTab === t ? "button--solid" : "button--ghost"
                }`}
                aria-pressed={activeTab === t}
              >
                {t === "local" ? "Local" : "OneDrive"}
              </button>
            ))}
          </div>
        </div>

        {/* Active scope isolation banner / guarded state */}
        {activeProject ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
              border: "1px solid var(--color-line)",
              borderRadius: "var(--radius-lg)",
              background: "var(--color-surface)",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
            }}
          >
            <span style={{ fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 600 }}>
              Active workspace
            </span>
            <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
              {activeClient ? `Client: ${activeClient.name}` : "Client: —"}
              <span style={{ color: "var(--color-muted)" }}> / </span>
              Project: {activeProject.name}
            </span>
            {activeNs && <NsChip ns={activeNs} />}
          </div>
        ) : (
          <div
            style={{
              border: "1px dashed var(--color-line)",
              borderRadius: "var(--radius-lg)",
              background: "var(--color-surface)",
              padding: "1.1rem 1.25rem",
              marginBottom: "1.25rem",
              display: "flex",
              gap: "0.9rem",
              alignItems: "flex-start",
            }}
          >
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: "2.2rem",
                height: "2.2rem",
                borderRadius: 999,
                background: "var(--color-accent-soft)",
                color: "var(--color-accent)",
                flexShrink: 0,
              }}
            >
              <LockIcon size={16} />
            </span>
            <div>
              <p style={{ margin: 0, fontSize: "0.92rem", fontWeight: 500 }}>
                Select a project to manage its documents.
              </p>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "var(--color-muted)", maxWidth: "34rem" }}>
                Workspaces are isolated per project: uploads, imports, and RAG
                retrieval stay inside the project you pick in the sidebar. Expand
                a client to reveal its projects.
              </p>
            </div>
          </div>
        )}

        {/* ---------- Local uploads ---------- */}
        {activeTab === "local" && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.md,.docx,.xlsx"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              aria-label="Upload PDF, TXT, MD, DOCX, or XLSX files"
              disabled={activeProjectId == null}
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
              disabled={activeProjectId == null || uploading}
              onClick={() => {
                if (activeProjectId != null && !uploading) inputRef.current?.click();
              }}
              onDragOver={(e) => {
                // Always cancel the browser default so dragging over the zone
                // never shows the forbidden-drop cursor.
                e.preventDefault();
                e.stopPropagation();
                if (activeProjectId == null || uploading) {
                  // No upload target (or one already in flight): keep the
                  // native "can't drop" cue but swallow the event so the page
                  // never navigates to the file.
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
                // Leave the dropzone lit while a file drag is still anywhere
                // in the window — the window-level depth counter owns when the
                // drag actually ends and clears the highlight.
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                dragDepth.current = 0;
                setDragOver(false);
                if (activeProjectId == null || uploading) return;
                handleFiles(e.dataTransfer.files);
              }}
              aria-describedby="upload-hint"
              className="flex w-full flex-col items-center justify-center gap-1.5 text-center"
              style={{
                width: "100%",
                minHeight: 180,
                border: `2px dashed ${
                  activeProjectId == null || uploading
                    ? "var(--color-line)"
                    : dragOver
                      ? "var(--color-accent)"
                      : "var(--color-line)"
                }`,
                background: activeProjectId == null || uploading
                  ? "var(--color-surface)"
                  : dragOver
                    ? "var(--color-accent-soft)"
                    : "var(--color-surface)",
                borderRadius: "var(--radius-lg)",
                padding: "2rem",
                textAlign: "center",
                cursor:
                  activeProjectId == null
                    ? "not-allowed"
                    : uploading
                      ? "default"
                      : "pointer",
                transition: "all 220ms ease",
                marginBottom: "0.75rem",
                opacity: activeProjectId == null ? 0.75 : 1,
              }}
            >
              {uploading ? (
                <span
                  className="flex items-center justify-center gap-2"
                  style={{ color: "var(--color-ink)" }}
                >
                  <span
                    className="streaming-dots"
                    style={{ padding: 0 }}
                    aria-hidden="true"
                  >
                    <span />
                    <span />
                    <span />
                  </span>
                  <span
                    style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-ink)" }}
                  >
                    Uploading {uploadingFile}…
                  </span>
                </span>
              ) : flash ? (
                <span
                  role="status"
                  className="flex flex-col items-center justify-center"
                  style={{
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
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: flash.ok ? "var(--color-accent)" : "var(--color-muted)",
                    }}
                  >
                    {flash.label}
                  </span>
                </span>
              ) : (
                <>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      margin: 0,
                      color: "var(--color-ink)",
                    }}
                  >
                    Drop files here or click to upload
                  </p>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-muted)",
                      margin: 0,
                    }}
                  >
                    PDF, TXT, MD, DOCX, XLSX
                  </p>
                </>
              )}
            </button>

            <p
              id="upload-hint"
              style={{
                fontSize: "0.74rem",
                color: "var(--color-muted)",
                margin: 0,
                textAlign: "center",
              }}
            >
              {activeProject
                ? `Target: ${activeProject.name}${activeNs ? ` · ${activeNs}` : ""}`
                : "Select or create a project to ingest documents into an isolated space."}
            </p>

            {uploads.length > 0 && (
              <div style={{ marginBottom: "1.25rem" }}>
                {/* Queue progress bar */}
                <div style={{ marginBottom: "0.5rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: "0.75rem",
                      fontSize: "0.74rem",
                      color: "var(--color-muted)",
                      marginBottom: "0.3rem",
                    }}
                  >
                    <span>
                      {queueActiveIdx >= 0
                        ? `Uploading file ${queueActiveIdx + 1} of ${queueTotal} · ${Math.round(queueActivePct)}%`
                        : queueDone === queueTotal
                          ? `${queueDone} file${queueDone !== 1 ? "s" : ""} uploaded`
                          : `Queued ${queueTotal - queueDone} file${queueTotal - queueDone !== 1 ? "s" : ""}`}
                    </span>
                    <span
                      style={{
                        fontWeight: 600,
                        color:
                          queueDone === queueTotal
                            ? "var(--color-accent)"
                            : "var(--color-ink)",
                      }}
                    >
                      {queuePct}%
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={queuePct}
                    style={{
                      height: "0.4rem",
                      borderRadius: "999px",
                      background: "var(--color-line)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${queuePct}%`,
                        borderRadius: "999px",
                        background: "var(--color-accent)",
                        transition: "width 300ms ease, background 300ms ease",
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {uploads.map((u, i) => {
                    const isActive = u.status === "uploading";
                    const isQueued = u.status === "queued";
                    const dotColor =
                      u.status === "success"
                        ? "var(--color-accent)"
                        : u.status === "partial"
                          ? "var(--color-muted)"
                          : u.status === "error"
                            ? "var(--color-error)"
                            : "var(--color-muted)";
                    const sub =
                      u.status === "queued"
                        ? "Waiting in queue…"
                        : u.status === "uploading"
                          ? `Uploading… ${Math.round(u.progress ?? 0)}%`
                          : (u.message ??
                            (u.status === "error" ? "Upload failed" : ""));
                    const statusColor =
                      u.status === "success"
                        ? "var(--color-accent)"
                        : u.status === "partial"
                          ? "var(--color-muted)"
                          : u.status === "error"
                            ? "var(--color-error)"
                            : u.status === "uploading"
                              ? "var(--color-accent)"
                              : "var(--color-muted)";
                    return (
                      <div
                        key={`${u.filename}-${i}`}
                        style={{
                          position: "relative",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.65rem",
                          background: isActive
                            ? "var(--color-accent-soft)"
                            : "var(--color-surface)",
                          border: `1px solid ${
                            isActive
                              ? "var(--color-accent)"
                              : "var(--color-line)"
                          }`,
                          borderRadius: "var(--radius-md)",
                          padding: "0.55rem 0.8rem",
                          fontSize: "0.82rem",
                          transition:
                            "border-color 200ms ease, background 200ms ease",
                        }}
                      >
                        <span
                          style={{
                            width: "1.4rem",
                            minWidth: "1.4rem",
                            height: "1.4rem",
                            borderRadius: "999px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.66rem",
                            fontWeight: 600,
                            color: isQueued
                              ? "var(--color-muted)"
                              : isActive
                                ? "var(--color-accent)"
                                : "var(--color-accent)",
                            background: "var(--color-bg)",
                            border: "1px solid var(--color-line)",
                            flexShrink: 0,
                          }}
                        >
                          {i + 1}
                        </span>
                        {isActive ? (
                          <span
                            className="streaming-dots"
                            style={{ padding: 0 }}
                            aria-hidden="true"
                          >
                            <span />
                            <span />
                            <span />
                          </span>
                        ) : (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              background: dotColor,
                              flexShrink: 0,
                              opacity: isQueued ? 0.55 : 1,
                            }}
                          />
                        )}
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            overflowWrap: "anywhere",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: isActive || isQueued ? 500 : 600,
                              color: "var(--color-ink)",
                            }}
                          >
                            {u.filename}
                          </span>
                          {sub && (
                            <span
                              style={{
                                display: "block",
                                fontSize: "0.76rem",
                                color:
                                  u.status === "error"
                                    ? "var(--color-error)"
                                    : u.status === "partial"
                                      ? "var(--color-muted)"
                                      : "var(--color-muted)",
                              }}
                            >
                              {sub}
                            </span>
                          )}
                        </span>
                        <span
                          style={{
                            fontSize: "0.66rem",
                            fontWeight: 600,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: statusColor,
                            flexShrink: 0,
                          }}
                        >
                          {isActive
                            ? `${Math.round(u.progress ?? 0)}%`
                            : u.status}
                        </span>
                        {isActive && (
                          <span
                            aria-hidden="true"
                            style={{
                              position: "absolute",
                              left: 0,
                              bottom: 0,
                              height: 3,
                              width: "100%",
                              background: "var(--color-line)",
                            }}
                          >
                            <span
                              style={{
                                display: "block",
                                height: "100%",
                                width: `${Math.min(
                                  100,
                                  Math.max(0, u.progress ?? 0),
                                )}%`,
                                background: "var(--color-accent)",
                                transition: "width 200ms linear",
                              }}
                            />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ---------- OneDrive ---------- */}
        {activeTab === "onedrive" && (
          <div style={{ marginBottom: "1.25rem" }}>
            {!odConnected ? (
              <div
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-line)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.75rem 2rem",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: "0.9rem", fontWeight: 500, margin: "0 0 0.5rem" }}>
                  Connect your OneDrive to import documents.
                </p>
                <p style={{ fontSize: "0.78rem", color: "var(--color-muted)", margin: "0 0 1rem" }}>
                  Requires a Microsoft account with Files.Read.All permission.
                </p>
                <button onClick={connectOneDrive} className="button button--solid">
                  Connect OneDrive
                </button>
              </div>
            ) : activeProjectId == null ? (
              <div
                style={{
                  background: "var(--color-surface)",
                  border: "1px dashed var(--color-line)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.25rem 1.5rem",
                  textAlign: "center",
                  color: "var(--color-muted)",
                  fontSize: "0.85rem",
                }}
              >
                Select a project from the sidebar before importing — files are
                ingested into that project&apos;s isolated RAG namespace.
              </div>
            ) : (
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    marginBottom: "0.8rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: "var(--color-accent)" }} />
                  <span style={{ fontSize: "0.82rem", color: "var(--color-muted)" }}>
                    OneDrive connected · importing into{" "}
                    <strong style={{ color: "var(--color-ink)" }}>{activeProject?.name}</strong>
                    {activeNs ? ` (${activeNs})` : ""}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-muted)", marginLeft: "auto" }}>
                    {odPath}
                  </span>
                </div>
                {odLoading ? (
                  <p style={{ color: "var(--color-muted)", fontSize: "0.85rem", padding: "1rem 0" }}>
                    Loading...
                  </p>
                ) : (
                  <div className="space-y-1">
                    {odPath !== "/" && (
                      <button
                        type="button"
                        onClick={() => {
                          const parent = odPath.split("/").slice(0, -1).join("/") || "/";
                          loadOdFiles(parent);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 0.75rem",
                          borderRadius: "var(--radius-md)",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          color: "var(--color-muted)",
                          width: "100%",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: "0.75rem" }}>&larr;</span> Back
                      </button>
                    )}
                    {odFiles.map((f) => (
                      <div
                        key={f.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          background: "var(--color-surface)",
                          border: "1px solid var(--color-line)",
                          borderRadius: "var(--radius-md)",
                          padding: "0.55rem 0.75rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.85rem",
                            width: "1.25rem",
                            textAlign: "center",
                            flexShrink: 0,
                            display: "inline-flex",
                            justifyContent: "center",
                          }}
                        >
                          {f.is_folder ? <FolderIcon /> : <FileIcon />}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            f.is_folder ? loadOdFiles(f.path + "/" + f.name) : handleOdImport(f)
                          }
                          style={{
                            flex: 1,
                            textAlign: "left",
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            color: "var(--color-ink)",
                            padding: 0,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {f.name}
                        </button>
                        {!f.is_folder && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOdImport(f)}
                              disabled={odImportingIds.has(f.id)}
                              className="button button--ghost button--small"
                              style={{ fontSize: "0.68rem", padding: "0.25rem 0.6rem", minHeight: "2rem" }}
                            >
                              {odImportingIds.has(f.id) ? "Importing..." : "Import"}
                            </button>
                            <span style={{ fontSize: "0.72rem", color: "var(--color-muted)", flexShrink: 0 }}>
                              {f.size > 1024 * 1024
                                ? `${(f.size / 1024 / 1024).toFixed(1)} MB`
                                : `${(f.size / 1024).toFixed(0)} KB`}
                            </span>
                          </>
                        )}
                      </div>
                    ))}
                    {odFiles.length === 0 && (
                      <p style={{ color: "var(--color-muted)", fontSize: "0.85rem", padding: "1rem 0" }}>
                        No files in this folder.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ---------- Live import status (per file) ---------- */}
            {odImports.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <h4
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--color-muted)",
                    margin: "0 0 0.6rem",
                  }}
                >
                  Import status
                </h4>
                <div className="space-y-2">
                  {odImports.map((row, i) => {
                    const isImporting = row.status === "importing";
                    const isError = row.status === "error";
                    const dotColor =
                      row.status === "success"
                        ? "var(--color-accent)"
                        : row.status === "error"
                          ? "var(--color-error)"
                          : "var(--color-muted)";
                    return (
                      <div
                        key={`${row.fileId}-${i}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.65rem",
                          background: isImporting
                            ? "var(--color-accent-soft)"
                            : "var(--color-surface)",
                          border: `1px solid ${
                            isImporting ? "var(--color-accent)" : "var(--color-line)"
                          }`,
                          borderRadius: "var(--radius-md)",
                          padding: "0.55rem 0.8rem",
                          fontSize: "0.82rem",
                        }}
                      >
                        <span
                          style={{
                            width: "1.4rem",
                            minWidth: "1.4rem",
                            height: "1.4rem",
                            borderRadius: "999px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.66rem",
                            fontWeight: 600,
                            color: isImporting
                              ? "var(--color-accent)"
                              : row.status === "success"
                                ? "var(--color-accent)"
                                : "var(--color-muted)",
                            background: "var(--color-bg)",
                            border: "1px solid var(--color-line)",
                            flexShrink: 0,
                          }}
                        >
                          {i + 1}
                        </span>
                        {isImporting ? (
                          <span
                            className="streaming-dots"
                            style={{ padding: 0 }}
                            aria-hidden="true"
                          >
                            <span />
                            <span />
                            <span />
                          </span>
                        ) : (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: dotColor, flexShrink: 0 }}
                          />
                        )}
                        <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                          <span
                            style={{
                              fontWeight: isImporting ? 500 : 600,
                              color: "var(--color-ink)",
                            }}
                          >
                            {row.filename}
                          </span>
                          {row.message && (
                            <span
                              style={{
                                display: "block",
                                fontSize: "0.76rem",
                                color: isError
                                  ? "var(--color-error)"
                                  : "var(--color-muted)",
                              }}
                            >
                              {row.message}
                            </span>
                          )}
                        </span>
                        <span
                          style={{
                            fontSize: "0.66rem",
                            fontWeight: 600,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: isImporting
                              ? "var(--color-accent)"
                              : isError
                                ? "var(--color-error)"
                                : "var(--color-accent)",
                            flexShrink: 0,
                          }}
                        >
                          {row.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------- Documents in active scope ---------- */}
        <div style={{ marginTop: "0.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
              marginBottom: "0.6rem",
            }}
          >
            <h4 style={{ ...labelStyle, margin: 0 }}>
              {activeProject ? `Documents in ${activeProject.name}` : "Documents"}
            </h4>

            {/* Tag filter (strictly scoped to current project list) */}
            {activeProject && docs.length > 0 && (
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setSelectedTagId(null)}
                  aria-pressed={selectedTagId == null}
                  className="agent-pill"
                  style={{
                    fontSize: "0.7rem",
                    padding: "0.2rem 0.7rem",
                    background: selectedTagId == null ? "var(--color-accent)" : "transparent",
                    color: selectedTagId == null ? "#fff" : undefined,
                  }}
                >
                  All tags
                </button>
                {tagFilterOptions.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTagId(selectedTagId === t.id ? null : t.id)}
                    aria-pressed={selectedTagId === t.id}
                    className="agent-pill"
                    style={{
                      fontSize: "0.7rem",
                      padding: "0.2rem 0.7rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      background:
                        selectedTagId === t.id ? "var(--color-accent)" : "transparent",
                      color: selectedTagId === t.id ? "#fff" : undefined,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: t.color, flexShrink: 0 }} />
                    {t.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowNewTag((v) => !v)}
                  className="agent-pill"
                  style={{ fontSize: "0.7rem", padding: "0.2rem 0.7rem" }}
                  aria-expanded={showNewTag}
                >
                  + New tag
                </button>
              </div>
            )}
          </div>

          {showNewTag && (
            <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.75rem", maxWidth: "20rem" }}>
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                placeholder="Tag name"
                aria-label="New tag name"
                className="input"
                style={{ fontSize: "0.8rem", padding: "0.35rem 0.6rem", flex: 1 }}
              />
              <button type="button" onClick={handleCreateTag} className="button button--solid button--small">
                Add
              </button>
            </div>
          )}

          {activeProjectId == null ? (
            <p style={{ color: "var(--color-muted)", fontSize: "0.86rem", padding: "2rem 0", textAlign: "center" }}>
              No workspace selected. Pick a project in the sidebar to view its
              documents.
            </p>
          ) : docs.length === 0 ? (
            <p style={{ color: "var(--color-muted)", fontSize: "0.86rem", padding: "2rem 0", textAlign: "center" }}>
              No documents in this project yet. Upload files above — they are
              ingested into the project&apos;s isolated RAG namespace.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: "56rem" }}>
                {/* Header row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(13rem, 2.2fr) 4.5rem 8rem 8.5rem minmax(9rem, 1.4fr) 11rem",
                    gap: "0.75rem",
                    alignItems: "center",
                    padding: "0.45rem 0.9rem",
                    borderBottom: "1px solid var(--color-line)",
                  }}
                >
                  {[
                    "Document",
                    "Type",
                    "Ingestion",
                    "Date added",
                    "Tags",
                    "Actions",
                  ].map((col) => (
                    <span key={col} style={labelStyle}>
                      {col}
                    </span>
                  ))}
                </div>

                {docs.map((d) => {
                  const status = statusOf(d);
                  const type = fileExt(d.filename);
                  const docTags = d.tags ?? [];
                  return (
                    <div
                      key={d.id ?? d.filename}
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(13rem, 2.2fr) 4.5rem 8rem 8.5rem minmax(9rem, 1.4fr) 11rem",
                        gap: "0.75rem",
                        alignItems: "center",
                        padding: "0.65rem 0.9rem",
                        borderBottom: "1px solid var(--color-line)",
                        background: "var(--color-surface)",
                        fontSize: "0.85rem",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={d.filename}
                        >
                          {d.filename}
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.15rem" }}>
                          {d.source === "onedrive" && (
                            <span className="chip" style={{ fontSize: "0.62rem", padding: "0 0.35rem" }}>
                              onedrive
                            </span>
                          )}
                          {d.client_name && d.project_name && (
                            <span style={{ fontSize: "0.68rem", color: "var(--color-muted)" }}>
                              {d.client_name} / {d.project_name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span
                          className="chip"
                          style={{ fontSize: "0.66rem", padding: "0.15rem 0.45rem" }}
                        >
                          {type}
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            fontSize: "0.78rem",
                            fontWeight: 500,
                            color:
                              status.label === "Vectorized"
                                ? "var(--color-ink)"
                                : "var(--color-muted)",
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: status.color, flexShrink: 0 }}
                          />
                          {status.label}
                        </span>
                        <span style={{ fontSize: "0.66rem", color: "var(--color-muted)" }}>
                          {d.chunks} chunk{d.chunks !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div style={{ fontSize: "0.76rem", color: "var(--color-muted)" }}>
                        {fmtDate(d.created_at)}
                      </div>

                      <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", alignItems: "center" }}>
                        {docTags.map((t) => (
                          <span
                            key={t.id}
                            className="chip"
                            style={{
                              fontSize: "0.62rem",
                              padding: "0.05rem 0.4rem",
                              background: t.color + "22",
                              borderColor: t.color + "40",
                            }}
                          >
                            {t.name}
                            <button
                              type="button"
                              onClick={() => d.id && handleUntagDoc(d.id, t.id)}
                              aria-label={`Remove tag ${t.name} from ${d.filename}`}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                marginLeft: "0.15rem",
                                fontSize: "0.6rem",
                                color: "var(--color-muted)",
                                padding: "0.15rem",
                              }}
                            >
                              x
                            </button>
                          </span>
                        ))}
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value && d.id) handleTagDoc(d.id, Number(e.target.value));
                          }}
                          aria-label={`Add tag to ${d.filename}`}
                          className="select"
                          style={{
                            fontSize: "0.66rem",
                            padding: "0.15rem 1.3rem 0.15rem 0.4rem",
                            minHeight: "1.6rem",
                          }}
                        >
                          <option value="">+ Tag</option>
                          {tags
                            .filter((t) => !docTags.some((dt) => dt.id === t.id))
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => d.id && setAssignDoc(d)}
                          className="button button--ghost button--small"
                          style={{ fontSize: "0.66rem", padding: "0.2rem 0.6rem", minHeight: "1.8rem" }}
                        >
                          Move
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReindex(d)}
                          disabled={busyDocId === d.id || !d.id}
                          title="Re-index from source file"
                          aria-label={`Re-index ${d.filename}`}
                          className="doc-tree-act"
                          style={{
                            opacity: 1,
                            width: "1.8rem",
                            height: "1.8rem",
                            border: "1px solid var(--color-line)",
                          }}
                        >
                          <RefreshIcon size={14} />
                        </button>
                        {d.id && (
                          <a
                            href={documentDownloadUrl(d.id)}
                            title="Download original file"
                            aria-label={`Download ${d.filename}`}
                            className="doc-tree-act"
                            style={{
                              opacity: 1,
                              width: "1.8rem",
                              height: "1.8rem",
                              border: "1px solid var(--color-line)",
                              textDecoration: "none",
                            }}
                          >
                            <DownloadIcon size={14} />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteDoc(d)}
                          disabled={busyDocId === d.id || !d.id}
                          title="Delete document"
                          aria-label={`Delete ${d.filename}`}
                          className="doc-tree-act doc-tree-act--danger"
                          style={{
                            opacity: 1,
                            width: "1.8rem",
                            height: "1.8rem",
                            border: "1px solid var(--color-line)",
                          }}
                        >
                          {busyDocId === d.id ? (
                            <span className="streaming-dots" style={{ padding: 0 }}>
                              <span style={{ width: "0.3rem", height: "0.3rem" }} />
                              <span style={{ width: "0.3rem", height: "0.3rem" }} />
                              <span style={{ width: "0.3rem", height: "0.3rem" }} />
                            </span>
                          ) : (
                            <TrashIcon size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Page-level drop overlay ---------- */}
      {dragOver && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.05)",
          }}
        >
          <div
            style={{
              border: "2px dashed var(--color-accent)",
              background: "var(--color-surface)",
              borderRadius: "var(--radius-lg)",
              padding: "1.35rem 2rem",
              maxWidth: "26rem",
              textAlign: "center",
            }}
          >
            {uploading ? (
              <>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    color: "var(--color-ink)",
                  }}
                >
                  Upload in progress
                </p>
                <p
                  style={{
                    margin: "0.3rem 0 0",
                    fontSize: "0.8rem",
                    color: "var(--color-muted)",
                  }}
                >
                  Drops are paused while {uploadingFile} finishes — you can add
                  more files as soon as it completes.
                </p>
              </>
            ) : activeTab === "local" && activeProject ? (
              <>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    color: "var(--color-ink)",
                  }}
                >
                  Drop anywhere to upload into {activeNs}
                </p>
                <p
                  style={{
                    margin: "0.3rem 0 0",
                    fontSize: "0.8rem",
                    color: "var(--color-muted)",
                  }}
                >
                  Release to ingest these files into the project's isolated
                  namespace.
                </p>
              </>
            ) : activeTab !== "local" ? (
              <>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    color: "var(--color-ink)",
                  }}
                >
                  Drag-to-upload works on the Local tab
                </p>
                <p
                  style={{
                    margin: "0.3rem 0 0",
                    fontSize: "0.8rem",
                    color: "var(--color-muted)",
                  }}
                >
                  Switch to Local above and pick a project to upload by
                  dragging files anywhere.
                </p>
              </>
            ) : (
              <>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    color: "var(--color-ink)",
                  }}
                >
                  Select a project first
                </p>
                <p
                  style={{
                    margin: "0.3rem 0 0",
                    fontSize: "0.8rem",
                    color: "var(--color-muted)",
                  }}
                >
                  Uploads are project-scoped — pick a project in the sidebar,
                  then drag files anywhere to add them.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ---------- Move (assign) modal ---------- */}
      {assignDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-title"
          ref={assignRef}
          tabIndex={-1}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            outline: "none",
          }}
          onClick={() => setAssignDoc(null)}
        >
          <div
            className="panel-card"
            style={{ width: "26rem", padding: "1.5rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="assign-title" style={{ fontSize: "1rem", fontWeight: 500, margin: "0 0 0.25rem" }}>
              Move document to another project
            </h3>
            <p style={{ fontSize: "0.76rem", color: "var(--color-muted)", margin: "0 0 1rem" }}>
              {assignDoc.filename} — moving changes its isolated RAG namespace.
            </p>

            <label
              htmlFor="assign-project"
              style={{ fontSize: "0.78rem", color: "var(--color-muted)", display: "block", marginBottom: "0.3rem" }}
            >
              Destination project
            </label>
            <select
              id="assign-project"
              value={assignProjectId}
              onChange={(e) =>
                setAssignProjectId(
                  e.target.value ? Number(e.target.value) : "",
                )
              }
              className="select"
              style={{ width: "100%", marginBottom: "0.75rem" }}
            >
              <option value="">Keep current project</option>
              {clients.map((c) => {
                const list = byClient(c.id);
                if (list.length === 0) return null;
                return (
                  <optgroup key={c.id} label={c.name}>
                    {list.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {namespaceLabel(c.name, p.name)}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
              {unassigned.length > 0 && (
                <optgroup label="No client">
                  {unassigned.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {namespaceLabel(null, p.name)}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button onClick={() => setAssignDoc(null)} className="button button--ghost button--small">
                Cancel
              </button>
              <button onClick={() => handleAssign(assignDoc)} className="button button--solid button--small">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
