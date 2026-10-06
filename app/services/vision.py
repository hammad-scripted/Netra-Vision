import base64
import json
import os
from functools import lru_cache

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()  # Load environment variables from .env file


@lru_cache(maxsize=1)
def _get_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    return OpenAI(api_key=api_key)

CROP_ANALYSIS_PROMPT = """Analyze the crop in the supplied image. Assess visible health, likely growth stage, crop type, and any visible disease symptoms. Do not claim a disease or deficiency unless the image provides visible evidence; state uncertainty in additional_notes when the image is unclear. Give practical, cautious recommendations for any listed issue."""

CROP_ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "health_status": {"type": "string"},
        "growth_stage": {"type": "string"},
        "crop_type": {"type": "string"},
        "diseases": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "severity": {"type": "string"},
                    "recommendations": {"type": "string"},
                    "description": {"type": "string"},
                },
                "required": [
                    "name",
                    "severity",
                    "recommendations",
                    "description",
                ],
                "additionalProperties": False,
            },
        },
        "additional_notes": {"type": "string"},
    },
    "required": [
        "health_status",
        "growth_stage",
        "crop_type",
        "diseases",
        "additional_notes",
    ],
    "additionalProperties": False,
}


def analyze_crop_image(image_bytes: bytes, content_type: str) -> dict:
    """Analyze an uploaded JPEG or PNG and return the crop findings as a dict."""
    if not image_bytes:
        raise ValueError("image_bytes must not be empty")
    if content_type not in {"image/jpeg", "image/png"}:
        raise ValueError("content_type must be image/jpeg or image/png")

    base64_image = base64.b64encode(image_bytes).decode("ascii")
    response = _get_client().responses.create(
        model="gpt-6.1-sol",
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": CROP_ANALYSIS_PROMPT},
                    {
                        "type": "input_image",
                        "image_url": f"data:{content_type};base64,{base64_image}",
                    },
                ],
            }
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": "crop_analysis",
                "strict": True,
                "schema": CROP_ANALYSIS_SCHEMA,
            }
        },
    )

    if not response.output_text:
        raise ValueError("The model returned no crop analysis")

    return json.loads(response.output_text)
