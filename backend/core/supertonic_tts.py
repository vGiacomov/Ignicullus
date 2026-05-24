import logging
import os
import tempfile
import threading
import time
from functools import lru_cache

logger = logging.getLogger("ignicullus.tts")

DEFAULT_SUPERTONIC_VOICE = "F4"
AVAILABLE_SUPERTONIC_VOICES = ("F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3", "M4", "M5")
DEFAULT_SUPERTONIC_LANG = "en"
DEFAULT_SUPERTONIC_WARMUP_TEXTS = (
    "Supertonic three voice test. Ignicullus telemetry online.",
    "Launch sequence initiated.",
    "Gravity turn initiated.",
    "Main engine cutoff. Stage one burnout.",
    "Stage separation confirmed.",
    "Stage two ignition.",
    "Payload fairing jettisoned.",
    "Second engine cutoff.",
    "Payload separation. Satellite deployment.",
    "Max Q.",
    "Mission complete. Orbit achieved.",
    "Mission abort.",
)

_warmup_started = False
_warmup_lock = threading.Lock()


def normalize_supertonic_voice(voice: str | None) -> str:
    requested_voice = (voice or DEFAULT_SUPERTONIC_VOICE).strip().upper()

    if requested_voice in AVAILABLE_SUPERTONIC_VOICES:
        return requested_voice

    logger.warning(
        "Supertonic TTS: unknown voice=%s, falling back to %s",
        requested_voice,
        DEFAULT_SUPERTONIC_VOICE,
    )
    return DEFAULT_SUPERTONIC_VOICE


@lru_cache(maxsize=1)
def _engine():
    start = time.perf_counter()
    logger.warning("Supertonic TTS: loading engine/model. First run can download ~400 MB, wait...")

    from supertonic import TTS

    engine = TTS(auto_download=True)
    logger.warning("Supertonic TTS: engine ready in %.2fs", time.perf_counter() - start)
    logger.warning("Supertonic TTS: preloading default voice style %s", DEFAULT_SUPERTONIC_VOICE)
    engine.get_voice_style(voice_name=DEFAULT_SUPERTONIC_VOICE)

    return engine


@lru_cache(maxsize=128)
def _synthesize_supertonic_wav_cached(text: str, voice: str, lang: str) -> bytes:
    total_start = time.perf_counter()
    logger.warning(
        "Supertonic TTS: cache miss voice=%s lang=%s chars=%s",
        voice,
        lang,
        len(text),
    )

    tts = _engine()
    logger.warning("Supertonic TTS: resolving voice style %s", voice)
    style = tts.get_voice_style(voice_name=voice)

    synth_start = time.perf_counter()
    logger.warning("Supertonic TTS: synthesizing audio, wait...")
    wav, _ = tts.synthesize(
        text=text,
        voice_style=style,
        total_steps=8,
        speed=1.05,
        max_chunk_length=220,
        silence_duration=0.2,
        lang=lang,
        verbose=True,
    )
    logger.warning("Supertonic TTS: synthesis done in %.2fs", time.perf_counter() - synth_start)

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp:
            temp_path = temp.name

        logger.warning("Supertonic TTS: saving wav to temp file")
        tts.save_audio(wav, temp_path)

        with open(temp_path, "rb") as audio_file:
            audio = audio_file.read()

        logger.warning(
            "Supertonic TTS: complete bytes=%s total=%.2fs",
            len(audio),
            time.perf_counter() - total_start,
        )

        return audio
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


def synthesize_supertonic_wav(
    text: str,
    voice: str = DEFAULT_SUPERTONIC_VOICE,
    lang: str = DEFAULT_SUPERTONIC_LANG,
) -> bytes:
    normalized_text = text.strip()
    normalized_voice = normalize_supertonic_voice(voice)
    normalized_lang = (lang or DEFAULT_SUPERTONIC_LANG).strip().lower()

    logger.warning(
        "Supertonic TTS: request started voice=%s lang=%s chars=%s",
        normalized_voice,
        normalized_lang,
        len(normalized_text),
    )

    return _synthesize_supertonic_wav_cached(normalized_text, normalized_voice, normalized_lang)


def _warmup_supertonic_cache(
    voice: str = DEFAULT_SUPERTONIC_VOICE,
    lang: str = DEFAULT_SUPERTONIC_LANG,
) -> None:
    start = time.perf_counter()
    logger.warning("Supertonic TTS: background warmup started voice=%s", voice)

    for text in DEFAULT_SUPERTONIC_WARMUP_TEXTS:
        try:
            synthesize_supertonic_wav(text, voice, lang)
        except Exception:
            logger.exception("Supertonic TTS: warmup failed for text=%r", text)
            return

    logger.warning("Supertonic TTS: background warmup complete in %.2fs", time.perf_counter() - start)


def start_supertonic_warmup() -> None:
    global _warmup_started

    with _warmup_lock:
        if _warmup_started:
            return
        _warmup_started = True

    thread = threading.Thread(
        target=_warmup_supertonic_cache,
        name="supertonic-tts-warmup",
        daemon=True,
    )
    thread.start()
