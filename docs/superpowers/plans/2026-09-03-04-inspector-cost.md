# Pipeline Inspector & Token Cost Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing (but unused) cost tracker into real LLM calls and expose a Developer launchpad app showing recent pipeline runs (node traces, latency) plus token/cost analytics.

**Architecture:** Instrument `src/agents/graph.py` LLM chokepoints with char-estimated token counts into the existing `cost_tracker` singleton; keep a bounded in-memory run log (`src/utils/telemetry.py`); endpoints under `/api/telemetry`; UI `/telemetry`.

**Tech Stack:** Existing `src/utils/cost_tracker.py`, FastAPI, Next.js 14.

**Spec:** Launchpad vision item 6. Verified facts: `cost_tracker.record_call(node, input_tokens, output_tokens)` already exists; `_invoke_text(llm, messages, retries=2)` at `graph.py:360` is the main LLM chokepoint; `_select_sources_llm` does a direct `.invoke` at `graph.py:397`.

## Global Constraints

- No git commits; no new Python deps.
- Tests must run offline (fake LLM objects; monkeypatch `cost_tracker` state via `reset()`).
- Frontend: `tsc --noEmit` only; no emojis; JS&C tokens.

---

### Task 1: Instrument LLM calls in the graph

**Files:**
- Modify: `src/agents/graph.py`

**Interfaces (consumed by Task 2):** `cost_tracker.get_summary()` shape from `src/utils/cost_tracker.py`: `{calls, total_input_tokens, total_output_tokens, total_cost, by_node: {node: {calls, tokens, cost}}}`; `cost_tracker.reset()`.

- [ ] **Step 1:** Import: `from src.utils.cost_tracker import cost_tracker`.
- [ ] **Step 2:** Change `_invoke_text` signature to `_invoke_text(llm, messages, node="unknown", retries: int = 2)`. After a successful response `text` (before returning), estimate and record:
  `in_tokens = max(1, sum(len(str(m.content or "")) for m in messages) // 4)`, `out_tokens = max(1, len(text) // 4)`; call `cost_tracker.record_call(node, in_tokens, out_tokens)`. On retried failures return early as today (record nothing on hard failure).
- [ ] **Step 3:** Pass `node=` at every call site: classify fallback LLM (`_classify`/classify paths → `"classify"`), `answer_node` → `"answer"`, `verify_node` → `"verify"`, `wide_search_node` → `"wide_search"`.
- [ ] **Step 4:** Instrument `_select_sources_llm`'s direct `llm.invoke(...)` at `graph.py:397`: capture `raw`, estimate with `len(SOURCE_SELECTION_PROMPT… formatted + raw)//4`, and record `cost_tracker.record_call("narrow", in_tokens, out_tokens)` inside the existing try.
- [ ] **Step 5:** Tests `tests/test_cost_tracking.py`: fake LLM object with `invoke(messages)` returning an object with `.content = "Fake answer text " * 10`; call `graph._invoke_text(fake_llm, [fake_msgs], node="answer")` after `cost_tracker.reset()`; assert `get_summary()["by_node"]["answer"]["calls"] == 1` and `total_cost > 0`; assert `reset()` zeroes totals. Also a direct-call test of the narrow instrumentation via a fake `llm` and patched messages if `_select_sources_llm` is importable (otherwise assert only `_invoke_text` — document).

### Task 2: Run log + telemetry endpoints

**Files:**
- Create: `src/utils/telemetry.py`
- Create: `src/api/routes/telemetry.py`
- Modify: `src/agents/router.py`, `src/api/main.py`

- [ ] **Step 1:** `telemetry.py`:

```python
import threading
class RunLog:
    def __init__(self, maxlen: int = 100):
        self.maxlen = maxlen; self._runs: list[dict] = []; self._lock = threading.Lock()
    def push(self, run: dict) -> None:
        with self._lock:
            self._runs.append(run)
            if len(self._runs) > self.maxlen:
                del self._runs[: len(self._runs) - self.maxlen]
    def all(self) -> list[dict]:
        with self._lock:
            return list(self._runs)
    def reset(self) -> None:
        with self._lock:
            self._runs.clear()
run_log = RunLog()
```

- [ ] **Step 2:** In `RouterAgent.invoke` and `invoke_streaming`: snapshot `cost_before = cost_tracker.get_summary()["total_cost"]` before graph execution and `cost_after` after; build run dict `{"ts": <iso or time.time()>, "query": query, "agent_type": agent_type_final, "routing_method": routing, "confidence": confidence, "trace": trace, "total_ms": sum(t.get("ms",0) for t in trace), "error": bool(meta.get("error")), "cost": round(cost_after - cost_before, 6)}` and `run_log.push(...)` (invoke: at end before return; invoke_streaming: after loop, once, alongside the final response). Wrap in try/except so telemetry never breaks execution.
- [ ] **Step 3:** Endpoints: `GET /api/telemetry/runs` → `{"runs": run_log.all()}`; `GET /api/telemetry/cost` → `cost_tracker.get_summary()`; `POST /api/telemetry/reset` → resets both `cost_tracker` and `run_log`, returns `{"reset": True}`. Register in `main.py`.
- [ ] **Step 4:** Tests `tests/test_telemetry.py`: monkeypatch `get_router_agent` with a fake router (invoke returns high-confidence AgentResponse with a 2-node trace) → POST `/api/agents/execute` → `GET /api/telemetry/runs` contains one run with that trace and `error: false`; `POST /api/telemetry/reset` then runs empty and cost summary zero.

### Task 3: Dashboard UI

**Files:**
- Create: `frontend/src/app/telemetry/page.tsx`
- Modify: `frontend/src/lib/api.ts`, `frontend/src/lib/types.ts`, `frontend/src/lib/apps.tsx` (key `telemetry`, category `"Developer"`, href `/telemetry`, activity icon)

- [ ] **Step 1:** Types: `TelemetryRun { ts: number; query: string; agent_type: string; routing_method: string; confidence: number; trace: TraceEntry[]; total_ms: number; error: boolean; cost: number }`, `CostSummary { calls: number; total_input_tokens: number; total_output_tokens: number; total_cost: number; by_node: Record<string, { calls: number; tokens: number; cost: number }> }`. Helpers `fetchTelemetryRuns()`, `fetchTelemetryCost()`, `resetTelemetry()`.
- [ ] **Step 2:** Page: cards (Total cost $, Calls, Tokens, per-node table w/ calls/tokens/cost rows); runs table newest-first: time (relative via `timeAgo`-style helper on `ts*1000`), agent, routing chip, confidence %, total_ms via `formatMs`, cost, error text marker (text not color); expandable row shows per-node bars with ms labels (reuse `traceSummary`/`formatMs`, no color-only). Refresh + "Reset" (with confirm) buttons; empty state.
- [ ] **Step 3:** `tsc` PASS; Playwright live: run one chat query (backend up; DeepSeek offline yields an error run — good), `/telemetry` shows ≥1 run row with error text and cost table populated; reset empties; console clean; no overflow 390/1440.
