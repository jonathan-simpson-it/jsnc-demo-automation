"""Tests for email summary generator."""

import tempfile
from datetime import datetime, timezone, timedelta

from src.compliance.audit import AuditLog
from src.compliance.summary import SummaryGenerator


def _seed_audit(db_path: str, count: int = 5) -> None:
    """Seed the audit log with sample entries."""
    audit = AuditLog(db_path=db_path)
    agents = ["due_diligence", "term_sheet", "compliance", "lp_report", "cross_doc"]
    users = ["analyst_001", "analyst_002", "admin_001"]
    for i in range(count):
        audit.log_query(
            query=f"What is the risk level for deal {i}?",
            response=f"Deal {i} has moderate risk.",
            agent_type=agents[i % len(agents)],
            trace=[{"node": "classify", "ms": 5}, {"node": "search", "ms": 100}],
            user_id=users[i % len(users)],
            confidence=0.85 + (i * 0.02),
        )


def test_generate_week_summary():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = f"{tmpdir}/audit.db"
        _seed_audit(db_path, count=5)

        gen = SummaryGenerator(db_path=db_path)
        result = gen.generate(period="week")

        assert result["period"] == "week"
        assert result["period_label"] == "Last 7 Days"
        assert result["total_queries"] == 5
        assert result["avg_confidence"] > 0
        assert len(result["agent_breakdown"]) > 0
        assert len(result["user_activity"]) > 0
        assert len(result["top_queries"]) > 0
        assert "PE AI System" in result["email_markdown"]
        assert "Total Queries" in result["email_markdown"]


def test_generate_month_summary():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = f"{tmpdir}/audit.db"
        _seed_audit(db_path, count=3)

        gen = SummaryGenerator(db_path=db_path)
        result = gen.generate(period="month")

        assert result["period"] == "month"
        assert result["period_label"] == "Last 30 Days"
        assert result["total_queries"] == 3


def test_empty_summary():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = f"{tmpdir}/audit.db"
        gen = SummaryGenerator(db_path=db_path)
        result = gen.generate(period="week")

        assert result["total_queries"] == 0
        assert result["avg_confidence"] == 0.0
        assert len(result["agent_breakdown"]) == 0
        assert "No data yet" not in result["email_markdown"]


def test_email_markdown_format():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = f"{tmpdir}/audit.db"
        _seed_audit(db_path, count=3)

        gen = SummaryGenerator(db_path=db_path)
        result = gen.generate(period="week")

        md = result["email_markdown"]
        assert "# PE AI System" in md
        assert "## Key Metrics" in md
        assert "## Agent Usage" in md
        assert "## User Activity" in md
        assert "## Recent Queries" in md
        assert "audit trail" in md.lower()
