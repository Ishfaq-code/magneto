# cell-firmware

Arduino Uno sketch for the one-cell Braille display: six SG90 servos, one per
dot. The Uno holds the Braille table and the letter timing. The Jetson, or
anything with a serial port, sends a word such as `SPELL chair` and the board
spells it: raise the letter's dots, hold, lower, short gap, next letter.

```
Jetson ── USB serial ──▶ Arduino Uno ── D2..D7 ──▶ six SG90s ──▶ dots 1..6
  "SPELL chair"            Braille table, timing,
  ◀── "CELL 09 c" ...      servo endpoints (EEPROM)
```

**Status.** The sketch compiles for the Uno (about 29% of flash and 45% of
RAM). The logic passes host tests and runs in a simulator. It has not yet
been run on a real board with servos; the endpoint defaults are placeholders
until each dot is calibrated.

## Files

```text
magneto_cell/magneto_cell.ino   Arduino glue: servos, serial port, EEPROM
magneto_cell/cell_core.*        All the logic, plain C++ (also built on a computer)
one_servo_test/one_servo_test.ino  Slow sweep of a single servo on D2
servo_test/servo_test.ino       Slow sweep of all six servos together
test/test_core.cpp              Host tests: make test
sim/cell_sim.cpp                The firmware on stdin/stdout: make sim
```

## Wiring

Dots as the reader sees them from above:

```
1  4
2  5
3  6
```

| Arduino | Connects to                            |
| ------- | -------------------------------------- |
| D2      | dot 1 servo signal                     |
| D3      | dot 2 servo signal                     |
| D4      | dot 3 servo signal                     |
| D5      | dot 4 servo signal                     |
| D6      | dot 5 servo signal                     |
| D7      | dot 6 servo signal                     |
| GND     | servo supply negative (common ground)  |
| USB     | Jetson: data and the Arduino's own power |

- Servo supply positive goes to all six servo red leads. Servo supply negative
  goes to all six servo grounds **and** to Arduino GND.
- Do not power the servos from the Arduino's 5 V pin, from the Jetson, or
  through breadboard power rails. A breadboard can carry the signal wires.
- SG90 leads are usually brown = ground, red = positive, orange = signal.
  Check yours.
- The supply (for example a four-cell NiMH pack) is still undecided. Check
  that the servos accept its fully charged voltage, and that it can supply six
  servos starting at once.

## Servo test first

