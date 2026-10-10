"""Grade 1 Braille encoding for the single Magneto cell.

Each cell is a 6-bit mask where bit 0 is dot 1 and bit 5 is dot 6:

    1  4
    2  5
    3  6

This matches the Unicode Braille block (U+2800 + mask), which the console
preview uses to draw the cell.
"""

from __future__ import annotations

from dataclasses import dataclass

BLANK = 0x00
ALL_UP = 0x3F


def dots(*numbers: int) -> int:
    mask = 0
    for n in numbers:
        mask |= 1 << (n - 1)
    return mask


LETTERS: dict[str, int] = {
    "a": dots(1),
    "b": dots(1, 2),
    "c": dots(1, 4),
    "d": dots(1, 4, 5),
    "e": dots(1, 5),
    "f": dots(1, 2, 4),
    "g": dots(1, 2, 4, 5),
    "h": dots(1, 2, 5),
    "i": dots(2, 4),
    "j": dots(2, 4, 5),
    "k": dots(1, 3),
    "l": dots(1, 2, 3),
    "m": dots(1, 3, 4),
    "n": dots(1, 3, 4, 5),
    "o": dots(1, 3, 5),
    "p": dots(1, 2, 3, 4),
    "q": dots(1, 2, 3, 4, 5),
    "r": dots(1, 2, 3, 5),
    "s": dots(2, 3, 4),
    "t": dots(2, 3, 4, 5),
    "u": dots(1, 3, 6),
    "v": dots(1, 2, 3, 6),
    "w": dots(2, 4, 5, 6),
    "x": dots(1, 3, 4, 6),
    "y": dots(1, 3, 4, 5, 6),
    "z": dots(1, 3, 5, 6),
}


@dataclass(frozen=True)
class Step:
    """Show `mask` on the cell for `seconds`."""

    mask: int
    seconds: float
    char: str = ""


@dataclass(frozen=True)
class Timing:
    letter_hold_s: float = 3.0
    letter_gap_s: float = 0.3
    word_gap_s: float = 1.0


def to_unicode(mask: int) -> str:
    return chr(0x2800 + (mask & ALL_UP))


def normalize(text: str) -> str:
    """What the cell can show: lowercase letters and single spaces.

    Characters without a Grade 1 letter mapping are dropped. The Arduino
    firmware applies the same rule to the text it is sent.
    """
    words = ("".join(c for c in word if c in LETTERS) for word in text.lower().split())
    return " ".join(word for word in words if word)


def spell(text: str, timing: Timing = Timing()) -> list[Step]:
    """Turn text into cell steps: hold each letter, clear between letters.

    Every letter is followed by an all-down gap so repeated letters (the two
    L's in "hello") are distinguishable. Spaces become a longer blank gap.
    """
    steps: list[Step] = []
    for letters in normalize(text).split():
        if steps:
            steps.append(Step(BLANK, timing.word_gap_s, " "))
        for i, c in enumerate(letters):
            steps.append(Step(LETTERS[c], timing.letter_hold_s, c))
            if i < len(letters) - 1:
                steps.append(Step(BLANK, timing.letter_gap_s))
    return steps
