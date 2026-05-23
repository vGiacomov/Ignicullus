import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from api.routes import router
from api.ws_simulate import ws_simulate_handler

app = FastAPI(title="IGNICULLUS API", version="2.0.0")

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

# Serve built frontend
dist_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
