"""Enums and constants for PE domain."""

from enum import Enum


class DocumentType(str, Enum):
    """Types of documents in the PE knowledge base."""

    INVESTMENT_MEMO = "investment_memo"
    TERM_SHEET = "term_sheet"
    FINANCIAL_MODEL = "financial_model"
    PORTFOLIO_REPORT = "portfolio_report"
    COMPLIANCE_DOC = "compliance_doc"
    LEGAL_AGREEMENT = "legal_agreement"


class RiskLevel(str, Enum):
    """Risk severity levels for compliance and due diligence."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AgentType(str, Enum):
    """Types of specialist agents."""

    DUE_DILIGENCE = "due_diligence"
    TERM_SHEET = "term_sheet"
    LP_REPORT = "lp_report"
    COMPLIANCE = "compliance"
