import time

import pytest

from cane_vision import elevenlabs
from cane_vision.elevenlabs import ElevenLabsSpeaker, ElevenLabsTTS, make_speaker
from cane_vision.speech import Speaker


class FakeResponse:
    def __init__(self, status_code=200, content=b"RIFF....WAVE", text=""):
        self.status_code = status_code
        self.content = content
        self.text = text


@pytest.fixture
def calls(monkeypatch):
    log = []

    def fake_post(url, **kwargs):
        log.append((url, kwargs))
        return FakeResponse()

    monkeypatch.setattr(elevenlabs.requests, "post", fake_post)
    return log


def test_synthesizes_once_then_uses_cache(tmp_path, calls):
    tts = ElevenLabsTTS("key-123", voice_id="v1", model_id="m1", cache_dir=tmp_path)
    first = tts.audio("chair")
    second = tts.audio("chair")
    assert first == second and first.read_bytes() == b"RIFF....WAVE"
    assert len(calls) == 1
    url, kwargs = calls[0]
    assert url.endswith("/v1/text-to-speech/v1")
    assert kwargs["headers"]["xi-api-key"] == "key-123"
    assert kwargs["params"]["output_format"] == "wav_22050"
    assert kwargs["json"] == {"text": "chair", "model_id": "m1"}


def test_cache_key_depends_on_voice_and_text(tmp_path):
    a = ElevenLabsTTS("k", voice_id="v1", cache_dir=tmp_path)
    b = ElevenLabsTTS("k", voice_id="v2", cache_dir=tmp_path)
    assert a.cache_path("chair") != b.cache_path("chair")
    assert a.cache_path("chair") != a.cache_path("table")


def test_http_error_raises_and_caches_nothing(tmp_path, monkeypatch):
    monkeypatch.setattr(elevenlabs.requests, "post",
                        lambda url, **kw: FakeResponse(401, b"", "invalid api key"))
    tts = ElevenLabsTTS("bad", cache_dir=tmp_path)
    with pytest.raises(RuntimeError, match="401"):
        tts.audio("chair")
    assert not any(tmp_path.iterdir())


class RecordingSpeaker(Speaker):
    def __init__(self):
        super().__init__("print")
        self.said = []

    def say(self, text):
        self.said.append(text)


def test_falls_back_to_local_voice_when_api_fails(tmp_path, monkeypatch):
    def boom(url, **kw):
        raise elevenlabs.requests.ConnectionError("offline")

    monkeypatch.setattr(elevenlabs.requests, "post", boom)
    local = RecordingSpeaker()
    speaker = ElevenLabsSpeaker(ElevenLabsTTS("k", cache_dir=tmp_path), local)
    speaker.say("chair")
    for _ in range(100):
        if local.said:
            break
        time.sleep(0.01)
    assert local.said == ["chair"]


def test_auto_without_key_uses_local(monkeypatch):
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    assert isinstance(make_speaker({"engine": "auto"}), Speaker)
    assert isinstance(make_speaker({"engine": "elevenlabs"}), Speaker)


def test_auto_with_key_uses_elevenlabs(monkeypatch, tmp_path):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "k")
    monkeypatch.setattr(elevenlabs, "_player", lambda: ["true"])
    speaker = make_speaker({"engine": "auto", "elevenlabs": {"cache_dir": str(tmp_path)}})
    assert isinstance(speaker, ElevenLabsSpeaker)
    assert isinstance(make_speaker({"engine": "print"}), Speaker)
