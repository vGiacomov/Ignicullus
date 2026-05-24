import logging
import os
import tempfile
import time
from functools import lru_cache

logger = logging.getLogger("ignicullus.tts")

DEFAULT_SUPERTONIC_VOICE = "F4"
AVAILABLE_SUPERTONIC_VOICES = ("F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3", "M4", "M5")


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


def synthesize_supertonic_wav(text: str, voice: str = DEFAULT_SUPERTONIC_VOICE, lang: str = "en") -> bytes:
    voice = normalize_supertonic_voice(voice)
    total_start = time.perf_counter()
    logger.warning(
        "Supertonic TTS: request started voice=%s lang=%s chars=%s",
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
