"""Agent execution endpoints."""

import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

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
            {
                "type": "cross_doc",
                "name": "Cross-Document Comparison",
                "description": "Compare and synthesize information across multiple documents",
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
        raise HTTPException(
            status_code=500,
            detail=f"Agent execution failed: {str(e)}",
        )


@router.post("/execute/stream")
async def execute_agent_stream(query: AgentQuery):
    """Execute an agent with streaming SSE output.

    Each event is a JSON object with a "node" field (the pipeline step)
    and an "update" field (the state update from that node). The final
    event has "done": true and a "response" field with the full result.
    """
    router_agent = get_router_agent()

    def event_generator():
        for event in router_agent.invoke_streaming(
            query=query.query,
            agent_type=query.agent_type,
        ):
            payload = {"node": event.get("node")}
            if event.get("done"):
                resp = event["response"]
                payload["done"] = True
                payload["response"] = {
                    "agent_type": resp.agent_type,
                    "result": resp.result,
                    "citations": resp.citations,
                    "metadata": resp.metadata,
                }
            else:
                payload["update"] = event.get("update", {})
            yield f"data: {json.dumps(payload)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
