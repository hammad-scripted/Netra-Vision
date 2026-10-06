import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from starlette.concurrency import run_in_threadpool

from services.analysis_store import (
    InvalidImageId,
    get_analysis_result,
    list_analysis_results,
    save_analysis_result,
)
from services.image import (
    DEFAULT_UPLOAD_DIR,
    MAX_IMAGE_SIZE,
    resize_image_if_needed,
    save_image,
    validate_image,
)
from services.vision import analyze_crop_image


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analyze_image", tags=["Analyze"])
MAX_BATCH_IMAGES = 10


async def _analyze_upload(file: UploadFile) -> dict[str, Any]:
    """Validate one upload, analyze it, and persist its result."""
    content = await file.read(MAX_IMAGE_SIZE + 1)
    validation = await run_in_threadpool(validate_image, file.content_type, content)
    processed = await run_in_threadpool(
        resize_image_if_needed,
        validation["content_bytes"],
    )
    image_id = f"{uuid4()}.{validation['format'].lower()}"

    try:
        analysis = await run_in_threadpool(
            analyze_crop_image,
            processed,
            validation["content_type"],
        )
    except Exception as exc:
        logger.exception("Crop analysis failed for uploaded image")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Crop analysis could not be completed. Please try again.",
        ) from exc

    result = {
        "success": True,
        "image_id": image_id,
        "filename": file.filename or "upload",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "analysis": analysis,
    }
    await run_in_threadpool(save_image, processed, image_id, DEFAULT_UPLOAD_DIR)
    await run_in_threadpool(save_analysis_result, result)
    return result


@router.post("/image")
async def analyze_image_single(file: UploadFile = File(...)) -> dict[str, Any]:
    """Analyze one uploaded crop image and return its findings."""
    return await _analyze_upload(file)


@router.post("/batch")
async def analyze_images_batch(
    files: list[UploadFile] = File(...),
) -> dict[str, Any]:
    """Analyze up to ten images, returning a per-file result or error."""
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upload at least one image.",
        )
    if len(files) > MAX_BATCH_IMAGES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"A batch may contain at most {MAX_BATCH_IMAGES} images.",
        )

    results: list[dict[str, Any]] = []
    for file in files:
        try:
            results.append(await _analyze_upload(file))
        except HTTPException as exc:
            results.append(
                {
                    "success": False,
                    "filename": file.filename or "upload",
                    "error": str(exc.detail),
                }
            )
        except Exception:
            logger.exception("Could not save batch analysis for uploaded image")
            results.append(
                {
                    "success": False,
                    "filename": file.filename or "upload",
                    "error": "The image could not be analyzed. Please retry.",
                }
            )

    succeeded = sum(1 for result in results if result["success"])
    return {
        "total": len(results),
        "succeeded": succeeded,
        "failed": len(results) - succeeded,
        "results": results,
    }


@router.get("/history")
async def get_analysis_history(
    limit: int = Query(default=100, ge=1, le=500),
) -> dict[str, Any]:
    """Return a newest-first page of saved analysis summaries."""
    saved_results = await run_in_threadpool(list_analysis_results)
    summaries = []
    for result in saved_results[:limit]:
        analysis = result.get("analysis")
        if not isinstance(analysis, dict):
            analysis = {}
        diseases = analysis.get("diseases")
        if not isinstance(diseases, list):
            diseases = []

        summaries.append(
            {
                "image_id": str(result.get("image_id", "")),
                "filename": str(result.get("filename", "upload")),
                "created_at": str(result.get("created_at", "")),
                "crop_type": str(analysis.get("crop_type", "")),
                "growth_stage": str(analysis.get("growth_stage", "")),
                "health_status": str(analysis.get("health_status", "Unknown")),
                "disease_count": len(diseases),
            }
        )

    return {"total": len(saved_results), "results": summaries}


@router.get("/{image_id}")
def get_analysis(image_id: str) -> dict[str, Any]:
    """Return a stored analysis by the ID returned from an upload request."""
    try:
        return get_analysis_result(image_id)
    except (InvalidImageId, FileNotFoundError) as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No analysis was found for that image ID.",
        ) from exc
