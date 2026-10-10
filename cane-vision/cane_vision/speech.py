"""Non-blocking text-to-speech with whatever engine the machine has.

- macOS: `say`
- Jetson / Linux: Piper (offline neural TTS) piped into `aplay`, falling
  back to `espeak-ng`
- Anything else: print to the console
"""

from __future__ import annotations

import os
import shlex
import shutil
import signal
import subprocess
import sys


class Speaker:
    def __init__(self, engine: str = "auto", piper_model: str | None = None):
        self.piper_model = piper_model
        self.engine = self._pick(engine)
        self._proc: subprocess.Popen | None = None

    def _pick(self, engine: str) -> str:
        if engine != "auto":
            return engine
        if sys.platform == "darwin" and shutil.which("say"):
            return "say"
        if self.piper_model and shutil.which("piper") and shutil.which("aplay"):
            return "piper"
        if shutil.which("espeak-ng"):
            return "espeak-ng"
        return "print"

    def say(self, text: str) -> None:
        """Speak `text`, cutting off anything still being spoken."""
        self.stop()
        print(f"[speech] {text}", flush=True)
        if self.engine == "say":
            self._proc = subprocess.Popen(["say", text])
        elif self.engine == "espeak-ng":
            self._proc = subprocess.Popen(["espeak-ng", text])
        elif self.engine == "piper":
            # Piper writes raw 16-bit mono audio; aplay plays it.
            self._proc = subprocess.Popen(
                f"piper --model {shlex.quote(self.piper_model)} --output-raw"
                " | aplay -q -r 22050 -f S16_LE -t raw -",
                shell=True,
                stdin=subprocess.PIPE,
                start_new_session=True,
            )
            self._proc.stdin.write(text.encode())
            self._proc.stdin.close()

    def stop(self) -> None:
        if self._proc and self._proc.poll() is None:
            if self.engine == "piper":
                # Kill the whole piper | aplay pipeline, not just the shell.
                os.killpg(self._proc.pid, signal.SIGTERM)
            else:
                self._proc.terminate()
        self._proc = None
