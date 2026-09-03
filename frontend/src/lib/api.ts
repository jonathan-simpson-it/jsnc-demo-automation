import type {
  AgentInfo,
  AgentQuery,
  AgentResponse,
  Client,
  Conversation,
  ConversationMessage,
  CostSummary,
  DocumentStats,
  EvalResults,
  HealthStatus,
  OneDriveFile,
  OneDriveStatus,
  Project,
  ReindexResult,
  RegulatoryFeedItem,
  RegulatoryState,
  ReviewItem,
  StreamEvent,
  SummaryResponse,
  Tag,
  TelemetryRun,
  UploadResult,
} from "./types";
import { apiHeaders, getApiKey } from "./api-key";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...apiHeaders(), ...init?.headers },
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
    headers: { "Content-Type": "application/json", ...apiHeaders() },
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

export interface UploadProgress {
  /** Monotonic 0..100 estimate of the whole upload+ingest operation. */
  percent: number;
  /** send: file bytes going up; process: server ingesting (headers not out
      yet); receive: response body coming back; done: finished. */
  phase: "send" | "process" | "receive" | "done";
}

export async function uploadDocument(
  file: File,
  clientId?: number | null,
  projectId?: number | null,
  onProgress?: (p: UploadProgress) => void,
): Promise<UploadResult> {
  const params = new URLSearchParams();
  if (clientId) params.set("client_id", String(clientId));
  if (projectId) params.set("project_id", String(projectId));
  const qs = params.toString();
  const url = `/api/documents/upload${qs ? "?" + qs : ""}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    let last = -1;
    const report = (percent: number, phase: UploadProgress["phase"]) => {
      const pct = Math.max(0, Math.min(100, percent));
      if (onProgress && pct > last) onProgress({ percent: pct, phase });
      if (pct > last) last = pct;
    };

    // Real bytes sent upstream (0 -> ~40).
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        report(2 + (e.loaded / e.total) * 38, "send");
      }
    };
    xhr.upload.onload = () => report(40, "send");
    // Response headers arriving means the server finished ingesting: this is
    // the first real signal that processing is over.
    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
        report(88, "process");
      }
    };
    // Body streaming back (~88 -> ~99 by Content-Length).
    xhr.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        report(88 + (e.loaded / e.total) * 11, "receive");
      }
    };
    xhr.onload = () => {
      report(100, "done");
      const text = xhr.responseText ?? "";
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(text) as UploadResult);
        } catch {
          reject(new Error(`Upload ${xhr.status}: invalid response`));
        }
      } else {
        const body = text.trim();
        reject(
          new Error(`Upload ${xhr.status}${body ? `: ${body.slice(0, 300)}` : ""}`),
        );
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed: network error"));
    xhr.onabort = () => reject(new Error("Upload aborted"));

    const fd = new FormData();
    fd.append("file", file);
    xhr.setRequestHeader("X-API-Key", getApiKey());
    xhr.send(fd);
  });
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

export const reindexDocument = (docId: number) =>
  apiFetch<ReindexResult>(`/api/documents/${docId}/reindex`, {
    method: "POST",
  });

export const deleteDocument = (docId: number) =>
  apiFetch<{ deleted: boolean }>(`/api/documents/${docId}`, {
    method: "DELETE",
  });

/** URL for downloading a document's original source file. */
export const documentDownloadUrl = (docId: number) =>
  `/api/documents/${docId}/download`;

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

/* ---- Conversations (chat history) ---- */

export const fetchConversations = () =>
  apiFetch<{ conversations: Conversation[] }>("/api/conversations");

export const createConversation = (
  projectId?: number | null,
  title?: string,
) =>
  apiFetch<Conversation>("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId ?? null, title }),
  });

export const deleteConversation = (id: number) =>
  apiFetch<{ deleted: boolean }>(`/api/conversations/${id}`, {
    method: "DELETE",
  });

export const fetchConversationMessages = (id: number) =>
  apiFetch<{ messages: ConversationMessage[] }>(
    `/api/conversations/${id}/messages`,
  );

/* ---- Review queue (human-in-the-loop) ---- */

export const fetchReviewQueue = (status = "pending") =>
  apiFetch<{ items: ReviewItem[] }>(`/api/review/queue?status=${status}`);
export const approveReview = (id: number, answer?: string | null) =>
  apiFetch<{ id: number; status: string }>(`/api/review/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ answer: answer ?? null }),
  });
export const rejectReview = (id: number) =>
  apiFetch<{ id: number; status: string }>(`/api/review/${id}/reject`, {
    method: "POST",
  });

/* ---- Telemetry ---- */

export const fetchTelemetryRuns = () =>
  apiFetch<{ runs: TelemetryRun[] }>("/api/telemetry/runs");
export const fetchTelemetryCost = () =>
  apiFetch<CostSummary>("/api/telemetry/cost");
export const resetTelemetry = () =>
  apiFetch<{ reset: boolean }>("/api/telemetry/reset", { method: "POST" });

/* ---- Regulatory ---- */

export const fetchRegulatoryFeed = () =>
  apiFetch<{ items: RegulatoryFeedItem[] }>("/api/regulatory/feed");
export const fetchRegulatoryStatus = () =>
  apiFetch<RegulatoryState>("/api/regulatory/status");
export const pollRegulatory = () =>
  apiFetch<RegulatoryState>("/api/regulatory/poll", { method: "POST" });
