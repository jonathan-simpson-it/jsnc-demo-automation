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
  if (!iso) return "n/a";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "n/a";
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

function FileTextIcon({ size = 14, color = "var(--color-accent)" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

function ChevronsLeftIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 17l-5-5 5-5" />
      <path d="M18 17l-5-5 5-5" />
    </svg>
  );
}

function ChevronsRightIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 17l5-5-5-5" />
      <path d="M6 17l5-5-5-5" />
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
  // Queue progress (the list IS the active batch; handleFiles resets it).
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

  // App-shell layout
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  // Narrow screens start with the sidebar collapsed so the canvas keeps room.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setSidebarCollapsed(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSidebarCollapsed(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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
        if (real < 40) return; // send events still reporting live; stand back
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
      window.alert("Re-indexing failed. The source file may be missing.");
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

  function fmtBytes(b?: number | null): string {
    if (b == null || b < 0) return "n/a";
    if (b < 1024) return `${b} B`;
    const kb = b / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  const iconBtn =
    "grid h-7 w-7 place-items-center rounded-md text-muted transition-colors hover:bg-neutral-100 hover:text-ink focus-visible:opacity-100 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted";

  function renderClientRow(client: Client) {
    const isOpen = expanded.includes(client.id);
    const count = clientCounts.get(client.id) ?? 0;
    return (
      <div key={client.id} className="mb-0.5">
        <div className="group flex items-center">
          <button
            type="button"
            onClick={() => toggleClient(client.id)}
            aria-expanded={isOpen}
            aria-label={`${client.name}: ${count} documents`}
            className="flex h-8 min-w-0 flex-1 items-center gap-1 rounded-md px-1 text-left text-[0.84rem] text-ink transition-colors hover:bg-neutral-50"
          >
            <span
              aria-hidden="true"
              style={{
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 150ms ease",
              }}
            >
              <ChevronIcon
                size={12}
                color={isOpen ? "var(--color-ink)" : "var(--color-muted)"}
              />
            </span>
            <span style={{ display: "grid", placeItems: "center", flexShrink: 0 }}>
              <FolderIcon size={16} />
            </span>
            <span className="min-w-0 flex-1 truncate">{client.name}</span>
            {count > 0 && (
              <span className="ml-auto pl-2 text-[0.66rem] font-medium tabular-nums text-muted">
                {count}
              </span>
            )}
          </button>
          <button
            type="button"
            title={`New project under ${client.name}`}
            aria-label={`New project under ${client.name}`}
            onClick={() => {
              setNewProjectFor(client.id);
              setNewProjectName("");
            }}
            className={`${iconBtn} opacity-0 group-hover:opacity-100 group-focus-within:opacity-100`}
          >
            <PlusIcon size={13} />
          </button>
          <button
            type="button"
            title={`Delete client ${client.name}`}
            aria-label={`Delete client ${client.name}`}
            onClick={() => handleDeleteClient(client)}
            className={`${iconBtn} opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-ink`}
          >
            <TrashIcon size={13} />
          </button>
        </div>

        {newProjectFor === client.id && (
          <div className="flex items-center gap-1.5 py-1 pl-7 pr-1">
            <input
              ref={projectInputRef}
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
              onBlur={() => setNewProjectFor(null)}
              placeholder="New project name"
              aria-label={`Project name for ${client.name}`}
              className="input h-7 min-w-0 flex-1 text-[0.76rem]"
              style={{ padding: "0.25rem 0.5rem" }}
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreateProject}
              className="button button--solid button--small"
              style={{ minHeight: "1.8rem", padding: "0 0.7rem", fontSize: "0.66rem" }}
            >
              Add
            </button>
          </div>
        )}

        {isOpen && byClient(client.id).map((p) => renderProjectRow(p, client))}
        {isOpen && byClient(client.id).length === 0 && (
          <div className="py-0.5 pl-9 pr-1 text-[0.7rem] text-muted">
            No projects yet. Use the + button to create one.
          </div>
        )}
      </div>
    );
  }

  function renderProjectRow(project: Project, client: Client | null) {
    const isActive = activeProjectId === project.id;
    const ns = namespaceLabel(client?.name ?? null, project.name);
    return (
      <div className="group mb-0.5 flex items-center" key={project.id}>
        <button
          type="button"
          onClick={() => selectProject(project.id)}
          aria-current={isActive ? "true" : undefined}
          title={`Open ${project.name} · namespace ${ns}`}
          className={`flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md pl-9 pr-1 text-left text-[0.82rem] transition-colors ${
            isActive
              ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800"
              : "text-ink hover:bg-neutral-50"
          }`}
        >
          <FileTextIcon size={13} color={isActive ? "var(--color-ink)" : "var(--color-muted)"} />
          <span className="min-w-0 flex-1 truncate">{project.name}</span>
        </button>
        <button
          type="button"
          title={`Delete project ${project.name}`}
          aria-label={`Delete project ${project.name}`}
          onClick={() => handleDeleteProject(project)}
          className={`${iconBtn} opacity-0 group-hover:opacity-100 group-focus-within:opacity-100`}
        >
          <TrashIcon size={13} />
        </button>
      </div>
    );
  }

  /* ---- Render ---- */

  return (
    <div className="kb-shell flex overflow-hidden bg-bg">
      {/* ============ Collapsed sidebar rail ============ */}
      {sidebarCollapsed && (
        <div className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-line bg-surface pt-2">
          <button
            type="button"
            title="Show workspaces"
            aria-label="Show workspaces"
            onClick={() => setSidebarCollapsed(false)}
            className="grid h-8 w-8 place-items-center rounded-md text-muted transition-colors hover:bg-neutral-100 hover:text-ink"
          >
            <ChevronsRightIcon size={14} />
          </button>
        </div>
      )}

      {/* ============ Sidebar: Client -> Project tree ============ */}
      {!sidebarCollapsed && (
        <aside
          aria-label="Workspaces"
          className="flex w-72 shrink-0 flex-col border-r border-line bg-surface"
        >
          {/* Sticky header: workspaces title + collapse */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-3">
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted">
              Workspaces
            </span>
            <button
              type="button"
              title="Hide sidebar"
              aria-label="Hide sidebar"
              onClick={() => setSidebarCollapsed(true)}
              className="grid h-7 w-7 place-items-center rounded-md text-muted transition-colors hover:bg-neutral-100 hover:text-ink"
            >
              <ChevronsLeftIcon size={14} />
            </button>
          </div>

          {/* New workspace / project */}
          <div className="shrink-0 border-b border-line p-3">
            <button
              type="button"
              onClick={() => setCreateMenuOpen((v) => !v)}
              aria-expanded={createMenuOpen}
              className="button button--solid w-full"
              style={{ minHeight: "2.3rem" }}
            >
              <PlusIcon size={13} />
              <span>New workspace</span>
            </button>
            {createMenuOpen && (
              <div className="mt-2 space-y-1 rounded-lg border border-line bg-bg p-1">
                <button
                  type="button"
                  onClick={() => {
                    setCreateMenuOpen(false);
                    setShowNewClient(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent-soft"
                >
                  <span style={{ display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <FolderIcon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.8rem] font-medium text-ink">
                      New client workspace
                    </span>
                    <span className="block text-[0.68rem] leading-snug text-muted">
                      Groups projects under a firm or client
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreateMenuOpen(false);
                    setNewProjectFor("none");
                    setNewProjectName("");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent-soft"
                >
                  <span style={{ display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <FileTextIcon size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.8rem] font-medium text-ink">
                      New standalone project
                    </span>
                    <span className="block text-[0.68rem] leading-snug text-muted">
                      A project without a client folder
                    </span>
                  </span>
                </button>
              </div>
            )}
          </div>

          {showNewClient && (
            <div className="flex shrink-0 items-center gap-2 border-b border-line bg-bg px-3 py-2">
              <input
                autoFocus
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateClient()}
                placeholder="Client name"
                aria-label="New client name"
                className="input h-7 min-w-0 flex-1 text-[0.78rem]"
                style={{ padding: "0.25rem 0.5rem" }}
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCreateClient}
                className="button button--solid button--small"
                style={{ minHeight: "1.8rem", padding: "0 0.7rem", fontSize: "0.66rem" }}
              >
                Add
              </button>
            </div>
          )}

          {/* Workspace tree */}
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {newProjectFor === "none" && (
              <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-bg p-2">
                <input
                  ref={projectInputRef}
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                  onBlur={() => setNewProjectFor(null)}
                  placeholder="Project name"
                  aria-label="New project name"
                  className="input h-7 min-w-0 flex-1 text-[0.76rem]"
                  style={{ padding: "0.25rem 0.5rem" }}
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleCreateProject}
                  className="button button--solid button--small"
                  style={{ minHeight: "1.8rem", padding: "0 0.7rem", fontSize: "0.66rem" }}
                >
                  Add
                </button>
              </div>
            )}

            {sortedClients.map(renderClientRow)}

            {unassigned.length > 0 && (
              <div className="mb-1 mt-3 px-2 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-muted">
                Standalone
              </div>
            )}
            {unassigned.map((p) => renderProjectRow(p, null))}

            {sortedClients.length === 0 && projects.length === 0 && (
              <p className="px-3 py-10 text-center text-[0.78rem] leading-relaxed text-muted">
                No workspaces yet.
                <br />
                Create one to start uploading.
              </p>
            )}
          </div>
        </aside>
      )}

      {/* ============ Main canvas ============ */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Canvas toolbar */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[1.02rem] font-semibold tracking-tight text-ink">
              {activeProject ? (
                <>
                  {activeClient ? (
                    <span className="font-normal text-muted">{activeClient.name} / </span>
                  ) : null}
                  <span>{activeProject.name}</span>
                </>
              ) : (
                "Knowledge base"
              )}
            </h1>
            <p className="truncate text-[0.72rem] text-muted">
              {activeProject ? (
                <>
                  {docs.length} document{docs.length === 1 ? "" : "s"} ·{" "}
                  {totalChunks} vectorized chunk{totalChunks === 1 ? "" : "s"}
                  {activeNs ? ` · namespace ${activeNs}` : ""}
                </>
              ) : (
                <>
                  {allDocs.length} document{allDocs.length === 1 ? "" : "s"} across{" "}
                  {projects.length} project{projects.length === 1 ? "" : "s"}
                </>
              )}
            </p>
          </div>

          {/* Source segmented control */}
          <div
            role="group"
            aria-label="Source"
            className="flex shrink-0 items-center rounded-lg border border-line bg-bg p-0.5"
          >
            {(["local", "onedrive"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setActiveTab(t);
                  if (t === "onedrive" && odConnected) loadOdFiles("/");
                }}
                aria-pressed={activeTab === t}
                className={`rounded-md px-3 py-1.5 text-[0.72rem] font-medium transition-colors ${
                  activeTab === t
                    ? "bg-ink text-surface"
                    : "text-muted hover:text-ink"
                }`}
              >
                {t === "local" ? "Local" : "OneDrive"}
              </button>
            ))}
          </div>
        </header>

        {/* Canvas body */}
        <div className="flex-1 overflow-y-auto">
          {activeProject ? (
            <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
              {/* ---------- Local uploads ---------- */}
              {activeTab === "local" && (
                <section aria-label="Upload documents">
                  <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept=".pdf,.txt,.md,.docx,.xlsx"
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
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
                    onClick={() => {
                      if (!uploading) inputRef.current?.click();
                    }}
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
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      dragDepth.current = 0;
                      setDragOver(false);
                      if (uploading) return;
                      handleFiles(e.dataTransfer.files);
                    }}
                    aria-describedby="upload-hint"
                    className={`flex min-h-[180px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                      uploading
                        ? "cursor-default border-neutral-300 bg-neutral-50/50 opacity-70"
                        : dragOver
                          ? "cursor-copy border-accent bg-accent-soft"
                          : "cursor-pointer border-neutral-300 bg-neutral-50/50"
                    }`}
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center gap-2.5">
                        <span className="streaming-dots" aria-hidden="true" style={{ padding: 0 }}>
                          <span />
                          <span />
                          <span />
                        </span>
                        <span className="text-sm font-medium text-ink">
                          Uploading {uploadingFile}…
                        </span>
                      </span>
                    ) : flash ? (
                      <span
                        role="status"
                        className="flex flex-col items-center gap-1.5"
                        style={{
                          opacity: flashLeaving ? 0 : 1,
                          transition: "opacity 450ms ease",
                        }}
                      >
                        <svg
                          width="30"
                          height="30"
                          viewBox="0 0 26 26"
                          aria-hidden="true"
                          className="upload-success-pop"
                        >
                          <circle
                            cx="13"
                            cy="13"
                            r="12"
                            fill="none"
                            stroke={
                              flash.ok ? "var(--color-ok)" : "var(--color-muted)"
                            }
                            strokeWidth="1.6"
                            opacity="0.35"
                          />
                          <path
                            className="upload-check-path"
                            d="M7.5 13.5l3.8 3.8 7.2-8.2"
                            fill="none"
                            stroke={
                              flash.ok ? "var(--color-ok)" : "var(--color-muted)"
                            }
                            strokeWidth="2.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span
                          className="text-sm font-medium"
                          style={{
                            color: flash.ok ? "var(--color-ok)" : "var(--color-muted)",
                          }}
                        >
                          {flash.label}
                        </span>
                      </span>
                    ) : (
                      <>
                        <p className="m-0 mb-1 text-center text-base font-medium text-neutral-900">
                          Drop files here or click to browse
                        </p>
                        <p className="m-0 text-center text-xs font-mono text-neutral-500">
                          PDF · TXT · MD · DOCX · XLSX, ingested into this workspace
                        </p>
                      </>
                    )}
                  </button>
                  <div className="my-3 flex w-full items-center justify-center">
                    <span
                      id="upload-hint"
                      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200/60 bg-neutral-100/80 px-3 py-1 text-center font-mono text-xs text-neutral-500"
                    >
                      <span className="text-neutral-400">Target:</span>
                      {activeProject.name}
                      {activeNs ? (
                        <>
                          <span className="text-neutral-300">•</span>
                          <span className="text-neutral-400">namespace</span>
                          {activeNs}
                        </>
                      ) : null}
                    </span>
                  </div>

                  {/* Live upload queue */}
                  {uploads.length > 0 && (
                    <div className="mt-4">
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[0.74rem] text-muted">
                        <span>
                          {queueActiveIdx >= 0
                            ? `Uploading file ${queueActiveIdx + 1} of ${queueTotal} · ${Math.round(queueActivePct)}%`
                            : queueDone === queueTotal
                              ? `${queueDone} file${queueDone !== 1 ? "s" : ""} uploaded`
                              : `Queued ${queueTotal - queueDone} file${queueTotal - queueDone !== 1 ? "s" : ""}`}
                        </span>
                        <span className="font-semibold tabular-nums text-ink">
                          {queuePct}%
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={queuePct}
                        className="h-1.5 overflow-hidden rounded-sm bg-line"
                      >
                        <div
                          className="h-full rounded-sm transition-[width] duration-300 ease-out"
                          style={{ width: `${queuePct}%`, background: "var(--color-accent)" }}
                        />
                      </div>
                      <div className="mt-3 space-y-2">
                        {uploads.map((u, i) => {
                          const isActive = u.status === "uploading";
                          const isQueued = u.status === "queued";
                          const ok = u.status === "success";
                          const failed = u.status === "error";
                          const partial = u.status === "partial";
                          const dotColor = failed
                            ? "var(--color-error)"
                            : ok
                              ? "var(--color-ok)"
                              : "var(--color-muted)";
                          const sub = isQueued
                            ? "Waiting in queue…"
                            : isActive
                              ? `${Math.round(u.progress ?? 0)}%`
                              : u.message ?? "";
                          return (
                            <div
                              key={`${u.filename}-${i}`}
                              className="flex items-center gap-3 rounded-md border px-3 py-2 text-[0.82rem] transition-colors"
                              style={{
                                position: "relative",
                                overflow: "hidden",
                                background: isActive
                                  ? "var(--color-accent-soft)"
                                  : "var(--color-surface)",
                                borderColor: isActive
                                  ? "var(--color-accent)"
                                  : "var(--color-line)",
                              }}
                            >
                              <span className="grid h-6 w-6 shrink-0 place-items-center rounded border border-line bg-bg text-[0.64rem] font-semibold text-muted">
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
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{
                                    background: dotColor,
                                    opacity: isQueued ? 0.55 : 1,
                                  }}
                                />
                              )}
                              <span className="min-w-0 flex-1 overflow-wrap-anywhere">
                                <span className="block font-medium text-ink">
                                  {u.filename}
                                </span>
                                {sub && (
                                  <span
                                    className="block text-[0.76rem]"
                                    style={{
                                      color: failed
                                        ? "var(--color-error)"
                                        : "var(--color-muted)",
                                    }}
                                  >
                                    {sub}
                                  </span>
                                )}
                              </span>
                              <span
                                className="shrink-0 text-[0.66rem] font-semibold uppercase tracking-[0.06em]"
                                style={{
                                  color: failed
                                    ? "var(--color-error)"
                                    : ok
                                      ? "var(--color-ok)"
                                      : partial
                                        ? "var(--color-muted)"
                                        : "var(--color-accent)",
                                }}
                              >
                                {isActive
                                  ? `${Math.round(u.progress ?? 0)}%`
                                  : u.status}
                              </span>
                              {isActive && (
                                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-line">
                                  <span
                                    className="block h-full transition-[width] duration-200 ease-linear"
                                    style={{
                                      width: `${Math.min(100, Math.max(0, u.progress ?? 0))}%`,
                                      background: "var(--color-accent)",
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
                </section>
              )}

              {/* ---------- OneDrive ---------- */}
              {activeTab === "onedrive" && (
                <section aria-label="Import from OneDrive">
                  {!odConnected ? (
                    <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-neutral-200/80 bg-white p-10 text-center md:p-12 dark:bg-neutral-900">
                      <p className="mb-2 text-base font-semibold text-neutral-900">
                        Connect your OneDrive to import documents.
                      </p>
                      <p className="mb-6 max-w-md text-sm text-neutral-500">
                        Requires a Microsoft account with Files.Read.All
                        permission.
                      </p>
                      <div className="mb-0 mt-2 flex items-center justify-center gap-3">
                        <button
                          onClick={connectOneDrive}
                          className="button button--solid"
                        >
                          Connect OneDrive
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-line bg-surface">
                      <div className="flex items-center gap-2.5 border-b border-line px-4 py-2.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: "var(--color-ok)" }}
                        />
                        <span className="text-[0.82rem] text-muted">
                          OneDrive connected · importing into{" "}
                          <strong className="font-medium text-ink">
                            {activeProject.name}
                          </strong>
                        </span>
                        <span className="ml-auto text-[0.72rem] tabular-nums text-muted">
                          {odPath}
                        </span>
                      </div>
                      <div className="divide-y divide-line">
                        {odPath !== "/" && (
                          <button
                            type="button"
                            onClick={() => {
                              const parent =
                                odPath.split("/").slice(0, -1).join("/") || "/";
                              loadOdFiles(parent);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[0.82rem] text-muted transition-colors hover:bg-neutral-50"
                          >
                            <span aria-hidden="true" className="text-[0.72rem]">
                              &larr;
                            </span>{" "}
                            Back
                          </button>
                        )}
                        {odLoading ? (
                          <p className="px-4 py-6 text-center text-[0.82rem] text-muted">
                            Loading…
                          </p>
                        ) : odFiles.length === 0 ? (
                          <p className="px-4 py-6 text-center text-[0.82rem] text-muted">
                            No files in this folder.
                          </p>
                        ) : (
                          odFiles.map((f) => (
                            <div
                              key={f.id}
                              className="group flex items-center gap-3 px-4 py-2 transition-colors hover:bg-neutral-50"
                            >
                              <span className="shrink-0 text-accent" style={{ lineHeight: 0 }}>
                                {f.is_folder ? <FolderIcon size={17} /> : <FileIcon size={17} />}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  f.is_folder
                                    ? loadOdFiles(f.path + "/" + f.name)
                                    : handleOdImport(f)
                                }
                                title={
                                  f.is_folder
                                    ? `Open folder ${f.name}`
                                    : `Import ${f.name} into ${activeProject.name}`
                                }
                                className="min-w-0 flex-1 truncate text-left text-[0.84rem] text-ink hover:underline"
                              >
                                {f.name}
                              </button>
                              {!f.is_folder && (
                                <>
                                  <span className="shrink-0 text-[0.7rem] tabular-nums text-muted">
                                    {fmtBytes(f.size)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOdImport(f)}
                                    disabled={odImportingIds.has(f.id)}
                                    className="button button--ghost button--small shrink-0"
                                    style={{
                                      fontSize: "0.68rem",
                                      padding: "0.2rem 0.6rem",
                                      minHeight: "1.9rem",
                                    }}
                                  >
                                    {odImportingIds.has(f.id)
                                      ? "Importing…"
                                      : "Import"}
                                  </button>
                                </>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Live import status */}
                  {odImports.length > 0 && (
                    <div className="mt-4">
                      <h2 className="mb-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-muted">
                        Import status
                      </h2>
                      <div className="space-y-2">
                        {odImports.map((row, i) => {
                          const isImporting = row.status === "importing";
                          const isError = row.status === "error";
                          const isSuccess = row.status === "success";
                          return (
                            <div
                              key={`${row.fileId}-${i}`}
                              className="flex items-center gap-3 rounded-md border px-3 py-2 text-[0.82rem]"
                              style={{
                                background: isImporting
                                  ? "var(--color-accent-soft)"
                                  : "var(--color-surface)",
                                borderColor: isImporting
                                  ? "var(--color-accent)"
                                  : "var(--color-line)",
                              }}
                            >
                              <span className="grid h-6 w-6 shrink-0 place-items-center rounded border border-line bg-bg text-[0.64rem] font-semibold text-muted">
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
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{
                                    background: isError
                                      ? "var(--color-error)"
                                      : isSuccess
                                        ? "var(--color-ok)"
                                        : "var(--color-muted)",
                                  }}
                                />
                              )}
                              <span className="min-w-0 flex-1 overflow-wrap-anywhere">
                                <span className="block font-medium text-ink">
                                  {row.filename}
                                </span>
                                {row.message && (
                                  <span
                                    className="block text-[0.76rem]"
                                    style={{
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
                                className="shrink-0 text-[0.66rem] font-semibold uppercase tracking-[0.06em]"
                                style={{
                                  color: isError
                                    ? "var(--color-error)"
                                    : isSuccess
                                      ? "var(--color-ok)"
                                      : "var(--color-accent)",
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
                </section>
              )}

              {/* ---------- Documents data table ---------- */}
              <section aria-label="Documents" className="overflow-x-auto">
                <div className="min-w-[46rem] overflow-hidden rounded-xl border border-line bg-surface">
                  <table className="w-full text-[0.82rem]">
                    <thead>
                      <tr className="border-b border-line">
                        {[
                          { label: "Name", align: "text-left", w: "w-[46%]" },
                          { label: "Size", align: "text-right", w: "w-[10%]" },
                          { label: "Type", align: "text-left", w: "w-[9%]" },
                          { label: "Ingestion", align: "text-left", w: "w-[15%]" },
                          { label: "Actions", align: "text-right", w: "w-[20%]" },
                        ].map((c) => (
                          <th
                            key={c.label}
                            scope="col"
                            className={`${c.align} ${c.w} px-4 py-2.5 text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-muted`}
                          >
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {docs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center">
                            <p className="text-sm font-medium text-ink">
                              No documents in this workspace yet.
                            </p>
                            <p className="mt-1 text-[0.78rem] text-muted">
                              Drop files above and they appear here once
                              ingested.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        docs.map((d) => {
                          const status = statusOf(d);
                          const type = fileExt(d.filename);
                          const docTags = d.tags ?? [];
                          return (
                            <tr
                              key={d.id ?? d.filename}
                              className="border-t border-line transition-colors first:border-t-0 hover:bg-neutral-50"
                            >
                              {/* Name */}
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className="shrink-0"
                                    style={{ lineHeight: 0 }}
                                  >
                                    <FileIcon size={16} color="var(--color-muted)" />
                                  </span>
                                  <div className="min-w-0">
                                    <div
                                      className="max-w-full truncate font-medium text-ink"
                                      title={d.filename}
                                    >
                                      {d.filename}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {d.source === "onedrive" && (
                                        <span className="rounded bg-accent-soft px-1 py-px text-[0.6rem] font-semibold uppercase tracking-wide text-accent">
                                          onedrive
                                        </span>
                                      )}
                                      {docTags.length > 0 && (
                                        <span className="flex items-center gap-1">
                                          {docTags.map((t) => (
                                            <span
                                              key={t.id}
                                              title={t.name}
                                              className="h-1.5 w-1.5 rounded-full"
                                              style={{ background: t.color }}
                                            />
                                          ))}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              {/* Size */}
                              <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                                {fmtBytes(d.size)}
                              </td>
                              {/* Type */}
                              <td className="px-4 py-2.5">
                                <span className="rounded border border-line bg-bg px-1.5 py-0.5 text-[0.64rem] font-medium uppercase tracking-wide text-muted">
                                  {type}
                                </span>
                              </td>
                              {/* Ingestion */}
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{ background: status.color }}
                                  />
                                  <div className="leading-tight">
                                    <div className="font-medium text-ink">
                                      {status.label}
                                    </div>
                                    <div className="text-[0.66rem] text-muted">
                                      {d.chunks} chunk{d.chunks === 1 ? "" : "s"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              {/* Actions */}
                              <td className="px-4 py-2.5">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => d.id && setAssignDoc(d)}
                                    className="button button--ghost button--small"
                                    style={{
                                      fontSize: "0.68rem",
                                      padding: "0.2rem 0.6rem",
                                      minHeight: "1.9rem",
                                    }}
                                  >
                                    Move
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReindex(d)}
                                    disabled={busyDocId === d.id || !d.id}
                                    title="Re-index from source file"
                                    aria-label={`Re-index ${d.filename}`}
                                    className={iconBtn}
                                  >
                                    {busyDocId === d.id ? (
                                      <span
                                        className="streaming-dots"
                                        style={{ padding: 0 }}
                                        aria-hidden="true"
                                      >
                                        <span style={{ width: "0.3rem", height: "0.3rem" }} />
                                        <span style={{ width: "0.3rem", height: "0.3rem" }} />
                                        <span style={{ width: "0.3rem", height: "0.3rem" }} />
                                      </span>
                                    ) : (
                                      <RefreshIcon size={14} />
                                    )}
                                  </button>
                                  {d.id && (
                                    <a
                                      href={documentDownloadUrl(d.id)}
                                      title="Download original file"
                                      aria-label={`Download ${d.filename}`}
                                      className={`${iconBtn} border border-line bg-transparent`}
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
                                    className={iconBtn}
                                  >
                                    <TrashIcon size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          ) : (
            /* ---------- Unselected empty state ---------- */
            <div className="flex min-h-full flex-col items-center justify-center px-6 py-20 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl border border-line bg-surface text-accent">
                <FolderIcon size={30} />
              </div>
              <h2 className="mt-5 max-w-md text-lg font-semibold tracking-tight text-ink">
                Select or create a workspace to start uploading
              </h2>
              <p className="mt-2 max-w-md text-[0.82rem] leading-relaxed text-muted">
                Workspaces act as isolated knowledge bases. Pick a project in
                the sidebar, or create a new workspace to upload, tag, and
                retrieve documents scoped to that deal or client.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  className="button button--solid"
                  onClick={() => {
                    if (sidebarCollapsed) setSidebarCollapsed(false);
                    setCreateMenuOpen(true);
                  }}
                >
                  <PlusIcon size={13} />
                  <span>New workspace</span>
                </button>
                {sidebarCollapsed && (
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => setSidebarCollapsed(false)}
                  >
                    <FolderIcon size={13} />
                    <span>Browse workspaces</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Page-level drop overlay ---------- */}
      {dragOver && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-60 flex items-center justify-center"
          style={{ background: "rgba(0, 0, 0, 0.05)" }}
        >
          <div className="max-w-[26rem] rounded-xl border-2 border-dashed border-accent bg-surface px-8 py-6 text-center">
            {uploading ? (
              <>
                <p className="m-0 text-[0.95rem] font-semibold text-ink">
                  Upload in progress
                </p>
                <p className="mb-0 mt-1.5 text-[0.8rem] text-muted">
                  Drops are paused while {uploadingFile} finishes. You can add
                  more files as soon as it completes.
                </p>
              </>
            ) : activeTab === "local" ? (
              <>
                <p className="m-0 text-[0.95rem] font-semibold text-ink">
                  Drop anywhere to upload into {activeProject?.name}
                </p>
                <p className="mb-0 mt-1.5 text-[0.8rem] text-muted">
                  Release to ingest these files into the project&apos;s isolated
                  namespace.
                </p>
              </>
            ) : (
              <>
                <p className="m-0 text-[0.95rem] font-semibold text-ink">
                  Drag-to-upload works on the Local tab
                </p>
                <p className="mb-0 mt-1.5 text-[0.8rem] text-muted">
                  Switch to Local above and pick a project to upload by dragging
                  files anywhere.
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
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/30"
          style={{ outline: "none" }}
          onClick={() => setAssignDoc(null)}
        >
          <div
            className="panel-card w-[26rem] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="assign-title"
              className="m-0 text-[1rem] font-medium text-ink"
            >
              Move document to another project
            </h3>
            <p className="mb-4 mt-1 text-[0.76rem] text-muted">
              {assignDoc.filename}. Moving changes its isolated RAG namespace.
            </p>

            <label
              htmlFor="assign-project"
              className="mb-1 block text-[0.78rem] text-muted"
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
              className="select mb-3 w-full"
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
                <optgroup label="Standalone">
                  {unassigned.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {namespaceLabel(null, p.name)}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssignDoc(null)}
                className="button button--ghost button--small"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAssign(assignDoc)}
                className="button button--solid button--small"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
