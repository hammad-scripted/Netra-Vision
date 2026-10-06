from io import BytesIO
from pathlib import Path
from typing import Any
import warnings
import os

from fastapi import HTTPException, status
from PIL import Image, UnidentifiedImageError

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MiB
MAX_IMAGE_PIXELS = 40_000_000

_SUPPORTED_FORMATS = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
}
_MIME_ALIASES = {"image/jpg": "image/jpeg"}
_MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MiB
_MAX_IMAGE_DIMENSIONS = 2048  # 2048 pixels in width or height
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_UPLOAD_DIR = Path(os.getenv("NETRA_UPLOAD_DIR", PROJECT_ROOT / "uploads"))


def validate_image(
    content_type: str | None,
    content: bytes | None,
    *,
    max_size: int = MAX_IMAGE_SIZE,
    max_pixels: int = MAX_IMAGE_PIXELS,
) -> dict[str, Any]:
    """Validate JPEG or PNG image bytes and return image metadata.

    The MIME type is treated as a hint and checked against the decoded file
    format. If it is missing, the format is inferred from the image bytes.
    Raises ``HTTPException(400)`` when the upload is missing, too large,
    malformed, unsupported, or exceeds the pixel limit.
    """
    if content is None or not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No image uploaded",
        )

    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image size exceeds the {max_size // (1024 * 1024)} MiB limit",
        )

    declared_type = (content_type or "").split(";", 1)[0].strip().lower()
    declared_type = _MIME_ALIASES.get(declared_type, declared_type)
    if declared_type and declared_type not in _SUPPORTED_FORMATS.values():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Only JPEG and PNG are allowed.",
        )

    try:
        # Pillow warns or errors on images large enough to risk excessive
        # memory use. Convert its warning to an exception for this operation.
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(content)) as image:
                image_format = image.format
                width, height = image.size

                if image_format not in _SUPPORTED_FORMATS:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid image format. Only JPEG and PNG are allowed.",
                    )

                if width <= 0 or height <= 0 or width * height > max_pixels:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Image dimensions exceed the {max_pixels:,}-pixel limit",
                    )

                image.verify()
    except HTTPException:
        raise
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is not a valid image",
        ) from exc

    actual_type = _SUPPORTED_FORMATS[image_format]
    if declared_type and declared_type != actual_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image content does not match the declared content type",
        )

    size = len(content)
    return {
        "content_type": actual_type,
        "content_bytes": content,
        "format": image_format,
        "size": size,
        "size_mb": round(size / (1024 * 1024), 2),
        "is_valid": True,
        "height": height,
        "width": width,
    }


def resize_image_if_needed(image_bytes: bytes) -> bytes:
    """
    Resize the image if it exceeds the specified maximum dimensions.
    Returns the resized image bytes or the original bytes if no resizing is needed.
    """
    with Image.open(BytesIO(image_bytes)) as img:
        width, height = img.size
        if width > _MAX_IMAGE_DIMENSIONS or height > _MAX_IMAGE_DIMENSIONS:
            img.thumbnail((_MAX_IMAGE_DIMENSIONS, _MAX_IMAGE_DIMENSIONS))
            output = BytesIO()
            img.save(output, format=img.format)
            return output.getvalue()
    return image_bytes


def save_image(
    image_bytes: bytes,
    file_path: str,
    upload_dir: str | os.PathLike[str] = DEFAULT_UPLOAD_DIR,
) -> None:
    """
    Save the image bytes to the specified file path.
    """
    upload_path = Path(upload_dir)
    upload_path.mkdir(parents=True, exist_ok=True)
    full_path = upload_path / file_path
    with full_path.open("wb") as f:
        f.write(image_bytes)
