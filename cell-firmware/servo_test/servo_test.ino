// Magneto servo test: all six dot servos sweep slowly together, back and
// forth, forever. Same pins as the real firmware (../magneto_cell):
// D2-D7 = dots 1-6. No input needed; just power it and watch.
//
// The Serial Monitor (115200 baud) prints each end of the sweep. If
// "servo test starting" reappears by itself, the board reset: the servos
// are pulling the supply down. Check the servo supply and the shared ground.

#include <Servo.h>

const uint8_t DOT_COUNT = 6;
const uint8_t SERVO_PINS[DOT_COUNT] = {2, 3, 4, 5, 6, 7};  // dots 1-6

// Pulse widths in microseconds. 1500 is the middle of an SG90's range and
// roughly 10 us is one degree, so 1300-1700 is about 40 degrees of swing.
// With the dot linkages attached, narrow this so no pin hits its stop.
const uint16_t LOW_US = 1300;
const uint16_t HIGH_US = 1700;

// Speed: STEP_US every STEP_MS, so one sweep takes
// (1700 - 1300) / 5 * 25 ms = 2 seconds.
const uint16_t STEP_US = 5;
const uint16_t STEP_MS = 25;
const uint16_t END_PAUSE_MS = 1000;  // rest at each end

Servo servos[DOT_COUNT];

void writeAll(uint16_t us) {
  for (uint8_t i = 0; i < DOT_COUNT; i++) servos[i].writeMicroseconds(us);
}

void sweep(int from, int to) {
  int step = to > from ? STEP_US : -STEP_US;
  for (int us = from; step > 0 ? us < to : us > to; us += step) {
    writeAll(us);
    delay(STEP_MS);
  }
  writeAll(to);
}

void setup() {
  Serial.begin(115200);
  Serial.println(F("servo test starting"));

  // Start every servo at LOW, powering them up one at a time.
  for (uint8_t i = 0; i < DOT_COUNT; i++) {
    servos[i].writeMicroseconds(LOW_US);
    servos[i].attach(SERVO_PINS[i], 500, 2500);
    delay(150);
  }
  delay(END_PAUSE_MS);
}

void loop() {
  sweep(LOW_US, HIGH_US);
  Serial.println(F("HIGH"));
  delay(END_PAUSE_MS);
  sweep(HIGH_US, LOW_US);
  Serial.println(F("LOW"));
  delay(END_PAUSE_MS);
}
