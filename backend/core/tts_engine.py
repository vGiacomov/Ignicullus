"""
TTS Engine - Supertonic 3 (local, on-device, ONNX, no GPU needed)
https://huggingface.co/Supertone/supertonic-3

Install:
    pip install supertonic

Auto-downloads model on first run (~99M params, no manual wget needed).
Fallback: Web Speech API (browser-side).
"""
import io, threading, tempfile, os
from typing import Optional

# ── Config ─────────────────────────────────────────────────────────────────
SUPERTONIC_VOICE  = os.environ.get("TTS_VOICE", "M1")   # M1 M2 F1 F2 etc.
SUPERTONIC_LANG   = os.environ.get("TTS_LANG",  "en")


class SupertonicTTSEngine:
    """
    Supertonic 3 engine — downloads model on first use, runs fully local.
    Synthesizes text → WAV bytes for WebSocket streaming to the browser.
    """

    def __init__(self):
        self._ready    = False
        self._tts      = None
        self._style    = None
        self._lock     = threading.Lock()
        threading.Thread(target=self._load, daemon=True).start()

    def _load(self):
        try:
            from supertonic import TTS
            print("[TTS] Loading Supertonic 3 (auto-download on first run)...")
            tts   = TTS(auto_download=True)
            style = tts.get_voice_style(voice_name=SUPERTONIC_VOICE)
            self._tts   = tts
            self._style = style
            self._ready = True
            print(f"[TTS] Supertonic 3 ready — voice={SUPERTONIC_VOICE} lang={SUPERTONIC_LANG}")
        except ImportError:
            print("[TTS] supertonic not installed — pip install supertonic")
            print("[TTS] Fallback: browser Web Speech API")
        except Exception as e:
            print(f"[TTS] Supertonic load error: {e}")
            print("[TTS] Fallback: browser Web Speech API")

    @property
    def ready(self) -> bool:
        return self._ready

    def get_sample_rate(self) -> int:
        # Supertonic 3 outputs 24000 Hz
        return 24000

    def synthesize_wav_bytes(self, text: str) -> Optional[bytes]:
        """text → WAV bytes (streamed to browser via WebSocket)."""
        if not self._ready or not self._tts:
            return None
        text = text.strip()
        if not text:
            return None
        with self._lock:
            try:
                import wave, numpy as np
                wav_arr, duration = self._tts.synthesize(
                    text, voice_style=self._style, lang=SUPERTONIC_LANG
                )
                # wav_arr is numpy float32 [-1,1] at 24kHz
                pcm = (wav_arr * 32767).astype(np.int16)
                buf = io.BytesIO()
                with wave.open(buf, "wb") as wf:
                    wf.setnchannels(1)
                    wf.setsampwidth(2)
                    wf.setframerate(self.get_sample_rate())
                    wf.writeframes(pcm.tobytes())
                return buf.getvalue()
            except Exception as e:
                print(f"[TTS] Synthesis error: {e}")
                return None


# ── Singleton ────────────────────────────────────────────────────────────
_engine: Optional[SupertonicTTSEngine] = None
_engine_lock = threading.Lock()


def get_tts_engine() -> SupertonicTTSEngine:
    global _engine
    with _engine_lock:
        if _engine is None:
            _engine = SupertonicTTSEngine()
    return _engine
