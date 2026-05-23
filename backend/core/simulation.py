import math
from typing import Generator, Dict, Any
from core.rocket_model import RocketModel
from core.atmosphere import air_density, speed_of_sound, gravity
from models.schemas import AtmosphereConfig, SimConfig

G0 = 9.80665

def simulate(rocket: RocketModel, atm: AtmosphereConfig, cfg: SimConfig,
             scenario: str = "nominal") -> Generator[Dict[str, Any], None, None]:
    dt       = cfg.dt
    max_time = cfg.max_time
    leo_alt  = cfg.leo_alt_km * 1000
    leo_vel  = cfg.leo_vel_ms

    # State
    t   = 0.0; h = 0.0; v = 0.0; gamma = 90.0  # degrees from horizontal
    vx  = 0.0; vy = 0.0; x = 0.0
    stage = 1
    s1_prop = rocket.s1_prop; s2_prop = rocket.s2_prop
    fairing_sep = False; stage2_ignited = False
    orbit = False; abort = False; fail_reason = ""
    events = []
    
    # Scenario modifications
    engine_failure_s1  = scenario == "engine_failure_s1"
    engine_failure_t   = 30.0
    overload_payload   = scenario == "overloaded_payload"
    if overload_payload:
        rocket = RocketModel(**{**rocket.__dict__, 'payload': rocket.payload * 2.0})
    atm_anomaly        = scenario == "atmospheric_anomaly"
    atm_mult           = 1.45 if atm_anomaly else 1.0
    ai_optimized       = scenario == "ai_optimized"
    if ai_optimized:
        # Better Isp and lower structural mass
        rocket = RocketModel(**{**rocket.__dict__,
            's1_isp_v': rocket.s1_isp_v * 1.05,
            's2_isp_v': rocket.s2_isp_v * 1.06,
            's1_dry':   rocket.s1_dry   * 0.88,
            's2_dry':   rocket.s2_dry   * 0.85})

    # Emit start event
    yield {"type": "event", "time": 0.0, "name": "IGNITION",
           "desc": "Main engines ignited — T+0 launch commit", "icon": "🔥"}

    while t <= max_time and not abort:
        # Current mass
        mass = rocket.s1_dry + s1_prop + rocket.s2_dry + s2_prop + rocket.payload + (rocket.fairing if not fairing_sep else 0.0)

        # Gravity turn angle
        if   t < 10:    gamma = 90.0
        elif t < 60:    gamma = 90.0 - (80.0 * (t - 10) / 50.0)
        elif t < 150:   gamma = max(10.0 + 80.0 * (1 - (t - 60) / 90.0), 1.0)
        else:           gamma = max(gamma - 0.2 * dt, 0.0)

        gamma_rad = math.radians(gamma)
        g_eff     = gravity(h)
        rho       = air_density(h, atm.temperature_delta_k, atm.pressure_hpa * 100.0,
                                atm.humidity_pct / 100.0) * atm_mult
        a_sound   = speed_of_sound(h, atm.temperature_delta_k)
        mach      = v / max(a_sound, 1.0)
        cd        = rocket.mach_cd(mach)
        q         = 0.5 * rho * v * v
        drag      = q * cd * rocket.area
        wind_force= rho * (atm.wind_speed_ms ** 2) * rocket.area * 0.1

        # Thrust
        if stage == 1 and s1_prop > 0:
            if engine_failure_s1 and t >= engine_failure_t:
                thrust = 0.0
            else:
                isp    = rocket.isp_at_altitude(h, 1)
                mdot   = rocket.s1_thrust / (isp * G0)
                burn   = mdot * dt
                if burn > s1_prop: burn = s1_prop
                s1_prop -= burn
                thrust  = isp * G0 * burn / dt
        elif stage == 2 and s2_prop > 0:
            isp    = rocket.s2_isp_v
            mdot   = rocket.s2_thrust / (isp * G0)
            burn   = mdot * dt
            if burn > s2_prop: burn = s2_prop
            s2_prop -= burn
            thrust  = isp * G0 * burn / dt
        else:
            thrust = 0.0

        # Net force
        F_net_y = thrust * math.sin(gamma_rad) - mass * g_eff - drag * math.sin(gamma_rad) - wind_force
        F_net_x = thrust * math.cos(gamma_rad) - drag * math.cos(gamma_rad)
        ax = F_net_x / mass; ay = F_net_y / mass
        accel_g = math.sqrt(ax**2 + ay**2) / G0

        # Stability margin (simplified: CP ahead of CG when fueled)
        stab_margin = 1.5 + (1.0 - (s1_prop + s2_prop) / (rocket.s1_prop + rocket.s2_prop)) * 0.8

        # Integrate (simple Euler — good enough at dt=0.1s)
        vx += ax * dt; vy += ay * dt
        v   = math.sqrt(vx**2 + vy**2)
        x  += vx * dt; h += vy * dt
        if h < 0: h = 0

        t += dt

        # Events
        if abs(t - 10.0) < dt/2:
            yield {"type":"event","time":t,"name":"GRAVITY TURN",
                   "desc":"Vehicle pitching downrange","icon":"📐"}
        if not hasattr(simulate, '_maxq') and mach > 0.8 and q > 30000:
            simulate._maxq = True
            yield {"type":"event","time":t,"name":"MAX-Q",
                   "desc":f"Max dynamic pressure: {q/1000:.1f} kPa at Mach {mach:.2f}","icon":"⚠️"}
        if engine_failure_s1 and abs(t - engine_failure_t) < dt/2:
            yield {"type":"event","time":t,"name":"ENGINE FAILURE",
                   "desc":"Stage 1 engine shutdown — mission abort initiated","icon":"🔴"}
        if stage == 1 and s1_prop <= 0 and not stage2_ignited:
            yield {"type":"event","time":t,"name":"MECO",
                   "desc":f"Main Engine Cutoff — S1 burnout at {h/1000:.1f} km","icon":"✂️"}
            yield {"type":"event","time":t+3,"name":"STAGE SEP",
                   "desc":"Stage 1 separated successfully","icon":"💥"}
            stage = 2; stage2_ignited = True
            yield {"type":"event","time":t+6,"name":"SES-1",
                   "desc":"Stage 2 ignition confirmed","icon":"🔥"}
        if not fairing_sep and h >= 100000:
            fairing_sep = True
            yield {"type":"event","time":t,"name":"FAIRING SEP",
                   "desc":f"Payload fairing jettisoned at {h/1000:.1f} km","icon":"🛡️"}
        if stage == 2 and s2_prop <= 0 and stage2_ignited:
            yield {"type":"event","time":t,"name":"SECO",
                   "desc":f"Stage 2 engine cutoff — alt {h/1000:.1f} km vel {v:.0f} m/s","icon":"🌐"}
            yield {"type":"event","time":t+10,"name":"PAYLOAD SEP",
                   "desc":"Satellite deployed","icon":"🛰️"}
            break

        # Check orbit
        if h >= leo_alt and v >= leo_vel:
            orbit = True
            yield {"type":"event","time":t,"name":"ORBIT ACHIEVED",
                   "desc":f"LEO orbit confirmed at {h/1000:.1f} km, {v:.0f} m/s","icon":"✅"}
            break

        # Check abort / impact
        if h <= 0 and t > 5:
            if not engine_failure_s1:
                fail_reason = f"Vehicle impact at T+{t:.0f}s"
            yield {"type":"event","time":t,"name":"IMPACT",
                   "desc":fail_reason or "Ballistic trajectory — vehicle lost","icon":"💥"}
            abort = True; break

        # Telemetry point (every step)
        yield {
            "type":     "telemetry",
            "t":        round(t, 2),
            "alt":      round(h / 1000, 3),
            "vel":      round(v, 2),
            "mach":     round(mach, 3),
            "accel_g":  round(accel_g, 3),
            "q_kpa":    round(q / 1000, 3),
            "downrange":round(x / 1000, 2),
            "thrust":   round(thrust, 0),
            "drag":     round(drag, 0),
            "mass":     round(mass, 1),
            "s1_prop":  round(s1_prop, 1),
            "s2_prop":  round(s2_prop, 1),
            "stage":    stage,
            "cd":       round(cd, 4),
            "stab":     round(stab_margin, 3),
        }

    # Cleanup
    if hasattr(simulate, '_maxq'): del simulate._maxq

    final_orbit = orbit and not abort
    if engine_failure_s1 and not orbit:
        fail_reason = f"Engine failure at T+{engine_failure_t:.0f}s — vehicle lost"
    elif overload_payload and not orbit:
        fail_reason = f"Insufficient ΔV — payload 2× nominal ({rocket.payload:.0f} kg)"
    elif not orbit and not fail_reason:
        fail_reason = f"Orbital velocity not achieved — final: {v:.0f} m/s at {h/1000:.1f} km"

    yield {"type":"complete","orbit":final_orbit,"fail_reason":fail_reason if not final_orbit else ""}
