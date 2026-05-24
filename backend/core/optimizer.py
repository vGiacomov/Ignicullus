import math
import random
from typing import Any

from core.rocket_model import RocketModel

G0 = 9.80665

# Genome: [s1_prop_f, s2_prop_f, s1_isp_f, s2_isp_f, fairing_f]
BOUNDS = [(0.80, 1.15), (0.80, 1.15), (0.96, 1.06), (0.96, 1.07), (0.60, 1.0)]

MODE_WEIGHTS = {
    "balanced": (1.0, 1.0, 1.0),
    "fuel_efficient": (2.0, 0.5, 1.5),
    "max_altitude": (0.5, 2.5, 1.0),
    "max_velocity": (0.3, 3.0, 0.5),
    "max_payload": (1.0, 1.5, 3.0),
}


def _build(base: RocketModel, genome: list[float]) -> RocketModel:
    s1_prop_f, s2_prop_f, s1_isp_f, s2_isp_f, fairing_f = genome
    return RocketModel(
        s1_dry=base.s1_dry,
        s1_prop=base.s1_prop * s1_prop_f,
        s1_thrust=base.s1_thrust,
        s1_isp_v=base.s1_isp_v * s1_isp_f,
        s1_isp_sl=base.s1_isp_sl * s1_isp_f,
        s1_burn=base.s1_burn,
        s2_dry=base.s2_dry,
        s2_prop=base.s2_prop * s2_prop_f,
        s2_thrust=base.s2_thrust,
        s2_isp_v=base.s2_isp_v * s2_isp_f,
        s2_burn=base.s2_burn,
        payload=base.payload,
        fairing=base.fairing * fairing_f,
        diameter=base.diameter,
        cd_base=base.cd_base,
    )


def _delta_v(rocket: RocketModel) -> float:
    m0 = rocket.total_mass
    mf1 = m0 - rocket.s1_prop
    dv1 = rocket.s1_isp_v * G0 * math.log(m0 / max(mf1, 1))

    m0_2 = rocket.s2_dry + rocket.s2_prop + rocket.payload
    mf2 = rocket.s2_dry + rocket.payload
    dv2 = rocket.s2_isp_v * G0 * math.log(m0_2 / max(mf2, 1))

    return dv1 + dv2


def _objectives(rocket: RocketModel) -> tuple[float, float, float]:
    delta_v = _delta_v(rocket)
    mass = rocket.total_mass
    payload_ratio = rocket.payload / max(mass, 1)
    return (mass, -delta_v, -payload_ratio)


def _dominates(a: tuple[float, ...], b: tuple[float, ...]) -> bool:
    return all(ai <= bi for ai, bi in zip(a, b)) and any(ai < bi for ai, bi in zip(a, b))


def _fast_nondominated_sort(pop_obj: list[tuple[float, ...]]) -> list[list[int]]:
    size = len(pop_obj)
    dominated_by = [0] * size
    dominates = [[] for _ in range(size)]
    fronts = [[]]

    for p in range(size):
        for q in range(size):
            if p == q:
                continue
            if _dominates(pop_obj[p], pop_obj[q]):
                dominates[p].append(q)
            elif _dominates(pop_obj[q], pop_obj[p]):
                dominated_by[p] += 1

        if dominated_by[p] == 0:
            fronts[0].append(p)

    front_index = 0
    while fronts[front_index]:
        next_front = []
        for p in fronts[front_index]:
            for q in dominates[p]:
                dominated_by[q] -= 1
                if dominated_by[q] == 0:
                    next_front.append(q)

        front_index += 1
        fronts.append(next_front)

    return [front for front in fronts if front]


def _crowding_distance(front: list[int], pop_obj: list[tuple[float, ...]]) -> dict[int, float]:
    distance = {idx: 0.0 for idx in front}
    objective_count = len(pop_obj[0])

    for objective_index in range(objective_count):
        sorted_front = sorted(front, key=lambda idx: pop_obj[idx][objective_index])
        values = [pop_obj[idx][objective_index] for idx in sorted_front]
        value_range = max(values) - min(values) or 1e-9

        distance[sorted_front[0]] = float("inf")
        distance[sorted_front[-1]] = float("inf")

        for pos in range(1, len(sorted_front) - 1):
            distance[sorted_front[pos]] += (values[pos + 1] - values[pos - 1]) / value_range

    return distance


def _clip(genome: list[float]) -> list[float]:
    return [max(lo, min(hi, value)) for value, (lo, hi) in zip(genome, BOUNDS)]


def _mutate(genome: list[float], rate: float = 0.25) -> list[float]:
    return [
        value + random.gauss(0, (hi - lo) * 0.1) if random.random() < rate else value
        for value, (lo, hi) in zip(genome, BOUNDS)
    ]


