SCENARIOS = [
    {"id":"nominal",             "name":"Nominal Mission",       "color":"#00c896","outcome":"Full LEO insertion",        "description":"Ideal flight — all systems nominal"},
    {"id":"engine_failure_s1",   "name":"S1 Engine Failure",     "color":"#ff4444","outcome":"Mission abort T+30s",       "description":"Stage 1 engine fails at T+30s"},
    {"id":"overloaded_payload",  "name":"Overloaded Payload",    "color":"#f0a500","outcome":"ΔV deficit — no orbit",     "description":"Payload mass 2× nominal"},
    {"id":"atmospheric_anomaly", "name":"Atmospheric Anomaly",   "color":"#58a6ff","outcome":"High drag — marginal orbit", "description":"Dense atmosphere storm conditions"},
    {"id":"ai_optimized",        "name":"AI Optimized",          "color":"#bc8cff","outcome":"Optimal mass efficiency",   "description":"GA-optimized Isp + reduced structure"},
]
