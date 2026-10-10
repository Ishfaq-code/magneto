"""ElevenLabs voice with an on-disk cache and an offline fallback.

The detector only ever says a few dozen distinct words, so every phrase is
synthesized once and kept as a WAV file. After that, announcements play
instantly and keep working without a network. If ElevenLabs can't be reached
(no key, no network, quota used up), the local engine speaks instead, so
the user is never left in silence.

The API key is read from the ELEVENLABS_API_KEY environment variable and is
never stored in the config.
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
import threading
from pathlib import Path

import requests

from .speech import Speaker

API_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb"  # "George", one of the premade voices
DEFAULT_MODEL = "eleven_flash_v2_5"      # lowest latency, cheapest per character
OUTPUT_FORMAT = "wav_22050"              # plays with afplay/aplay, no decoder needed
DEFAULT_CACHE = Path.home() / ".cache" / "cane-vision" / "elevenlabs"


class ElevenLabsTTS:
    def __init__(
        self,
        api_key: str,
        voice_id: str = DEFAULT_VOICE,
        model_id: str = DEFAULT_MODEL,
        voice_settings: dict | None = None,
        cache_dir: str | Path = DEFAULT_CACHE,
        timeout_s: float = 4.0,
    ):
        self.api_key = api_key
        self.voice_id = voice_id
        self.model_id = model_id
        self.voice_settings = voice_settings or {}
        self.cache_dir = Path(cache_dir).expanduser()
        self.timeout_s = timeout_s

    def cache_path(self, text: str) -> Path:
        key = json.dumps(
            [self.voice_id, self.model_id, OUTPUT_FORMAT, self.voice_settings, text],
            sort_keys=True,
        )
        return self.cache_dir / f"{hashlib.sha256(key.encode()).hexdigest()[:24]}.wav"

    def audio(self, text: str) -> Path:
        """Path to a WAV of `text`, synthesizing it on a cache miss."""
        path = self.cache_path(text)
        if path.exists():
            return path
        body: dict = {"text": text, "model_id": self.model_id}
        if self.voice_settings:
            body["voice_settings"] = self.voice_settings
        resp = requests.post(
            API_URL.format(voice_id=self.voice_id),
            params={"output_format": OUTPUT_FORMAT},
            headers={"xi-api-key": self.api_key, "Accept": "audio/wav"},
            json=body,
            timeout=self.timeout_s,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"ElevenLabs HTTP {resp.status_code}: {resp.text[:200]}")
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".part")
        tmp.write_bytes(resp.content)
        tmp.replace(path)
        return path

    def prewarm(self, phrases: list[str]) -> None:
        """Synthesize phrases that aren't cached yet, in the background."""

        def run() -> None:
            missing = [p for p in dict.fromkeys(phrases) if not self.cache_path(p).exists()]
            for phrase in missing:
                try:
                    self.audio(phrase)
                except Exception as e:
                    print(f"[speech] prewarm stopped: {e}", flush=True)
                    return
            if missing:
                print(f"[speech] cached {len(missing)} phrases", flush=True)

        threading.Thread(target=run, daemon=True).start()


def _player() -> list[str] | None:
    if sys.platform == "darwin" and shutil.which("afplay"):
        return ["afplay"]
    if shutil.which("aplay"):
        return ["aplay", "-q"]
    if shutil.which("ffplay"):
        return ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet"]
    return None


class ElevenLabsSpeaker:
    """Same interface as `Speaker`, voiced by ElevenLabs, local on failure."""

    engine = "elevenlabs"

    def __init__(self, tts: ElevenLabsTTS, fallback: Speaker):
        self.tts = tts
        self.fallback = fallback
        self.player = _player()
        if self.player is None:
            raise RuntimeError("no audio player found (afplay, aplay or ffplay)")
        self._proc: subprocess.Popen | None = None
        self._generation = 0
        self._lock = threading.Lock()

    def say(self, text: str) -> None:
        """Speak `text`, cutting off anything still being spoken.

        Fetching may take a moment on a cache miss, so it runs off the camera
        loop. If a newer phrase arrives meanwhile, the stale one is dropped.
        """
        self.stop()
        print(f"[speech] {text}", flush=True)
        with self._lock:
            self._generation += 1
            generation = self._generation
        threading.Thread(target=self._speak, args=(text, generation), daemon=True).start()

    def _speak(self, text: str, generation: int) -> None:
        try:
            path = self.tts.audio(text)
        except Exception as e:
            print(f"[speech] ElevenLabs unavailable, using {self.fallback.engine}: {e}", flush=True)
            with self._lock:
                if generation == self._generation:
                    self.fallback.say(text)
            return
        with self._lock:
            if generation == self._generation:
                self._proc = subprocess.Popen([*self.player, str(path)])

    def stop(self) -> None:
        with self._lock:
            self._generation += 1
            if self._proc and self._proc.poll() is None:
                self._proc.terminate()
            self._proc = None
        self.fallback.stop()


def make_speaker(speech_cfg: dict) -> Speaker | ElevenLabsSpeaker:
    """Build the speaker described by the `speech:` config section.

    engine "auto" uses ElevenLabs when ELEVENLABS_API_KEY is set, otherwise
    the best local engine.
    """
    engine = speech_cfg.get("engine", "auto")
    local_engine = "auto" if engine in ("auto", "elevenlabs") else engine
    local = Speaker(local_engine, speech_cfg.get("piper_model"))
    if engine not in ("auto", "elevenlabs"):
        return local

    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        if engine == "elevenlabs":
            print("[speech] ELEVENLABS_API_KEY not set, using local voice", flush=True)
        return local

    el = speech_cfg.get("elevenlabs", {}) or {}
    tts = ElevenLabsTTS(
        api_key,
        voice_id=el.get("voice_id", DEFAULT_VOICE),
        model_id=el.get("model_id", DEFAULT_MODEL),
        voice_settings=el.get("voice_settings"),
        cache_dir=el.get("cache_dir", DEFAULT_CACHE),
        timeout_s=el.get("timeout_s", 4.0),
    )
    try:
        return ElevenLabsSpeaker(tts, local)
    except RuntimeError as e:
        print(f"[speech] {e}, using local voice", flush=True)
        return local
