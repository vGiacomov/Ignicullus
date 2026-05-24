import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Response, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from api.routes import router
from api.ws_simulate import ws_simulate_handler
from core.flight_db import init_db
from core.supertonic_tts import DEFAULT_SUPERTONIC_VOICE, start_supertonic_warmup, synthesize_supertonic_wav
from models.schemas import TTSRequest


@asynccontextmanager
async def lifespan(app: FastAPI):
    if os.getenv("SUPERTONIC_WARMUP") == "1":
        start_supertonic_warmup()
    yield


app = FastAPI(title="IGNICULLUS API", version="2.0.0", lifespan=lifespan)
init_db()

app.add_middleware(CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"])

app.include_router(router, prefix="/api")

@app.websocket("/ws/simulate")
async def ws_endpoint(ws: WebSocket):
    await ws_simulate_handler(ws)

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "IGNICULLUS Backend v2.0"}

def _tts_response(text: str, voice: str, lang: str):
    try:
        audio = synthesize_supertonic_wav(text[:500], voice, lang)
    except ModuleNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail="Supertonic is not installed. Run: pip install supertonic"
        ) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return Response(
        content=audio,
        media_type="audio/wav",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )

@app.post("/api/tts/supertonic")
def tts_supertonic_post(req: TTSRequest):
    return _tts_response(req.text, req.voice, req.lang)

@app.get("/api/tts/supertonic")
def tts_supertonic_get(
    text: str = Query(..., max_length=500),
    voice: str = DEFAULT_SUPERTONIC_VOICE,
    lang: str = "en",
):
    return _tts_response(text, voice, lang)

# Serve built frontend
dist_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
