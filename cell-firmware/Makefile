CXX ?= c++
CXXFLAGS ?= -std=c++11 -Wall -Wextra -O1
CORE = magneto_cell/cell_core.cpp magneto_cell/cell_core.h

.PHONY: test sim uno clean

test: build/test_core
	./build/test_core

sim: build/cell_sim

build/test_core: test/test_core.cpp $(CORE)
	@mkdir -p build
	$(CXX) $(CXXFLAGS) -o $@ test/test_core.cpp magneto_cell/cell_core.cpp

build/cell_sim: sim/cell_sim.cpp $(CORE)
	@mkdir -p build
	$(CXX) $(CXXFLAGS) -o $@ sim/cell_sim.cpp magneto_cell/cell_core.cpp

# Needs arduino-cli with the arduino:avr core and the Servo library.
uno:
	arduino-cli compile --fqbn arduino:avr:uno --warnings all magneto_cell

clean:
	rm -rf build
