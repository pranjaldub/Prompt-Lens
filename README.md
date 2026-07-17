# PromptLens

PromptLens analyzes prompts and scores them on clarity, specificity, ambiguity,
context, instruction quality, complexity, readability, predicted success rate,
and response quality - then suggests concrete improvements and an optimized rewrite.

- **Backend**: FastAPI (`backend/server.py`) + a LangGraph multi-agent analyzer
  (`backend/langgraph_analyzer.py`). Uses the Hugging Face Inference API if
  `HF_API_TOKEN` is set, otherwise falls back to a deterministic heuristic
  analyzer - no database, no OpenAI/Google keys required.
- **Frontend**: React (Create React App + CRACO), Tailwind, shadcn/Radix UI, MUI.

## Quick start

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full local setup, Docker Compose,
and Render/Vercel deployment instructions. TL;DR:

```bash
# backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn server:app --reload --port 8000

# frontend (new terminal)
cd frontend
yarn install --legacy-peer-deps
echo "REACT_APP_BACKEND_URL=http://localhost:8000" > .env
yarn start
```

Then open http://localhost:3000.
