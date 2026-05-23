from pydantic import BaseModel, Field
from typing import Optional

class StageConfig(BaseModel):
    dry_mass:  float = Field(gt=0)
    prop_mass: float = Field(gt=0)
    thrust:    float = Field(gt=0)
    isp_vac:   float = Field(gt=0)
    isp_sl:    float = Field(gt=0, default=0)
    burn_time: float = Field(gt=0)

class RocketConfig(BaseModel):
    stage1:     StageConfig
    stage2:     StageConfig
    payload_kg: float = Field(gt=0)
    fairing_kg: float = Field(ge=0, default=50.0)
    diameter_m: float = Field(gt=0, default=1.2)
    cd_base:    float = Field(gt=0, default=0.35)

class AtmosphereConfig(BaseModel):
    wind_speed_ms:       float = 0.0
    temperature_delta_k: float = 0.0
    humidity_pct:        float = Field(ge=0, le=100, default=50.0)
    pressure_hpa:        float = Field(gt=0, default=1013.25)

class SimConfig(BaseModel):
    dt:          float = 0.1
    max_time:    float = 900.0
    leo_alt_km:  float = 400.0
    leo_vel_ms:  float = 7700.0

class SimRequest(BaseModel):
    rocket:     RocketConfig
    scenario:   str = "nominal"
    atmosphere: AtmosphereConfig = AtmosphereConfig()
    sim:        SimConfig        = SimConfig()
    speed:      float            = 1.0

class OptimizeRequest(BaseModel):
    rocket:      RocketConfig
    atmosphere:  AtmosphereConfig = AtmosphereConfig()
    sim:         SimConfig        = SimConfig()
    generations: int = 80
    population:  int = 40
