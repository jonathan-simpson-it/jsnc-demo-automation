"use client";
import { useState, useRef, useEffect, Suspense, useCallback } from "react";
import type { KeyboardEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  streamAgent,
  fetchProjects,
  fetchConversations,
  createConversation,
  deleteConversation,
  fetchConversationMessages,
  fetchDocumentList,
  uploadDocument,
} from "@/lib/api";
import type {
  AgentResponse,
  Conversation,
  ConversationMessage,
  DocumentInfo,
  Project,
  TraceEntry,
} from "@/lib/types";
import ChatMessage from "@/components/ChatMessage";
import PipelineInspector from "@/components/PipelineInspector";
import StatusBadge from "@/components/StatusBadge";
import { useApiKey } from "@/components/ApiKeyProvider";
import { KeyPrompt } from "@/components/KeySettings";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentType?: string;
  citations?: string[];
  trace?: TraceEntry[];
  confidence?: number;
}

const AGENTS = [
  { value: "", label: "Auto-route" },
  { value: "due_diligence", label: "Due Diligence" },
  { value: "term_sheet", label: "Term Sheet" },
  { value: "lp_report", label: "LP Report" },
  { value: "compliance", label: "Compliance Auditor" },
  { value: "cross_doc", label: "Cross-Document" },
];

const AGENT_NAMES: Record<string, string> = {
  due_diligence: "Due Diligence Agent",
  term_sheet: "Term Sheet Extractor",
  lp_report: "LP Report Generator",
  compliance: "Compliance Auditor",
  cross_doc: "Cross-Document Comparison",
};

/** A file staged in the composer, waiting to be ingested on send. */
interface StagedFile {
  id: string;
  file: File;
}

/** An @-mention chip: a project document or a project-level tag. */
interface MentionChip {
  id: string;
  kind: "doc" | "tag";
  token: string;
}

interface MentionItem {
  kind: "doc" | "tag";
  token: string;
  meta: string;
}

const ACCEPTED_UPLOAD = ".pdf,.txt,.md,.docx,.xlsx";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Vector namespace slug used for the ingestion status line, e.g. `personal_hku`. */
function namespaceLabel(p: Project): string {
  const a = (p.client_name || "no_client").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const b = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return `${a}_${b}`.replace(/_+/g, "_").replace(/^_|_$/g, "");
}

/**
 * Locate the `@token` region around a caret position in the prompt text.
 * Returns null when the caret is not inside (or right after) an @-mention.
 */
function atTokenAt(
  text: string,
  caret: number,
): { start: number; end: number; token: string } | null {
  if (!text || caret <= 0) return null;
  let s = caret;
  while (s > 0 && text[s - 1] !== " " && text[s - 1] !== "\n") s -= 1;
  if (text[s] !== "@" || s === caret) return null;
  let e = caret;
  while (e < text.length && text[e] !== " " && text[e] !== "\n") e += 1;
  if (e <= s + 1) return null;
  const token = text.slice(s + 1, e);
  if (token.includes("@")) return null;
  return { start: s, end: e, token };
}

/**
 * Resolve mention chips + raw `@token` text into exact document filenames.
 * Docs resolve to their own filename; tags resolve to every document in the
 * project carrying that tag. Unknown tokens resolve to nothing.
 */
