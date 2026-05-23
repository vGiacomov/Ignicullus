import math

R_EARTH = 6371000.0
G0      = 9.80665

def gravity(h_m: float) -> float:
    return G0 * (R_EARTH / (R_EARTH + h_m)) ** 2

def isa_temperature(h_m: float, delta_k: float = 0.0) -> float:
    if h_m < 11000:
        T = 288.15 - 6.5e-3 * h_m
    elif h_m < 20000:
        T = 216.65
    elif h_m < 32000:
        T = 216.65 + 1e-3 * (h_m - 20000)
    elif h_m < 47000:
        T = 228.65 + 2.8e-3 * (h_m - 32000)
    else:
        T = 270.65
    return max(T + delta_k, 165.0)

def isa_pressure(h_m: float, p0_pa: float = 101325.0) -> float:
    if h_m <= 0:
        return p0_pa
    ratio = p0_pa / 101325.0
    if h_m < 11000:
        p = 101325.0 * (288.15 / (288.15 - 6.5e-3 * h_m)) ** (-34.163)
    elif h_m < 20000:
        p = 22632.0 * math.exp(-1.576e-4 * (h_m - 11000))
    elif h_m < 32000:
        p = 5474.9 * (216.65 / (216.65 + 1e-3 * (h_m - 20000))) ** (-34.163)
    elif h_m < 47000:
        p = 868.0 * (228.65 / (228.65 + 2.8e-3 * (h_m - 32000))) ** (-12.20)
    else:
        p = max(110.0 * math.exp(-1.654e-4 * (h_m - 47000)), 0.01)
    return p * ratio

def air_density(h_m: float, delta_k: float = 0.0, p0_pa: float = 101325.0,
                humidity: float = 0.5) -> float:
    R_dry = 287.058
    T     = isa_temperature(h_m, delta_k)
    p     = isa_pressure(h_m, p0_pa)
    rho   = p / (R_dry * T)
    pv    = humidity * 611.2 * math.exp(17.67 * (T - 273.15) / (T - 29.65))
    rho  *= (1 - 0.378 * pv / max(p, 1.0))
    return max(rho, 0.0)

def speed_of_sound(h_m: float, delta_k: float = 0.0) -> float:
    T = isa_temperature(h_m, delta_k)
    return math.sqrt(1.4 * 287.058 * T)
