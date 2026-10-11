"""Private subprocess adapter: one bounded invocation through the shared platform layer."""
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'databricks/platform'))
from magneto_platform import ServiceConfig, Services


def main():
    try:
        snapshot=json.load(sys.stdin)
        services=Services(ServiceConfig.load(ROOT/'databricks/platform/services.toml'))
        result=services.invoke_agent(snapshot,session_id=snapshot['session_id'],
                                     request_id=snapshot['request_id'],timeout_s=12)
        print(json.dumps(result))
        return 0
    except Exception as exc:
        # Only an exception type is returned; SDK errors can contain credential context.
        print(json.dumps({'error_type':type(exc).__name__}))
        return 1


if __name__=='__main__': sys.exit(main())
