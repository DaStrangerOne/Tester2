"""
AxiomRed local backend.

Replaces the OnSpace/Supabase edge functions with:
  - /api/axiom-chat   — OpenAI-shaped chat (SSE or JSON) via Emergent LLM (Claude Sonnet 4.5)
  - /api/axiom-agent  — Agent plan/step/summarize JSON
  - /api/axiom-attack — Attack plan/step/analyze JSON
  - /api/code-exec    — Executes bash/python/node code IN THIS CONTAINER (nmap, host, curl, jq, etc. are installed)
  - /api/get-secrets  — Minimal compatibility shim
  - /api/get-users    — Minimal compatibility shim
  - /api/health
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import tempfile
import time
import uuid
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

# Load .env before importing emergentintegrations
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: E402

EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]
LLM_PROVIDER = os.environ.get("AXIOM_LLM_PROVIDER", "anthropic")
LLM_MODEL = os.environ.get("AXIOM_LLM_MODEL", "claude-sonnet-4-5-20250929")

app = FastAPI(title="AxiomRed Backend", version="2.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ────────────────────────────────────────────────────────────────────────────
# Health
# ────────────────────────────────────────────────────────────────────────────


@app.get("/api/health")
async def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": "axiomred",
        "llm": {"provider": LLM_PROVIDER, "model": LLM_MODEL},
        "tools": {name: bool(shutil.which(name)) for name in [
            "bash", "python3", "node", "curl", "jq", "nmap", "host",
            "dig", "whois", "nc", "traceroute", "ping",
        ]},
    }


# ────────────────────────────────────────────────────────────────────────────
# LLM helper
# ────────────────────────────────────────────────────────────────────────────


async def _llm_complete(messages: List[Dict[str, str]], temperature: float = 0.3) -> str:
    """Send a chat completion to the configured Emergent LLM and return the text."""
    system_parts = [m["content"] for m in messages if m.get("role") == "system" and m.get("content")]
    non_system = [m for m in messages if m.get("role") != "system"]
    if not non_system:
        return ""

    system_message = "\n\n".join(system_parts) if system_parts else "You are AXIOM, a red team AI."

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"axiom-{uuid.uuid4().hex[:12]}",
        system_message=system_message,
    ).with_model(LLM_PROVIDER, LLM_MODEL).with_params(temperature=temperature)

    # Replay prior turns (everything except the most recent user message) as initial_messages
    *prior, last = non_system
    if prior:
        # The library accepts initial_messages via constructor only, so push them via send loop
        # We approximate by concatenating prior turns into the user message context.
        history_text = "\n\n".join(f"[{m['role'].upper()}] {m['content']}" for m in prior)
        user_text = f"{history_text}\n\n[USER] {last['content']}" if history_text else last["content"]
    else:
        user_text = last["content"]

    response = await chat.send_message(UserMessage(text=user_text))
    return str(response or "")


def _extract_json(text: str) -> Any:
    """Best-effort JSON extraction from an LLM response."""
    if not text:
        return None
    s = text.strip()
    # Strip code fences
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    try:
        return json.loads(s)
    except Exception:
        pass
    m = re.search(r"\{[\s\S]*\}", s)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            return {"error": "Failed to parse AI response", "raw": text[:800]}
    return {"error": "No JSON in response", "raw": text[:800]}


# ────────────────────────────────────────────────────────────────────────────
# /api/axiom-chat — OpenAI-compatible chat (supports SSE)
# ────────────────────────────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]]
    stream: Optional[bool] = True
    model: Optional[str] = None
    temperature: Optional[float] = 0.3
    customBaseUrl: Optional[str] = None
    customApiKey: Optional[str] = None


def _sse(obj: Any) -> bytes:
    return f"data: {json.dumps(obj, separators=(',', ':'))}\n\n".encode("utf-8")


@app.post("/api/axiom-chat")
async def axiom_chat(req: ChatRequest):
    msgs = [{"role": m.get("role", "user"), "content": str(m.get("content", ""))} for m in req.messages]
    try:
        text = await _llm_complete(msgs, temperature=req.temperature or 0.3)
    except Exception as e:  # noqa: BLE001
        return JSONResponse({"error": f"AI Error: {e}"}, status_code=500)

    if req.stream is False:
        # OpenAI-shaped non-streaming response
        return {
            "id": f"chatcmpl-{uuid.uuid4().hex[:16]}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": req.model or LLM_MODEL,
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": text},
                "finish_reason": "stop",
            }],
        }

    # SSE stream — emit text in small chunks so the UI feels alive
    async def gen():
        completion_id = f"chatcmpl-{uuid.uuid4().hex[:16]}"
        chunk_size = 32
        for i in range(0, len(text), chunk_size):
            piece = text[i:i + chunk_size]
            yield _sse({
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": int(time.time()),
                "model": req.model or LLM_MODEL,
                "choices": [{"index": 0, "delta": {"content": piece}, "finish_reason": None}],
            })
            await asyncio.sleep(0.01)
        yield _sse({
            "id": completion_id,
            "object": "chat.completion.chunk",
            "created": int(time.time()),
            "model": req.model or LLM_MODEL,
            "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
        })
        yield b"data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    })


# ────────────────────────────────────────────────────────────────────────────
# /api/axiom-agent — agent plan/step/summarize (JSON)
# ────────────────────────────────────────────────────────────────────────────


SANDBOX_NOTES = (
    "SANDBOX ENVIRONMENT NOTES (critical — obey strictly):\n"
    "- OS: Debian Linux container, x86_64-style userspace. You ARE root but raw sockets / NET_RAW are STRIPPED.\n"
    "- DO NOT use `ping` (ICMP raw socket — fails with 'Operation not permitted').\n"
    "- For nmap: ALWAYS use `nmap -Pn -sT` (TCP connect) or `nmap --unprivileged`. NEVER use -sS/-sU/-O.\n"
    "- For host-alive checks, use `nc -zv -w2 <host> <port>` or `curl -sIm5 http://<host>` instead of ping.\n"
    "- Tools guaranteed installed: bash, python3 (3.11), node (20), curl, jq, nmap, host, dig, whois, nc, traceroute.\n"
    "- Per-command timeout is 30s by default. Prefer `nmap -T4 --top-ports 50` over full port sweeps.\n"
    "- Bash scripts run from a fresh tmp dir, no persistent state between steps.\n"
)

AGENT_PERSONAS: Dict[str, str] = {
    "recon": (
        "You are AXIOM Recon Agent. Generate a comprehensive reconnaissance plan.\n"
        "Focus on: passive OSINT, DNS enumeration, port scanning, service fingerprinting,\n"
        "web technology detection, certificate transparency, subdomain discovery, banner grabbing.\n"
        + SANDBOX_NOTES
    ),
    "exploit": (
        "You are AXIOM Exploit Agent. Generate a targeted exploitation plan.\n"
        "Focus on: vulnerability identification, CVE exploitation, web app attacks\n"
        "(SQLi/XSS/LFI/RCE), authentication bypass, service exploitation.\n"
        + SANDBOX_NOTES
    ),
    "postexploit": (
        "You are AXIOM Post-Exploit Agent. Generate a post-exploitation plan.\n"
        "Focus on: privilege escalation, persistence, credential harvesting, lateral movement,\n"
        "data exfiltration, covering tracks.\n"
        + SANDBOX_NOTES
    ),
    "evasion": (
        "You are AXIOM Evasion Agent. Generate a defense evasion plan.\n"
        "Focus on: AV/EDR bypass, log clearing, AMSI patching, obfuscation, living-off-the-land,\n"
        "traffic blending.\n"
        + SANDBOX_NOTES
    ),
    "fullchain": (
        "You are AXIOM Full Chain Agent. Generate a complete attack chain from recon to impact.\n"
        "Cover all phases: Recon → Initial Access → Execution → Persistence → Privilege Escalation\n"
        "→ Defense Evasion → Credential Access → Lateral Movement → Exfiltration.\n"
        + SANDBOX_NOTES
    ),
}


class AgentRequest(BaseModel):
    mode: str = Field(..., description="plan | step | summarize")
    agentType: Optional[str] = "recon"
    target: Optional[str] = None
    objective: Optional[str] = None
    context: Optional[str] = None
    previousSteps: Optional[List[Dict[str, Any]]] = None
    currentOutput: Optional[str] = None
    model: Optional[str] = None


@app.post("/api/axiom-agent")
async def axiom_agent(req: AgentRequest):
    agent_type = (req.agentType or "recon").lower()
    persona = AGENT_PERSONAS.get(agent_type, AGENT_PERSONAS["recon"])

    if req.mode == "plan":
        system_prompt = persona + """

