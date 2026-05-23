from dataclasses import dataclass, field
from models.schemas import RocketConfig
import math

@dataclass
class RocketModel:
    s1_dry:    float; s1_prop:  float; s1_thrust: float
    s1_isp_v:  float; s1_isp_sl:float; s1_burn:   float
    s2_dry:    float; s2_prop:  float; s2_thrust: float
    s2_isp_v:  float; s2_burn:  float
    payload:   float; fairing:  float
    diameter:  float; cd_base:  float

    @property
    def s1_mdot(self):
        return self.s1_thrust / (self.s1_isp_v * 9.80665)

    @property
    def s2_mdot(self):
        return self.s2_thrust / (self.s2_isp_v * 9.80665)

    @property
    def area(self):
        return math.pi * (self.diameter / 2) ** 2

    @property
    def total_mass(self):
        return (self.s1_dry + self.s1_prop + self.s2_dry +
                self.s2_prop + self.payload + self.fairing)

    def mach_cd(self, mach: float) -> float:
        base = self.cd_base
        if mach < 0.8:   return base * 0.85
        elif mach < 1.0: return base * (0.85 + (mach - 0.8) / 0.2 * 0.65)
        elif mach < 1.2: return base * (1.5 - (mach - 1.0) / 0.2 * 0.3)
        elif mach < 2.0: return base * (1.2 - (mach - 1.2) / 0.8 * 0.3)
        elif mach < 5.0: return base * (0.9 - (mach - 2.0) / 3.0 * 0.2)
        else:            return base * 0.7

    def isp_at_altitude(self, h_m: float, stage: int = 1) -> float:
        isp_v  = self.s1_isp_v  if stage == 1 else self.s2_isp_v
        isp_sl = self.s1_isp_sl if stage == 1 else isp_v * 0.88
        t = min(h_m / 80000.0, 1.0)
        return isp_sl + t * (isp_v - isp_sl)

def build_from_config(cfg: RocketConfig) -> RocketModel:
    return RocketModel(
        s1_dry=cfg.stage1.dry_mass, s1_prop=cfg.stage1.prop_mass,
        s1_thrust=cfg.stage1.thrust, s1_isp_v=cfg.stage1.isp_vac,
        s1_isp_sl=cfg.stage1.isp_sl or cfg.stage1.isp_vac * 0.88,
        s1_burn=cfg.stage1.burn_time,
        s2_dry=cfg.stage2.dry_mass, s2_prop=cfg.stage2.prop_mass,
        s2_thrust=cfg.stage2.thrust, s2_isp_v=cfg.stage2.isp_vac,
        s2_burn=cfg.stage2.burn_time,
        payload=cfg.payload_kg, fairing=cfg.fairing_kg,
        diameter=cfg.diameter_m, cd_base=cfg.cd_base
    )
