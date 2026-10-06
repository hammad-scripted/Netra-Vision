from fastapi import FastAPI
from routes import analyze

app = FastAPI(
    title="Netra Vision",
    description="Netra Vision API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.include_router(analyze.router)


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
