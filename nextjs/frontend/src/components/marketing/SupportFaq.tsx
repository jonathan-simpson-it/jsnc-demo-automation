"use client";

import { useState } from "react";
import type { Faq } from "@/content/site";

export default function SupportFaq({ faqs }: { faqs: readonly Faq[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div style={{ maxWidth: "45rem" }}>
      {faqs.map((f, i) => {
        const open = openIdx === i;
        return (
          <details
            key={f.q}
            className="faq-row"
            open={open}
            onToggle={(e) => setOpenIdx((e.currentTarget as HTMLDetailsElement).open ? i : null)}
            style={{ borderBottom: "1px solid var(--color-line)", padding: "1.25rem 0" }}
          >
            <summary>
              {f.q}
              <span className="faq-icon" style={{ color: "var(--color-accent)", fontSize: "1.25rem" }}>
                {open ? "−" : "+"}
              </span>
            </summary>
            <p style={{ marginTop: "1rem", color: "var(--color-muted)" }}>{f.a}</p>
          </details>
        );
      })}
    </div>
  );
}
