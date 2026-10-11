"""Single-node LangGraph: a complete snapshot in, a validated decision out."""
import asyncio
from typing import TypedDict

from databricks_agentkit.langgraph import configure_tracing, start_trace
from langgraph.graph import StateGraph, START, END

from agent.decision import decide, validate_snapshot


class DecisionState(TypedDict):
    snapshot: dict
    result: dict


def configure():
    from pathlib import Path
    from magneto_platform import ServiceConfig, Services
    Services(ServiceConfig.load(Path(__file__).resolve().parents[1] / 'services.toml')).configure_tracing()
    configure_tracing()


async def _decision_node(state):
    return {'result': await asyncio.to_thread(decide, state['snapshot'])}


builder = StateGraph(DecisionState)
builder.add_node('decide', _decision_node)
builder.add_edge(START, 'decide')
builder.add_edge('decide', END)
# Intentionally no conversational checkpointer or memory tools. Every call is self-contained.
graph = builder.compile()


async def run_agent(snapshot, *, session_id):
    validate_snapshot(snapshot)
    if snapshot['session_id'] != session_id:
        raise ValueError('Invocation session does not match snapshot')
    with start_trace(name='magneto_decision', inputs=snapshot, session_id=session_id) as span:
        import mlflow
        mlflow.update_current_trace(client_request_id=snapshot['request_id'])
        result = (await graph.ainvoke({'snapshot': snapshot}))['result']
        if span is not None:
            span.set_outputs(result)
            span.set_attributes({'model': result['model'], 'elapsed_ms': result['elapsed_ms'],
                                 'request_id': result['request_id']})
        return result
