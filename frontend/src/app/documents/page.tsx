"use client";
import { useEffect, useState, useCallback, useRef } from "react";
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
  deleteTag,
  assignDocument,
  addDocumentTag,
  removeDocumentTag,
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

type Tab = "all" | "onedrive";

export default function DocumentsPage() {
  // Data
  const [docs, setDocs] = useState<DocumentInfo[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Filters
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("all");

  // OneDrive
  const [odConnected, setOdConnected] = useState(false);
  const [odFiles, setOdFiles] = useState<OneDriveFile[]>([]);
  const [odPath, setOdPath] = useState("/");
  const [odLoading, setOdLoading] = useState(false);
  const [odImporting, setOdImporting] = useState<string | null>(null);

  // Upload
  const [uploads, setUploads] = useState<
    { filename: string; status: string; message?: string }[]
  >([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // New item inputs
  const [newClient, setNewClient] = useState("");
  const [newProject, setNewProject] = useState("");
  const [newProjectClient, setNewProjectClient] = useState<number | null>(null);
  const [newTag, setNewTag] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewTag, setShowNewTag] = useState(false);

  // Assign modal
  const [assignDoc, setAssignDoc] = useState<DocumentInfo | null>(null);

  const loadAll = useCallback(async () => {
    const params: { client_id?: number; project_id?: number; tag_id?: number } = {};
    if (selectedClient) params.client_id = selectedClient;
    if (selectedProject) params.project_id = selectedProject;
    if (selectedTag) params.tag_id = selectedTag;
    try {
      const [docRes, clientRes, projectRes, tagRes] = await Promise.all([
        fetchDocumentList(Object.keys(params).length ? params : undefined),
        fetchClients(),
        fetchProjects(),
        fetchTags(),
      ]);
      setDocs(docRes.documents);
      setClients(clientRes.clients);
      setProjects(projectRes.projects);
      setTags(tagRes.tags);
    } catch {
      /* skip */
    }
  }, [selectedClient, selectedProject, selectedTag]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    fetchOneDriveStatus()
      .then((s) => setOdConnected(s.connected))
      .catch(() => {});
  }, []);

  // ---- Upload ----

  async function handleFiles(files: FileList) {
    for (const file of Array.from(files)) {
      setUploads((p) => [...p, { filename: file.name, status: "uploading" }]);
      try {
        const r = await uploadDocument(file, selectedClient, selectedProject);
        setUploads((p) =>
          p.map((u) =>
            u.filename === file.name && u.status === "uploading"
              ? { filename: file.name, status: "success", message: `${r.chunks_ingested} chunks` }
              : u,
          ),
        );
      } catch (err: unknown) {
        setUploads((p) =>
          p.map((u) =>
            u.filename === file.name && u.status === "uploading"
              ? { filename: file.name, status: "error", message: err instanceof Error ? err.message : "Failed" }
              : u,
          ),
        );
      }
    }
    loadAll();
  }

  // ---- OneDrive ----

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
    setOdImporting(file.id);
    try {
      await importFromOneDrive(file.id, file.name, selectedClient, selectedProject);
      loadAll();
    } catch {
      /* skip */
    } finally {
      setOdImporting(null);
    }
  }

  // ---- Client/Project/Tag CRUD ----

  async function handleCreateClient() {
    if (!newClient.trim()) return;
    await createClient(newClient.trim());
    setNewClient("");
    setShowNewClient(false);
    loadAll();
  }

  async function handleCreateProject() {
    if (!newProject.trim()) return;
    await createProject(newProject.trim(), newProjectClient);
    setNewProject("");
    setNewProjectClient(null);
    setShowNewProject(false);
    loadAll();
  }

  async function handleCreateTag() {
    if (!newTag.trim()) return;
    await createTag(newTag.trim());
    setNewTag("");
    setShowNewTag(false);
    loadAll();
  }

  async function handleAssign(doc: DocumentInfo) {
    if (!doc.id) return;
    await assignDocument(doc.id, doc.client_id, doc.project_id);
    setAssignDoc(null);
    loadAll();
  }

  async function handleTagDoc(docId: number, tagId: number) {
    await addDocumentTag(docId, tagId);
    loadAll();
  }

  async function handleUntagDoc(docId: number, tagId: number) {
    await removeDocumentTag(docId, tagId);
    loadAll();
  }

  // ---- Render ----

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 3.5rem)" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: "16rem",
          flexShrink: 0,
          borderRight: "1px solid var(--color-line)",
          background: "var(--color-surface)",
          padding: "1.5rem 1rem",
          overflowY: "auto",
        }}
      >
        {/* Clients */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h4 style={{ fontSize: "0.72rem", letterSpacing: "0.08em", margin: 0 }}>Clients</h4>
            <button
              onClick={() => setShowNewClient(!showNewClient)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", fontSize: "0.85rem", padding: 0 }}
            >
              +
            </button>
          </div>
          {showNewClient && (
            <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.5rem" }}>
              <input
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateClient()}
                placeholder="Client name"
                className="input"
                style={{ fontSize: "0.78rem", padding: "0.35rem 0.5rem" }}
              />
            </div>
          )}
          <button
            onClick={() => setSelectedClient(null)}
            style={{
              display: "block", width: "100%", textAlign: "left", padding: "0.35rem 0.5rem",
              borderRadius: "var(--radius-md)", border: "none", cursor: "pointer", fontSize: "0.82rem",
              background: selectedClient === null ? "var(--color-accent-soft)" : "transparent",
              color: "var(--color-ink)", fontWeight: selectedClient === null ? 500 : 400,
            }}
          >
            All clients
          </button>
          {clients.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center" }}>
              <button
                onClick={() => setSelectedClient(c.id)}
                style={{
                  flex: 1, textAlign: "left", padding: "0.35rem 0.5rem",
                  borderRadius: "var(--radius-md)", border: "none", cursor: "pointer", fontSize: "0.82rem",
                  background: selectedClient === c.id ? "var(--color-accent-soft)" : "transparent",
                  color: "var(--color-ink)", fontWeight: selectedClient === c.id ? 500 : 400,
                }}
              >
                {c.name}
              </button>
              <button
                onClick={async () => { await deleteClient(c.id); loadAll(); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "0.7rem", padding: "0 0.25rem" }}
              >
                x
              </button>
            </div>
          ))}
        </div>

        {/* Projects */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h4 style={{ fontSize: "0.72rem", letterSpacing: "0.08em", margin: 0 }}>Projects</h4>
            <button
              onClick={() => setShowNewProject(!showNewProject)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", fontSize: "0.85rem", padding: 0 }}
            >
              +
            </button>
          </div>
          {showNewProject && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.5rem" }}>
              <input
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                placeholder="Project name"
                className="input"
                style={{ fontSize: "0.78rem", padding: "0.35rem 0.5rem" }}
              />
              <select
                value={newProjectClient ?? ""}
                onChange={(e) => setNewProjectClient(e.target.value ? Number(e.target.value) : null)}
                className="select"
                style={{ fontSize: "0.72rem", padding: "0.3rem 1.5rem 0.3rem 0.5rem" }}
              >
                <option value="">No client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={() => setSelectedProject(null)}
            style={{
              display: "block", width: "100%", textAlign: "left", padding: "0.35rem 0.5rem",
              borderRadius: "var(--radius-md)", border: "none", cursor: "pointer", fontSize: "0.82rem",
              background: selectedProject === null ? "var(--color-accent-soft)" : "transparent",
              color: "var(--color-ink)", fontWeight: selectedProject === null ? 500 : 400,
            }}
          >
            All projects
          </button>
          {projects.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center" }}>
              <button
                onClick={() => setSelectedProject(p.id)}
                style={{
                  flex: 1, textAlign: "left", padding: "0.35rem 0.5rem",
                  borderRadius: "var(--radius-md)", border: "none", cursor: "pointer", fontSize: "0.82rem",
                  background: selectedProject === p.id ? "var(--color-accent-soft)" : "transparent",
                  color: "var(--color-ink)", fontWeight: selectedProject === p.id ? 500 : 400,
                }}
              >
                {p.name}
                {p.client_name && (
                  <span style={{ color: "var(--color-muted)", fontSize: "0.72rem" }}> / {p.client_name}</span>
                )}
              </button>
              <button
                onClick={async () => { await deleteProject(p.id); loadAll(); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "0.7rem", padding: "0 0.25rem" }}
              >
                x
              </button>
            </div>
          ))}
        </div>

        {/* Tags */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h4 style={{ fontSize: "0.72rem", letterSpacing: "0.08em", margin: 0 }}>Tags</h4>
            <button
              onClick={() => setShowNewTag(!showNewTag)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", fontSize: "0.85rem", padding: 0 }}
            >
              +
            </button>
          </div>
          {showNewTag && (
            <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.5rem" }}>
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                placeholder="Tag name"
                className="input"
                style={{ fontSize: "0.78rem", padding: "0.35rem 0.5rem" }}
              />
            </div>
          )}
          <button
            onClick={() => setSelectedTag(null)}
            style={{
              display: "block", width: "100%", textAlign: "left", padding: "0.35rem 0.5rem",
              borderRadius: "var(--radius-md)", border: "none", cursor: "pointer", fontSize: "0.82rem",
              background: selectedTag === null ? "var(--color-accent-soft)" : "transparent",
              color: "var(--color-ink)", fontWeight: selectedTag === null ? 500 : 400,
            }}
          >
            All tags
          </button>
          {tags.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center" }}>
              <button
                onClick={() => setSelectedTag(t.id)}
                style={{
                  flex: 1, textAlign: "left", padding: "0.35rem 0.5rem",
                  borderRadius: "var(--radius-md)", border: "none", cursor: "pointer", fontSize: "0.82rem",
                  background: selectedTag === t.id ? "var(--color-accent-soft)" : "transparent",
                  color: "var(--color-ink)", fontWeight: selectedTag === t.id ? 500 : 400,
                  display: "flex", alignItems: "center", gap: "0.35rem",
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: t.color, flexShrink: 0 }} />
                {t.name}
              </button>
              <button
                onClick={async () => { await deleteTag(t.id); loadAll(); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "0.7rem", padding: "0 0.25rem" }}
              >
                x
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "1.5rem 2rem", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <span className="section-eyebrow">Documents</span>
            <h2 style={{ fontSize: "clamp(1.4rem, 3.8vw, 2rem)", fontFamily: "var(--font-display)", fontWeight: 400, marginBottom: "0.25rem" }}>
              Knowledge base.
            </h2>
            <p style={{ color: "var(--color-muted)", fontSize: "0.88rem" }}>
              {docs.length} document{docs.length !== 1 ? "s" : ""}
              {selectedClient ? ` in ${clients.find((c) => c.id === selectedClient)?.name || "client"}` : ""}
              {selectedProject ? ` / ${projects.find((p) => p.id === selectedProject)?.name || "project"}` : ""}
            </p>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "0.25rem" }}>
            {(["all", "onedrive"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setActiveTab(t);
                  if (t === "onedrive" && odConnected) loadOdFiles("/");
                }}
                className={`button button--small ${activeTab === t ? "button--solid" : "button--ghost"}`}
              >
                {t === "all" ? "Local" : "OneDrive"}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Area (Local tab) */}
        {activeTab === "all" && (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "var(--color-accent)" : "var(--color-line)"}`,
                background: dragOver ? "var(--color-accent-soft)" : "transparent",
                borderRadius: "var(--radius-lg)", padding: "2rem", textAlign: "center",
                cursor: "pointer", transition: "all 220ms ease", marginBottom: "1.5rem",
              }}
            >
              <input ref={inputRef} type="file" multiple accept=".pdf,.txt,.md"
                onChange={(e) => e.target.files && handleFiles(e.target.files)} className="hidden" />
              <p style={{ fontSize: "0.88rem", fontWeight: 500, marginBottom: "0.25rem" }}>
                Drop files here or click to upload
              </p>
              <p style={{ fontSize: "0.78rem", color: "var(--color-muted)" }}>PDF, TXT, MD</p>
            </div>

            {/* Upload status */}
            {uploads.length > 0 && (
              <div className="space-y-2" style={{ marginBottom: "1.5rem" }}>
                {uploads.map((u, i) => (
                  <div key={`${u.filename}-${i}`} className="panel-card"
                    style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 1rem" }}>
                    <span className="w-2 h-2 rounded-full" style={{
                      background: u.status === "success" ? "#22c55e" : u.status === "error" ? "#ef4444" : "var(--color-muted)",
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: "0.85rem", flex: 1 }}>
                      {u.filename}
                      {u.message && <span style={{ color: "var(--color-muted)" }}> -- {u.message}</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* OneDrive panel */}
        {activeTab === "onedrive" && (
          <div style={{ marginBottom: "1.5rem" }}>
            {!odConnected ? (
              <div className="panel-card" style={{ textAlign: "center", padding: "2rem" }}>
                <p style={{ fontSize: "0.88rem", fontWeight: 500, marginBottom: "0.75rem" }}>
                  Connect your OneDrive to import documents directly.
                </p>
                <p style={{ fontSize: "0.78rem", color: "var(--color-muted)", marginBottom: "1rem" }}>
                  Requires a Microsoft account with Files.Read.All permission.
                </p>
                <button onClick={connectOneDrive} className="button button--solid">
                  Connect OneDrive
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
                  <span style={{ fontSize: "0.82rem", color: "var(--color-muted)" }}>OneDrive connected</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-muted)", marginLeft: "auto" }}>
                    {odPath}
                  </span>
                </div>

                {odLoading ? (
                  <p style={{ color: "var(--color-muted)", fontSize: "0.85rem", padding: "1rem 0" }}>Loading...</p>
                ) : (
                  <div className="space-y-1">
                    {odPath !== "/" && (
                      <button
                        onClick={() => {
                          const parent = odPath.split("/").slice(0, -1).join("/") || "/";
                          loadOdFiles(parent);
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.5rem",
                          padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)",
                          border: "none", background: "transparent", cursor: "pointer",
                          fontSize: "0.85rem", color: "var(--color-muted)", width: "100%",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: "0.75rem" }}>&larr;</span> Back
                      </button>
                    )}
                    {odFiles.map((f) => (
                      <div
                        key={f.id}
                        className="panel-card"
                        style={{
                          display: "flex", alignItems: "center", gap: "0.75rem",
                          padding: "0.6rem 0.75rem",
                        }}
                      >
                        <span style={{ fontSize: "0.85rem", width: "1.25rem", textAlign: "center", flexShrink: 0 }}>
                          {f.is_folder ? "\uD83D\uDCC1" : "\uD83D\uDCC4"}
                        </span>
                        <button
                          onClick={() => f.is_folder ? loadOdFiles(f.path + "/" + f.name) : handleOdImport(f)}
                          style={{
                            flex: 1, textAlign: "left", border: "none", background: "none",
                            cursor: "pointer", fontSize: "0.85rem", color: "var(--color-ink)",
                            padding: 0,
                          }}
                        >
                          {f.name}
                        </button>
                        {!f.is_folder && (
                          <button
                            onClick={() => handleOdImport(f)}
                            disabled={odImporting === f.id}
                            className="button button--ghost button--small"
                            style={{ fontSize: "0.68rem", padding: "0.2rem 0.5rem", minHeight: "1.5rem" }}
                          >
                            {odImporting === f.id ? "Importing..." : "Import"}
                          </button>
                        )}
                        {!f.is_folder && (
                          <span style={{ fontSize: "0.72rem", color: "var(--color-muted)", flexShrink: 0 }}>
                            {f.size > 1024 * 1024
                              ? `${(f.size / 1024 / 1024).toFixed(1)} MB`
                              : `${(f.size / 1024).toFixed(0)} KB`}
                          </span>
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
          </div>
        )}

        {/* Document List */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h4 style={{ fontSize: "0.72rem", letterSpacing: "0.08em", margin: 0 }}>
              {activeTab === "all" ? "LOCAL DOCUMENTS" : "IMPORTED FROM ONEDRIVE"}
            </h4>
          </div>

          {docs.length === 0 ? (
            <p style={{ color: "var(--color-muted)", textAlign: "center", padding: "3rem 0", fontSize: "0.88rem" }}>
              No documents yet. {activeTab === "all" ? "Upload some files above." : "Connect OneDrive and import files."}
            </p>
          ) : (
            <div className="space-y-2">
              {docs.map((d) => (
                <div key={d.id || d.filename} className="panel-card"
                  style={{ display: "flex", alignItems: "flex-start", gap: "1rem", padding: "0.85rem 1rem" }}>
                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>{d.filename}</span>
                      {d.source === "onedrive" && (
                        <span className="chip" style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>onedrive</span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-muted)", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                      <span>{d.chunks} chunks</span>
                      {d.client_name && <span>Client: {d.client_name}</span>}
                      {d.project_name && <span>Project: {d.project_name}</span>}
                    </div>
                    {/* Tags */}
                    <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
                      {d.tags?.map((t) => (
                        <span key={t.id} className="chip" style={{
                          fontSize: "0.65rem", padding: "0.1rem 0.4rem",
                          background: t.color + "20", borderColor: t.color + "40",
                        }}>
                          {t.name}
                          <button
                            onClick={() => d.id && handleUntagDoc(d.id, t.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "0.2rem", fontSize: "0.6rem", color: "var(--color-muted)", padding: 0 }}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0 }}>
                    {/* Add tag */}
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value && d.id) handleTagDoc(d.id, Number(e.target.value));
                      }}
                      className="select"
                      style={{ fontSize: "0.68rem", padding: "0.2rem 1.5rem 0.2rem 0.4rem", minHeight: "1.5rem" }}
                    >
                      <option value="">+ Tag</option>
                      {tags.filter((t) => !d.tags?.some((dt) => dt.id === t.id)).map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>

                    {/* Assign */}
                    <button
                      onClick={() => setAssignDoc(d)}
                      className="button button--ghost button--small"
                      style={{ fontSize: "0.68rem", padding: "0.2rem 0.5rem", minHeight: "1.5rem" }}
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assign Modal */}
      {assignDoc && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
          }}
          onClick={() => setAssignDoc(null)}
        >
          <div
            className="panel-card"
            style={{ width: "24rem", padding: "1.5rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1rem", fontWeight: 500, marginBottom: "1rem" }}>
              Assign: {assignDoc.filename}
            </h3>

            <label style={{ fontSize: "0.78rem", color: "var(--color-muted)", display: "block", marginBottom: "0.25rem" }}>
              Client
            </label>
            <select
              value={assignDoc.client_id ?? ""}
              onChange={(e) => setAssignDoc({
                ...assignDoc,
                client_id: e.target.value ? Number(e.target.value) : null,
                client_name: clients.find((c) => c.id === Number(e.target.value))?.name || null,
              })}
              className="select"
              style={{ width: "100%", marginBottom: "0.75rem" }}
            >
              <option value="">None</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <label style={{ fontSize: "0.78rem", color: "var(--color-muted)", display: "block", marginBottom: "0.25rem" }}>
              Project
            </label>
            <select
              value={assignDoc.project_id ?? ""}
              onChange={(e) => setAssignDoc({
                ...assignDoc,
                project_id: e.target.value ? Number(e.target.value) : null,
                project_name: projects.find((p) => p.id === Number(e.target.value))?.name || null,
              })}
              className="select"
              style={{ width: "100%", marginBottom: "1rem" }}
            >
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
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
