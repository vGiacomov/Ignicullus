#!/usr/bin/env bash
# DTM — Supertonic TTS setup
# Model is auto-downloaded on first run. Just install the package.
set -e
echo "=== Installing Supertonic TTS ==="
pip install supertonic
echo ""
echo "=== DONE ==="
echo "Supertonic 3 will auto-download the model (~100 MB) on first startup."
echo "Voice: M1 (change via TTS_VOICE env var: M1 M2 F1 F2 ...)"
echo "Lang:  en  (change via TTS_LANG  env var)"
echo ""
echo "Now run: docker compose up --build"
