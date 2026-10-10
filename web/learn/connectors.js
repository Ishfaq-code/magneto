/** Integration boundary only. No camera, detection, microphone or device access. */
export const connectors = Object.freeze({
  camera: { status: 'not-integrated', async connect() { return { connected: false, reason: 'Camera integration is coming later.' }; } },
  braille: { status: 'not-integrated', async write(word) { return { ready: false, word, reason: 'Braille hardware is not connected.' }; } },
  voiceInput: { status: 'not-integrated' }
});
// Future adapters: objectSelected({ label, confidence }), write(word), ready({ word }).
// Only an actual hardware acknowledgement may announce physical Braille as ready.
