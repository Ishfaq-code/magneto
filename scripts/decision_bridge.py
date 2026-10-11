"""Bounded local bridge using databricks/platform; no credentials reach the browser."""
import json
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'databricks/magneto-director'))
from agent.decision import ContractError, make_snapshot, validate_decision


class BridgeError(RuntimeError):
    def __init__(self,message,status=502):
        super().__init__(message)
        self.status=status


def invoke_snapshot(snapshot, *, timeout=14):
    # Preserve `python3 scripts/serve.py`: only the adapter uses the SDK virtual environment.
    interpreter=ROOT/'.venv-agent/bin/python'
    if not interpreter.exists():
        raise BridgeError('Databricks adapter dependencies are missing. See the agent setup README.',503)
    try:
        response=subprocess.run([str(interpreter),str(ROOT/'scripts/platform_invoke.py')],
            input=json.dumps(snapshot),text=True,capture_output=True,timeout=timeout)
    except subprocess.TimeoutExpired as exc:
        raise BridgeError('Databricks did not respond in time. No activity was started.',504) from exc
    except OSError as exc:
        raise BridgeError('The Databricks adapter could not start.',503) from exc
    if response.returncode:
        raise BridgeError('Databricks could not complete the decision. Check the magneto login and app health, then retry.',503)
    try:
        envelope=json.loads(response.stdout)
        if envelope['id'] != snapshot['request_id'] or envelope['status'] != 'completed':
            raise ValueError('Not completed')
        result=envelope['output']
        if result['request_id'] != snapshot['request_id'] or result['session_id'] != snapshot['session_id']:
            raise ValueError('Mismatched request')
        validate_decision(result['decision'],snapshot)
        if type(result['elapsed_ms']) not in (int,float) or not 0 <= result['elapsed_ms'] < 1e9 or not isinstance(result['model'],str):
            raise ValueError('Invalid metadata')
        return result
    except (ValueError,KeyError,TypeError) as exc:
        raise BridgeError('Databricks returned an invalid or outdated decision. No activity was started.') from exc


def request_decision(request):
    return invoke_snapshot(make_snapshot(request))
