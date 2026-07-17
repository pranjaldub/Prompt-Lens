# Deployment Guide for PromptLens

This app has two parts:
- `backend/` - FastAPI app (`server.py`, app object is `app`). No database - analysis
  is either done via the Hugging Face Inference API (if `HF_API_TOKEN` is set) or a
  built-in deterministic heuristic fallback. There is no MongoDB, no OpenAI key, no
  Google key - the app does not use them despite what older docs may have said.
- `frontend/` - Create React App (via CRACO), talks to the backend through
  `REACT_APP_BACKEND_URL` (baked in at build time, since that's how CRA env vars work).

---

## 1. Run locally (no Docker)

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # HF_API_TOKEN is optional; app works without it
uvicorn server:app --reload --port 8000
```
Check it's alive: http://localhost:8000/api/health

### Frontend
```bash
cd frontend
yarn install --legacy-peer-deps   # or: npm install --legacy-peer-deps
echo "REACT_APP_BACKEND_URL=http://localhost:8000" > .env
yarn start                        # or: npm start
```
Opens at http://localhost:3000 and talks to the backend at :8000.

---

## 2. Run locally with Docker Compose
```bash
cp backend/.env.example backend/.env   # add HF_API_TOKEN if you have one
docker-compose up --build
```
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

(There is no database container - it was removed since nothing in the app uses one.)

---

## 3. Deploy backend to Render

A `render.yaml` blueprint is included at the repo root.

**Via Blueprint (recommended):**
1. Push this repo to GitHub.
2. In Render: New -> Blueprint -> select the repo -> Render reads `render.yaml`.
3. Set `HF_API_TOKEN` (optional) and update `CORS_ORIGINS` to your real Vercel URL once you have it.
4. Deploy. Render gives you a URL like `https://promptlens-backend.onrender.com`.

**Manual Web Service (if not using the blueprint):**
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- Env vars: `HF_API_TOKEN` (optional), `HF_MODEL_ID`, `CORS_ORIGINS` (set to your Vercel domain)

---

## 4. Deploy frontend to Vercel

A `vercel.json` at the repo root is already configured to build the `frontend/` subfolder.

1. Push this repo to GitHub, import it in Vercel.
2. Leave Root Directory as the repo root (vercel.json handles `cd frontend`).
3. In Project Settings -> Environment Variables, add:
   - `REACT_APP_BACKEND_URL` = `https://promptlens-backend.onrender.com` (your Render URL, no trailing slash)
4. Deploy. Because CRA bakes `REACT_APP_*` vars in at build time, changing this
   value later requires a redeploy.

---

## 5. Wire CORS correctly

After both are deployed, go back to Render and set the backend's `CORS_ORIGINS`
env var to your actual Vercel URL (e.g. `https://promptlens.vercel.app`), then
redeploy the backend. Multiple origins can be comma-separated.

---

## Troubleshooting

- **Backend won't start locally**: make sure you're using Python 3.11+ and the
  venv is activated before `pip install`. The first run needs internet access once -
  `tiktoken` downloads its encoding file from `openaipublic.blob.core.windows.net`
  on first use and caches it locally afterward.
- **Frontend can't reach backend / CORS errors**: check `REACT_APP_BACKEND_URL`
  has no trailing slash, and that the backend's `CORS_ORIGINS` includes your
  frontend's exact origin.
- **Docker build fails**: `docker system prune` then `docker-compose up --build` again.
