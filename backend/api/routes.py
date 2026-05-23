from fastapi import APIRouter, Response
from core.scenarios import SCENARIOS
from core.simulation import simulate
from core.optimizer import run_ga
from core.rocket_model import build_from_config
from models.schemas import SimRequest, OptimizeRequest

from datetime import datetime
from io import BytesIO
import textwrap


router = APIRouter()


@router.get("/scenarios")
def get_scenarios():
    return SCENARIOS


@router.post("/simulate/sync")
def simulate_sync(req: SimRequest):
    rocket = build_from_config(req.rocket)

    events = []
    telem = []

    for msg in simulate(rocket, req.atmosphere, req.sim, req.scenario):
        if msg["type"] == "telemetry":
            telem.append(msg)
        elif msg["type"] in ("event", "complete"):
            events.append(msg)

    return {
        "telemetry": telem,
        "events": events
    }


@router.post("/optimize")
def optimize(req: OptimizeRequest):
    rocket = build_from_config(req.rocket)
    return run_ga(rocket, req.generations, req.population)


def _safe_get(obj, key, default=None):
    if obj is None:
        return default

    if isinstance(obj, dict):
        return obj.get(key, default)

    return getattr(obj, key, default)


def _build_simple_pdf(lines):
    buffer = BytesIO()

    stream_lines = [
        "BT",
        "/F1 11 Tf"
    ]

    y = 800
    line_height = 16

    for line in lines:
        if y < 50:
            break

        safe_line = (
            str(line)
            .replace("\\", "\\\\")
            .replace("(", "\\(")
            .replace(")", "\\)")
        )

        stream_lines.append(f"1 0 0 1 50 {y} Tm")
        stream_lines.append(f"({safe_line}) Tj")

        y -= line_height

    stream_lines.append("ET")

    content_stream = "\n".join(stream_lines)

    pdf_objects = [
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
        "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
        (
            "3 0 obj\n"
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            "/Resources << /Font << /F1 4 0 R >> >> "
            "/Contents 5 0 R >>\n"
            "endobj"
        ),
        (
            "4 0 obj\n"
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n"
            "endobj"
        ),
        (
            f"5 0 obj\n"
            f"<< /Length {len(content_stream.encode('utf-8'))} >>\n"
            f"stream\n{content_stream}\nendstream\n"
            f"endobj"
        )
    ]

    xref_positions = []
    buffer.write(b"%PDF-1.4\n")

    for obj in pdf_objects:
        xref_positions.append(buffer.tell())
        buffer.write(obj.encode("utf-8"))
        buffer.write(b"\n")

    xref_start = buffer.tell()

    buffer.write(f"xref\n0 {len(pdf_objects) + 1}\n".encode("utf-8"))
    buffer.write(b"0000000000 65535 f \n")

    for pos in xref_positions:
        buffer.write(f"{pos:010d} 00000 n \n".encode("utf-8"))

    buffer.write(
        f"trailer\n"
        f"<< /Size {len(pdf_objects) + 1} /Root 1 0 R >>\n"
        f"startxref\n"
        f"{xref_start}\n"
        f"%%EOF".encode("utf-8")
    )

    buffer.seek(0)
    return buffer.read()


