"""Minimal backend stub for AxiomRed.

The actual application backend lives in Supabase Edge Functions
(see /app/frontend/supabase/functions). This stub satisfies the
supervisor-managed FastAPI service on port 8001 and is intentionally
kept lightweight.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AxiomRed Stub Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "axiomred-stub"}


@app.get("/api/")
async def root():
    return {
        "name": "AxiomRed",
        "info": "Backend is provided by Supabase Edge Functions; this is a placeholder.",
    }
