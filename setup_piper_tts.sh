#!/usr/bin/env bash
# Download Piper TTS model for DTM Digital Twin Mission
# Run this script inside the backend/ directory

set -e
MODEL="en_US-lessac-medium.onnx"
CONFIG="${MODEL}.json"
BASE_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium"

echo "=== Installing Piper TTS ==="
pip install piper-tts

echo ""
echo "=== Downloading voice model ($MODEL) ==="
cd backend/
wget -q --show-progress -O "$MODEL"        "${BASE_URL}/${MODEL}?download=true"
wget -q --show-progress -O "$CONFIG"       "${BASE_URL}/${CONFIG}?download=true"

echo ""
echo "=== DONE ==="
echo "Model saved: backend/${MODEL}"
echo "Now restart the backend: docker compose up --build"
