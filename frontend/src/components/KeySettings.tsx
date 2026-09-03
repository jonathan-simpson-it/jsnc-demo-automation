"use client";

import { useEffect, useRef, useState } from "react";
import { useApiKey } from "@/components/ApiKeyProvider";

export function KeyForm({ onDone }: { onDone?: () => void }) {
  const { key, setKey, removeKey } = useApiKey();
  const [value, setValue] = useState("");

  if (key) {
    return (
      <div style={{ width: "min(22rem, calc(100vw - 3rem))" }}>
        <p style={{ fontSize: "0.8rem", color: "var(--color-muted)", lineHeight: 1.5 }}>
          Your API key is stored <strong>only in this browser</strong>{" "}
          (localStorage) and is sent with your requests — never saved on our
          servers.
        </p>
        <p style={{ fontSize: "0.82rem" }}>
          Active key: <code>{key.slice(0, 4)}••••••••{key.slice(-4)}</code>
        </p>
        <button
          type="button"
          className="button button--small"
          onClick={() => {
            removeKey();
            onDone?.();
          }}
        >
          Remove key
        </button>
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={onDone}
          style={{ marginLeft: "0.5rem" }}
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: "min(22rem, calc(100vw - 3rem))" }}>
      <p style={{ fontSize: "0.8rem", color: "var(--color-muted)", lineHeight: 1.5 }}>
        Bring your own API key. It is stored <strong>only in this browser</strong>{" "}
        (localStorage) and sent with your requests — never saved on our servers.
      </p>
      <label
        htmlFor="api-key-input"
        style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "0.75rem" }}
      >
        API key
      </label>
      <input
        id="api-key-input"
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="sk-..."
        autoComplete="off"
        className="input"
        style={{ width: "100%" }}
      />
      <button
        type="button"
        className="button"
        style={{ width: "100%", marginTop: "0.75rem" }}
        onClick={() => {
          if (value.trim()) setKey(value);
          onDone?.();
        }}
      >
        Save key
      </button>
      <a
        href="https://platform.deepseek.com"
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: "0.78rem", color: "var(--color-accent)", display: "inline-block", marginTop: "0.5rem" }}
      >
        Get a free API key
      </a>
    </div>
  );
}

export function KeySettings() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { key, serverKeyConfigured } = useApiKey();

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    function openHandler() {
      setOpen(true);
    }
    window.addEventListener("opencode:open-key-settings", openHandler);
    return () =>
      window.removeEventListener("opencode:open-key-settings", openHandler);
  }, []);

  const label = key
    ? "My key active"
    : serverKeyConfigured
      ? "Server key in use"
      : "Add API key";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="button button--ghost"
        style={{ fontSize: "0.72rem", padding: "0.4rem 0.75rem" }}
        title="API key settings"
      >
        {label}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 0.5rem)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            borderRadius: "var(--radius-md)",
            padding: "1rem",
            zIndex: 50,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          <KeyForm onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

export function KeyPrompt({ onConfigure }: { onConfigure: () => void }) {
  return (
    <div
      style={{
        border: "1px solid var(--color-accent)",
        background: "var(--color-accent-soft)",
        borderRadius: "var(--radius-md)",
        padding: "0.85rem 1rem",
        fontSize: "0.88rem",
        marginBottom: "0.75rem",
      }}
    >
      <strong>Add your API key to start asking questions.</strong>{" "}
      <span style={{ color: "var(--color-muted)" }}>
        This platform keeps no server-side key — yours stays in your browser.
      </span>{" "}
      <button type="button" className="button button--small" onClick={onConfigure}>
        Set up key
      </button>
    </div>
  );
}