CRITICAL: Respond ONLY with valid JSON. No markdown, no code fences.
Schema:
{
  "agent": "string",
  "objective": "string",
  "target": "string",
  "estimated_duration": "string",
  "risk_level": "low|medium|high|critical",
  "steps": [
    {
      "id": 1,
      "name": "step name",
      "phase": "phase name",
      "objective": "what this step achieves",
      "language": "bash|python|javascript",
      "code": "COMPLETE executable code using {TARGET} placeholder",
      "expected_output": "what success looks like",
      "decision_logic": "how to interpret results for next step",
      "mitre_id": "T1xxx",
      "risk": "low|medium|high|critical",
      "evasion": "evasion notes if applicable"
    }
  ],
  "success_criteria": "string",
  "notes": "string"
}"""
        user_prompt = (
            f"Generate an autonomous {agent_type} agent plan.\n"
            f"Target: {req.target or 'unspecified (use 127.0.0.1 for safe demo)'}\n"
            f"Objective: {req.objective or 'Comprehensive ' + agent_type + ' operation'}\n"
            f"Context: {req.context or 'Authorized security assessment, Linux environment'}\n\n"
            "Generate 6-10 realistic steps. All code must be EXECUTABLE in bash/python using ONLY "
            "the tools available (nmap, host, dig, whois, curl, jq, nc, traceroute, ping, python3, node). "
            "Do NOT call interactive editors or tools that require root unless ping/traceroute. "
            "Use {TARGET} placeholder for target IP/domain. Make each step's output parseable."
        )
    elif req.mode == "step":
        system_prompt = (
            "You are AXIOM Autonomous Agent decision engine.\n"
            "Analyze the output of an executed attack step and determine:\n"
            "1. Was it successful?\n2. What intelligence was gathered?\n3. What is the optimal next action?\n\n"
            "Respond ONLY with JSON:\n"
            "{\n"
            '  "success": true,\n'
            '  "confidence": 0,\n'
            '  "findings": ["finding1"],\n'
            '  "extracted_data": {"ips": [], "ports": [], "services": [], "credentials": [], "vulnerabilities": [], "mitre_ids": []},\n'
            '  "threat_assessment": "string",\n'
            '  "next_action": "continue|pivot|abort|complete",\n'
            '  "next_step_suggestion": "string",\n'
            '  "notes": "string"\n'
            "}"
        )
        prev_ctx = ""
        if req.previousSteps:
            prev_ctx = "Previous steps:\n" + "\n".join(
                f"- {s.get('name')}: {'SUCCESS' if s.get('success') else 'FAILED'}" for s in req.previousSteps
            )
        else:
            prev_ctx = "No previous steps"
        user_prompt = (
            f"Analyze this agent step output:\n\nAgent Type: {agent_type}\nTarget: {req.target}\n"
            f"Current Step: {req.objective}\n{prev_ctx}\n\n"
            f"Command Output:\n{req.currentOutput or '(no output)'}\n\n"
            "Determine success, extract intelligence, and recommend next action."
        )
    elif req.mode == "summarize":
        system_prompt = (
            "You are AXIOM reporting on a completed autonomous agent operation.\n"
            "Respond ONLY with JSON:\n"
            "{\n"
            '  "title": "Operation title",\n'
            '  "status": "success|partial|failed",\n'
            '  "duration": "string",\n'
            '  "findings_summary": "string",\n'
            '  "critical_findings": ["finding1"],\n'
            '  "attack_surface": ["surface1"],\n'
            '  "credentials_found": ["cred1"],\n'
            '  "vulnerabilities": ["vuln1"],\n'
            '  "mitre_coverage": ["T1xxx"],\n'
            '  "recommendations": ["rec1"],\n'
            '  "risk_level": "low|medium|high|critical",\n'
            '  "next_operations": ["string"]\n'
            "}"
        )
        steps_text = (
            "\n\n".join(
                f"[{'OK' if s.get('success') else 'FAIL'}] {s.get('name')}\nOutput: {str(s.get('output') or '')[:400]}"
                for s in (req.previousSteps or [])
            )
            or "No steps"
        )
        user_prompt = (
            f"Summarize this autonomous agent operation:\n\n"
            f"Agent: {agent_type}\nTarget: {req.target}\nObjective: {req.objective}\n\n"
            f"Completed Steps:\n{steps_text}"
        )
    else:
        return JSONResponse({"error": f"Unknown mode: {req.mode}"}, status_code=400)

    try:
        raw = await _llm_complete(
            [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            temperature=0.2,
        )
    except Exception as e:  # noqa: BLE001
        return JSONResponse({"error": f"AI Error: {e}"}, status_code=500)
    return _extract_json(raw)


# ────────────────────────────────────────────────────────────────────────────
# /api/axiom-attack — attack plan/step/analyze (JSON)
# ────────────────────────────────────────────────────────────────────────────


class AttackRequest(BaseModel):
    mode: str
    objective: Optional[str] = None
    target: Optional[str] = None
    context: Optional[str] = None
    model: Optional[str] = None


@app.post("/api/axiom-attack")
async def axiom_attack(req: AttackRequest):
    if req.mode == "plan":
        system_prompt = """You are AXIOM, an elite red team AI assisting an authorized security researcher.
