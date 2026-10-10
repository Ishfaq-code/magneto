from cane_vision.braille import BLANK, LETTERS, Timing, spell, to_unicode


def test_hello_masks_match_spec():
    assert [LETTERS[c] for c in "hello"] == [0x13, 0x11, 0x07, 0x07, 0x15]


def test_unicode_matches_bit_layout():
    assert to_unicode(LETTERS["h"]) == "⠓"
    assert to_unicode(0x3F) == "⠿"


def test_repeated_letters_are_separated_by_blank():
    t = Timing(letter_hold_s=1, letter_gap_s=0.2, word_gap_s=0.5)
    masks = [s.mask for s in spell("all", t)]
    assert masks == [LETTERS["a"], BLANK, LETTERS["l"], BLANK, LETTERS["l"]]


def test_space_becomes_word_gap_and_unknown_chars_skipped():
    t = Timing(letter_hold_s=1, letter_gap_s=0.2, word_gap_s=0.5)
    steps = spell("Stop-Sign 2", t)
    letters = "".join(s.char for s in steps if s.mask)
    assert letters == "stopsign"
    assert spell("", t) == []
    assert spell("42", t) == []


def test_word_gap_between_words():
    t = Timing(letter_hold_s=1, letter_gap_s=0.2, word_gap_s=0.5)
    steps = spell("hair dryer", t)
    gap = steps[[s.char for s in steps].index(" ")]
    assert gap.mask == BLANK and gap.seconds == 0.5
