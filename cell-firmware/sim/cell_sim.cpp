// Runs the firmware logic on a computer, talking the same serial protocol on
// stdin/stdout, so the Jetson side can be tested without an Arduino:
//
//     make sim && ./build/cell_sim -v
//     SPELL hello
//
// With -v, servo moves are drawn on stderr. "-d 1500" waits that many ms
// before printing READY, like an Uno booting after the port opens.
#include <poll.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

#include "../magneto_cell/cell_core.h"

static bool verbose = false;

static uint32_t millis() {
  timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return (uint32_t)(ts.tv_sec * 1000ULL + ts.tv_nsec / 1000000);
}

struct SimHardware : magneto::Hardware {
  uint16_t pulse[magneto::DOT_COUNT] = {0, 0, 0, 0, 0, 0};
  const magneto::Cell* cell = nullptr;

  void writeServo(uint8_t dot, uint16_t us) override {
    pulse[dot] = us;
    if (!verbose || !cell) return;
    const magneto::Settings& s = cell->settings();
    // Reader's view: dots 1-3 down the left, 4-6 down the right.
    char dots[magneto::DOT_COUNT];
    for (int i = 0; i < magneto::DOT_COUNT; i++)
      dots[i] = pulse[i] == s.up_us[i] ? '#' : pulse[i] == s.down_us[i] ? '.' : '?';
    fprintf(stderr, "[servo] dot %d -> %4u us   %c%c %c%c %c%c\n", dot + 1, us, dots[0], dots[3],
            dots[1], dots[4], dots[2], dots[5]);
  }
  void println(const char* line) override {
    printf("%s\r\n", line);  // Serial.println ends lines with CRLF
    fflush(stdout);
  }
  bool save(const magneto::Settings&) override { return true; }
};

int main(int argc, char** argv) {
  int boot_ms = 0;
  for (int i = 1; i < argc; i++) {
    if (strcmp(argv[i], "-v") == 0) verbose = true;
    if (strcmp(argv[i], "-d") == 0 && i + 1 < argc) boot_ms = atoi(argv[++i]);
  }
  usleep(boot_ms * 1000);

  SimHardware hw;
  magneto::Cell cell(hw);
  hw.cell = &cell;
  cell.begin(millis());

  pollfd in = {STDIN_FILENO, POLLIN, 0};
  char buf[256];
  for (;;) {
    if (poll(&in, 1, 1) > 0) {
      ssize_t n = read(STDIN_FILENO, buf, sizeof buf);
      if (n <= 0) return 0;  // host closed the port
      for (ssize_t i = 0; i < n; i++) cell.feed(buf[i], millis());
    }
    cell.update(millis());
  }
}
