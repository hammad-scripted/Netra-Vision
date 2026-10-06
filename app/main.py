import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import analyze

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


@app.get("/health", tags=["Health"])
def health_check():
    """Liveness endpoint for the API process."""
    return {"status": "ok", "service": "netra-vision"}


@app.get("/")
def root():
    return {
        "message": "Welcome to Netra Vision API!",
        "app": "Netra Vision",
        "version": "1.0.0",
        "endpoint": {
            "POST /analyze_image/image": "Upload an image and return the results for disease detection.",
            "POST /analyze_image/batch": "Upload images in a batch and return the results for disease detection.",
            "GET /health": "Check the health status of the API.",
            "GET /analyze_image/{image_id}": "Get the analysis results for a specific image by its ID.",
        },
    }
