// Magneto single servo test: one servo on D2 (dot 1's pin) sweeps slowly
// back and forth, forever. No input needed; just power it and watch.
// Once this works, move on to ../servo_test for all six.
//
// Wiring: servo signal (orange) -> D2, servo ground (brown) -> GND and the
// supply's negative, servo power (red) -> the supply's positive. Check your
// servo's wire colors.

#include <Servo.h>

const uint8_t SERVO_PIN = 2;

// Pulse widths in microseconds; about 10 us per degree, so this is ~40 degrees.
const int LOW_US = 1300;
const int HIGH_US = 1700;

const int STEP_US = 5;   // sweep speed: STEP_US every STEP_MS,
const int STEP_MS = 25;  // so one sweep takes about 2 seconds

Servo servo;

void sweep(int from, int to) {
  int step = to > from ? STEP_US : -STEP_US;
  for (int us = from; step > 0 ? us < to : us > to; us += step) {
    servo.writeMicroseconds(us);
    delay(STEP_MS);
  }
  servo.writeMicroseconds(to);
}

void setup() {
  Serial.begin(115200);
  Serial.println(F("one servo test starting"));
  servo.writeMicroseconds(LOW_US);  // first pulse is LOW, not the 90 degree default
  servo.attach(SERVO_PIN, 500, 2500);
  delay(1000);
}

void loop() {
  sweep(LOW_US, HIGH_US);
  Serial.println(F("HIGH"));
  delay(1000);
  sweep(HIGH_US, LOW_US);
  Serial.println(F("LOW"));
  delay(1000);
}
