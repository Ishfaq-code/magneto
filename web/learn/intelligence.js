/** Browser outbox for at-least-once learning event delivery. */
export const INTELLIGENCE_KEY = 'magneto-intelligence-v2';
const isId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);

export class LearningOutbox {
  constructor({storage = globalThis.localStorage, fetcher = (...args) => globalThis.fetch(...args), uuid = () => crypto.randomUUID(), clock = () => new Date().toISOString()} = {}) {
    this.storage = storage; this.fetcher = fetcher; this.uuid = uuid; this.clock = clock;
    this.events = []; this.storageOK = true;
    try { const saved = JSON.parse(storage.getItem(INTELLIGENCE_KEY) || '[]'); if (Array.isArray(saved)) this.events = saved; } catch { this.storageOK = false; }
  }
  save() { try { this.storage.setItem(INTELLIGENCE_KEY, JSON.stringify(this.events)); this.storageOK = true; } catch { this.storageOK = false; } }
  async createProfile({profile_id, consent = 'granted', audio_enabled = false}) {
    if (!isId(profile_id)) throw new Error('Invalid learning profile identity.');
    const response = await this.fetcher('/api/learning/profile', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({schema_version: '2.0', profile_id, consent, preferences: {audio_enabled}})});
    let result; try { result = await response.json(); } catch { throw new Error('Profile service returned invalid JSON.'); }
    if (!response.ok) throw new Error(result.error || 'Profile creation failed.');
    return result;
  }
  enqueue({profile_id, session_id, activity_id, target = null, outcome = null, event_type = 'response_recorded'}) {
    if (!isId(profile_id) || !isId(session_id) || typeof activity_id !== 'string' || !activity_id) throw new Error('Invalid learning event identity.');
    const event = {schema_version: '2.0', event_id: this.uuid(), profile_id, session_id, occurred_at: this.clock(), event_type, activity_id, target, outcome, client_sequence: this.events.length, metadata: {source: 'browser'}};
    this.events.push(event); this.save(); return event;
  }
  async flush() {
    if (!this.events.length) return {accepted: 0, duplicates: 0, event_ids: []};
    const response = await this.fetcher('/api/learning/events', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({schema_version: '2.0', events: this.events})});
    let result; try { result = await response.json(); } catch { throw new Error('Learning history service returned invalid JSON.'); }
    if (!response.ok) throw new Error(result.error || 'Learning history upload failed.');
    const acknowledged = new Set(result.event_ids || []);
    this.events = this.events.filter(event => !acknowledged.has(event.event_id)); this.save();
    return result;
  }
}
