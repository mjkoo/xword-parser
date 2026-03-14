#!/usr/bin/env bash
# Populate vitiate seed directories from the testdata directory.
#
# The testdata directory contains copyright-encumbered puzzle files that live
# in a private repository (mjkoo/xword-parser-testdata). This script copies
# those files into the appropriate .vitiate/testdata/*/seeds/ directories so
# that the fuzzer has real-world seed inputs.
#
# Usage:
#   ./scripts/seed-vitiate.sh [testdata_dir]
#
# If testdata_dir is not specified, defaults to ./testdata

set -euo pipefail

TESTDATA_DIR="${1:-testdata}"

if [ ! -d "$TESTDATA_DIR" ]; then
  echo "Error: testdata directory '$TESTDATA_DIR' not found" >&2
  echo "Clone it first: git clone <testdata-repo-url> testdata" >&2
  exit 1
fi

VITIATE_TESTDATA=".vitiate/testdata"

if [ ! -d "$VITIATE_TESTDATA" ]; then
  echo "Error: $VITIATE_TESTDATA does not exist. Run 'npx vitiate fuzz --fuzz-time 0' first to initialize directories." >&2
  exit 1
fi

# Map file extensions to testdata subdirectories
declare -A EXT_TO_DIR=(
  [ipuz]=ipuz
  [puz]=puz
  [jpz]=jpz
  [xd]=xd
)

copied=0

for seeds_dir in "$VITIATE_TESTDATA"/*/seeds; do
  [ -d "$seeds_dir" ] || continue

  # Determine which format(s) this seed directory needs by reading the .formats file
  formats_file="$seeds_dir/.formats"
  if [ ! -f "$formats_file" ]; then
    echo "Warning: no .formats file in $seeds_dir, skipping" >&2
    continue
  fi

  while IFS= read -r fmt; do
    [ -n "$fmt" ] || continue
    src_dir="$TESTDATA_DIR/$fmt"
    if [ ! -d "$src_dir" ]; then
      echo "Warning: testdata format directory '$src_dir' not found, skipping" >&2
      continue
    fi

    count=$(find "$src_dir" -maxdepth 1 -type f | wc -l)
    if [ "$count" -gt 0 ]; then
      cp "$src_dir"/* "$seeds_dir"/
      copied=$((copied + count))
      echo "Copied $count files from $src_dir -> $seeds_dir"
    fi
  done < "$formats_file"
done

echo "Done: copied $copied seed files total"
