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

---

## 2026-05-31 — AI runtime swap + tool install

**Problem reported (from screenshots):** Recon Agent ran inside the OnSpace/Supabase Piston sandbox, which lacked `nmap`, `host`, `curl`, `jq`, etc. — every operation report said *"Execution environment lacks essential binary dependencies"*, exit code 127.

**Fix delivered:**
1. **AI runtime swap** — `axiom-chat`, `axiom-agent`, `axiom-attack` now run inside `/app/backend/server.py` powered by `emergentintegrations.llm.chat.LlmChat` → **Anthropic claude-sonnet-4-5-20250929** via the Emergent Universal Key. OpenAI-shaped SSE streaming is synthesized so the existing frontend SSE parser is unchanged.
2. **Local shell runtime** — `/api/code-exec` runs `bash | python3 | node` directly in this container via `asyncio.create_subprocess_exec` with a 30s timeout, working dir in `/tmp`, PATH restored. No external Piston / Wandbox.
3. **Toolchain installed** — `nmap, dnsutils (host, dig), whois, netcat-openbsd, net-tools, iputils-ping, traceroute, jq, curl`. Verified via `/api/health` (12/12 tools present).
4. **Sandbox-aware prompts** — `SANDBOX_NOTES` injected into every agent persona (recon/exploit/postexploit/evasion/fullchain) AND into `axiom-attack`. Tells the LLM that NET_RAW is stripped, so it must use `nc -zv`, `curl -sIm5`, `nmap -Pn -sT --unprivileged` instead of `ping` or raw-socket SYN scans. Verified — generated plans no longer contain `ping`.
5. **Frontend wiring** — added `EXPO_PUBLIC_API_URL` in `frontend/.env` pointing at the preview URL. Replaced `${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/` with `${EXPO_PUBLIC_API_URL || ...SUPABASE_URL}/api/` across `services/aiService.ts` and `app/(tabs)/{ops,terminal,intel,config,build,agents}.tsx`. Static export rebuilt by `yarn start`.

**Verification (live, public preview URL):**
- `GET  /api/health` → 12 tools confirmed.
- `POST /api/code-exec` running `nmap -Pn -sT scanme.nmap.org` → exit 0, ports 22 & 80 open.
- `POST /api/code-exec` running `host google.com | curl example.com | jq` → all succeed.
- `POST /api/axiom-chat` with AXIOM system prompt → "AXIOM v2.5 online — red team protocols active".
- `POST /api/axiom-attack mode=plan` → 10-step JSON plan, no `ping`, all `nc -zv` / `nmap -Pn -sT`.
- `POST /api/axiom-agent mode=plan agentType=recon` → JSON plan with sandbox-safe `nc -zv`, TCP-connect scan.

**Auth still uses Supabase** (untouched). The user only asked to swap AI + exec runtime.

## Next Action Items
- Sign in and run a Recon Agent against `scanme.nmap.org` or `127.0.0.1` — the "Operation Report" should now succeed instead of "Critical Findings: missing binaries".
- If a different LLM is preferred (e.g., `gpt-5.4` for cheaper plans, or `claude-opus-4-7` for harder reasoning), change `AXIOM_LLM_PROVIDER` / `AXIOM_LLM_MODEL` in `/app/backend/.env`.

## Note
`ping` is installed but blocked by container capabilities (no NET_RAW). Plans avoid it. Same for `nmap -sS`. If you ever need raw sockets, this would have to be deployed to a container with `--cap-add=NET_RAW`.
