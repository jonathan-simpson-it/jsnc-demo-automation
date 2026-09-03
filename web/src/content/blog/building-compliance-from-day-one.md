---
title: "Building Compliance Into AI Systems"
description: "Why HKMA and SFC compliance should be a first-class architectural concern."
pubDate: 2026-08-15
author: "Jonathan Simpson"
tags: ["Compliance", "HKMA", "SFC", "Architecture"]
---

Most AI systems treat compliance as a wrapper. Build the system, then add logging and audit trails after. This fails because bolt-on compliance misses edge cases — PII leaking through cache, audit gaps in streaming responses, model version drift.

When we build AI systems for SME financial institutions, compliance is Layer 0.

<figure style="display:flex;gap:1.5rem;align-items:center;margin:2rem 0;background:var(--color-surface);border:1px solid var(--color-line);border-radius:var(--radius-lg);padding:1.5rem;flex-wrap:wrap;">
  <a href="https://www.sfc.hk/en/" target="_blank" rel="noopener noreferrer"><img src="/pictures/sfc-logo.svg" alt="Securities and Futures Commission (SFC) logo" style="height:36px;width:auto;background:#fff;border-radius:6px;padding:4px 8px;border:1px solid var(--color-line);"/></a>
  <a href="https://www.hkma.gov.hk/eng/" target="_blank" rel="noopener noreferrer"><img src="/pictures/hkma-logo.png" alt="Hong Kong Monetary Authority (HKMA) logo" style="height:36px;width:auto;background:#fff;border-radius:6px;padding:4px 8px;border:1px solid var(--color-line);"/></a>
  <figcaption style="font-size:0.8rem;color:var(--color-muted);line-height:1.5;flex:1;min-width:12rem;">We build compliance-first systems against the standards these regulators publish. Logos belong to their owners and identify official sources.</figcaption>
</figure>

**Immutable Audit Trail** — Every query logged with SHA-256 hash chain. Tamper-evident without external dependencies.

**PII Redaction** — Before data touches logs, cache, or exports, our redaction layer detects and masks emails, HKIDs, phone numbers, bank accounts, and credit cards.

**Model Version Pinning** — HKMA requires firms to freeze model versions. Our system tracks model name, version, config hash, and deployment timestamp.

**Document-Level RBAC** — Not just "who can query" but "who can query which documents."

A system that's compliant by construction, not by exception.
