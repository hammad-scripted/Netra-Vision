# Netra Vision

Netra Vision helps review crop photos through a FastAPI service and a responsive React workspace.

## Run the API

Use the root `.env.example` as a template for `.env`, then replace the placeholder with your API key. Keep `.env` local; it is ignored by Git.

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

- `GET /health` returns the API process status.
- `POST /analyze_image/image` analyzes one JPEG or PNG upload. Send the file in the `file` multipart field.
- `POST /analyze_image/batch` analyzes up to ten JPEG or PNG uploads. Send repeated `files` multipart fields. The response reports success or an error for each file.
- `GET /analyze_image/history?limit=100` lists saved analysis summaries, newest first (maximum 500).
- `GET /analyze_image/{image_id}` returns a saved result using the `image_id` returned by an upload request.
- `GET /docs` opens the interactive API documentation.

Each image must be 10 MB or smaller. The result lookup route returns `404` when the ID is malformed or no saved analysis exists.
