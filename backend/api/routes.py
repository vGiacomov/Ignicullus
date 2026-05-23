from fastapi import APIRouter
from core.scenarios import SCENARIOS
from core.simulation import simulate
from core.optimizer  import run_ga
from core.rocket_model import build_from_config
from models.schemas import SimRequest, OptimizeRequest

router = APIRouter()

@router.get("/scenarios")
def get_scenarios():
    return SCENARIOS

@router.post("/simulate/sync")
def simulate_sync(req: SimRequest):
    rocket = build_from_config(req.rocket)
    events = []; telem = []
    for msg in simulate(rocket, req.atmosphere, req.sim, req.scenario):
        if msg["type"] == "telemetry": telem.append(msg)
        elif msg["type"] in ("event", "complete"): events.append(msg)
    return {"telemetry": telem, "events": events}

@router.post("/optimize")
def optimize(req: OptimizeRequest):
    rocket = build_from_config(req.rocket)
    return run_ga(rocket, req.generations, req.population)
