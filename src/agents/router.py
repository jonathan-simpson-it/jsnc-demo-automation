"""Router — thin dispatcher that invokes the LangGraph agent graph."""

import json

from src.agents.graph import AgentState, PARSERS, get_agent_graph
from src.core.models import AgentResponse
from src.vector_store.chroma import VectorStore


class RouterAgent:
    """Central router that dispatches queries through the agent graph."""

    def __init__(self, vector_store: VectorStore, api_key: str | None = None):
        self.vector_store = vector_store
        self.graph = get_agent_graph()

    def invoke(
        self,
        query: str,
        agent_type: str | None = None,
        conversation_history: list[dict] | None = None,
    ) -> AgentResponse:
        initial_state: AgentState = {
            "query": query,
            "agent_type": agent_type or "due_diligence",
            "retrieved": "", "narrowed": "", "answer": "",
            "verified": False, "citations": [],
            "conversation_history": conversation_history or [],
        }

        try:
            final = self.graph.invoke(initial_state)
            agent_type_final = final.get("agent_type", "due_diligence")
            answer = final.get("answer", "")
            citations = final.get("citations", [])

            parser = PARSERS.get(agent_type_final)
            result_data = parser(answer) if parser else {"summary": answer}

            return AgentResponse(
                agent_type=agent_type_final,
                result=json.dumps(result_data, default=str),
                citations=citations,
                metadata={"query": query, "agent_type": agent_type_final},
            )
        except Exception as e:
            return AgentResponse(
                agent_type=agent_type or "due_diligence",
                result=f"Error: {e}",
                metadata={"error": True},
            )
