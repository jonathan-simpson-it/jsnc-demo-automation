"""Reusable Streamlit UI components."""

import streamlit as st
from src.core.models import (
    DueDiligenceResult,
    TermSheetData,
    LPReport,
    ComplianceCheck,
)


def render_agent_selector() -> str:
    """Render agent selection dropdown.

    Returns:
        Selected agent type.
    """
    agent_options = {
        "🔍 Auto-Route (Smart Selection)": None,
        "📊 Due Diligence Analysis": "due_diligence",
        "📋 Term Sheet Extraction": "term_sheet",
        "📈 LP Report Generation": "lp_report",
        "✅ Compliance Check": "compliance",
    }

    selected = st.selectbox(
        "Select Agent",
        options=list(agent_options.keys()),
        key="agent_selector",
    )

    return agent_options[selected]


def render_due_diligence_result(result: DueDiligenceResult, citations: list[str] | None = None) -> None:
    """Render due diligence analysis results.

    Args:
        result: DueDiligenceResult to render.
        citations: Optional list of source citations.
    """
    st.subheader("📊 Due Diligence Analysis")

    st.markdown(f"**Summary:** {result.summary}")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("**⚠️ Risks:**")
        for risk in result.risks:
            st.markdown(f"- {risk}")

    with col2:
        st.markdown("**✅ Opportunities:**")
        for opp in result.opportunities:
            st.markdown(f"- {opp}")

    st.markdown(f"**💡 Recommendation:** {result.recommendation}")
    st.progress(result.confidence_score)
    st.caption(f"Confidence Score: {result.confidence_score:.1%}")

    if citations:
        st.divider()
        st.markdown("**📚 Sources:**")
        for c in citations:
            st.caption(f"📄 {c}")


def render_term_sheet_data(result: TermSheetData, citations: list[str] | None = None) -> None:
    """Render term sheet extraction results.

    Args:
        result: TermSheetData to render.
        citations: Optional list of source citations.
    """
    st.subheader("📋 Term Sheet Data")

    col1, col2 = st.columns(2)

    with col1:
        st.metric("Company", result.company_name)
        st.metric("Round", result.round_type)
        st.metric("Pre-money Valuation", f"${result.pre_money_valuation:,.0f}")
        st.metric("Price per Share", result.price_per_share)
        st.metric("Shares Issued", result.shares_issued)
        st.metric("ESOP Pool", result.esop_pool)
        st.metric("ESOP Refresh", result.esop_refresh)

    with col2:
        st.metric("Investment Amount", f"${result.investment_amount:,.0f}")
        st.markdown(f"**Liquidation Preference:** {result.liquidation_preference}")
        st.markdown(f"**Anti-dilution:** {result.anti_dilution}")
        st.markdown(f"**Board Seats:** {result.board_seats}")
        st.markdown(f"**Lead Investor:** {result.lead_investor}")
        st.markdown(f"**Post-round Founder Ownership:** {result.founder_ownership_post}")
        st.markdown(f"**Exclusivity:** {result.exclusivity}")
        st.markdown(f"**Governing Law:** {result.governing_law}")
        st.markdown(f"**Dispute Resolution:** {result.dispute_resolution}")
        st.markdown(f"**Key Person Insurance:** {result.key_person_insurance}")

    if result.protective_provisions:
        st.markdown("**🛡️ Protective Provisions (Investor Veto Rights):**")
        for p in result.protective_provisions:
            st.markdown(f"- {p}")

    if result.information_rights:
        st.markdown("**📋 Information Rights:**")
        for r_item in result.information_rights:
            st.markdown(f"- {r_item}")

    if citations:
        st.divider()
        st.markdown("**📚 Sources:**")
        for c in citations:
            st.caption(f"📄 {c}")


def render_lp_report(result: LPReport, citations: list[str] | None = None) -> None:
    """Render LP report results.

    Args:
        result: LPReport to render.
        citations: Optional list of source citations.
    """
    st.subheader("📈 LP Report")

    st.markdown(f"**Quarter:** {result.quarter}")

    st.markdown("**Portfolio Highlights:**")
    for highlight in result.portfolio_highlights:
        st.markdown(f"- {highlight}")

    if result.financial_summary:
        st.markdown("**Financial Summary:**")
        cols = st.columns(min(len(result.financial_summary), 4))
        for i, (key, value) in enumerate(result.financial_summary.items()):
            with cols[i % len(cols)]:
                label = key.replace("_", " ").title()
                if isinstance(value, (int, float)):
                    display = f"${value:,.0f}"
                else:
                    display = str(value)
                st.metric(label, display)

    st.markdown("**Risk Factors:**")
    for risk in result.risk_factors:
        st.markdown(f"- {risk}")

    if citations:
        st.divider()
        st.markdown("**📚 Sources:**")
        for c in citations:
            st.caption(f"📄 {c}")


def render_compliance_check(result: ComplianceCheck, citations: list[str] | None = None) -> None:
    """Render compliance check results.

    Args:
        result: ComplianceCheck to render.
        citations: Optional list of source citations.
    """
    st.subheader("✅ Compliance Check")

    col1, col2 = st.columns(2)

    with col1:
        st.metric("Document", result.document_name)
        status = "✅ Compliant" if result.compliant else "❌ Non-Compliant"
        st.metric("Status", status)

    with col2:
        st.metric("Jurisdiction", result.jurisdiction)
        st.markdown("**Regulations Checked:**")
        for reg in result.regulations_checked:
            st.markdown(f"- {reg}")

    if result.issues:
        st.markdown("**Issues Found:**")
        for issue in result.issues:
            st.error(f"- {issue}")
    else:
        st.success("No compliance issues found.")

    if citations:
        st.divider()
        st.markdown("**📚 Sources:**")
        for c in citations:
            st.caption(f"📄 {c}")
