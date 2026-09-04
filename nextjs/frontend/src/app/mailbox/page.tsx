"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createGraphDraft,
  fetchGraphDrafts,
  fetchGraphMail,
  fetchGraphMailStatus,
  generateAiReply,
} from "@/lib/api";
import type {
  GraphEmail,
  ReplyIntent,
  SavedDraft,
} from "@/lib/types";

const INTENTS: { key: ReplyIntent; label: string }[] = [
  { key: "acknowledge", label: "Confirm & Acknowledge" },
  { key: "clarify", label: "Request Clarification" },
  { key: "compliance", label: "Provide Compliance Summary" },
  { key: "custom", label: "Custom Prompt" },
];

type Selection =
  | { kind: "email"; email: GraphEmail }
  | { kind: "draft"; draft: SavedDraft }
  | null;

function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fullDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MailWorkspacePage() {
  const [mailStatus, setMailStatus] = useState<{
    configured: boolean;
    demo?: boolean;
    reason?: string;
    mailbox?: string;
  } | null>(null);
  const [mailEmails, setMailEmails] = useState<GraphEmail[]>([]);
  const [mailLoading, setMailLoading] = useState(false);
  const [mailError, setMailError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<SavedDraft[]>([]);
  const [tab, setTab] = useState<"mail" | "drafts">("mail");
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Selection>(null);

  // Inline AI reply composer state.
  const [intent, setIntent] = useState<ReplyIntent>("acknowledge");
  const [instructions, setInstructions] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const mailActive = !!mailStatus && (!!mailStatus.configured || !!mailStatus.demo);

  const refreshDrafts = useCallback(async () => {
    if (!mailActive) return;
    try {
      const res = await fetchGraphDrafts(20);
      setDrafts(res.drafts);
    } catch {
      setDrafts([]);
    }
  }, [mailActive]);

  const selectEmail = useCallback((email: GraphEmail, scrollToComposer = false) => {
    setSelection((prev) => {
      if (prev?.kind === "email" && prev.email.id === email.id) return prev;
      setReplyTo(email.from_email);
      setReplySubject(email.subject ? `Re: ${email.subject}` : "");
      setReplyBody("");
      setNote(null);
      return { kind: "email", email };
    });
    if (scrollToComposer) {
      requestAnimationFrame(() =>
        composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  }, []);

  const selectDraft = useCallback((draft: SavedDraft) => {
    setSelection((prev) => {
      if (prev?.kind === "draft" && prev.draft.id === draft.id) return prev;
      setReplyTo(draft.to);
      setReplySubject(draft.subject);
      setReplyBody("");
      setNote(null);
      return { kind: "draft", draft };
    });
  }, []);

  useEffect(() => {
    let alive = true;
    fetchGraphMailStatus()
      .then((st) => {
        if (!alive) return;
        setMailStatus(st);
        if (!st.configured && !st.demo) return;
        setMailLoading(true);
        fetchGraphMail(30)
          .then((r) => {
            if (!alive) return;
            setMailEmails(r.emails);
            if (r.emails.length > 0) {
              setSelection({ kind: "email", email: r.emails[0] });
              setReplyTo(r.emails[0].from_email);
              setReplySubject(r.emails[0].subject ? `Re: ${r.emails[0].subject}` : "");
              setReplyBody("");
            }
          })
          .catch(() => alive && setMailError("Couldn't load the mailbox."))
          .finally(() => alive && setMailLoading(false));
      })
      .catch(() =>
        alive && setMailStatus({ configured: false, reason: "Graph mail unavailable." }),
      );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (mailActive) refreshDrafts();
  }, [mailActive, refreshDrafts]);

  async function generate() {
    if (!mailActive) return;
    setBusy(true);
    setNote(null);
    try {
      let senderName = "";
      let senderEmail = "";
      let originalSubject = "";
      let originalBody = "";
      if (selection?.kind === "email") {
        senderName = selection.email.from;
        senderEmail = selection.email.from_email;
        originalSubject = selection.email.subject || "";
        originalBody = selection.email.body_preview || "";
      } else if (selection?.kind === "draft") {
        // The draft's subject is itself a "Re: ..." reply subject; strip the
        // prefix so the generator reconstructs the original thread subject.
        originalSubject = selection.draft.subject.replace(/^Re:\s*/i, "");
      }
      const draft = await generateAiReply({
        sender_name: senderName,
        sender_email: senderEmail,
        subject: originalSubject,
        body: originalBody,
        intent,
        instructions,
      });
      setReplySubject(draft.subject);
      setReplyBody(draft.body);
      setNote({
        ok: true,
        text:
          draft.generated_by === "ai"
            ? "AI reply generated. Review and edit before saving."
            : "Template reply generated. Add an API key to enable AI refinement.",
      });
    } catch (e) {
      setNote({
        ok: false,
        text: e instanceof Error ? e.message : "Couldn't generate the reply.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!mailActive || !replySubject.trim() || !replyBody.trim()) return;
    setBusy(true);
    setNote(null);
    try {
      const to = replyTo
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const res = await createGraphDraft(replySubject, replyBody, to);
      setNote({
        ok: true,
        text: `Draft saved${
          mailStatus?.demo
            ? " (demo, stored locally)"
            : res.draft_link
              ? ", open it in Outlook to review"
              : ""
        }.`,
      });
      await refreshDrafts();
    } catch (e) {
      setNote({
        ok: false,
        text: e instanceof Error ? e.message : "Couldn't save the draft.",
      });
    } finally {
      setBusy(false);
    }
  }

  const q = search.trim().toLowerCase();
  const visibleEmails = q
    ? mailEmails.filter((e) =>
        [e.from, e.from_email, e.subject, e.body_preview].some((v) =>
          (v || "").toLowerCase().includes(q),
        ),
      )
    : mailEmails;
  const visibleDrafts = q
    ? drafts.filter((d) =>
        [d.subject, d.to].some((v) => (v || "").toLowerCase().includes(q)),
      )
    : drafts;

  const selectedEmail = selection?.kind === "email" ? selection.email : null;
  const selectedDraft = selection?.kind === "draft" ? selection.draft : null;

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-hidden flex bg-neutral-50/50">
      {/* ===================== Left panel: feed & saved drafts ===================== */}
      <aside className="w-96 shrink-0 border-r border-neutral-200/80 bg-white flex flex-col">
        <div className="p-3 pb-2 border-b border-neutral-200/80 space-y-2">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Outlook Mail
            </span>
            {mailStatus?.demo && (
              <span className="text-[11px] text-neutral-400">demo</span>
            )}
          </div>
          <div className="flex rounded-lg bg-neutral-100 p-1 gap-1">
            <button
              type="button"
              onClick={() => setTab("mail")}
              className={`flex-1 rounded-md py-1.5 text-xs transition-colors ${
                tab === "mail"
                  ? "bg-white font-semibold text-neutral-900 shadow-sm"
                  : "font-medium text-neutral-500 hover:text-neutral-700"
              }`}
            >
              Recent Mail ({mailEmails.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("drafts")}
              className={`flex-1 rounded-md py-1.5 text-xs transition-colors ${
                tab === "drafts"
                  ? "bg-white font-semibold text-neutral-900 shadow-sm"
                  : "font-medium text-neutral-500 hover:text-neutral-700"
              }`}
            >
              Saved Drafts ({drafts.length})
            </button>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "mail" ? "Search mail…" : "Search drafts…"}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {mailLoading && tab === "mail" && (
            <p className="px-4 py-8 text-center text-xs text-neutral-400">
              Loading mailbox...
            </p>
          )}
          {!mailLoading && mailError && tab === "mail" && (
            <p className="px-4 py-8 text-center text-xs text-red-500">{mailError}</p>
          )}
          {!mailLoading && mailStatus && !mailActive && (
            <p className="px-4 py-8 text-center text-xs text-neutral-400 leading-relaxed">
              {mailStatus.reason || "Mailbox access is not configured."}
            </p>
          )}

          {mailActive && tab === "mail" && !mailLoading && !mailError && (
            <>
              {visibleEmails.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-neutral-400">
                  {q ? "No messages match your search." : "No messages in the mailbox yet."}
                </p>
              ) : (
                visibleEmails.map((email) => {
                  const selected = selectedEmail?.id === email.id;
                  return (
                    <button
                      key={email.id}
                      type="button"
                      onClick={() => selectEmail(email)}
                      className={`group w-full cursor-pointer border-l-4 px-4 py-3 text-left transition-colors ${
                        selected
                          ? "border-neutral-900 bg-neutral-100/80"
                          : "border-transparent hover:bg-neutral-100/80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-neutral-900">
                          {email.from || "(unknown sender)"}
                        </span>
                        <span className="shrink-0 text-xs text-neutral-400 tabular-nums">
                          {shortDate(email.received_at)}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-sm text-neutral-700">
                        {email.subject || "(no subject)"}
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-neutral-400">
                          {email.body_preview}
                        </span>
                        <span className="hidden shrink-0 rounded-md border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-700 group-hover:inline">
                          Draft Reply
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </>
          )}

          {mailActive && tab === "drafts" && (
            <>
              {visibleDrafts.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-neutral-400">
                  {q ? "No drafts match your search." : "No saved drafts yet. Generate and save a reply to see it here."}
                </p>
              ) : (
                visibleDrafts.map((draft) => {
                  const selected = selectedDraft?.id === draft.id;
                  return (
                    <button
                      key={draft.id}
                      type="button"
                      onClick={() => selectDraft(draft)}
                      className={`group w-full cursor-pointer border-l-4 px-4 py-3 text-left transition-colors ${
                        selected
                          ? "border-neutral-900 bg-neutral-100/80"
                          : "border-transparent hover:bg-neutral-100/80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-neutral-900">
                          {draft.subject || "(no subject)"}
                        </span>
                        <span className="shrink-0 text-xs text-neutral-400 tabular-nums">
                          {shortDate(draft.created_at)}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-neutral-400">
                        {draft.to ? `To: ${draft.to}` : "No recipients"}
                        {draft.demo ? " · demo" : ""}
                      </div>
                    </button>
                  );
                })
              )}
            </>
          )}
        </div>
      </aside>

      {/* ===================== Right panel: selected email + AI reply ===================== */}
      <section className="flex-1 flex flex-col overflow-y-auto p-8">
        {!selection && (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <p className="mb-1 text-sm font-semibold text-neutral-900">
                Select a message
              </p>
              <p className="max-w-xs text-xs text-neutral-500 leading-relaxed">
                Choose an email or saved draft from the left panel to view it and
                generate an AI reply.
              </p>
            </div>
          </div>
        )}

        {selectedEmail && (
          <div className="mx-auto w-full max-w-3xl">
            {/* Incoming email viewer */}
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-neutral-900">
                    {selectedEmail.from || "(unknown sender)"}
                  </div>
                  <div className="truncate text-xs text-neutral-500">
                    {selectedEmail.from_email}
                  </div>
                </div>
                <div className="shrink-0 text-xs text-neutral-400 tabular-nums">
                  {fullDate(selectedEmail.received_at)}
                </div>
              </div>
              <h2 className="mb-4 text-xl font-bold text-neutral-900">
                {selectedEmail.subject || "(no subject)"}
              </h2>
              <div className="whitespace-pre-wrap rounded-xl border border-neutral-200 bg-white p-5 text-sm leading-relaxed text-neutral-700 shadow-sm">
                {selectedEmail.body_preview || "No message body available."}
                {selectedEmail.web_link && (
                  <div className="mt-4">
                    <a
                      href={selectedEmail.web_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-500"
                    >
                      Open in Outlook ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedDraft && (
          <div className="mx-auto w-full max-w-3xl">
            <div className="mb-6">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Saved draft
              </div>
              <h2 className="mb-2 text-xl font-bold text-neutral-900">
                {selectedDraft.subject || "(no subject)"}
              </h2>
              <div className="text-xs text-neutral-500">
                To: {selectedDraft.to || "(no recipients)"}
                {selectedDraft.created_at
                  ? ` · saved ${fullDate(selectedDraft.created_at)}`
                  : ""}
                {selectedDraft.draft_link && (
                  <>
                    {" · "}
                    <a
                      href={selectedDraft.draft_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-500"
                    >
                      Open in Outlook ↗
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {(selectedEmail || selectedDraft) && (
          <div
            ref={composerRef}
            className="mx-auto w-full max-w-3xl scroll-mt-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
          >
            {/* Composer header */}
            <div className="mb-4">
              <h3 className="text-base font-semibold text-neutral-900">
                Generate AI Reply for{" "}
                {selectedEmail
                  ? selectedEmail.from || "Sender"
                  : selectedDraft?.to || "Recipient"}
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500">
                Auto-filled recipients and subject — edit as needed before saving.
              </p>
            </div>

            {/* To / Subject */}
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-neutral-500">
                  To
                </span>
                <input
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="recipient@firm.com"
                  disabled={!mailActive || busy}
                  className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none disabled:opacity-50"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-neutral-500">
                  Subject
                </span>
                <input
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  placeholder="Re: ..."
                  disabled={!mailActive || busy}
                  className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none disabled:opacity-50"
                />
              </label>
            </div>

            {/* Intent pills */}
            <div className="mb-3">
              <span className="mb-1.5 block text-xs font-medium text-neutral-500">
                Reply intent
              </span>
              <div className="flex flex-wrap gap-2">
                {INTENTS.map((it) => (
                  <button
                    key={it.key}
                    type="button"
                    onClick={() => setIntent(it.key)}
                    disabled={!mailActive || busy}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                      intent === it.key
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                    }`}
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt input */}
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Extra instructions for reply (e.g., maintain formal tone, mention SFC guidelines)..."
              disabled={!mailActive || busy}
              className="mb-4 w-full resize-y rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none disabled:opacity-50"
              rows={2}
            />

            {/* Action bar */}
            <div className="mb-4 flex items-center gap-3">
              <button
                type="button"
                onClick={generate}
                disabled={!mailActive || busy}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50"
              >
                {busy ? "Generating…" : "Generate Draft with AI"}
              </button>
              {note && (
                <span
                  className={`text-xs ${
                    note.ok ? "text-emerald-700" : "text-red-500"
                  }`}
                >
                  {note.text}
                </span>
              )}
            </div>

            {/* Generated preview — editable */}
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Generated reply (editable)
            </label>
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="The AI-generated reply will appear here. Edit freely before saving."
              disabled={!mailActive || busy}
              className="mb-4 w-full resize-y rounded-md border border-neutral-200 bg-neutral-50/50 px-3 py-3 font-mono text-sm leading-relaxed text-neutral-800 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none disabled:opacity-50"
              rows={12}
            />

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={saveDraft}
                disabled={!mailActive || busy || !replySubject.trim() || !replyBody.trim()}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-50"
              >
                Save to Outlook Drafts
              </button>
              {mailStatus?.demo && (
                <span className="text-[11px] text-neutral-400">
                  Demo mode: drafts are stored locally until Graph mail is
                  configured in .env.
                </span>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}