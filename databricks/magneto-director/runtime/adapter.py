"""Map the durable invocation envelope to Magneto's explicit snapshot contract."""
from agent.agent import run_agent


async def invoke(value, context):
    if not isinstance(value, dict) or value.get('request_id') != context.invocation_id:
        raise ValueError('request_id must match the invocation UUID')
    result = await run_agent(value, session_id=context.session_id)
    await context.emit({'type': 'decision', 'result': result})
    return result


# No physical side effects: replay can repeat inference after worker loss, never hardware.
recover = invoke
