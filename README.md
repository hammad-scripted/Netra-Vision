# Netra Vision

Netra Vision helps review crop photos through a FastAPI service and a responsive React workspace.

## Run the app

Use the root `.env.example` as a template for `.env`. Set `OPENAI_API_KEY` and generate a private signing key for `NETRA_AUTH_SECRET_KEY` with `python -c "import secrets; print(secrets.token_hex(32))"`. Keep `.env` local; it is ignored by Git. New accounts are stored in SQLite at `NETRA_AUTH_DATABASE` (default `uploads/netra_auth.sqlite3`), and access tokens expire after `NETRA_ACCESS_TOKEN_MINUTES` (default 60).

Install the Python dependencies and start FastAPI from the repository root:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
npm --prefix frontend install
npm --prefix frontend run build
python -m uvicorn main:app --reload --app-dir app --port 8000
```

The FastAPI app serves the built React workspace from `/`. Rebuild `frontend/dist` after frontend changes. During local Vite development, the frontend uses `http://localhost:8000` for the API; in production, it uses the current origin unless `VITE_API_BASE_URL` is set.

Accounts and completed analysis results share the SQLite database configured by `NETRA_AUTH_DATABASE` (default `uploads/netra_auth.sqlite3`). You can open that file with DB Browser for SQLite and browse the `users` and `analysis_results` tables. Uploaded image files remain under `uploads/` by default; set `NETRA_UPLOAD_DIR` to change their location. Existing analysis JSON files under `NETRA_ANALYSIS_DIR` (default `uploads/results`) are imported into SQLite the first time analysis history is accessed. Set `CORS_ORIGINS` to a comma-separated list of allowed frontend origins when deploying.

The first account created adopts unassigned analyses from the earlier shared-token workspace. New analyses are scoped to their uploading account. Passwords must be at least 12 characters and are stored as Argon2 hashes. Registration validates the email format but does not send a verification email.

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
- `GET /api/info` returns public API metadata.
- `POST /auth/register` creates an account using JSON fields `username`, `email`, and `password`, then returns an access token.
- `POST /auth/token` signs in using form fields `username` (username or email) and `password`.
- `GET /auth/me` returns the current signed-in account.
- `POST /analyze_image/image` analyzes one JPEG or PNG upload. Send the file in the `file` multipart field and include the access token as a Bearer token.
- `POST /analyze_image/batch` analyzes up to ten JPEG or PNG uploads. Send repeated `files` multipart fields and include the Bearer token. The response reports success or an error for each file.
- `GET /analyze_image/history?limit=100` lists the signed-in account's saved analysis summaries, newest first (maximum 500).
- `GET /analyze_image/image/{image_id}` returns the uploaded image for an analysis owned by the signed-in account.
- `GET /analyze_image/{image_id}` returns a saved result owned by the signed-in account.
- `GET /docs` opens the interactive API documentation.

Each image must be 10 MB or smaller. The result lookup route returns `404` when the ID is malformed or the analysis is not available to that account. `/docs` and `/redoc` stay available for API documentation; sign in through `/auth/token` to obtain a Bearer token before calling protected routes.
