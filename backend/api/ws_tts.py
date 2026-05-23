"""
WebSocket TTS endpoint:
  Client sends JSON: { "text": "...", "lang": "en" }
  Server responds:
    { "type": "tts_ready", "engine": "piper"|"browser", "sample_rate": 22050 }
    then binary frame: raw WAV bytes  (if Piper)
    OR  { "type": "tts_browser", "text": "..." }  (if fallback)
"""
import asyncio, json, base64
from fastapi import WebSocket, WebSocketDisconnect
from core.tts_engine import get_tts_engine

async def ws_tts_handler(ws: WebSocket):
    await ws.accept()
    engine = get_tts_engine()

    await ws.send_text(json.dumps({
        "type":        "tts_info",
        "engine":      "piper" if engine.ready else "browser",
        "sample_rate": engine.get_sample_rate(),
        "ready":       engine.ready,
    }))

    try:
        while True:
            raw = await asyncio.wait_for(ws.receive_text(), timeout=120)
            data = json.loads(raw)
            text = data.get("text", "").strip()
            if not text:
                continue

            if engine.ready:
                wav_bytes = engine.synthesize_wav_bytes(text)
                if wav_bytes:
                    # Send as base64 JSON so browser can decode easily
                    await ws.send_text(json.dumps({
                        "type":        "tts_audio",
                        "text":        text,
                        "audio_b64":   base64.b64encode(wav_bytes).decode(),
                        "sample_rate": engine.get_sample_rate(),
                        "format":      "wav",
                    }))
                else:
                    await ws.send_text(json.dumps({
                        "type": "tts_browser", "text": text
                    }))
            else:
                # Tell browser to use Web Speech API
                await ws.send_text(json.dumps({
                    "type": "tts_browser", "text": text
                }))

    except (WebSocketDisconnect, asyncio.TimeoutError):
        pass
    except Exception as e:
        try:
            await ws.send_text(json.dumps({"type": "error", "message": str(e)}))
        except:
            pass