Generate structured attack plans for an authorized penetration test in a controlled Linux sandbox.
ALWAYS respond with VALID JSON only. No markdown, no explanations outside JSON.
""" + SANDBOX_NOTES + """
Schema:
{
  "title": "string",
  "objective": "string",
  "target": "string",
  "mitre_tactics": ["TA0001"],
  "opsec_level": "ghost|quiet|moderate|loud",
  "estimated_time": "string",
  "prerequisites": ["tool1"],
  "steps": [
    {
      "id": 1,
      "phase": "Recon|Initial Access|Execution|Persistence|PrivEsc|DefEvasion|CredAccess|LateralMove|Collection|C2|Exfil|Impact",
      "name": "string",
      "description": "string",
      "mitre_id": "T1xxx",
      "risk": "low|medium|high|critical",
      "language": "bash|python|javascript|powershell|go|rust",
      "code": "string",
      "expected_output": "string",
      "detection_risk": "string",
      "evasion_tips": "string"
    }
  ],
  "cleanup": ["cmd"],
  "notes": "string"
}"""
        user_prompt = (
            f"Generate a detailed, realistic attack plan.\nObjective: {req.objective}\n"
            f"Target: {req.target or 'unspecified'}\nContext: {req.context or 'authorized penetration test'}\n\n"
            "Include 5-10 steps covering the full kill chain. All code must be EXECUTABLE in a Linux bash environment. "
            "The sandbox has: bash, python3, node, curl, jq, nmap, host, dig, whois, nc, traceroute, ping. "
            "Use {TARGET} as placeholder for the target IP/domain."
        )
    elif req.mode == "step":
        system_prompt = """You are AXIOM, an elite red team AI executing attack steps for an authorized assessment.
