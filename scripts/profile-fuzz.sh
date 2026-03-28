#!/bin/bash
# Profile a single fuzz target for a short run using Node.js CPU profiler
TARGET="${1:-fuzz/ipuz.fuzz.ts}"
DURATION="${2:-10}"
PROF_DIR="./profiles"

mkdir -p "$PROF_DIR"
PROF_DIR_ABS="$(cd "$PROF_DIR" && pwd)"
VITIATE_FUZZ=1 VITIATE_FUZZ_TIME="$DURATION" \
  NODE_OPTIONS="--cpu-prof --cpu-prof-dir=$PROF_DIR_ABS" \
  pnpm exec vitest run "$TARGET"

echo "Profile written to $PROF_DIR/"
echo "Open in Chrome DevTools (F12 → Performance → Load profile)"
echo "Or use: pnpm exec speedscope $PROF_DIR/*.cpuprofile"
