"""Validate base-contract examples and compatibility with the deployed demo validators."""
import copy
import json
from pathlib import Path
import sys
from jsonschema import Draft202012Validator, FormatChecker, ValidationError

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'databricks/contracts/v1'
V2=ROOT/'databricks/contracts/v2'
sys.path.insert(0,str(ROOT/'databricks/magneto-director'))
from agent.decision import make_snapshot, validate_snapshot, validate_decision, DECISION_SCHEMA

def read(path): return json.loads(path.read_text())
validators={}
for path in BASE.glob('*.schema.json'):
    schema=read(path)
    Draft202012Validator.check_schema(schema)
    validators[path.name.removesuffix('.schema.json')]=Draft202012Validator(schema,format_checker=FormatChecker())

examples={'guidance':'guidance','retrieval-request':'retrieval-request','retrieval-result':'retrieval-result',
          'retrieval-empty':'retrieval-result','browser-request':'browser-request','session-snapshot':'session-snapshot',
          'decision-teach':'decision','decision-continue':'decision'}
for name,contract in examples.items(): validators[contract].validate(read(BASE/'examples'/f'{name}.json'))
snapshot=read(BASE/'examples/session-snapshot.json')
assert make_snapshot(read(BASE/'examples/browser-request.json'))==snapshot
validate_snapshot(snapshot)
for action in ('teach','continue'): validate_decision(read(BASE/'examples'/f'decision-{action}.json'),snapshot)
assert set(validators['decision'].schema['required'])==set(DECISION_SCHEMA['required'])
for fixture in (ROOT/'databricks/magneto-director/fixtures').glob('*.json'):
    value=read(fixture)['snapshot'];validators['session-snapshot'].validate(value);validate_snapshot(value)

def rejects(contract,value):
    try: validators[contract].validate(value)
    except ValidationError: return
    raise AssertionError(f'{contract} accepted invalid example')
result=read(BASE/'examples/retrieval-result.json')
bad=copy.deepcopy(result);bad['matches'][0]['approved']=False;rejects('retrieval-result',bad)
bad=copy.deepcopy(result);del bad['matches'][0]['citation'];rejects('retrieval-result',bad)
bad=copy.deepcopy(result);bad['schema_version']='2.0';rejects('retrieval-result',bad)
bad=read(BASE/'examples/decision-continue.json');bad['prompt']='Unexpected activity';rejects('decision',bad)
bad=copy.deepcopy(snapshot);bad['schema_version']='1.0';rejects('session-snapshot',bad)
v2_validators={}
for path in V2.glob('*.schema.json'):
    schema=read(path)
    Draft202012Validator.check_schema(schema)
    v2_validators[path.name.removesuffix('.schema.json')]=Draft202012Validator(schema,format_checker=FormatChecker())
v2_validators['interaction-event'].validate(read(V2/'examples/interaction-event.json'))
v2_validators['profile'].validate(read(V2/'examples/profile.json'))
print(f'Validated {len(validators)+len(v2_validators)} schemas, {len(examples)+2} examples, live demo fixtures and negative cases. No cloud calls.')