Start with one servo. `one_servo_test/one_servo_test.ino` sweeps a single
servo on D2 (dot 1's pin) slowly back and forth. Wire just that servo: signal
to D2, ground to GND and the supply's negative, power to the supply's
positive. When it sweeps smoothly, move on to all six with the sketch below.

`servo_test/servo_test.ino` checks the wiring and power before the real
firmware goes on. It uses the same pins, needs no input or calibration, and
does no Braille. All six servos sweep slowly together, about 40° (1300 ↔ 1700
µs) over 2 seconds, with a 1 second rest at each end.

Flash it (same steps as below, with `servo_test` in place of `magneto_cell`).
Optionally open the Serial Monitor at 115200 baud, where it prints `HIGH` /
`LOW` at each end.

What to look for:

- **A servo doesn't move.** Check its signal pin, then its power and ground.
- **Jitter or buzzing.** The supply is weak or the ground is not shared.
- **"servo test starting" reappears by itself.** The board reset because the
  servos pulled the supply down.

Run it with the horns free or the linkages detached. Otherwise narrow
`LOW_US`/`HIGH_US` first so no pin is pushed against its stop. `STEP_US` and
`STEP_MS` set the speed.

## Flash

Arduino IDE: open `magneto_cell/magneto_cell.ino`, choose **Arduino Uno**, and
upload. The Servo library ships with the IDE.

arduino-cli:

```bash
arduino-cli core install arduino:avr
arduino-cli lib install Servo
arduino-cli compile --fqbn arduino:avr:uno cell-firmware/magneto_cell
arduino-cli upload  --fqbn arduino:avr:uno -p /dev/ttyACM0 cell-firmware/magneto_cell
```

## Calibrate each dot

Every linkage needs its own UP and DOWN pulse. Mirrored horns move in opposite
directions, so no single angle fits all six. Open the Serial Monitor at
**115200 baud** with line ending **Newline**, then do this for each dot:

1. `JOG 1 1500` moves dot 1's servo to 1500 µs. Step in 20–50 µs increments.
   Find the pulse where the pin is fully raised and the one where it sits just
   below the reading surface. A servo that buzzes is pushing against a hard
   stop, so back off a little.
2. `CAL 1 1720 1460` stores UP then DOWN. UP can be the smaller number.
3. Check with `DOTS 1` (raised) and `DOTS` (all down).

Repeat for dots 2–6. Then:

- `DOTS 123456` raises every dot. Check that none stick or collide.
- `SPELL hello` runs the demo word.
- `SAVE` writes the endpoints and timing to EEPROM.
- `CONFIG` prints the settings as commands you can paste back later. Keep a
  copy with the build notes.

## Commands

One command per line. Command words are not case sensitive.

| Command                               | Does                                                              |
| ------------------------------------- | ----------------------------------------------------------------- |
| `SPELL text` (or `S text`)            | Spells the letters a–z; spaces give a word gap; other characters are skipped. Interrupts the current word. |
| `DOTS 125`                            | Shows a raw pattern and holds it; `DOTS` alone lowers every dot     |
| `CLEAR` (or `C`)                      | Stops spelling and lowers every dot                               |
| `TIMING hold gap word [stagger]`      | Milliseconds: letter hold, gap between letters, gap between words, and the delay between individual servo moves |
| `CAL dot up_us down_us`               | Sets a dot's endpoints (500–2500 µs) and applies them at once      |
| `JOG dot pulse_us`                    | Moves one servo directly, for calibration, until the next pattern  |
| `CONFIG`                              | Prints the current settings as `CAL`/`TIMING` lines               |
| `SAVE` / `DEFAULTS`                   | Writes the settings to EEPROM / restores the defaults (not saved)  |
| `PING`, `HELP`                        | `PONG magneto-cell 1` / the command list                          |

The defaults are a 3000 ms letter hold, 300 ms gap, 1000 ms word gap and 20 ms
servo stagger. Changes last until reset unless saved.

## Messages from the board

| Line                     | Meaning                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `READY magneto-cell 1`   | Booted (an Uno also reboots whenever the port is opened)       |
| `OK` / `ERR reason`      | Exactly one per command                                        |
| `CELL 13 h`              | The cell now shows mask 0x13 (bit 0 = dot 1) for letter `h`; `-` = blank, `_` = word gap |
| `END done` / `END stopped` | A `SPELL` finished, or was cut short by another command. Every `SPELL` gets exactly one. |

## Behavior worth knowing

- **Clear between letters.** There is always an all-down gap after each letter,
  so the two L's in "hello" read as two letters.
- **Dots are driven both ways and held.** Servos stay powered while a letter is
  shown, with no catch, as the mechanism notes require.
- **Gentle power-up.** Each servo's first pulse is its DOWN position, so
  nothing jumps to 90°. The servos also start 150 ms apart.
- **Staggered moves.** Within a letter, servos start 20 ms apart instead of all
  at once, which lowers the peak current draw. Use `TIMING ... 0` to move them
  together.
- **Safe settings.** EEPROM settings carry a checksum. Blank or corrupt
  settings fall back to the defaults.
- **No computer needed for a demo.** Set `BOOT_TEXT` in the sketch to
  `"hello"` and the board spells it at power-up.
- **Unexpected restarts.** If the board prints `READY` while running (the
  Jetson logs `Arduino restarted`), the servos are probably pulling the supply
  down. Check the separate servo supply and the shared ground.

## From the Jetson

`cane-vision` finds the board automatically (`cell.port: auto` in its
`config.yaml`) and sends its `braille:` timing on connect without saving it.
It falls back to the on-screen preview if no Arduino is connected.

```bash
cd cane-vision
.venv/bin/python -m cane_vision.serial_cell hello              # spell a word
.venv/bin/python -m cane_vision.serial_cell --send CONFIG      # any command
.venv/bin/python -m cane_vision --cell /dev/ttyACM0            # full pipeline
```

## Test without hardware

```bash
cd cell-firmware
make test                       # firmware logic tests
make sim && ./build/cell_sim -v # type commands; servo moves print on stderr
```

The `cane-vision` tests also build the simulator. They run the Python serial
driver against it through a pseudo-terminal, which checks the protocol and
confirms that the firmware's Braille table matches `braille.py`.
