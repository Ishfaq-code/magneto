"""Invoke one synthetic deployed decision and read back its full UC MLflow trace."""
import json
from pathlib import Path
import signal
import sys
import time
from uuid import uuid4

from decision_bridge import ROOT, invoke_snapshot
sys.path.insert(0,str(ROOT/'databricks/platform'))
from magneto_platform import ServiceConfig, Services
import mlflow


def main():
    config=ServiceConfig.load(ROOT/'databricks/platform/services.toml')
    experiment_id=Services(config).configure_tracing()
    snapshot=json.loads((ROOT/'databricks/magneto-director/fixtures/plum_incorrect.json').read_text())['snapshot']
    output=ROOT/'reports/mlflow-agent-trace.json'
    if '--readback-only' in sys.argv:
        report=json.loads(output.read_text())
        started,result=report['started_ms'],report['result']
        snapshot.update(request_id=result['request_id'],session_id=result['session_id'])
    else:
        snapshot.update(request_id=str(uuid4()),session_id=str(uuid4()))
        started=int(time.time()*1000)
        result=invoke_snapshot(snapshot)
        report={'verified':False,'experiment_id':experiment_id,'request_id':snapshot['request_id'],
                'started_ms':started,'result':result}
        output.write_text(json.dumps(report,indent=2)+'\n')
        print('Agent decision saved; request_id='+snapshot['request_id'],flush=True)
        # Ingestion is asynchronous; a retry can reuse the saved request without another call.
        time.sleep(10)
    print('Starting trace readback (60 second deadline)',flush=True)
    def deadline(*_): raise TimeoutError('Trace readback exceeded 60 seconds')
    signal.signal(signal.SIGALRM,deadline)
    signal.alarm(60)
    try:
        traces=mlflow.search_traces(locations=[experiment_id],max_results=1,return_type='list',
            include_spans=True,filter_string=f"trace.timestamp_ms >= {started-1000} AND trace.client_request_id = '{snapshot['request_id']}'")
        assert len(traces)==1,'No matching trace returned'
        trace=traces[0]
        spans=trace.data.spans
        root=next(s for s in spans if s.name=='magneto_decision')
        decode=lambda value: json.loads(value) if isinstance(value,str) else value
        assert decode(root.inputs)==snapshot,'Trace input mismatch'
        assert decode(root.outputs)==result,'Trace output mismatch'
        assert root.attributes['model']==result['model']
        # UC span attributes may deserialize numeric values as strings.
        assert float(root.attributes['elapsed_ms'])==float(result['elapsed_ms'])
        assert trace.info.client_request_id==snapshot['request_id']
        report.update(verified=True,trace_id=trace.info.trace_id,span_count=len(spans),
                      spans=[{'name':s.name,'inputs':decode(s.inputs),'outputs':decode(s.outputs),'attributes':s.attributes} for s in spans])
        report['url']=f'{config.workspace_host}/ml/experiments/{experiment_id}/traces/{trace.info.trace_id.rsplit("/",1)[-1]}'
        output.write_text(json.dumps(report,indent=2,default=str)+'\n')
        print(json.dumps({k:report[k] for k in ('verified','trace_id','span_count','url')}),flush=True)
    finally:
        signal.alarm(0)


if __name__=='__main__': main()