def _crossover(a: list[float], b: list[float]) -> list[float]:
    point = random.randint(1, len(a) - 1)
    return _clip(a[:point] + b[point:])


def _normalized_mode_scores(
    indexes: list[int],
    objectives: list[tuple[float, float, float]],
    weights: tuple[float, float, float],
) -> dict[int, float]:
    mins = [min(objectives[idx][obj_i] for idx in indexes) for obj_i in range(3)]
    maxs = [max(objectives[idx][obj_i] for idx in indexes) for obj_i in range(3)]
    ranges = [(maxs[i] - mins[i]) or 1e-9 for i in range(3)]

    scores = {}
    for idx in indexes:
        normalized = [(objectives[idx][i] - mins[i]) / ranges[i] for i in range(3)]
        scores[idx] = sum(weight * value for weight, value in zip(weights, normalized))

    return scores


def run_ga(
    base: RocketModel,
    generations: int = 80,
    population: int = 60,
    mode: str = "balanced",
) -> dict[str, Any]:
    generations = max(1, int(generations))
    population = max(4, int(population))
    selected_mode = mode if mode in MODE_WEIGHTS else "balanced"
    weights = MODE_WEIGHTS[selected_mode]

    pop = [_clip([random.uniform(lo, hi) for lo, hi in BOUNDS]) for _ in range(population)]
    history_dv = []

    for _ in range(generations):
        offspring = []
        while len(offspring) < population:
            a, b = random.sample(pop, 2)
            offspring.append(_clip(_mutate(_crossover(a, b))))

        combined = pop + offspring
        objectives = [_objectives(_build(base, genome)) for genome in combined]
        fronts = _fast_nondominated_sort(objectives)

        selected_indexes = []
        for front in fronts:
            if len(selected_indexes) + len(front) <= population:
                selected_indexes.extend(front)
                continue

            crowding = _crowding_distance(front, objectives)
            needed = population - len(selected_indexes)
            selected_indexes.extend(sorted(front, key=lambda idx: -crowding[idx])[:needed])
            break

        pop = [combined[idx] for idx in selected_indexes]
        best_delta_v = max(-objectives[idx][1] for idx in selected_indexes)
        history_dv.append(round(best_delta_v, 1))

    final_objectives = [_objectives(_build(base, genome)) for genome in pop]
    fronts = _fast_nondominated_sort(final_objectives)
    pareto_indexes = fronts[0] if fronts else list(range(len(pop)))
    mode_scores = _normalized_mode_scores(pareto_indexes, final_objectives, weights)
    sorted_pareto = sorted(pareto_indexes, key=lambda idx: mode_scores[idx])

    solutions = []
    for idx in sorted_pareto:
        genome = pop[idx]
        f1, f2, f3 = final_objectives[idx]
        delta_v = -f2
        payload_ratio = -f3
        estimated_apogee = max(0, (delta_v - 7700) * 0.055)

        solutions.append({
            "id": idx,
            "delta_v": round(delta_v, 1),
            "total_mass_kg": round(f1, 1),
            "payload_ratio": round(payload_ratio * 100, 2),
            "est_apogee_km": round(estimated_apogee, 1),
            "s1_prop_factor": round(genome[0], 4),
            "s2_prop_factor": round(genome[1], 4),
            "s1_isp_factor": round(genome[2], 4),
            "s2_isp_factor": round(genome[3], 4),
            "fairing_factor": round(genome[4], 4),
            "applied_config": {
                "s1_prop_kg": round(base.s1_prop * genome[0], 1),
                "s2_prop_kg": round(base.s2_prop * genome[1], 1),
                "s1_isp_vac": round(base.s1_isp_v * genome[2], 1),
                "s1_isp_sl": round(base.s1_isp_sl * genome[2], 1),
                "s2_isp_vac": round(base.s2_isp_v * genome[3], 1),
                "fairing_kg": round(base.fairing * genome[4], 1),
            },
            "mode_score": round(mode_scores[idx], 4),
        })

    recommended = solutions[0] if solutions else {}

    return {
        "mode": selected_mode,
        "pareto_front": solutions[:12],
        "recommended": recommended,
        "history_dv": history_dv,
        "history": history_dv,
        "generations": generations,
        "population": population,
        "pareto_size": len(pareto_indexes),
        "best_config": {
            "S1 propellant factor": recommended.get("s1_prop_factor"),
            "S2 propellant factor": recommended.get("s2_prop_factor"),
            "S1 Isp factor": recommended.get("s1_isp_factor"),
            "S2 Isp factor": recommended.get("s2_isp_factor"),
            "Fairing mass factor": recommended.get("fairing_factor"),
            "Optimal ΔV (m/s)": recommended.get("delta_v"),
            "Estimated mass (kg)": recommended.get("total_mass_kg"),
            "Payload ratio (%)": recommended.get("payload_ratio"),
        },
    }
