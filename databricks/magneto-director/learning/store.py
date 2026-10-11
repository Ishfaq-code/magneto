"""Small Delta-backed store for v2 profiles and interaction events."""
import json


def _sql(value):
    text = json.dumps(value, separators=(',', ':')) if isinstance(value, (dict, list)) else str(value)
    return "'" + text.replace("'", "''") + "'"


class LearningStore:
    def __init__(self, services):
        warehouse = services.config.learning_warehouse_id
        if not warehouse:
            raise RuntimeError('Learning SQL warehouse is not configured')
        self.services = services
        self.warehouse = warehouse
        self.catalog = services.config.catalog
        self.schema = services.config.schema
        self.events = f'{self.catalog}.{self.schema}.interaction_events_v2'
        self.profiles = f'{self.catalog}.{self.schema}.profiles_v2'

    def execute(self, statement):
        return self.services.client.statement_execution.execute_statement(
            warehouse_id=self.warehouse, statement=statement, catalog=self.catalog,
            schema=self.schema, wait_timeout='30s')

    def ensure_tables(self):
        self.execute(f'''CREATE TABLE IF NOT EXISTS {self.events} (
            event_id STRING, profile_id STRING, session_id STRING, occurred_at TIMESTAMP,
            event_type STRING, activity_id STRING, target STRING, outcome STRING,
            client_sequence BIGINT, metadata STRING, ingested_at TIMESTAMP)
            USING DELTA''')
        self.execute(f'''CREATE TABLE IF NOT EXISTS {self.profiles} (
            profile_id STRING, consent STRING, preferences STRING,
            created_at TIMESTAMP, updated_at TIMESTAMP)
            USING DELTA''')

    def ingest_events(self, events):
        rows = ','.join('(' + ','.join((_sql(e['event_id']), _sql(e['profile_id']), _sql(e['session_id']),
            _sql(e['occurred_at']), _sql(e['event_type']), _sql(e['activity_id']), _sql(e['target']),
            _sql(e['outcome']), str(e['client_sequence']), _sql(e['metadata']))) + ')' for e in events)
        source = f'''SELECT * FROM VALUES {rows} AS s(event_id, profile_id, session_id, occurred_at,
            event_type, activity_id, target, outcome, client_sequence, metadata)'''
        self.execute(f'''MERGE INTO {self.events} t USING ({source}) s ON t.event_id=s.event_id
            WHEN NOT MATCHED THEN INSERT (event_id, profile_id, session_id, occurred_at, event_type,
            activity_id, target, outcome, client_sequence, metadata, ingested_at)
            VALUES (s.event_id, s.profile_id, s.session_id, CAST(s.occurred_at AS TIMESTAMP), s.event_type,
            s.activity_id, s.target, s.outcome, s.client_sequence, s.metadata, current_timestamp())''')
        return {'accepted': len(events), 'duplicates': 0, 'event_ids': [e['event_id'] for e in events]}

    def create_profile(self, profile):
        self.execute(f'''MERGE INTO {self.profiles} t USING (SELECT {_sql(profile['profile_id'])} profile_id,
            {_sql(profile['consent'])} consent, {_sql(profile['preferences'])} preferences) s
            ON t.profile_id=s.profile_id WHEN MATCHED THEN UPDATE SET consent=s.consent,
            preferences=s.preferences, updated_at=current_timestamp() WHEN NOT MATCHED THEN INSERT
            (profile_id, consent, preferences, created_at, updated_at) VALUES
            (s.profile_id, s.consent, s.preferences, current_timestamp(), current_timestamp())''')
        return {'profile_id': profile['profile_id'], 'status': 'ready'}
