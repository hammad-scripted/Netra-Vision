import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from routes import analyze, auth

app = FastAPI(
    title="Netra Vision",
    description="Netra Vision API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(analyze.router)
app.include_router(auth.router)


@app.get("/health", tags=["Health"])
def health_check():
    """Liveness endpoint for the API process."""
    return {"status": "ok", "service": "netra-vision"}


@app.get("/api/info")
def api_info():
    return {
        "message": "Welcome to Netra Vision API!",
        "app": "Netra Vision",
        "version": "1.0.0",
        "endpoint": {
            "POST /auth/register": "Create an account with a username, email, and password.",
            "POST /auth/token": "Sign in with a username or email and password to receive a bearer token.",
            "GET /auth/me": "Read the current signed-in account profile.",
            "POST /analyze_image/image": "Upload an image and return the results for disease detection.",
            "POST /analyze_image/batch": "Upload images in a batch and return the results for disease detection.",
            "GET /analyze_image/history": "List recent saved analysis summaries.",
            "GET /analyze_image/image/{image_id}": "Get an uploaded image owned by the signed-in account.",
            "GET /health": "Check the health status of the API.",
            "GET /analyze_image/{image_id}": "Get the analysis results for a specific image by its ID.",
        },
    }


frontend_dist = Path(__file__).resolve().parents[1] / "frontend" / "dist"
if frontend_dist.is_dir():
    app.frontend("/", directory=frontend_dist)
