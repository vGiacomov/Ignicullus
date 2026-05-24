import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parents[1] / "ignicullus.sqlite3"


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS flight_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                scenario TEXT NOT NULL,
                success INTEGER NOT NULL,
                score INTEGER NOT NULL,
                final_time_s REAL NOT NULL,
                final_alt_km REAL NOT NULL,
                final_vel_ms REAL NOT NULL,
                max_alt_km REAL NOT NULL,
                max_vel_ms REAL NOT NULL,
                max_mach REAL NOT NULL,
                max_q_kpa REAL NOT NULL,
                payload_kg REAL NOT NULL,
                total_mass_kg REAL NOT NULL,
                fail_reason TEXT NOT NULL,
                params_json TEXT NOT NULL
            )
            """
        )


def _asdict(value: Any) -> dict[str, Any]:
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if isinstance(value, dict):
        return value
    return dict(value)


def _total_mass(rocket: Any) -> float:
    data = _asdict(rocket)
    stage1 = data["stage1"]
    stage2 = data["stage2"]
    return float(
        stage1["dry_mass"] + stage1["prop_mass"] +
        stage2["dry_mass"] + stage2["prop_mass"] +
        data["payload_kg"] + data["fairing_kg"]
    )


def _score(success: bool, final_alt: float, final_vel: float, max_q: float) -> int:
    orbit_score = 55 if success else 0
    altitude_score = min(final_alt / 400.0, 1.0) * 20
    velocity_score = min(final_vel / 7700.0, 1.0) * 20
    pressure_penalty = max(0.0, (max_q - 80.0) / 80.0) * 10
    return max(0, min(100, round(orbit_score + altitude_score + velocity_score - pressure_penalty)))


def save_flight_run(req: Any, telemetry: list[dict[str, Any]], complete: dict[str, Any]) -> None:
    init_db()
    last = telemetry[-1] if telemetry else {}
    success = bool(complete.get("orbit"))
    final_time = float(last.get("t", 0))
    final_alt = float(last.get("alt", 0))
    final_vel = float(last.get("vel", 0))
    max_alt = max((float(p.get("alt", 0)) for p in telemetry), default=0)
    max_vel = max((float(p.get("vel", 0)) for p in telemetry), default=0)
    max_mach = max((float(p.get("mach", 0)) for p in telemetry), default=0)
    max_q = max((float(p.get("q_kpa", 0)) for p in telemetry), default=0)
    rocket = req.rocket

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO flight_runs (
                created_at, scenario, success, score, final_time_s, final_alt_km,
                final_vel_ms, max_alt_km, max_vel_ms, max_mach, max_q_kpa,
                payload_kg, total_mass_kg, fail_reason, params_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                datetime.now().isoformat(timespec="seconds"),
                req.scenario,
                1 if success else 0,
                _score(success, final_alt, final_vel, max_q),
                final_time,
                final_alt,
                final_vel,
                max_alt,
                max_vel,
                max_mach,
                max_q,
                float(req.rocket.payload_kg),
                _total_mass(rocket),
                str(complete.get("fail_reason") or ""),
                json.dumps({
                    "rocket": _asdict(req.rocket),
                    "atmosphere": _asdict(req.atmosphere),
                    "sim": _asdict(req.sim),
                }, ensure_ascii=False),
            ),
        )


def list_flight_runs() -> list[dict[str, Any]]:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
      conn.row_factory = sqlite3.Row
      rows = conn.execute(
          "SELECT * FROM flight_runs ORDER BY score DESC, created_at DESC"
      ).fetchall()
      return [dict(row) for row in rows]


def delete_flight_run(run_id: int) -> bool:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("DELETE FROM flight_runs WHERE id = ?", (run_id,))
        return cursor.rowcount > 0
