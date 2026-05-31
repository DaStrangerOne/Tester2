# AxiomRed — Project Setup Notes

## Original Request
"Build AxiomRed from GitHub" — clone https://github.com/DaStrangerOne/AxiomRed (main) and run as-is.

## What AxiomRed Is
AXIOM v2.5 — a Red Team AI assistant built as an Expo / React Native cross-platform app (iOS, Android, Web). The codebase ships an `onspace-app` (Expo SDK 53, React Native 0.79, expo-router 5) with screens: Chat, Terminal, Ops, Intel, Files, Agents, Config, Build, plus Login/Profile and auth via `@/template`. Backend is provided by Supabase Edge Functions (`supabase/functions/axiom-chat`, `axiom-agent`, `axiom-attack`, `code-exec`, etc.) hosted on `*.backend.onspace.ai` (URL + anon key in `frontend/.env`).

## Tech Stack
- Frontend: Expo SDK 53, React Native 0.79, expo-router 5, react-native-web 0.20, nativewind, react-native-paper, supabase-js, lucide, zustand, etc.
- Backend (real): Supabase Edge Functions @ `https://xzadnsyybwlymcuhxzad.backend.onspace.ai`
- Backend (in this preview): tiny FastAPI stub at `/app/backend/server.py` so the supervisor-managed port 8001 service stays healthy

## Repo → Preview Layout
The cloned project (originally at `/app/`) was reshuffled to match the supervisor contract:
- `/app/frontend/` — full Expo project (the cloned repo)
- `/app/backend/` — FastAPI stub (port 8001) with `/api/health` endpoint
- `/app/.git/` — preserved at root (origin: `DaStrangerOne/AxiomRed`)

## Run Strategy
Because the container's inotify watcher limit (12288) is far below what Metro needs for ~1.6k node_modules, `expo start` (dev mode) crashes with `ENOSPC` and the limit can't be raised (read-only sysctl). To run "as-is" on supervisor's port 3000, the `start` script was changed to a **static web export + serve**:

```
"start": "npx expo export -p web --output-dir dist && npx serve -s dist -l tcp://0.0.0.0:3000 --single",
"dev":   "expo start --web --port 3000 --host lan"
```

`yarn start` builds a production web bundle (~2.34 MB) and serves the `dist/` SPA on `0.0.0.0:3000`. The 20 static routes (chat, terminal, ops, intel, files, agents, config, build, login, profile, etc.) are all exported.

## One-time fix applied
`@expo/metro-config` calls `metro-cache-key` as a default export, but yarn resolved `metro-cache-key@0.84.4` (named export only), which broke the web export with `TypeError: (0 , metro_cache_key_1.default) is not a function`. Pinned `metro-cache-key@0.82.5` (matches installed `metro@0.82.5`) as a dev dependency to restore the `module.exports = getCacheKey` default-export shape.

## Status
- Frontend: RUNNING on port 3000 — login screen ("AXIOM · RED TEAM AI · SECURE ACCESS") renders correctly.
- Backend stub: RUNNING on port 8001 — `GET /api/health` → `{"status":"ok","service":"axiomred-stub"}`.
- Real backend (Supabase Edge Functions) is hit directly from the client using `EXPO_PUBLIC_SUPABASE_URL` + anon key already present in `frontend/.env`.

## Next Action Items
- Sign in or create an operator account against the live Supabase backend to exercise chat/ops/intel/etc.
- If hot-reload is desired during further development, either (a) raise inotify limits at the container level, or (b) configure Metro to ignore `node_modules` watching and use `yarn dev`.
- Apply Expo's recommended version bumps if planning to extend (e.g., `expo-router@~5.1.11`, `react-native@0.79.6`).

## Backlog (not requested, future ideas)
- Native iOS/Android builds via EAS.
- Wire the FastAPI stub into a real MongoDB-backed feature if the Supabase backend ever needs a sidecar.
