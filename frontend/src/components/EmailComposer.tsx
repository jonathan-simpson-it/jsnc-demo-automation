"use client";

import { useState } from "react";
import {
  createGraphDraft,
  generateAiDraft,
} from "@/lib/api";
import type { EmailTemplateKey, EmailTone } from "@/lib/types";
import EmailPreview from "@/components/EmailPreview";

interface Props {
  period: "week" | "month";
  mailActive: boolean;
  demo?: boolean;
  onSaved?: (saved: { subject: string; demo?: boolean }) => void;
}

const TEMPLATES: { key: EmailTemplateKey; label: string }[] = [
  { key: "digest", label: "Weekly digest" },
  { key: "monthly", label: "Monthly report" },
  { key: "client", label: "Client update" },
  { key: "alert", label: "Alert" },
];

const TONES: { key: EmailTone; label: string }[] = [
  { key: "professional", label: "Professional" },
  { key: "friendly", label: "Friendly" },
  { key: "formal", label: "Formal" },
];

export default function EmailComposer({
  period,
  mailActive,
  demo,
  onSaved,
}: Props) {
  const [subject, setSubject] = useState("");
  const [toValue, setToValue] = useState("");
  const [template, setTemplate] = useState<EmailTemplateKey>("digest");
  const [tone, setTone] = useState<EmailTone>("professional");
  const [instructions, setInstructions] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function regenerate() {
    if (!mailActive) return;
    setBusy(true);
    setNote(null);
    try {
      const to = toValue
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const draft = await generateAiDraft({
        period,
        template,
        tone,
        instructions,
        to,
      });
      setSubject(draft.subject);
      setBody(draft.body);
      setNote(
        draft.generated_by === "ai"
          ? { ok: true, text: "AI draft generated — review and save it." }
          : {
              ok: true,
              text: "Template draft generated — add an API key to enable AI refinement.",
            },
      );
      setTab("preview");
    } catch (e) {
      setNote({
        ok: false,
        text: e instanceof Error ? e.message : "Couldn't generate the draft.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!mailActive || !subject.trim() || !body.trim()) return;
    setBusy(true);
    setNote(null);
    try {
      const to = toValue
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const res = await createGraphDraft(subject, body, to);
      setNote({
        ok: true,
        text: `Draft saved${demo ? " (demo — stored locally)" : res.draft_link ? " — open it in Outlook to review" : ""}.`,
      });
      onSaved?.({ subject, demo });
    } catch (e) {
      setNote({
        ok: false,
        text: e instanceof Error ? e.message : "Couldn't save the draft.",
      });
    } finally {
      setBusy(false);
    }
  }

  const chipStyle = (active: boolean) =>
    ({
      background: active ? "var(--color-accent)" : "transparent",
      color: active ? "var(--color-bg)" : "var(--color-ink)",
      border: active ? "1px solid var(--color-accent)" : "1px solid var(--color-line)",
    }) as React.CSSProperties;

  return (
    <div className="panel-card" style={{ padding: "1rem 1.1rem" }}>
      <div className="section-intro" style={{ marginBottom: "0.5rem" }}>
        <span className="section-eyebrow">Compose</span>
        <h2 style={{ fontSize: "1.1rem", margin: 0 }}>
          {period === "week" ? "Weekly" : "Monthly"} email draft
        </h2>
      </div>

      <input
        className="input"
        style={{ width: "100%", marginBottom: "0.6rem", fontWeight: 600 }}
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        disabled={!mailActive || busy}
      />
      <input
        className="input"
        style={{ width: "100%", marginBottom: "0.6rem" }}
        placeholder="To (optional, comma separated)"
        value={toValue}
        onChange={(e) => setToValue(e.target.value)}
        disabled={!mailActive || busy}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.35rem" }}>
        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTemplate(t.key)}
            style={{ ...chipStyle(template === t.key), fontSize: "0.72rem", padding: "0.3rem 0.7rem", borderRadius: "999px", cursor: "pointer" }}
            disabled={!mailActive || busy}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.6rem" }}>
        {TONES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTone(t.key)}
            style={{ ...chipStyle(tone === t.key), fontSize: "0.72rem", padding: "0.3rem 0.7rem", borderRadius: "999px", cursor: "pointer" }}
            disabled={!mailActive || busy}
          >
            {t.label}
          </button>
        ))}
      </div>

      <textarea
        className="input"
        style={{ width: "100%", minHeight: "2.6rem", marginBottom: "0.6rem", resize: "vertical" }}
        placeholder="Extra instructions for the draft (optional)"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        disabled={!mailActive || busy}
      />

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.6rem" }}>
        <button
          type="button"
          className="button"
          onClick={regenerate}
          disabled={!mailActive || busy}
        >
          {busy ? "Working..." : "Draft with AI"}
        </button>
        <button
          type="button"
          className="button button--ghost"
          onClick={() => setTab(tab === "write" ? "preview" : "write")}
          disabled={!mailActive}
        >
          {tab === "write" ? "Preview" : "Write"}
        </button>
      </div>

      {tab === "write" ? (
        <textarea
          className="input"
          style={{
            width: "100%",
            minHeight: "16rem",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "0.82rem",
            lineHeight: 1.55,
            resize: "vertical",
          }}
          placeholder="Email body (markdown-lite: ## sections, **bold**, - bullets)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={!mailActive || busy}
        />
      ) : (
        <div style={{ maxHeight: "24rem", overflowY: "auto" }}>
          {body.trim() ? (
            <EmailPreview text={body} />
          ) : (
            <p style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>
              Nothing to preview yet — draft with AI first.
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        className="button button--solid"
        style={{ width: "100%", marginTop: "0.7rem" }}
        onClick={saveDraft}
        disabled={!mailActive || busy || !subject.trim() || !body.trim()}
      >
        Save to Outlook drafts
      </button>
      {note && (
        <p
          style={{
            margin: "0.7rem 0 0",
            fontSize: "0.8rem",
            lineHeight: 1.45,
            color: note.ok ? "var(--color-accent)" : "var(--color-error)",
          }}
        >
          {note.text}
        </p>
      )}
      {demo && (
        <p style={{ margin: "0.6rem 0 0", fontSize: "0.76rem", color: "var(--color-muted)", lineHeight: 1.5 }}>
          Demo mode — drafts are stored locally until Graph mail is configured
          in .env.
        </p>
      )}
    </div>
  );
}
