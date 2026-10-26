# Deployment plan (not deployed)

| Part | Host | Why |
|---|---|---|
| Frontend (React/Vite static build) | **Vercel** | Free static hosting + CDN, builds on every git push |
| Backend (Node/Express API) | **Render** Web Service | Runs a long-lived Node server; handles multipart uploads and in-memory scan cache |
| (Optional) scan history | MongoDB Atlas free tier | Only if scan history is added |

## Frontend on Vercel
- Root directory: `frontend` · Build command: `npm run build` · Output: `dist`
- Environment variable (Vercel → Project → Settings → Environment Variables):
  - `VITE_API_URL=https://tritorc-tender-scanner-api.onrender.com`

## Backend on Render
- Root directory: `backend` · Build: `npm install` · Start: `npm start` · Health check path: `/api/health`
- Environment variables (Render → Service → Environment):
  - `PORT` (set by Render automatically)
  - `CORS_ORIGIN=https://tritorc-tender-scanner.vercel.app`
  - `MAX_FILE_SIZE_MB=20`, `RELATED_MIN=3`, `POSSIBLE_MIN=1`
  - `MONGODB_URI=...` (only if history is added)
- Secrets live only in the Vercel / Render dashboards, never in git (`.env` is git-ignored; `.env.example` documents the names).

## Production URLs (example)
- App: `https://tritorc-tender-scanner.vercel.app`
- API: `https://tritorc-tender-scanner-api.onrender.com/api`
  - `POST https://tritorc-tender-scanner-api.onrender.com/api/scan`
  - `GET  https://tritorc-tender-scanner-api.onrender.com/api/scan/<scanId>/report.xlsx`

## Notes
- Render's free tier sleeps when idle (first request can take ~30 s) and has 1 instance; the in-memory scan cache means the report must be downloaded from the same instance, so with more than one instance move scans to MongoDB/Redis or return the xlsx directly.
- An alternative is a single Render service serving both the API and the built frontend.
