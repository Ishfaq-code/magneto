/** Local camera preview; detection, microphone and Braille device remain unintegrated. */
export const connectors = Object.freeze({
  camera: { status: 'available', async connect() { if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported'); const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }); return { connected: true, stream }; } },
  braille: { status: 'not-integrated', async write(word) { return { ready: false, word, reason: 'Braille hardware is not connected.' }; } },
  voiceInput: { status: 'not-integrated' }
});
// Future adapters: objectSelected({ label, confidence }), write(word), ready({ word }).
// Only an actual hardware acknowledgement may announce physical Braille as ready.
