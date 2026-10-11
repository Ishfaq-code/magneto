"""Run real fixtures or measure one first request plus N warm deployed requests."""
import argparse
import json
import math
from pathlib import Path
import statistics
import sys
import time
from uuid import uuid4

from decision_bridge import ROOT, invoke_snapshot
from agent.decision import decide

FIXTURES = ROOT / 'databricks' / 'magneto-director' / 'fixtures'


def run(name, direct):
    f=json.loads((FIXTURES/f'{name}.json').read_text())
    snapshot=f['snapshot']
    snapshot['request_id']=str(uuid4())
    snapshot['session_id']=str(uuid4())
    started=time.perf_counter()
    try:
        result=(decide if direct else invoke_snapshot)(snapshot)
        row={'fixture':name,'ok':True,'expected_action':f['expected_action'],
             'matches_expected':result['decision']['action']==f['expected_action'],**result}
    except Exception as exc:
        row={'fixture':name,'ok':False,'error':str(exc),'request_id':snapshot['request_id']}
    row['round_trip_ms']=round((time.perf_counter()-started)*1000)
    return row


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--direct',action='store_true',help='Call the configured model directly, before deployment')
    parser.add_argument('--fixture',choices=['apple','pear','plum_incorrect','plum_correct','plum_help'])
    parser.add_argument('--benchmark',type=int,default=0,help='Number of warm deployed calls, in addition to one first call')
    parser.add_argument('--output',type=Path)
    args=parser.parse_args()
    names=['apple','plum_incorrect','plum_correct','pear','plum_help']
    if args.fixture: names=[args.fixture]
    rows=[]
    first=run('apple',args.direct) if args.benchmark else None
    if first: print(json.dumps({'first_request':first}),flush=True)
    for i in range(args.benchmark or len(names)):
        row=run(names[i%len(names)],args.direct);rows.append(row)
        print(json.dumps(row),flush=True)
    times=sorted(r['round_trip_ms'] for r in rows if r['ok'])
    summary={'requests':len(rows),'successes':len(times),'failures':len(rows)-len(times),
             'behavior_mismatches':sum(r['ok'] and not r['matches_expected'] for r in rows),
             'median_ms':statistics.median(times) if times else None,
             'p95_ms':times[max(0,math.ceil(.95*len(times))-1)] if times else None,
             'first_request_ms':first['round_trip_ms'] if first else None,
             'first_request_ok':first['ok'] if first else None}
    report={'mode':'direct' if args.direct else 'deployed','first_request':first,'summary':summary,'requests':rows}
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'summary':summary}),flush=True)
    return int(summary['failures']>0 or summary['behavior_mismatches']>0 or (first is not None and not first['ok']))


if __name__=='__main__':
    sys.exit(main())
