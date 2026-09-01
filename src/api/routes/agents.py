"""Agent execution endpoints."""

from fastapi import APIRouter, HTTPException

from src.core.models import AgentQuery
from src.api.deps import get_router_agent

router = APIRouter()


@router.get("")
async def list_agents():
    """List available agents.

    Returns:
        List of agent types and descriptions.
    """
    return {
        "agents": [
            {
                "type": "due_diligence",
                "name": "Due Diligence Agent",
                "description": "Analyze investment opportunities and conduct due diligence",
            },
            {
                "type": "term_sheet",
                "name": "Term Sheet Extractor",
                "description": "Extract structured data from term sheets",
            },
            {
                "type": "lp_report",
                "name": "LP Report Generator",
                "description": "Generate quarterly LP reports",
            },
            {
                "type": "compliance",
                "name": "Compliance Checker",
                "description": "Check regulatory compliance of documents",
            },
        ]
    }


@router.post("/execute")
async def execute_agent(query: AgentQuery):
    """Execute an agent with a query.

    Args:
        query: Agent query with query text and agent type.

    Returns:
        Agent execution result.
    """
    try:
        router_agent = get_router_agent()
        result = router_agent.invoke(
            query=query.query,
            agent_type=query.agent_type,
        )
        return {
            "agent_type": result.agent_type,
            "result": result.result,
            "metadata": result.metadata,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {str(e)}")
