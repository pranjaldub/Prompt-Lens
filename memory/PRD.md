# PromptLens — Product Requirements Document

## Original Problem Statement
Build a modern full-stack web application called PromptLens — an AI-powered Prompt Analyzer. Use React + Material UI + Recharts + Monaco Editor for the frontend, and FastAPI (Python) for the backend. Do not use paid APIs. Use free/open-source LLMs (Ollama / Hugging Face) for prompt analysis and optimization. Use tiktoken for token estimation. Dark theme, animated score cards, charts, side-by-side comparison, prompt history, copy/download, loading states, responsive.

## User Choices
- **LLM**: Hugging Face Inference API (`meta-llama/Llama-3.1-8B-Instruct` default).
- **Orchestration**: LangGraph 1.2.x (multi-agent DAG, parallel fan-out).
- **Tokenizer**: tiktoken (`cl100k_base`).
- **History**: browser localStorage only.
- **Auth**: none.
- **UI**: Material UI + bespoke brutalist / terminal-retro dark theme.

## Architecture
- **Backend** (`/app/backend/`):
  - `server.py`: FastAPI endpoints — `/api/analyze`, `/api/analyze/stream` (SSE), `/api/metrics/definitions`, `/api/models`, `/api/tokenize`, `/api/health`.
  - `langgraph_analyzer.py`: StateGraph — START fans out to 9 metric-specialist nodes (Clarity/Specificity/Ambiguity/Context/Instructions/Complexity/Readability/SuccessRate/ResponseQuality Judges) which all fan into a Synthesis aggregate node. Each metric node calls HF (8s timeout) with a narrow "judge this dimension" prompt and returns {score, diagnosis, recommendation, evidence, source, latency_ms}. Deterministic heuristic fallback per agent guarantees non-empty diagnosis/recommendation.
- **Frontend** (`/app/frontend/src/`): React 19 + MUI + Monaco + Recharts + react-router-dom + jsdiff.
  - Pages: `/` landing, `/analyze`, `/compare`, `/metrics`, `/history`.
  - Streaming UI: `AgentProgressPanel` renders 10 agent rows with checkmarks/score/source/latency as SSE events arrive.
  - `ScoreCard` now supports a `details` prop → collapsible "// DIAGNOSIS" + "// FIX" + "// EVIDENCE" section per metric.

## What's Been Implemented

### v1 (Feb 16, 2026)
Initial MVP: HF integration + heuristic fallback, Monaco editor, 4 score cards, radar+cost chart, side-by-side rewrite, history drawer.

### v2
10 metrics + tooltip formulas, tabbed AnalysisView (Overview/Metrics/Costs/Rewrite), react-router multi-page (Analyze/Compare/Metrics/History), SSE streaming, word-level diff.

### v3
Richer schema — Prompt Score composite gauge, typed failure_risks (7), token distribution donut, typed suggestions, primary cost line, landing page.

### v4 (Feb 16, 2026) — LangGraph multi-agent
- ✅ 9 parallel metric-specialist agents + 1 Synthesis agent orchestrated via LangGraph StateGraph.
- ✅ Each agent returns per-metric {score, diagnosis, recommendation, evidence} — NEVER just a number.
- ✅ SSE event schema: `graph_start`, `agent_done` (with latency_ms), `aggregate_done`, `result`.
- ✅ `AgentProgressPanel` renders the live checklist during streaming.
- ✅ `ScoreCard` "Why this score?" expandable reveals diagnosis + fix + evidence.
- ✅ Meta bar `graph-chip` shows `<hf>/<total> agents · hf`.
- ✅ Testing: pytest 6/6 + frontend 100% pass (iteration 5).

## Prioritized Backlog

### P1
- Compile the LangGraph once and cache — remove per-request `build_graph` cost.
- Show latency and source-badge (AGENT vs FALLBACK) inline on every score card, not just on the progress panel.
- Deep-link `/a/:id` — persist an analysis server-side (opt-in) and share.

### P2
- Streaming partial JSON of the aggregate agent into the Rewrite tab as it generates.
- Batch analyze CSV of prompts.
- "Explain this risk" that fires an ad-hoc agent for a single failure_risk item.
- Prompt template library with categorised starters.

## Next Tasks
- Await user feedback for v4.
- Consider caching HF client health to avoid wasted timeouts when HF is down.
