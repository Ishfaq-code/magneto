"""Plays Braille steps on the single cell in a background thread.

The cell itself is a pluggable sink: anything with `show(mask)`. For now the
only sink is the console preview; the Arduino/servo sink drops in later
without touching the vision pipeline.
"""

from __future__ import annotations

import threading
from typing import Protocol

from .braille import BLANK, Step, to_unicode


class CellSink(Protocol):
    def show(self, mask: int) -> None: ...


class ConsoleCell:
    def show(self, mask: int) -> None:
        raised = [str(n + 1) for n in range(6) if mask & (1 << n)]
        print(f"[cell] {to_unicode(mask)}  dots {','.join(raised) or '-'}", flush=True)


class CellPlayer:
    """Spells one word at a time; a new word interrupts the current one."""

    def __init__(self, sink: CellSink):
        self.sink = sink
        self.mask = BLANK
        self.char = ""
        self._cancel = threading.Event()
        self._thread: threading.Thread | None = None
        self._lock = threading.Lock()

    @property
    def busy(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def wait(self) -> None:
        if self._thread:
            self._thread.join()

    def play(self, steps: list[Step]) -> None:
        with self._lock:
            self._stop_locked()
            self._cancel = threading.Event()
            self._thread = threading.Thread(target=self._run, args=(steps, self._cancel), daemon=True)
            self._thread.start()

    def stop(self) -> None:
        with self._lock:
            self._stop_locked()
        self._set(BLANK, "")

    def _stop_locked(self) -> None:
        self._cancel.set()
        if self._thread:
            self._thread.join()
            self._thread = None

    def _set(self, mask: int, char: str) -> None:
        self.mask, self.char = mask, char
        self.sink.show(mask)

    def _run(self, steps: list[Step], cancel: threading.Event) -> None:
        for step in steps:
            if cancel.is_set():
                return
            self._set(step.mask, step.char)
            if cancel.wait(step.seconds):
                return
        self._set(BLANK, "")
