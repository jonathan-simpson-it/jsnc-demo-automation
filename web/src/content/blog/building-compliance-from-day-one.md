---
title: "Building Compliance Into AI Systems"
description: "Why HKMA and SFC compliance should be a first-class architectural concern."
pubDate: 2026-08-15
author: "Jonathan Simpson"
tags: ["Compliance", "HKMA", "SFC", "Architecture"]
---

Most AI systems treat compliance as a wrapper. Build the system, then add logging and audit trails after. This fails because bolt-on compliance misses edge cases — PII leaking through cache, audit gaps in streaming responses, model version drift.

When we build AI systems for SME financial institutions, compliance is Layer 0.

**Immutable Audit Trail** — Every query logged with SHA-256 hash chain. Tamper-evident without external dependencies.

**PII Redaction** — Before data touches logs, cache, or exports, our redaction layer detects and masks emails, HKIDs, phone numbers, bank accounts, and credit cards.

**Model Version Pinning** — HKMA requires firms to freeze model versions. Our system tracks model name, version, config hash, and deployment timestamp.

**Document-Level RBAC** — Not just "who can query" but "who can query which documents."

A system that's compliant by construction, not by exception.
