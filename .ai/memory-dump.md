# AI Memory Dump

Updated: 2026-05-24

## Goal
- Projekt: IGNICULLUS. Digital twin rakiety LEO. Frontend React/Vite. Backend FastAPI.
- User chce szybki prototyp: mission sim, telemetry, DB lotow, TTS, rakieta wireframe, dev one-command.

## Done
- Branding zmieniony na IGNICULLUS w frontend/backend/README/package files.
- PreLaunch: prawa rakieta wireframe z `frontend/public/racket-wireframe.png`; skaluje sie wg parametrow rakiety.
- Mission page: panel malej rakiety; fail = eksplozja i znika; success = sukces.
- Mission page: suwak predkosci odtwarzania `1x-30x`, pause/resume, suwak dlugosci testu `120-1800s`, pasek postepu.
- Usuniety stary suwak anim speed z lewego sidebaru.
- SQLite: backend tworzy `backend/ignicullus.sqlite3`, tabela `flight_runs`, zapis lotow, score, parametry, usuwanie wpisow.
- Frontend: strona `/flights`, tabela lotow, refresh, delete.
- `.gitignore` dodany; uwaga: DB ignore dla `*.sqlite3` warto potwierdzic/dodac jesli brak.
- `npm run dev` z root i frontend ma startowac backend + frontend.
- TTS przepiety z Web Speech/Microsoft Edge na backend Supertonic 3.
- Zainstalowano `supertonic==1.3.1` przez `python -m pip install supertonic`.
- TTS UI: dropdown Supertonic voices `F1-F5`, `M1-M5`, `TEST`, status `TTS: ...`.
- TTS logging: backend loguje loading modelu, request, synthesize, save wav, bytes, total time. Frontend loguje request/audio received.

## Changed Files
- `frontend/src/pages/PreLaunchPage.tsx`: wireframe rocket image, dynamic stretch/width.
- `frontend/src/pages/MissionControlPage.tsx`: rocket status panel, playback controls, pause/resume, test length.
- `frontend/src/pages/FlightHistoryPage.tsx`: added flights table page.
- `frontend/src/services/wsService.ts`: simulation playback queue; Supertonic TTS fetch/audio playback; no speechSynthesis.
- `frontend/src/services/apiService.ts`: flights API helpers.
- `frontend/src/store/missionStore.ts`: simPaused, animSpeed, ttsVoice, ttsStatus.
- `frontend/src/components/Sidebar.tsx`: nav `/flights`; TTS controls; removed old speed slider.
- `frontend/src/App.tsx`: route `/flights`.
- `frontend/src/types/index.ts`: `FlightRun`.
- `frontend/package.json`: `dev` runs `node scripts/dev-all.cjs`; `dev:frontend`; `dev:backend`.
- `frontend/scripts/dev-all.cjs`: starts uvicorn backend and Vite frontend.
- `package.json`: root scripts `dev`, `build`.
- `backend/core/flight_db.py`: SQLite init/list/save/delete flight runs.
- `backend/core/supertonic_tts.py`: Supertonic 3 engine + WAV generation + logs.
- `backend/api/routes.py`: flights endpoints; `/api/tts/supertonic` GET/POST; PDF report still present.
- `backend/api/ws_simulate.py`: saves websocket flights; rocket name IGNICULLUS; speed max 30.
- `backend/models/schemas.py`: `TTSRequest`.
- `backend/main.py`: direct `/api/tts/supertonic` GET/POST fallback endpoints.
- `backend/requirements.txt`: `supertonic>=0.1.0`.
- `.gitignore`: Node/Python/env/log/build ignores.

## Decisions
- TTS must not use browser `window.speechSynthesis` / Microsoft Edge voices.
- TTS now uses backend Supertonic 3, built-in voices `F1-F5`, `M1-M5`.
- First Supertonic use can download model about 400 MB to `~/.cache/supertonic3`; user must wait.
- Frontend TTS tries `POST /api/tts/supertonic`, then `GET /api/tts/supertonic`, then direct `GET http://localhost:8000/api/tts/supertonic`.
- Simulation backend sends fast; frontend controls perceived playback speed and pause/resume.
- `npm run dev` should be run from root or `frontend`; backend on `8000`, frontend on `5173`.

## Validation
- `pip install supertonic` succeeded.
- Multiple validation commands failed due environment/tool process issue: `CreateProcess ... spawn setup refresh`.
- User saw TTS errors:
  - `{"detail":"Method Not Allowed"}`: fixed by adding GET endpoint + frontend fallback.
  - `{"detail":"Not Found"}`: fixed by adding direct endpoints in `backend/main.py` + direct localhost fallback.
- Need real runtime validation after backend restart.

## Next
- Restart dev server after backend route changes:
  - `Ctrl + C`
  - `npm run dev`
- Click sidebar `TEST`.
- Watch terminal backend logs:
  - `Supertonic TTS: loading engine/model...`
  - `synthesizing audio, wait...`
  - `complete bytes=...`
- If TTS still silent, inspect sidebar `TTS:` status and browser console `[IGNICULLUS TTS]`.
- If route still `Not Found`, verify backend actually restarted and `http://localhost:8000/api/health` responds.
- Run when command environment works:
  - `python -m py_compile .\backend\core\supertonic_tts.py .\backend\api\routes.py .\backend\main.py`
  - `cd frontend; npm run build`