@router.post("/report/pdf")
def generate_pdf_report(req: SimRequest):
    rocket = build_from_config(req.rocket)

    events = []
    telemetry = []

    for msg in simulate(rocket, req.atmosphere, req.sim, req.scenario):
        if msg["type"] == "telemetry":
            telemetry.append(msg)
        elif msg["type"] in ("event", "complete"):
            events.append(msg)

    max_altitude = 0
    max_velocity = 0
    max_mach = 0
    max_q = 0
    max_g = 0

    for point in telemetry:
        altitude = (
            point.get("alt")
            or point.get("altitude")
            or point.get("height")
            or 0
        )

        velocity = (
            point.get("vel")
            or point.get("velocity")
            or point.get("speed")
            or point.get("v")
            or 0
        )

        mach = (
            point.get("mach")
            or point.get("Mach")
            or 0
        )

        dynamic_pressure = (
            point.get("q_kpa")
            or point.get("q")
            or point.get("dynamic_pressure")
            or 0
        )

        g_load = (
            point.get("accel_g")
            or point.get("g")
            or point.get("g_load")
            or point.get("acceleration_g")
            or 0
        )

        try:
            max_altitude = max(max_altitude, float(altitude))
            max_velocity = max(max_velocity, float(velocity))
            max_mach = max(max_mach, float(mach))
            max_q = max(max_q, float(dynamic_pressure))
            max_g = max(max_g, float(g_load))
        except Exception:
            pass

    orbit_reached = False

    for event in events:
        event_text = str(event).lower()

        if (
            "orbit" in event_text
            or "orbita" in event_text
            or "leo" in event_text
            or "payload" in event_text
        ):
            if (
                "reached" in event_text
                or "achieved" in event_text
                or "osiąg" in event_text
                or "success" in event_text
                or "complete" in event_text
            ):
                orbit_reached = True

    mission_status = "SUCCESS" if orbit_reached else "PARTIAL / ANALYSIS REQUIRED"

    rocket_mass = _safe_get(req.rocket, "mass", "brak danych")
    engine = _safe_get(req.rocket, "engine", "brak danych")
    structure = _safe_get(req.rocket, "structure", "brak danych")

    atmosphere_model = _safe_get(req.atmosphere, "model", "brak danych")
    scenario_name = _safe_get(req.scenario, "name", req.scenario)

    raw_lines = [
        "IGNICULLUS - SATELLITE LAUNCH SYSTEM",
        "MISSION ANALYSIS REPORT",
        "",
        f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "1. Mission status",
        f"Mission status: {mission_status}",
        f"Orbit reached: {'YES' if orbit_reached else 'NO'}",
        "",
        "2. Key telemetry results",
        f"Maximum altitude: {max_altitude:.2f} km",
        f"Maximum velocity: {max_velocity:.2f} m/s",
        f"Maximum Mach number: {max_mach:.2f}",
        f"Maximum dynamic pressure Max Q: {max_q:.2f} kPa",
        f"Maximum G-load: {max_g:.2f} g",
        f"Telemetry samples: {len(telemetry)}",
        "",
        "3. Rocket configuration",
        f"Rocket mass: {rocket_mass}",
        f"Engine: {engine}",
        f"Structure: {structure}",
        "",
        "4. Simulation configuration",
        f"Atmosphere model: {atmosphere_model}",
        f"Scenario: {scenario_name}",
        "",
        "5. Mission events",
    ]

    if events:
        for index, event in enumerate(events[:25], start=1):
            event_text = str(event)
            wrapped = textwrap.wrap(event_text, width=85)

            if wrapped:
                raw_lines.append(f"{index}. {wrapped[0]}")
                for extra_line in wrapped[1:]:
                    raw_lines.append(f"   {extra_line}")
            else:
                raw_lines.append(f"{index}. {event_text}")
    else:
        raw_lines.append("No mission events recorded.")

    raw_lines.extend([
        "",
        "6. Interpretation",
    ])

    if orbit_reached:
        raw_lines.extend([
            "The simulation indicates that the mission reached the target orbital phase.",
            "The tested rocket configuration can be treated as a successful baseline for further optimization.",
        ])
    else:
        raw_lines.extend([
            "The simulation did not clearly confirm successful orbit insertion.",
            "Recommended next steps: increase performance, reduce mass, optimize staging or improve flight profile.",
        ])

    raw_lines.extend([
        "",
        "7. IGNICULLUS value",
        "This report documents the influence of selected rocket, atmosphere and mission parameters",
        "on the simulated flight profile. It supports repeated testing and comparison of mission variants.",
    ])

    pdf_bytes = _build_simple_pdf(raw_lines)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=mission-analysis-report.pdf"
        }
    )
