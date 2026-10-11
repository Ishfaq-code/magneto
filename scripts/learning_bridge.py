"""Validate the browser outbox before forwarding it through the authenticated adapter."""
import json
from pathlib import Path
import subprocess
import sys
from uuid import UUID

ROOT = Path(__file__).resolve().parents[1]


class LearningError(RuntimeError):
    def __init__(self, message, status=502):
        super().__init__(message)
        self.status = status


EVENT_TYPES = {'activity_started', 'activity_completed', 'response_recorded', 'activity_skipped', 'device_unavailable'}
OUTCOMES = {'correct', 'incorrect', 'help', 'skipped', 'unavailable', None}


def _uuid(value, name):
    try:
        if str(UUID(value)) != value:
            raise ValueError
    except (TypeError, ValueError) as exc:
        raise LearningError(f'{name} must be a canonical UUID', 400) from exc


def validate_batch(payload):
    if not isinstance(payload, dict) or set(payload) != {'schema_version', 'events'} or payload['schema_version'] != '2.0':
        raise LearningError('Expected interaction event schema version 2.0.', 400)
    events = payload['events']
    if not isinstance(events, list) or not 1 <= len(events) <= 50:
        raise LearningError('Expected between 1 and 50 interaction events.', 400)
    seen = set(); profile = None
    required = {'schema_version', 'event_id', 'profile_id', 'session_id', 'occurred_at', 'event_type', 'activity_id', 'target', 'outcome', 'client_sequence', 'metadata'}
    for event in events:
        if not isinstance(event, dict) or set(event) != required:
            raise LearningError('Invalid interaction event shape.', 400)
        for key in ('event_id', 'profile_id', 'session_id'):
            _uuid(event[key], key)
        if profile is None: profile = event['profile_id']
        if event['profile_id'] != profile or event['event_id'] in seen:
            raise LearningError('Events must share one profile and have unique IDs.', 400)
        seen.add(event['event_id'])
        if event['event_type'] not in EVENT_TYPES or event['outcome'] not in OUTCOMES:
            raise LearningError('Unsupported interaction event type or outcome.', 400)
        if not isinstance(event['activity_id'], str) or not event['activity_id'] or len(event['activity_id']) > 120:
            raise LearningError('Invalid activity ID.', 400)
        if not isinstance(event['client_sequence'], int) or event['client_sequence'] < 0:
            raise LearningError('Invalid client sequence.', 400)
        if event['metadata'] != {'source': 'browser'}:
            raise LearningError('Unsupported event metadata.', 400)
    return payload


def ingest_events(payload, *, timeout=14):
    validate_batch(payload)
    interpreter = ROOT / '.venv-agent/bin/python'
    if not interpreter.exists():
        raise LearningError('Databricks adapter dependencies are missing.', 503)
    try:
        response = subprocess.run([str(interpreter), str(ROOT / 'scripts/platform_learning.py')],
                                  input=json.dumps(payload), text=True, capture_output=True, timeout=timeout)
    except subprocess.TimeoutExpired as exc:
        raise LearningError('Learning history upload timed out.', 504) from exc
    except OSError as exc:
        raise LearningError('The Databricks learning adapter could not start.', 503) from exc
    if response.returncode:
        raise LearningError('Learning history could not be uploaded.', 503)
    try:
        result = json.loads(response.stdout)
        if not isinstance(result, dict) or not isinstance(result.get('event_ids'), list):
            raise ValueError
        return result
    except (ValueError, TypeError):
        raise LearningError('Learning history service returned an invalid response.')


def validate_profile(profile):
    if not isinstance(profile, dict) or set(profile) != {'schema_version', 'profile_id', 'consent', 'preferences'}:
        raise LearningError('Expected profile schema version 2.0.', 400)
    if profile['schema_version'] != '2.0':
        raise LearningError('Expected profile schema version 2.0.', 400)
    _uuid(profile['profile_id'], 'profile_id')
    preferences = profile.get('preferences')
    if profile['consent'] not in ('granted', 'revoked') or not isinstance(preferences, dict) or set(preferences) != {'audio_enabled'} or not isinstance(preferences['audio_enabled'], bool):
        raise LearningError('Invalid profile consent or preferences.', 400)
    return profile


def create_profile(profile, *, timeout=14):
    validate_profile(profile)
    interpreter = ROOT / '.venv-agent/bin/python'
    if not interpreter.exists():
        raise LearningError('Databricks adapter dependencies are missing.', 503)
    try:
        response = subprocess.run([str(interpreter), str(ROOT / 'scripts/platform_learning.py')],
                                  input=json.dumps({'profile': profile}), text=True, capture_output=True, timeout=timeout)
    except subprocess.TimeoutExpired as exc:
        raise LearningError('Profile creation timed out.', 504) from exc
    except OSError as exc:
        raise LearningError('The Databricks learning adapter could not start.', 503) from exc
    if response.returncode:
        raise LearningError('Profile could not be created.', 503)
    try:
        result = json.loads(response.stdout)
        if not isinstance(result, dict) or result.get('profile_id') != profile['profile_id']:
            raise ValueError
        return result
    except (ValueError, TypeError):
        raise LearningError('Profile service returned an invalid response.')
