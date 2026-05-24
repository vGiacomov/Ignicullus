# 🚀 IGNICULLUS

> Satellite Launch System Digital Twin

IGNICULLUS to kompletna aplikacja webowa symulująca cyfrowego bliźniaka rakiety nośnej dla małego satelity na LEO.

---

## ✨ Features

| Moduł | Opis |
|---|---|
| 🔬 **Fizyka RK4** | Silnik symulacji z równaniami ruchu (Tsiolkovsky + atmosfera ISA) |
| 📡 **WebSocket telemetria** | Live streaming danych przez WS w czasie rzeczywistym |
| 🎤 **TTS Komentator** | Web Speech API — głosowe komentowanie misji |
| 📊 **Dashboard** | Recharts: altitude, velocity, Mach, Q, drag, stability |
| ⚙️ **Pre-Launch Config** | Pełna konfiguracja rakiety + warunki atmosferyczne |
| 🚀 **5 Scenariuszy** | Nominal, Engine Failure, Overload, Anomaly, AI-Optimized |
| 🧬 **GA Optimizer** | Algorytm genetyczny minimalizuje masę startową |
| 📈 **Analysis Page** | Post-flight: trajectory scatter, radar, event log |

---

## 🚀 Quickstart

### Opcja 1 — Docker Compose (zalecane)

```bash
git clone https://github.com/vGiacomov/Ignicullus
cd IGNICULLUS
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs

### Opcja 2 — Lokalnie

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
# → http://localhost:8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 🗂️ Struktura projektu

```
IGNICULLUS/
├── backend/
│   ├── main.py                    # FastAPI app + WebSocket endpoint
│   ├── core/
│   │   ├── atmosphere.py          # ISA atmosphere model (ICAO 1993)
│   │   ├── rocket_model.py        # RocketModel + Mach-dependent Cd
│   │   ├── simulation.py          # RK4 integration engine
│   │   ├── scenarios.py           # 5 mission scenarios
│   │   └── optimizer.py           # Genetic Algorithm optimizer
│   ├── api/
│   │   ├── routes.py              # REST endpoints
│   │   └── ws_simulate.py         # WebSocket streaming handler
│   ├── models/schemas.py          # Pydantic v2 schemas
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage.tsx       # Video hero + mission summary
│   │   │   ├── PreLaunchPage.tsx  # Rocket config + readiness check
│   │   │   ├── MissionControlPage.tsx # Live telemetry dashboard
│   │   │   ├── AnalysisPage.tsx   # Post-flight analysis + radar
│   │   │   └── OptimizerPage.tsx  # GA optimizer UI
│   │   ├── components/
│   │   │   └── Sidebar.tsx        # Nav + scenario selector + TTS toggle
│   │   ├── store/missionStore.ts  # Zustand state management
│   │   ├── services/
│   │   │   ├── wsService.ts       # WebSocket client + TTS engine
│   │   │   └── apiService.ts      # REST API client (axios)
│   │   └── types/index.ts         # TypeScript types
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 🎤 TTS — Komentator Misji

TTS działa przez **Web Speech API** (wbudowana w przeglądarkę, bez serwera).

Mówi przy każdym zdarzeniu:
- `T-0` — Launch sequence initiated
- Max-Q, MECO, Stage Sep, Fairing Sep, SECO
- Orbit achieved / Mission abort

**Ollama TTS (opcjonalne):**
Jeśli masz uruchomiony `ollama serve` z modelem `supertonic-tts`, aplikacja może go użyć przez REST.

---

## 🔬 Fizyka — Równania ruchu

```
F_net = F_thrust(Isp,h) - F_drag(ρ,v,Cd,A) - m(t)·g(h)
ṁ     = F_thrust / (Isp × g₀)
ρ(h)  = ISA atmosphere model (ICAO 1993)
g(h)  = g₀ × (R_E / (R_E + h))²
Cd(M) = Mach-dependent polynomial (transonic bump at M=1.0)
Gravity Turn: γ(t) — automatic pitch schedule
```

---

## 📋 Kryteria sukcesu orbity

- Altitude ≥ 350 km (configurable)  
- Velocity ≥ 7700 m/s (configurable)  
- Flight path angle ≈ 0°

---

## 🧬 Optymalizator GA

Algorytm genetyczny (80 generacji × 40 osobników) minimalizuje masę startową zachowując ΔV ≥ 9500 m/s. Parametry optymalizowane:
- S1/S2 masa paliwa (±15%)
- S1/S2 Isp (±5%)
- Masa owiewki (–30%)

---

*IGNICULLUS*
