import random, math
from typing import List, Dict, Any
from core.rocket_model import RocketModel, build_from_config
from core.simulation import simulate
from models.schemas import RocketConfig, AtmosphereConfig, SimConfig

G0 = 9.80665

def tsiolkovsky_dv(rocket: RocketModel) -> float:
    m0 = rocket.total_mass
    mf_s1 = m0 - rocket.s1_prop
    dv1 = rocket.s1_isp_v * G0 * math.log(m0 / max(mf_s1, 1))
    m0_2 = rocket.s2_dry + rocket.s2_prop + rocket.payload
    mf_s2 = rocket.s2_dry + rocket.payload
    dv2 = rocket.s2_isp_v * G0 * math.log(m0_2 / max(mf_s2, 1))
    return dv1 + dv2

def fitness(genome: List[float], base: RocketModel, target_dv: float = 9500.0) -> float:
    s1_prop_f, s2_prop_f, s1_isp_f, s2_isp_f, fair_f = genome
    r = RocketModel(
        s1_dry=base.s1_dry, s1_prop=base.s1_prop * s1_prop_f,
        s1_thrust=base.s1_thrust, s1_isp_v=base.s1_isp_v * s1_isp_f,
        s1_isp_sl=base.s1_isp_sl * s1_isp_f, s1_burn=base.s1_burn,
        s2_dry=base.s2_dry, s2_prop=base.s2_prop * s2_prop_f,
        s2_thrust=base.s2_thrust, s2_isp_v=base.s2_isp_v * s2_isp_f,
        s2_burn=base.s2_burn,
        payload=base.payload, fairing=base.fairing * fair_f,
        diameter=base.diameter, cd_base=base.cd_base
    )
    dv = tsiolkovsky_dv(r)
    mass = r.total_mass
    dv_pen = max(0, target_dv - dv) * 50.0
    return mass + dv_pen

def run_ga(base: RocketModel, generations: int = 80, population: int = 40) -> Dict[str, Any]:
    BOUNDS = [(0.85, 1.10), (0.85, 1.10), (0.97, 1.05), (0.97, 1.06), (0.7, 1.0)]

    def random_genome():
        return [random.uniform(lo, hi) for lo, hi in BOUNDS]

    def mutate(g, rate=0.25):
        return [gi + random.gauss(0, (hi-lo)*0.08) if random.random() < rate
                else gi for gi, (lo, hi) in zip(g, BOUNDS)]

    def clip(g):
        return [max(lo, min(hi, gi)) for gi, (lo, hi) in zip(g, BOUNDS)]

    def crossover(a, b):
        pt = random.randint(1, len(a)-1)
        return clip(a[:pt] + b[pt:])

    pop = [random_genome() for _ in range(population)]
    history = []
    best_g = pop[0]; best_f = float('inf')

    for gen in range(generations):
        scored = sorted([(fitness(g, base), g) for g in pop], key=lambda x: x[0])
        f0, g0 = scored[0]
        if f0 < best_f:
            best_f = f0; best_g = g0
        history.append(round(tsiolkovsky_dv(RocketModel(
            s1_dry=base.s1_dry, s1_prop=base.s1_prop*g0[0],
            s1_thrust=base.s1_thrust, s1_isp_v=base.s1_isp_v*g0[2],
            s1_isp_sl=base.s1_isp_sl*g0[2], s1_burn=base.s1_burn,
            s2_dry=base.s2_dry, s2_prop=base.s2_prop*g0[1],
            s2_thrust=base.s2_thrust, s2_isp_v=base.s2_isp_v*g0[3],
            s2_burn=base.s2_burn, payload=base.payload, fairing=base.fairing*g0[4],
            diameter=base.diameter, cd_base=base.cd_base
        )), 1))
        # Selection + reproduction
        elite = [g for _, g in scored[:population//5]]
        children = []
        while len(children) < population - len(elite):
            a, b = random.choices(elite + [g for _, g in scored[:population//2]], k=2)
            children.append(clip(mutate(crossover(a, b))))
        pop = elite + children

    s1_pf, s2_pf, s1_if, s2_if, fair_f = best_g
    dv_opt = tsiolkovsky_dv(RocketModel(
        s1_dry=base.s1_dry, s1_prop=base.s1_prop*s1_pf,
        s1_thrust=base.s1_thrust, s1_isp_v=base.s1_isp_v*s1_if,
        s1_isp_sl=base.s1_isp_sl*s1_if, s1_burn=base.s1_burn,
        s2_dry=base.s2_dry, s2_prop=base.s2_prop*s2_pf,
        s2_thrust=base.s2_thrust, s2_isp_v=base.s2_isp_v*s2_if,
        s2_burn=base.s2_burn, payload=base.payload, fairing=base.fairing*fair_f,
        diameter=base.diameter, cd_base=base.cd_base
    ))
    return {
        "best_config": {
            "S1 propellant factor": round(s1_pf, 4),
            "S2 propellant factor": round(s2_pf, 4),
            "S1 Isp factor":        round(s1_if, 4),
            "S2 Isp factor":        round(s2_if, 4),
            "Fairing mass factor":  round(fair_f, 4),
            "Optimal ΔV (m/s)":    round(dv_opt, 1),
            "Estimated mass (kg)":  round(best_f, 1),
        },
        "history": history,
        "generations": generations,
    }