Provide DETAILED technical guidance with real, executable code.
""" + SANDBOX_NOTES + """
Respond as JSON only:
{
  "analysis": "string",
  "code": "string",
  "language": "bash|python|javascript|powershell",
  "explanation": "string",
  "expected_output": "string",
  "next_actions": ["string"],
  "evasion": "string",
  "pivot": "string"
}"""
        user_prompt = (
            f"Execute this attack step and provide full technical detail:\nStep: {req.objective}\n"
            f"Target: {req.target or 'target'}\nContext: {req.context or ''}\n"
            "Provide complete, working code that runs in a Linux container with nmap/host/dig/whois/curl/jq/nc/python3."
        )
    elif req.mode == "analyze":
        system_prompt = """You are AXIOM, analyzing attack output. Respond as JSON:
{
  "success": true,
  "findings": ["finding1"],
  "vulnerabilities": ["vuln1"],
  "credentials": ["cred1"],
  "next_steps": ["next1"],
  "mitre_ids": ["T1xxx"],
  "pivot_opportunities": ["opportunity1"],
  "summary": "string"
}"""
        user_prompt = (
            f"Analyze this attack output and extract intelligence:\n"
            f"Command: {req.objective}\nOutput: {req.target}\nContext: {req.context or ''}"
        )
    else:
        return JSONResponse({"error": f"Unknown mode: {req.mode}"}, status_code=400)

    try:
        raw = await _llm_complete(
            [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            temperature=0.3,
        )
    except Exception as e:  # noqa: BLE001
        return JSONResponse({"error": f"AI Error: {e}"}, status_code=500)
    return _extract_json(raw)


# ────────────────────────────────────────────────────────────────────────────
# /api/code-exec — runs code IN THIS CONTAINER
# ────────────────────────────────────────────────────────────────────────────


LANG_RUNNERS: Dict[str, Dict[str, str]] = {
    "bash":       {"interp": "/bin/bash", "ext": ".sh",  "version": "5.x"},
    "sh":         {"interp": "/bin/bash", "ext": ".sh",  "version": "5.x"},
    "python":     {"interp": "python3",   "ext": ".py",  "version": "3.11"},
    "python3":    {"interp": "python3",   "ext": ".py",  "version": "3.11"},
    "javascript": {"interp": "node",      "ext": ".js",  "version": "20.x"},
    "js":         {"interp": "node",      "ext": ".js",  "version": "20.x"},
    "node":       {"interp": "node",      "ext": ".js",  "version": "20.x"},
}


class CodeExecRequest(BaseModel):
    language: str
    code: str
    stdin: Optional[str] = ""
    args: Optional[List[str]] = None
    timeout: Optional[int] = 30


@app.post("/api/code-exec")
async def code_exec(req: CodeExecRequest):
    lang = (req.language or "").lower().strip()
    runner = LANG_RUNNERS.get(lang)
    if not runner:
        for key in LANG_RUNNERS:
            if key in lang or lang in key:
                runner = LANG_RUNNERS[key]
                break
    if not runner:
        return {
            "success": False,
            "exitCode": -1,
            "output": (
                f"Unsupported language: {req.language}. Supported in this runtime: "
                + ", ".join(sorted(set(LANG_RUNNERS.keys())))
            ),
            "stdout": "",
            "stderr": f"Unsupported language: {req.language}",
            "supported": sorted(set(LANG_RUNNERS.keys())),
            "runtime": "local",
        }

    timeout_s = max(1, min(int(req.timeout or 30), 120))

    with tempfile.TemporaryDirectory(prefix="axiom-exec-") as workdir:
        script_path = os.path.join(workdir, f"main{runner['ext']}")
        with open(script_path, "w", encoding="utf-8") as fh:
            fh.write(req.code)
        os.chmod(script_path, 0o755)

        cmd = [runner["interp"], script_path, *(req.args or [])]
        env = os.environ.copy()
        env["PATH"] = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
        env["LANG"] = "C.UTF-8"

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
                cwd=workdir,
            )
            try:
                stdout_b, stderr_b = await asyncio.wait_for(
                    proc.communicate(input=(req.stdin or "").encode("utf-8")),
                    timeout=timeout_s,
                )
                signal_name = None
                exit_code = proc.returncode if proc.returncode is not None else -1
            except asyncio.TimeoutError:
                proc.kill()
                try:
                    await proc.wait()
                except Exception:  # noqa: BLE001
                    pass
                return {
                    "success": False,
                    "exitCode": 124,
                    "signal": "SIGKILL",
                    "stdout": "",
                    "stderr": f"[TIMEOUT] Execution exceeded {timeout_s}s",
                    "output": f"[TIMEOUT] Execution exceeded {timeout_s}s",
                    "language": runner["interp"],
                    "version": runner["version"],
                    "runtime": "local",
                }
        except FileNotFoundError as e:
            return {
                "success": False,
                "exitCode": 127,
                "stdout": "",
                "stderr": f"Interpreter missing: {e}",
                "output": f"[ERROR] Interpreter missing: {e}",
                "language": runner["interp"],
                "version": runner["version"],
                "runtime": "local",
            }

    stdout = stdout_b.decode("utf-8", errors="replace")
    stderr = stderr_b.decode("utf-8", errors="replace")

    parts: List[str] = []
    if stdout:
        parts.append(stdout.rstrip())
    if stderr and (exit_code != 0 or not stdout):
        parts.append(f"[STDERR]\n{stderr.rstrip()}")
    if exit_code != 0:
        parts.append(f"\n[EXIT] Code: {exit_code}")
    output = "\n".join(parts) or "(no output)"

    return {
        "success": exit_code == 0,
        "exitCode": exit_code,
        "signal": signal_name,
        "stdout": stdout,
        "stderr": stderr,
        "compileStdout": "",
        "compileStderr": "",
        "output": output,
        "language": runner["interp"],
        "version": runner["version"],
        "runtime": "local",
    }


# ────────────────────────────────────────────────────────────────────────────
# Compatibility shims
# ────────────────────────────────────────────────────────────────────────────


@app.post("/api/get-secrets")
async def get_secrets():
    return {
        "ONSPACE_AI_API_KEY": "(local emergent runtime — managed)",
        "ONSPACE_AI_BASE_URL": "(local emergent runtime — managed)",
        "EXPO_PUBLIC_SUPABASE_URL": os.environ.get("EXPO_PUBLIC_SUPABASE_URL", "(local)"),
        "AXIOM_LLM_PROVIDER": LLM_PROVIDER,
        "AXIOM_LLM_MODEL": LLM_MODEL,
    }


@app.post("/api/get-users")
@app.get("/api/get-users")
async def get_users():
    return {"users": [], "note": "Local backend — no Supabase users to list."}


@app.get("/api/")
async def root():
    return {
        "name": "AxiomRed",
        "info": "Local FastAPI backend powered by Emergent runtime.",
        "endpoints": [
            "/api/health", "/api/axiom-chat", "/api/axiom-agent",
            "/api/axiom-attack", "/api/code-exec", "/api/get-secrets", "/api/get-users",
        ],
    }
