import uuid

from fastapi import APIRouter, File, UploadFile
from starlette.concurrency import run_in_threadpool

from services.image import resize_image_if_needed, save_image, validate_image
from services.vision import analyze_crop_image


router = APIRouter(prefix="/analyze_image", tags=["Analyze"])


@router.post("/image")
async def analyze_image_single(file: UploadFile = File(...)) -> dict:
    """Validate an uploaded image, analyze it, and return the crop findings."""
    content = await file.read()
    validation = validate_image(file.content_type, content)
    processed = resize_image_if_needed(validation["content_bytes"])

    image_id = f"{uuid.uuid4()}.{validation['format'].lower()}"
    save_image(processed, image_id)

    analysis = await run_in_threadpool(
        analyze_crop_image,
        processed,
        validation["content_type"],
    )
    return {"image_id": image_id, "analysis": analysis}
