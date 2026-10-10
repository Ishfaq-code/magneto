"""SerialCell against the real firmware logic, built as a host simulator and
connected through a pseudo-terminal, so pyserial sees an ordinary port."""

import os
import shutil
import subprocess
import sys
import time
import tty
from pathlib import Path
from types import SimpleNamespace

import pytest

from cane_vision import serial_cell
from cane_vision.braille import LETTERS, Timing
from cane_vision.cell import CellPlayer
from cane_vision.serial_cell import SerialCell, find_port, make_cell

FIRMWARE = Path(__file__).resolve().parents[2] / "cell-firmware"
FAST = Timing(letter_hold_s=0.03, letter_gap_s=0.005, word_gap_s=0.02)


@pytest.fixture(scope="module")
def sim_binary(tmp_path_factory):
    cxx = shutil.which("c++") or shutil.which("g++") or shutil.which("clang++")
    if not cxx or not FIRMWARE.is_dir() or sys.platform == "win32":
        pytest.skip("needs a C++ compiler, cell-firmware/ and a POSIX pty")
    out = tmp_path_factory.mktemp("sim") / "cell_sim"
    subprocess.run(
        [cxx, "-std=c++11", "-O1", "-o", str(out),
         str(FIRMWARE / "sim" / "cell_sim.cpp"), str(FIRMWARE / "magneto_cell" / "cell_core.cpp")],
        check=True,
    )
    return out


def start_sim(sim_binary, boot_ms):
    master, slave = os.openpty()
    tty.setraw(slave)  # no echo or newline translation before pyserial opens it
    proc = subprocess.Popen([str(sim_binary), "-d", str(boot_ms)], stdin=master, stdout=master)
    return proc, master, slave


@pytest.fixture
def sim_port(sim_binary):
    # Like an Uno: READY comes a moment after the port is opened.
    proc, master, slave = start_sim(sim_binary, boot_ms=300)
    yield os.ttyname(slave)
    proc.kill()
    proc.wait()
    os.close(master)
    os.close(slave)


class Recorder:
    def __init__(self):
        self.masks = []

    def show(self, mask):
        self.masks.append(mask)


def test_spells_word_and_reports_each_step(sim_port):
    cell = SerialCell(sim_port, FAST)
    cell._console = recorder = Recorder()
    cell.spell("Hi!")
    assert cell.busy
    assert cell.wait(timeout=3)
    assert recorder.masks == [LETTERS["h"], 0, LETTERS["i"], 0]
    assert cell.mask == 0 and cell.char == "" and not cell.busy
    cell.close()


def test_firmware_table_matches_python(sim_port):
    cell = SerialCell(sim_port, Timing(letter_hold_s=0.005, letter_gap_s=0.001, word_gap_s=0.001))
    cell._console = recorder = Recorder()
    alphabet = "abcdefghijklmnopqrstuvwxyz"
    cell.spell(alphabet)
    assert cell.wait(timeout=5)
    assert [m for m in recorder.masks if m] == [LETTERS[c] for c in alphabet]
    cell.close()


def test_new_word_interrupts_and_busy_tracks_the_last(sim_port):
    cell = SerialCell(sim_port, Timing(letter_hold_s=0.2, letter_gap_s=0.01, word_gap_s=0.05))
    cell.spell("hello")
    cell.spell("ab")
    assert cell.busy
    assert cell.wait(timeout=3)
    cell.spell("hello")
    cell.stop()
    assert cell.wait(timeout=1)
    cell.close()


def test_word_gap_shows_as_space(sim_port):
    cell = SerialCell(sim_port, Timing(letter_hold_s=0.1, letter_gap_s=0.01, word_gap_s=0.3))
    cell.spell("a b")
    chars = set()
    while cell.busy:
        chars.add(cell.char)
    assert {"a", " ", "b"} <= chars
    cell.close()


def test_board_that_did_not_reset_answers_ping(sim_binary):
    proc, master, slave = start_sim(sim_binary, boot_ms=0)
    try:
        time.sleep(0.3)  # READY is long gone; pyserial flushes input on open
        cell = SerialCell(os.ttyname(slave), FAST, ready_timeout_s=0.2)
        cell.spell("a")
        assert cell.wait(timeout=2)
        cell.close()
    finally:
        proc.kill()
        proc.wait()
        os.close(master)
        os.close(slave)


def test_no_answer_raises():
    master, slave = os.openpty()
    tty.setraw(slave)
    try:
        with pytest.raises(RuntimeError, match="no Magneto cell"):
            SerialCell(os.ttyname(slave), ready_timeout_s=0.2)
    finally:
        os.close(master)
        os.close(slave)


def test_make_cell_console_options(monkeypatch):
    assert isinstance(make_cell({"port": None}, FAST), CellPlayer)
    assert isinstance(make_cell({"port": "none"}, FAST), CellPlayer)
    monkeypatch.setattr(serial_cell, "find_port", lambda: None)
    assert isinstance(make_cell({}, FAST), CellPlayer)


def test_find_port_picks_arduino_like_boards(monkeypatch):
    ports = [
        SimpleNamespace(device="/dev/ttyS0", vid=None),
        SimpleNamespace(device="/dev/ttyUSB0", vid=0x1A86),
        SimpleNamespace(device="/dev/ttyACM0", vid=0x2341),
    ]
    monkeypatch.setattr(serial_cell.list_ports, "comports", lambda: ports)
    assert find_port() == "/dev/ttyACM0"
    monkeypatch.setattr(serial_cell.list_ports, "comports", lambda: ports[:1])
    assert find_port() is None
