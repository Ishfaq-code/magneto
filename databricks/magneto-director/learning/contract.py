"""Runtime validation for the small v2 learning boundary."""
from uuid import UUID


def _uuid(value):
    if not isinstance(value, str) or str(UUID(value)) != value:
        raise ValueError('canonical UUID required')


def validate_batch(payload):
    if not isinstance(payload, dict) or payload.get('schema_version') != '2.0' or not isinstance(payload.get('events'), list) or not payload['events']:
        raise ValueError('invalid event batch')
    profile = payload['events'][0]['profile_id']
    for event in payload['events']:
        for key in ('event_id', 'profile_id', 'session_id'):
            _uuid(event[key])
        if event['profile_id'] != profile or event['schema_version'] != '2.0':
            raise ValueError('mixed profile or schema')
    return payload


def validate_profile(profile):
    if not isinstance(profile, dict) or profile.get('schema_version') != '2.0':
        raise ValueError('invalid profile')
    _uuid(profile['profile_id'])
    if profile.get('consent') not in ('granted', 'revoked'):
        raise ValueError('invalid consent')
    return profile
