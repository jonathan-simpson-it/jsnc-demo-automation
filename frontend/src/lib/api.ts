import type {
  AgentInfo,
  AgentQuery,
  AgentResponse,
  Client,
  DocumentStats,
  EvalResults,
  HealthStatus,
  OneDriveFile,
  OneDriveStatus,
  Project,
  StreamEvent,
  SummaryResponse,
  Tag,
  UploadResult,
} from "./types";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

/* ---- Health / Agents ---- */

export const fetchHealth = () => apiFetch<HealthStatus>("/health");
export const fetchAgents = () =>
  apiFetch<{ agents: AgentInfo[] }>("/api/agents");
export const fetchDocumentStats = () =>
  apiFetch<DocumentStats>("/api/documents/stats");
export const fetchEvalResults = () =>
  apiFetch<EvalResults>("/api/eval/results");
export const generateSummary = (period: "week" | "month") =>
  apiFetch<SummaryResponse>("/api/summary", {
    method: "POST",
    body: JSON.stringify({ period }),
  });

/* ---- Agents ---- */

export async function executeAgent(query: AgentQuery): Promise<AgentResponse> {
  const data = await apiFetch<{
    agent_type: string;
    result: string;
    metadata: Record<string, unknown>;
    citations: string[];
  }>("/api/agents/execute", { method: "POST", body: JSON.stringify(query) });
  return {
    ...data,
    confidence_score: (data.metadata?.confidence as number) ?? 0.8,
  };
}

export async function* streamAgent(
  query: AgentQuery,
): AsyncGenerator<StreamEvent> {
  const res = await fetch("/api/agents/execute/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  if (!res.ok) throw new Error(`Stream ${res.status}`);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          yield JSON.parse(line.slice(6));
        } catch {
          /* skip */
        }
      }
    }
  }
}

/* ---- Documents ---- */

export async function uploadDocument(
  file: File,
  clientId?: number | null,
  projectId?: number | null,
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  const params = new URLSearchParams();
  if (clientId) params.set("client_id", String(clientId));
  if (projectId) params.set("project_id", String(projectId));
  const qs = params.toString();
  const res = await fetch(`/api/documents/upload${qs ? "?" + qs : ""}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload ${res.status}: ${await res.text()}`);
  return res.json();
}

export const fetchDocumentList = (params?: {
  client_id?: number;
  project_id?: number;
  tag_id?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.client_id) qs.set("client_id", String(params.client_id));
  if (params?.project_id) qs.set("project_id", String(params.project_id));
  if (params?.tag_id) qs.set("tag_id", String(params.tag_id));
  const q = qs.toString();
  return apiFetch<{ documents: (import("./types").DocumentInfo)[] }>(
    `/api/documents/list${q ? "?" + q : ""}`,
  );
};

export const assignDocument = (
  docId: number,
  clientId?: number | null,
  projectId?: number | null,
) =>
  apiFetch(`/api/documents/${docId}/assign`, {
    method: "PUT",
    body: JSON.stringify({ client_id: clientId, project_id: projectId }),
  });

export const addDocumentTag = (docId: number, tagId: number) =>
  apiFetch(`/api/documents/${docId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tag_id: tagId }),
  });

export const removeDocumentTag = (docId: number, tagId: number) =>
  apiFetch(`/api/documents/${docId}/tags/${tagId}`, { method: "DELETE" });

/* ---- Tags ---- */

export const fetchTags = () =>
  apiFetch<{ tags: Tag[] }>("/api/documents/tags");

export const createTag = (name: string, color: string = "#80988f") =>
  apiFetch<Tag>("/api/documents/tags", {
    method: "POST",
    body: JSON.stringify({ name, color }),
  });

export const deleteTag = (tagId: number) =>
  apiFetch(`/api/documents/tags/${tagId}`, { method: "DELETE" });

/* ---- Clients ---- */

export const fetchClients = () =>
  apiFetch<{ clients: Client[] }>("/api/clients");

export const createClient = (name: string) =>
  apiFetch<Client>("/api/clients", {
    method: "POST",
    body: JSON.stringify({ name }),
  });

export const deleteClient = (id: number) =>
  apiFetch(`/api/clients/${id}`, { method: "DELETE" });

/* ---- Projects ---- */

export const fetchProjects = (clientId?: number) => {
  const qs = clientId ? `?client_id=${clientId}` : "";
  return apiFetch<{ projects: Project[] }>(`/api/projects${qs}`);
};

export const createProject = (name: string, clientId?: number | null) =>
  apiFetch<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify({ name, client_id: clientId }),
  });

export const deleteProject = (id: number) =>
  apiFetch(`/api/projects/${id}`, { method: "DELETE" });

/* ---- OneDrive ---- */

export const fetchOneDriveStatus = () =>
  apiFetch<OneDriveStatus>("/api/onedrive/status");

export const fetchOneDriveFiles = (path: string = "/") =>
  apiFetch<{ files: OneDriveFile[]; path: string }>(
    `/api/onedrive/files?path=${encodeURIComponent(path)}`,
  );

export const importFromOneDrive = (
  fileId: string,
  fileName: string,
  clientId?: number | null,
  projectId?: number | null,
) =>
  apiFetch<UploadResult>("/api/onedrive/import", {
    method: "POST",
    body: JSON.stringify({
      file_id: fileId,
      file_name: fileName,
      client_id: clientId,
      project_id: projectId,
    }),
  });

export const connectOneDrive = () => {
  window.location.href = "/api/onedrive/connect";
};

export const disconnectOneDrive = () =>
  apiFetch("/api/onedrive/disconnect", { method: "POST" });
