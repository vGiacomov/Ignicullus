import asyncio, json
from fastapi import WebSocket, WebSocketDisconnect
from core.simulation import simulate
from core.rocket_model import build_from_config
from core.flight_db import save_flight_run
from models.schemas import SimRequest

async def ws_simulate_handler(websocket: WebSocket):
    await websocket.accept()
    try:
        raw  = await asyncio.wait_for(websocket.receive_text(), timeout=30)
        data = json.loads(raw)
        req  = SimRequest(**data)
        rocket = build_from_config(req.rocket)
        speed  = max(1.0, min(req.speed, 30.0))

        await websocket.send_text(json.dumps({
            "type": "start",
            "rocket_name": "IGNICULLUS Launch Vehicle",
            "scenario": req.scenario
        }))

        batch = []
        telemetry = []
        for msg in simulate(rocket, req.atmosphere, req.sim, req.scenario):
            if msg["type"] == "telemetry":
                telemetry.append(msg)
            elif msg["type"] == "complete":
                save_flight_run(req, telemetry, msg)
            batch.append(msg)
            if len(batch) >= 10 or msg["type"] in ("event", "complete"):
                for m in batch:
                    await websocket.send_text(json.dumps(m))
                batch = []
                if msg["type"] != "telemetry":
                    await asyncio.sleep(0.02 / speed)
                else:
                    await asyncio.sleep(req.sim.dt / speed * 0.8)
        for m in batch:
            await websocket.send_text(json.dumps(m))
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_text(json.dumps({"type":"error","message":str(e)}))
        except:
            pass