function resolveTaggedFilenames(
  text: string,
  chips: MentionChip[],
  docs: DocumentInfo[],
): string[] {
  const out = new Set<string>();
  const docByName = new Map(docs.map((d) => [d.filename, d]));
  const tagToDocs = new Map<string, DocumentInfo[]>();
  for (const d of docs) {
    for (const t of d.tags || []) {
      const list = tagToDocs.get(t.name) || [];
      list.push(d);
      tagToDocs.set(t.name, list);
    }
  }
  const addTag = (name: string) => {
    for (const d of tagToDocs.get(name) || []) out.add(d.filename);
  };
  for (const c of chips) {
    if (c.kind === "doc") out.add(c.token);
    else addTag(c.token);
  }
  const re = /(?:^|[\s(])@([^\s@]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const t = m[1];
    if (docByName.has(t)) out.add(t);
    else addTag(t);
  }
  return Array.from(out);
}

const SUGGESTIONS: Record<string, string[]> = {
  due_diligence: [
    "Summarize the key risks in the Enosis pitch deck",
    "What is the pre-money valuation?",
    "Who are the lead investors?",
  ],
  term_sheet: [
    "Extract the liquidation preference terms",
    "What anti-dilution provisions are included?",
    "List the protective provisions",
  ],
  lp_report: [
    "Generate a Q3 2026 LP report",
    "What are the portfolio highlights?",
    "Summarize the risk factors",
  ],
  compliance: [
    "Audit the term sheet for SFC, HKMA and AMLO gaps",
    "Which jurisdictions and regulations apply to this document?",
    "List the corrective actions the audit requires",
  ],
  cross_doc: [
    "Compare liquidation preferences across all decks",
    "What are the key differences between proposals?",
    "Synthesize the board seat allocations",
  ],
  "": [
    "What are the key risks in the Enosis deal?",
    "Extract term sheet data from the Dr. Yip proposal",
    "Compare the three pitch decks",
  ],
};

function timeAgo(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function workspaceLabel(projectId: number | null, projects: Project[]): string {
  if (projectId === null) return "Global workspace";
  const p = projects.find((x) => x.id === projectId);
  if (!p) return "Project workspace";
  return p.client_name ? `${p.client_name} › ${p.name}` : p.name;
}

function serverMessageToLocal(m: ConversationMessage): Message {
  let content = m.content;
  if (m.is_error) {
    const detail = content.replace(/^Error:\s*/i, "").trim().slice(0, 160);
    if (detail && /invalid|authentication|401|402/i.test(detail)) {
      content =
        "Your request was rejected by the model service. Check the API key in the header button — it may be invalid or out of credit.";
    } else if (detail) {
      content = `The model service couldn't complete this turn (${detail}). Add your API key with the header API key button, then try again.`;
    } else {
      content = "The model service couldn't complete this turn. Please try again.";
    }
  }
  return {
    id: `s-${m.id}`,
    role: m.role,
    content,
    agentType: m.agent_type ?? undefined,
    citations: m.citations,
    trace: m.trace,
    confidence: m.confidence ?? undefined,
  };
}

function ChatInner() {
  const searchParams = useSearchParams();
  const initialAgent = searchParams.get("agent") || "";

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: initialAgent
        ? `Hello — I'm your ${AGENT_NAMES[initialAgent] || initialAgent}, tuned for private markets. Ask me anything about the documents in this workspace — every answer comes with its sources.`
        : "Hello — I'm the Jonathan Simpson & Co. AI analyst for private markets. Ask me about due diligence, term sheets, LP reports, or SFC- and HKMA-aware compliance — grounded in the documents in this workspace.",
    },
  ]);
  const [input, setInput] = useState("");
  const [agentType, setAgentType] = useState(initialAgent);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingNode, setStreamingNode] = useState("");
  const convScrollRef = useRef<HTMLDivElement>(null);
  const stickBottomRef = useRef(true);
  const justSwitchedRef = useRef(false);
  const prevStreamingRef = useRef(false);
  const queuedTurnRef = useRef(false);

  // --- Composer: attachments + @-mentions ---
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [mentions, setMentions] = useState<MentionChip[]>([]);
  const [projectDocs, setProjectDocs] = useState<DocumentInfo[]>([]);
  const [uploadNotice, setUploadNotice] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [atOpen, setAtOpen] = useState(false);
  const [atQuery, setAtQuery] = useState("");
  const [atIndex, setAtIndex] = useState(0);
  const atTokenRef = useRef<{ start: number; end: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputEl = useRef<HTMLInputElement>(null);

  // --- Chat history / project workspaces ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [workspace, setWorkspace] = useState<string>(""); // "" = Global
  const [activeConv, setActiveConv] = useState<number | null>(null);
  // Project whose documents ground the open thread (null = Global workspace).
  // Kept separate from the rail filter so the per-message scope label always
  // reflects the conversation that produced the messages.
  const [threadProjectId, setThreadProjectId] = useState<number | null>(null);
  const [railOpen, setRailOpen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);

  // Welcome suggestions follow the selected agent; derived at render time
  // (never round-tripped through state, which caused an infinite update loop).
  const welcomeSuggestions = SUGGESTIONS[agentType] || SUGGESTIONS[""];

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetchConversations();
      setConversations(res.conversations);
    } catch {
      /* backend offline: rail stays empty */
    }
  }, []);

  // Bootstrap: projects, conversation list, narrow-screen detection
  useEffect(() => {
    fetchProjects()
      .then((res) => setProjects(res.projects))
      .catch(() => {});
    refreshConversations();
    const mq = window.matchMedia("(max-width: 767px)");
    setIsNarrow(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [refreshConversations]);

  // Documents/tags of the active project feed the @-mention popover. Fetched
  // from the server on every project switch so the list is always live.
  useEffect(() => {
    if (threadProjectId === null) {
      setProjectDocs([]);
      setMentions([]);
      return;
    }
    let alive = true;
    fetchDocumentList({ project_id: threadProjectId })
      .then((res) => {
        if (alive) setProjectDocs(res.documents);
      })
      .catch(() => {
        if (alive) setProjectDocs([]);
      });
    return () => {
      alive = false;
    };
  }, [threadProjectId]);

  // Chat history is ephemeral per conversation load; a fresh visit opens at the
  // top instead of restoring a deep scroll from a previous session.
  useEffect(() => {
    const resetTop = () => window.scrollTo({ top: 0, left: 0 });
    resetTop();
    const t = window.setTimeout(resetTop, 150);
    return () => window.clearTimeout(t);
  }, []);

  // Auto-scroll rule: the conversation follows only while the user is pinned
  // to the bottom (within 8px), and only for actual content changes — never
  // for the act of sending. Pressing Enter does not move the view at all
  // (the submit moment is skipped), and pipeline node events (header labels
  // like "Classifying query") do not trigger scrolling either. When the
  // final answer lands the view follows once — but only if the user is still
  // at the bottom, so reading history above is never yanked. Opening a
  // conversation or starting a new chat jumps instantly to the end.
  useEffect(() => {
    const el = convScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      stickBottomRef.current =
        el.scrollHeight - el.scrollTop - el.clientHeight <= 8;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = convScrollRef.current;
    if (!el) return;
    if (justSwitchedRef.current) {
      justSwitchedRef.current = false;
      el.scrollTop = el.scrollHeight;
      stickBottomRef.current = true;
      return;
    }
    const wasStreaming = prevStreamingRef.current;
    prevStreamingRef.current = isStreaming;
    // Submit moment (stream just started): never scroll.
    if (isStreaming && !wasStreaming) return;
    // Idle message changes (e.g. history reconcile): no scrolling either.
    if (!isStreaming && !wasStreaming) return;
    if (stickBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  const { hasKey, serverKeyConfigured } = useApiKey();
  const showKeyPrompt = !hasKey && !serverKeyConfigured;

  async function openConversation(conv: Conversation) {
    if (isStreaming) return;
    try {
      const res = await fetchConversationMessages(conv.id);
      setActiveConv(conv.id);
      setThreadProjectId(conv.project_id ?? null);
            justSwitchedRef.current = true;
      setMessages(res.messages.length ? res.messages.map(serverMessageToLocal) : []);
    } catch {
      /* skip */
    }
    setRailOpen(false);
    setAtOpen(false);
  }

  async function handleNewChat() {
    if (isStreaming) return;
    setActiveConv(null);
    setThreadProjectId(workspace ? Number(workspace) : null);
    justSwitchedRef.current = true;
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hello! I'm your PE AI assistant. Ask about the documents in the current workspace, or pick a project to scope answers to its documents.",
      },
    ]);
    setRailOpen(false);
    setAtOpen(false);
  }

  async function handleDeleteConversation(conv: Conversation) {
    if (isStreaming) return;
    if (!window.confirm(`Delete chat "${conv.title}"? This cannot be undone.`))
      return;
    try {
      await deleteConversation(conv.id);
      if (activeConv === conv.id) await handleNewChat();
      await refreshConversations();
    } catch {
      /* skip */
    }
  }

  function handleWorkspaceChange(next: string) {
    if (isStreaming) return;
    setWorkspace(next);
    setActiveConv(null);
    setThreadProjectId(next ? Number(next) : null);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          next === ""
            ? "Global workspace: answers may draw on every document in the knowledge base."
            : "Project workspace: answers will only draw on documents assigned to this project.",
      },
    ]);
    setRailOpen(false);
    setAtOpen(false);
  }

  async function handleSend(query?: string) {
    const q = (query || input).trim();
    const hasFiles = stagedFiles.length > 0;
    if (!q && !hasFiles) return;
    if (isStreaming || isUploading) return;

    const activeProject =
      threadProjectId !== null
        ? projects.find((p) => p.id === threadProjectId) || null
        : null;
    const finalQuery =
      q ||
      (hasFiles
        ? stagedFiles.length === 1
          ? `Summarize the attached document "${stagedFiles[0].file.name}"`
          : "Summarize the attached documents"
        : "");

    // Attachments and @-tags must land in a project's isolated namespace.
    if ((hasFiles || mentions.length > 0) && !activeProject) {
      setUploadNotice({
        ok: false,
        text: "Attachments and @-mentions need a project workspace — pick one in the Chats rail, then retry.",
      });
      return;
    }
    setUploadNotice(null);

    // A fresh chat needs a conversation first (in the current workspace)
    let conversationId = activeConv;
    if (conversationId === null) {
      try {
        const projectId = workspace ? Number(workspace) : null;
        const conv = await createConversation(projectId);
        conversationId = conv.id;
        setActiveConv(conv.id);
        setThreadProjectId(projectId);
      } catch {
        return;
      }
    }

    // Ingest staged attachments into the conversation's project namespace.
    const ingested: { name: string; ok: boolean }[] = [];
    if (hasFiles && activeProject) {
      setIsUploading(true);
      for (const s of stagedFiles) {
        try {
          const res = await uploadDocument(
            s.file,
            activeProject.client_id,
            activeProject.id,
          );
          ingested.push({ name: res.filename || s.file.name, ok: true });
        } catch {
          ingested.push({ name: s.file.name, ok: false });
        }
      }
      setIsUploading(false);
      setStagedFiles([]);
      const okNames = ingested.filter((u) => u.ok).map((u) => u.name);
      if (okNames.length > 0) {
        setUploadNotice({
          ok: okNames.length === ingested.length,
          text: `Uploaded & vectorized: ${okNames.join(", ")} → namespace ${namespaceLabel(activeProject)}`,
        });
        // Refresh the @-mention list so a just-uploaded file is taggable in
        // the very next prompt without switching projects.
        fetchDocumentList({ project_id: activeProject.id })
          .then((res) => setProjectDocs(res.documents))
          .catch(() => {});
      }
    }

    setInput("");
    setMentions([]);
    setAtOpen(false);
    queuedTurnRef.current = false;
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: finalQuery },
    ]);
    setIsStreaming(true);
    setStreamingNode("");

    const taggedFilenames = resolveTaggedFilenames(
      finalQuery,
      mentions,
      projectDocs,
    );

    try {
      let final: AgentResponse | null = null;
      for await (const ev of streamAgent({
        query: finalQuery,
        agent_type: agentType || null,
        conversation_id: conversationId,
        tagged_filenames:
          taggedFilenames.length > 0 ? taggedFilenames : undefined,
      })) {
        if (ev.done && ev.response) final = ev.response;
        else if (ev.node) setStreamingNode(ev.node);
      }
      if (final) {
        const meta = (final.metadata ?? {}) as {
          review?: { id?: number; status?: string };
          error?: boolean;
        };
        if (meta.error) {
          const detail = final.result
            .replace(/^Error:\s*/i, "")
            .trim()
            .slice(0, 240);
          const rejected =
            !detail || /invalid|authentication|401|402|api key/i.test(detail);
          setMessages((prev) => [
            ...prev,
            {
              id: `e-${Date.now()}`,
              role: "assistant",
              content: rejected
                ? "Your request was rejected by the model service. Check the API key in the header button — it may be invalid or out of credit."
                : `The model service returned an error: ${detail}`,
            },
          ]);
        } else if (meta.review) {
          // Queued for human review: not shown as an answer, and not persisted
          // to the conversation until an officer approves/edits it.
          queuedTurnRef.current = true;
          setMessages((prev) => [
            ...prev,
            {
              id: `r-${Date.now()}`,
              role: "assistant",
              content:
                "This answer is pending human review in the Review Hub. It will appear here once approved.",
            },
          ]);
        } else {
          let content = final.result;
          try {
            content = JSON.stringify(JSON.parse(final.result), null, 2);
          } catch {
            /* keep */
          }
          setMessages((prev) => [
            ...prev,
            {
              id: `a-${Date.now()}`,
              role: "assistant",
              content,
              agentType: final!.agent_type,
              citations: final!.citations,
              trace: (final!.metadata?.trace as TraceEntry[]) || [],
              confidence: final!.confidence_score,
            },
          ]);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content:
              "I wasn't able to generate a response. Try rephrasing your question or selecting a different agent.",
          },
        ]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      let friendly = "Something went wrong. Please try again.";
      if (msg.includes("500") || msg.includes("Stream")) {
        friendly =
          "The backend couldn't process this request. Add your API key with the header API key button.";
      } else if (msg.includes("401") || msg.includes("403")) {
        friendly = "Authentication failed. Check your API key configuration.";
      } else if (
        msg.includes("fetch") ||
        msg.includes("network") ||
        msg.includes("Connection")
      ) {
        friendly =
          "Can't reach the backend. Make sure the API server is running on port 8000.";
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: friendly,
        },
      ]);
    } finally {
      setIsStreaming(false);
      setStreamingNode("");
      // Server is the source of truth: reconcile list + messages
      await refreshConversations();
      const queued = queuedTurnRef.current;
      queuedTurnRef.current = false;
      let reconciled = false;
      if (conversationId !== null) {
        try {
          const res = await fetchConversationMessages(conversationId);
          if (res.messages.length) {
            setMessages(res.messages.map(serverMessageToLocal));
            reconciled = true;
          }
        } catch {
          /* keep local echo */
        }
      }
      // A queued answer is not persisted server-side, so the reconcile above
      // would erase its notice; re-show it so the turn never looks silent.
      if (queued && reconciled) {
        setMessages((prev) => [
          ...prev,
          {
            id: `r-${Date.now()}`,
            role: "assistant",
            content:
              "This answer is pending human review in the Review Hub. It will appear here once approved.",
          },
        ]);
      }
    }
  }

  // --- Composer handlers: prompt typing, @-mention pick/remove, attachments ---

  function handlePromptChange(e: {
    target: { value: string; selectionStart: number | null };
  }) {
    const value = e.target.value;
    const caret = e.target.selectionStart ?? value.length;
    setInput(value);
    // Prune chips whose @token was deleted from the text so a stale tag is
    // never silently sent.
    setMentions((prev) => prev.filter((m) => value.includes("@" + m.token)));
    const at = atTokenAt(value, caret);
    if (at) {
      atTokenRef.current = { start: at.start, end: at.end };
      setAtQuery(at.token);
      setAtIndex(0);
      setAtOpen(true);
    } else {
      atTokenRef.current = null;
      setAtOpen(false);
    }
  }

  function handlePromptKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (atOpen && popItems.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAtIndex((i) => (i + 1) % popItems.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAtIndex((i) => (i - 1 + popItems.length) % popItems.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        pickMention(popItems[Math.min(atIndex, popItems.length - 1)]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setAtOpen(false);
        atTokenRef.current = null;
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  /** Insert the chosen doc/tag as an @token and register its chip. */
  function pickMention(item: MentionItem) {
    const region = atTokenRef.current;
    setInput((prev) => {
      const start = region
        ? Math.min(Math.max(region.start, 0), prev.length)
        : prev.length;
      const end = region
        ? Math.min(Math.max(region.end, start), prev.length)
        : prev.length;
      return prev.slice(0, start) + "@" + item.token + " " + prev.slice(end);
    });
    setMentions((prev) =>
      prev.some((m) => m.kind === item.kind && m.token === item.token)
        ? prev
        : [...prev, { id: uid(), kind: item.kind, token: item.token }],
    );
    setAtOpen(false);
    atTokenRef.current = null;
    requestAnimationFrame(() => inputEl.current?.focus());
  }

  /** Remove a chip and strip its @token from the prompt text. */
  function dropMention(id: string) {
    const chip = mentions.find((m) => m.id === id);
    if (!chip) return;
    setMentions((prev) => prev.filter((m) => m.id !== id));
    const tokenText = "@" + chip.token;
    setInput((prev) => {
      const i = prev.indexOf(tokenText);
      return i >= 0 ? prev.slice(0, i) + prev.slice(i + tokenText.length) : prev;
    });
    requestAnimationFrame(() => inputEl.current?.focus());
  }

  function handleAttachFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    setStagedFiles((prev) => [
      ...prev,
      ...files.map((f) => ({ id: uid(), file: f })),
    ]);
    requestAnimationFrame(() => inputEl.current?.focus());
  }

  function removeStaged(id: string) {
    setStagedFiles((prev) => prev.filter((s) => s.id !== id));
  }

  const nodeLabels: Record<string, string> = {
    classify: "Classifying query",
    search: "Searching documents",
    narrow: "Selecting sources",
    answer: "Generating answer",
    verify: "Verifying answer",
    wide_search: "Deep search",
  };

  const isHero =
    messages.length === 0 || (messages.length === 1 && messages[0].id === "welcome");
  const activeAgentName = AGENT_NAMES[agentType] || "PE AI Assistant";
  const threadLabel = workspaceLabel(threadProjectId, projects);

  // @-mention candidates: this project's documents first, then the tags that
  // appear on them. Filtered live by whatever follows the "@" being typed.
  const mentionCandidates: MentionItem[] = [];
  if (threadProjectId !== null) {
    const seen = new Set<string>();
    for (const d of projectDocs) {
      if (seen.has(d.filename)) continue;
      seen.add(d.filename);
      mentionCandidates.push({
        kind: "doc",
        token: d.filename,
        meta: d.doc_type
          ? `${d.doc_type} · ${d.chunks} chunks`
          : `${d.chunks} chunks`,
      });
    }
    const tagCounts = new Map<string, number>();
    for (const d of projectDocs) {
      for (const t of d.tags || []) {
        tagCounts.set(t.name, (tagCounts.get(t.name) || 0) + 1);
      }
    }
    for (const [name, count] of Array.from(tagCounts.entries())) {
      if (seen.has(name)) continue;
      seen.add(name);
      mentionCandidates.push({
        kind: "tag",
        token: name,
        meta: count === 1 ? "1 document" : `${count} documents`,
      });
    }
  }
  const popItems = mentionCandidates
    .filter((i) => i.token.toLowerCase().includes(atQuery.toLowerCase()))
    .slice(0, 14);

  const visibleConversations = conversations.filter((c) =>
    workspace ? c.project_id === Number(workspace) : c.project_id === null,
  );

  const rail = (
    <aside className="rail" aria-label="Chat history">
      <div className="rail-head">
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--color-ink)",
          }}
        >
          Chats
        </span>
        <button
          type="button"
          onClick={handleNewChat}
          aria-label="New chat"
          className="send-btn"
          style={{ width: "1.75rem", height: "1.75rem" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>

      <div style={{ padding: "0 1rem 0.6rem" }}>
        <select
          value={workspace}
          onChange={(e) => handleWorkspaceChange(e.target.value)}
          aria-label="Project workspace"
          className="select"
          style={{ width: "100%", fontSize: "0.8rem" }}
        >
          <option value="">Global workspace</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.client_name ? `${p.client_name} / ` : ""}
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rail-body">
        {visibleConversations.length === 0 ? (
          <div className="rail-empty">
            {workspace
              ? "No chats in this project yet. Start one to keep answers scoped to the project's documents."
              : "No chats yet. Start one below."}
          </div>
        ) : (
          visibleConversations.map((c) => (
            <div
              key={c.id}
              className={`rail-row${activeConv === c.id ? " is-active" : ""}`}
            >
              <button
                type="button"
                className="rail-row-btn"
                onClick={() => openConversation(c)}
                aria-current={activeConv === c.id ? "true" : undefined}
              >
                <div className="rail-row-btn-title">{c.title}</div>
                <div className="rail-row-btn-meta">
                  {c.message_count} messages · {timeAgo(c.updated_at)}
                </div>
              </button>
              <button
                type="button"
                className="rail-del"
                aria-label={`Delete chat ${c.title}`}
                onClick={() => handleDeleteConversation(c)}
              >
                x
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );

  return (
    <div className="chat-shell flex" style={{ position: "relative" }}>
      <h1 className="sr-only">AI Chat</h1>

      {/* Rail: inline on wide screens, drawer on narrow ones */}
      {!isNarrow && rail}
      {isNarrow && railOpen && (
        <div className="chat-drawer">
          <button
            type="button"
            className="chat-drawer-backdrop"
            onClick={() => setRailOpen(false)}
            aria-label="Close history"
          />
          {rail}
        </div>
      )}

      <div
        className="flex flex-col min-w-0 flex-1"
        style={{ height: "100%" }}
      >
        {/* Top strip */}
        <div
          className="flex items-center gap-3 px-4 sm:px-6 shrink-0"
          style={{
            minHeight: "3rem",
            borderBottom: "1px solid var(--color-line)",
            background: "var(--color-surface)",
          }}
        >
          {isNarrow && (
            <button
              type="button"
              onClick={() => setRailOpen(true)}
              aria-label="Open chat history"
              aria-expanded={railOpen}
              className="agent-pill"
            >
              History
            </button>
          )}
          <img
            src="/jsco-logo.png"
            alt=""
            width={24}
            height={24}
            className="rounded-full"
            style={{ objectFit: "cover" }}
          />
          <StatusBadge />
          <div style={{ flex: 1 }} />
          {streamingNode ? (
            <span
              aria-live="polite"
              className="flex items-center gap-2"
              style={{ color: "var(--color-accent)", fontSize: "0.78rem" }}
            >
              <span className="streaming-dots" aria-hidden="true" style={{ padding: 0 }}>
                <span />
                <span />
                <span />
              </span>
              {nodeLabels[streamingNode] || streamingNode}
            </span>
          ) : (
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--color-muted)",
                letterSpacing: "0.04em",
              }}
            >
              {activeAgentName}
            </span>
          )}
        </div>

        {/* Messages */}
        <div
          ref={convScrollRef}
          role="log"
          aria-label="Conversation"
          aria-live="polite"
          aria-relevant="additions"
          className="flex-1 overflow-y-auto"
          style={{ background: "var(--color-bg)" }}
        >
          {isHero ? (
            <div
              className="mx-auto w-full max-w-2xl px-5"
              style={{ minHeight: "100%", display: "flex" }}
            >
              <div
                className="w-full flex flex-col items-center text-center py-8 sm:py-10"
                style={{ margin: "auto" }}
              >
                <div className="chat-avatar chat-avatar--lg" aria-hidden="true">
                  <img src="/jsco-logo.png" alt="" width={80} height={80} />
                </div>
                <h2
                  style={{
                    marginTop: "1.5rem",
                    fontFamily: "var(--font-display)",
                    fontWeight: 400,
                    fontSize: "clamp(1.7rem, 4vw, 2.4rem)",
                    lineHeight: 1.15,
                    letterSpacing: "-0.01em",
                    color: "var(--color-ink)",
                  }}
                >
                  What can I help with?
                </h2>
                <p
                  style={{
                    marginTop: "0.6rem",
                    color: "var(--color-muted)",
                    fontSize: "0.92rem",
                    maxWidth: "34rem",
                  }}
                >
                  {agentType ? (
                    <>
                      You're chatting with{" "}
                      <strong style={{ color: "var(--color-ink)", fontWeight: 600 }}>
                        {activeAgentName}
                      </strong>{" "}
                      in the{" "}
                      <strong style={{ color: "var(--color-ink)", fontWeight: 600 }}>
                        {workspace
                          ? projects.find((p) => p.id === Number(workspace))?.name ||
                            "selected project"
                          : "Global workspace"}
                      </strong>
                      .
                    </>
                  ) : (
                    <>
                      You're chatting with the{" "}
                      <strong style={{ color: "var(--color-ink)", fontWeight: 600 }}>
                        Jonathan Simpson &amp; Co. AI analyst
                      </strong>{" "}
                      for private markets — grounded in this workspace's
                      documents, with sources on every answer. Ask about due
                      diligence, term sheets, LP reports, or SFC- and HKMA-aware
                      compliance.
                    </>
                  )}
                </p>
                <div
                  className="grid gap-3 w-full sm:grid-cols-2"
                  style={{ marginTop: "2rem", textAlign: "left" }}
                >
                  {welcomeSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="suggestion-card"
                      onClick={() => handleSend(s)}
                    >
                      <span>{s}</span>
                      <span className="suggestion-card-arrow" aria-hidden="true">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M7 17L17 7" />
                          <path d="M7 7h10v10" />
                        </svg>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-6 space-y-6">
              {messages
                .filter((m) => m.id !== "welcome")
                .map((m) =>
                  m.role === "user" ? (
                    <ChatMessage
                      key={m.id}
                      role="user"
                      content={m.content}
                      scopeLabel={threadLabel}
                    />
                  ) : (
                    <div key={m.id} className="flex items-start gap-3">
                      <div className="chat-avatar" aria-hidden="true">
                        <img src="/jsco-logo.png" alt="" width={30} height={30} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <ChatMessage
                          role="assistant"
                          content={m.content}
                          agentType={m.agentType}
                          citations={m.citations}
                          trace={m.trace}
                          scopeLabel={threadLabel}
                        />
                        {m.trace && m.trace.length > 0 && (
                          <div style={{ marginTop: "0.4rem", maxWidth: "100%" }}>
                            <PipelineInspector
                              trace={m.trace}
                              citations={m.citations || []}
                              agentType={m.agentType || "unknown"}
                              confidence={m.confidence || 0.8}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                )}

              {isStreaming && (
                <div className="flex items-start gap-3">
                  <div className="chat-avatar" aria-hidden="true">
                    <img src="/jsco-logo.png" alt="" width={30} height={30} />
                  </div>
                  <div
                    className="flex items-center justify-center"
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-line)",
                      borderRadius: "1.25rem",
                      minHeight: "2.6rem",
                      padding: "0 1rem",
                    }}
                    aria-label="Thinking"
                  >
                    <span className="streaming-dots">
                      <span />
                      <span />
                      <span />
                    </span>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Composer */}
        <div
          className="shrink-0"
          style={{
            background: "var(--color-bg)",
            padding: "0.4rem 1rem 0.85rem",
          }}
        >
          <div className="mx-auto w-full max-w-[1400px]">
            <div
              role="group"
              aria-label="Choose agent"
              className="flex flex-wrap gap-1.5"
              style={{ marginBottom: "0.45rem" }}
            >
              {AGENTS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  aria-pressed={agentType === a.value}
                  onClick={() => setAgentType(a.value)}
                  className="agent-pill"
                >
                  {a.label}
                </button>
              ))}
            </div>

            <div className="composer-wrap">
              {/* @-mention popover: project documents + tags */}
              {atOpen && (
                <div
                  className="mention-pop"
                  role="listbox"
                  aria-label="Tag a document or tag"
                >
                  <div className="mention-pop-head">
                    {threadProjectId === null
                      ? "Pick a project workspace first"
                      : `Tag retrieval into ${threadLabel}`}
                  </div>
                  {threadProjectId === null ? (
                    <div className="mention-pop-empty">
                      @-mentions scope retrieval to one project's documents.
                      Pick a project in the Chats rail, then type @ to tag
                      files or tags.
                    </div>
                  ) : popItems.length === 0 ? (
                    <div className="mention-pop-empty">
                      No documents or tags match “{atQuery}” in this project.
                    </div>
                  ) : (
                    popItems.map((it, idx) => (
                      <button
                        key={`${it.kind}:${it.token}`}
                        type="button"
                        role="option"
                        aria-selected={atIndex === idx}
                        className={`mention-item${
                          atIndex === idx ? " is-active" : ""
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickMention(it)}
                      >
                        {it.kind === "doc" ? (
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--color-muted)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            style={{ flexShrink: 0 }}
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <path d="M14 2v6h6" />
                          </svg>
                        ) : (
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--color-muted)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            style={{ flexShrink: 0 }}
                          >
                            <path d="M4 9h16" />
                            <path d="M4 15h16" />
                            <path d="M10 3L8 21" />
                            <path d="M16 3l-2 18" />
                          </svg>
                        )}
                        <span className="mention-item-name">{it.token}</span>
                        <span style={{ flex: 1 }} />
                        <span className="mention-item-meta">
                          {it.kind === "doc" ? "document" : "tag"} · {it.meta}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Ingestion status after sending attachments */}
              {uploadNotice && (
                <div
                  className="chat-notice"
                  role="status"
                  style={{
                    borderColor: uploadNotice.ok
                      ? "var(--color-accent)"
                      : "var(--color-error)",
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={
                      uploadNotice.ok
                        ? "var(--color-accent)"
                        : "var(--color-error)"
                    }
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {uploadNotice.ok ? (
                      <path d="M20 6L9 17l-5-5" />
                    ) : (
                      <path d="M18 6L6 18M6 6l12 12" />
                    )}
                  </svg>
                  <span
                    style={{
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {uploadNotice.text}
                  </span>
                </div>
              )}

              {/* First-run API key prompt (no user key and no server key) */}
              {showKeyPrompt && (
                <KeyPrompt
                  onConfigure={() =>
                    window.dispatchEvent(new Event("opencode:open-key-settings"))
                  }
                />
              )}

              <div className="composer">
                <div className="composer-stack">
                  {/* Staged attachments + @-mention chips */}
                  {(stagedFiles.length > 0 || mentions.length > 0) && (
                    <div className="chat-chip-row" aria-label="Attachments and @-mentions">
                      {stagedFiles.map((s) => (
                        <span key={s.id} className="chat-chip chat-chip-file">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--color-muted)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            style={{ flexShrink: 0 }}
                          >
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                          </svg>
                          <span className="chat-chip-name">{s.file.name}</span>
                          <span className="chat-chip-meta">
                            {formatBytes(s.file.size)}
                          </span>
                          <button
                            type="button"
                            className="chat-chip-x"
                            aria-label={`Remove ${s.file.name}`}
                            onClick={() => removeStaged(s.id)}
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              aria-hidden="true"
                            >
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                      {mentions.map((m) => (
                        <span
                          key={m.id}
                          className={`chat-chip ${
                            m.kind === "doc"
                              ? "chat-chip-doc"
                              : "chat-chip-tag"
                          }`}
                        >
                          <span className="chat-chip-name">@{m.token}</span>
                          <span className="chat-chip-meta">
                            {m.kind === "doc" ? "document" : "tag"}
                          </span>
                          <button
                            type="button"
                            className="chat-chip-x"
                            aria-label={`Remove @${m.token}`}
                            onClick={() => dropMention(m.id)}
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              aria-hidden="true"
                            >
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="composer-row">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={ACCEPTED_UPLOAD}
                      className="hidden"
                      aria-hidden="true"
                      tabIndex={-1}
                      onChange={(e) => {
                        handleAttachFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      className="attach-btn"
                      aria-label="Attach files to upload into the current project"
                      title={
                        threadProjectId === null
                          ? "Pick a project workspace in the Chats rail to attach files"
                          : "Attach files — uploaded to this project's namespace on send"
                      }
                      disabled={
                        isStreaming || isUploading || threadProjectId === null
                      }
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                    </button>

                    <input
                      ref={inputEl}
                      type="text"
                      value={input}
                      onChange={handlePromptChange}
                      onKeyDown={handlePromptKeyDown}
                      placeholder={
                        agentType
                          ? `Ask the ${AGENT_NAMES[agentType] || agentType}...`
                          : threadProjectId !== null
                            ? "Ask about this project's documents, or type @ to tag a specific file..."
                            : "Ask about PE deals, term sheets, compliance..."
                      }
                      aria-label={
                        agentType
                          ? `Message the ${AGENT_NAMES[agentType] || agentType}`
                          : "Message the PE AI assistant"
                      }
                      disabled={isStreaming || isUploading}
                    />
                    <button
                      type="button"
                      onClick={() => handleSend()}
                      disabled={
                        isStreaming ||
                        isUploading ||
                        (!input.trim() && stagedFiles.length === 0)
                      }
                      className="send-btn"
                      aria-label={
                        isStreaming || isUploading
                          ? "Working…"
                          : "Send message"
                      }
                    >
                      {isStreaming || isUploading ? (
                        <span
                          className="streaming-dots"
                          style={{ padding: 0 }}
                          aria-hidden="true"
                        >
                          <span style={{ background: "#ffffff" }} />
                          <span style={{ background: "#ffffff" }} />
                          <span style={{ background: "#ffffff" }} />
                        </span>
                      ) : (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M12 19V5" />
                          <path d="M5 12l7-7 7 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p
              style={{
                textAlign: "center",
                fontSize: "0.72rem",
                color: "var(--color-muted)",
                marginTop: "0.5rem",
              }}
            >
              {workspace
                ? "Answers are scoped to this project's documents only."
                : "Answers cite their sources. Verify important facts before relying on them."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "calc(100vh - 3.5rem)",
            color: "var(--color-muted)",
            fontSize: "0.88rem",
          }}
        >
          Loading...
        </div>
      }
    >
      <ChatInner />
    </Suspense>
  );
}
