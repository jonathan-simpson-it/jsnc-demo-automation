"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  clearApiKey,
  getApiKey,
  saveApiKey,
  subscribeApiKey,
} from "@/lib/api-key";

interface ApiKeyValue {
  key: string;
  hasKey: boolean;
  serverKeyConfigured: boolean;
  setKey: (key: string) => void;
  removeKey: () => void;
}

const ApiKeyContext = createContext<ApiKeyValue | null>(null);

export function ApiKeyProvider({ children }: { children: React.ReactNode }) {
  const [key, setKeyState] = useState<string>("");
  const [serverKeyConfigured, setServerKeyConfigured] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setKeyState(getApiKey());
    return subscribeApiKey(setKeyState);
  }, []);

  useEffect(() => {
    fetch("/health")
      .then((r) => r.json())
      .then((h) => setServerKeyConfigured(Boolean(h?.server_key_configured)))
      .catch(() => setServerKeyConfigured(false));
  }, []);

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const setKey = useCallback(
    (next: string) => {
      saveApiKey(next);
      showToast("API key saved — stored only in this browser, never on our servers.");
    },
    [showToast],
  );

  const removeKey = useCallback(() => {
    clearApiKey();
  }, []);

  return (
    <ApiKeyContext.Provider
      value={{
        key,
        hasKey: key.length > 0,
        serverKeyConfigured,
        setKey,
        removeKey,
      }}
    >
      {children}
      {toast && (
        <div
          role="status"
          className="api-key-toast"
          style={{
            position: "fixed",
            bottom: "1.25rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--color-ink)",
            color: "var(--color-bg)",
            padding: "0.7rem 1.1rem",
            borderRadius: "var(--radius-md)",
            fontSize: "0.85rem",
            zIndex: 60,
            boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
            maxWidth: "min(30rem, calc(100vw - 2rem))",
          }}
        >
          {toast}
        </div>
      )}
    </ApiKeyContext.Provider>
  );
}

export function useApiKey(): ApiKeyValue {
  const ctx = useContext(ApiKeyContext);
  if (!ctx) throw new Error("useApiKey must be used inside <ApiKeyProvider>");
  return ctx;
}
