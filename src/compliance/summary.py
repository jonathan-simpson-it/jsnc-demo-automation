"""Email summary generator from audit trail.

Queries the audit log for a time period (week/month) and produces
an email-ready markdown summary with key metrics, top queries,
agent usage breakdown, and per-user activity.
"""

from __future__ import annotations

import sqlite3
import threading
from collections import Counter
from datetime import datetime, timezone, timedelta


class SummaryGenerator:
    """Generate email-ready summaries from the audit trail."""

    def __init__(self, db_path: str = "./data/audit.db"):
        self.db_path = db_path
        self._local = threading.local()

    def _conn(self) -> sqlite3.Connection:
        conn = getattr(self._local, "conn", None)
        if conn is None or not isinstance(conn, sqlite3.Connection):
            conn = sqlite3.connect(self.db_path, timeout=5)
            conn.execute("PRAGMA journal_mode=WAL")
            self._local.conn = conn
            # Ensure table exists (in case AuditLog hasn't been used yet)
            conn.execute(
                """CREATE TABLE IF NOT EXISTS audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    query TEXT NOT NULL,
                    response TEXT NOT NULL,
                    agent_type TEXT NOT NULL,
                    trace TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    confidence REAL,
                    prev_hash TEXT,
                    entry_hash TEXT NOT NULL
                )"""
            )
            conn.commit()
        return conn

    def _get_entries(self, since: datetime) -> list[dict]:
        """Get all audit entries since a given datetime."""
        conn = self._conn()
        since_iso = since.isoformat()
        rows = conn.execute(
            "SELECT timestamp, query, response, agent_type, user_id, confidence "
            "FROM audit_log WHERE timestamp >= ? ORDER BY timestamp DESC",
            (since_iso,),
        ).fetchall()
        return [
            {
                "timestamp": r[0],
                "query": r[1],
                "response": r[2],
                "agent_type": r[3],
                "user_id": r[4],
                "confidence": r[5],
            }
            for r in rows
        ]

    def generate(self, period: str = "week") -> dict:
        """Generate a summary for the given period.

        Args:
            period: "week" (last 7 days) or "month" (last 30 days).

        Returns:
            Dict with metrics, top_queries, agent_breakdown, user_activity,
            and email_markdown (ready-to-send email body).
        """
        now = datetime.now(timezone.utc)
        if period == "month":
            since = now - timedelta(days=30)
            period_label = "Last 30 Days"
        else:
            since = now - timedelta(days=7)
            period_label = "Last 7 Days"

        entries = self._get_entries(since)

        # --- Metrics ---
        total_queries = len(entries)
        if total_queries == 0:
            avg_confidence = 0.0
        else:
            avg_confidence = sum(e["confidence"] or 0 for e in entries) / total_queries

        # --- Agent breakdown ---
        agent_counts = Counter(e["agent_type"] for e in entries)
        agent_breakdown = [
            {"agent": agent, "count": count, "pct": round(count / total_queries * 100, 1) if total_queries else 0}
            for agent, count in agent_counts.most_common()
        ]

        # --- User activity ---
        user_counts = Counter(e["user_id"] for e in entries)
        user_activity = [
            {"user": user, "queries": count}
            for user, count in user_counts.most_common()
        ]

        # --- Top queries (most recent first, deduplicated) ---
        seen = set()
        top_queries = []
        for e in entries:
            q = e["query"][:100]
            if q not in seen:
                seen.add(q)
                top_queries.append({
                    "query": q,
                    "agent": e["agent_type"],
                    "confidence": e["confidence"],
                    "timestamp": e["timestamp"],
                })
            if len(top_queries) >= 10:
                break

        # --- Build email markdown ---
        email_md = self._build_email(
            period_label=period_label,
            since=since,
            total=total_queries,
            avg_confidence=avg_confidence,
            agent_breakdown=agent_breakdown,
            user_activity=user_activity,
            top_queries=top_queries,
        )

        return {
            "period": period,
            "period_label": period_label,
            "since": since.isoformat(),
            "total_queries": total_queries,
            "avg_confidence": round(avg_confidence, 3),
            "agent_breakdown": agent_breakdown,
            "user_activity": user_activity,
            "top_queries": top_queries,
            "email_markdown": email_md,
        }

    def _build_email(
        self,
        period_label: str,
        since: datetime,
        total: int,
        avg_confidence: float,
        agent_breakdown: list[dict],
        user_activity: list[dict],
        top_queries: list[dict],
    ) -> str:
        """Build the email-ready markdown string."""
        now = datetime.now(timezone.utc).strftime("%B %d, %Y")
        since_str = since.strftime("%B %d, %Y")

        lines = [
            f"# PE AI System — {period_label} Summary",
            f"",
            f"**Report Period:** {since_str} – {now}",
            f"**Generated:** {now}",
            f"",
            f"---",
            f"",
            f"## Key Metrics",
            f"",
            f"| Metric | Value |",
            f"|--------|-------|",
            f"| Total Queries | {total} |",
            f"| Avg Confidence | {avg_confidence:.1%} |",
            f"| Active Users | {len(user_activity)} |",
            f"| Agent Types Used | {len(agent_breakdown)} |",
            f"",
        ]

        # Agent breakdown
        if agent_breakdown:
            lines.extend([
                f"## Agent Usage",
                f"",
                f"| Agent | Queries | Share |",
                f"|-------|---------|-------|",
            ])
            for a in agent_breakdown:
                lines.append(f"| {a['agent']} | {a['count']} | {a['pct']}% |")
            lines.append("")

        # User activity
        if user_activity:
            lines.extend([
                f"## User Activity",
                f"",
                f"| User | Queries |",
                f"|------|---------|",
            ])
            for u in user_activity:
                lines.append(f"| {u['user']} | {u['queries']} |")
            lines.append("")

        # Top queries
        if top_queries:
            lines.extend([
                f"## Recent Queries",
                f"",
            ])
            for i, q in enumerate(top_queries, 1):
                ts = q["timestamp"][:16].replace("T", " ")
                conf = f"{q['confidence']:.0%}" if q["confidence"] else "—"
                lines.append(f"{i}. **{q['query']}**")
                lines.append(f"   — _{q['agent']}_ | {conf} confidence | {ts}")
                lines.append("")

        # Footer
        lines.extend([
            f"---",
            f"",
            f"_This report was auto-generated by the PE AI Engineering Platform._",
            f"_Audit trail integrity: tamper-evident hash chain (SHA-256)._",
        ])

        return "\n".join(lines)
