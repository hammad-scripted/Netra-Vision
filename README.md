# Netra Vision

Netra Vision helps review crop photos through a FastAPI service and a responsive React workspace.

## Run the API

Use the root `.env.example` as a template for `.env`, then set `OPENAI_API_KEY` and replace `NETRA_API_TOKEN` with a long random secret. Keep `.env` local; it is ignored by Git. The frontend sign-in screen accepts this shared API token.

Install the Python dependencies and start FastAPI from the repository root:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --app-dir app --port 8000
```

Image uploads and completed analysis records are stored under `uploads/` by default. Set `NETRA_UPLOAD_DIR` or `NETRA_ANALYSIS_DIR` to change their storage locations. Set `CORS_ORIGINS` to a comma-separated list of allowed frontend origins when deploying.

## Run the frontend

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

The Vite app opens at `http://localhost:5173` and calls the API at `http://localhost:8000` by default. Set `VITE_API_BASE_URL` in `frontend/.env.local` to use another API URL.

## API routes

- `GET /health` returns the API process status without authentication.
- `GET /` returns public API metadata.
- `POST /analyze_image/image` analyzes one JPEG or PNG upload. Send the file in the `file` multipart field and include `Authorization: Bearer <NETRA_API_TOKEN>`.
- `POST /analyze_image/batch` analyzes up to ten JPEG or PNG uploads. Send repeated `files` multipart fields and include the bearer token. The response reports success or an error for each file.
- `GET /analyze_image/history?limit=100` lists saved analysis summaries, newest first (maximum 500); it requires the bearer token.
- `GET /analyze_image/{image_id}` returns a saved result using the `image_id` returned by an upload request; it requires the bearer token.
- `GET /docs` opens the interactive API documentation.

Each image must be 10 MB or smaller. The result lookup route returns `404` when the ID is malformed or no saved analysis exists. `/docs` and `/redoc` stay available for API documentation; use the Bearer token authorization control in Swagger when calling protected routes.
