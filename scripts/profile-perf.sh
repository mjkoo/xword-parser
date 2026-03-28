#!/bin/bash
# Profile a single fuzz target using perf + V8 JIT maps for unified Rust+JS flamegraph
TARGET="${1:-fuzz/ipuz.fuzz.ts}"
DURATION="${2:-10}"

VITIATE_FUZZ=1 VITIATE_FUZZ_TIME="$DURATION" \
  NODE_OPTIONS="--perf-basic-prof --interpreted-frames-native-stack" \
  perf record -g -F 997 -- \
  npx vitest run "$TARGET"

# Generate flamegraph
perf script | inferno-collapse-perf | inferno-flamegraph > flamegraph.svg
echo "Flamegraph: flamegraph.svg"
