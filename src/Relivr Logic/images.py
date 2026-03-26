# app/routes/images.py
import logging
from typing import List
from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse
from fastapi import APIRouter, Body, HTTPException

# Import services
from ..services.theme_style import get_theme_bg_style
from ..services.image_organizer import image_organizer
# from ..services import auth_service  # Uncomment if authentication is required

# Initialize logger
logger = logging.getLogger("gunicorn.error")

router = APIRouter()

@router.post("/api/v1/theme/style")
async def api_v1_theme_style(
    theme: str = Body(..., description="Specify the theme (e.g., Travel & Vacation, Family & Friendship, Seasons & Nature):"),
    user_input: str = Body(..., description="Provide a user-defined style for the theme (e.g., Retro, Modern, Classic):"),
    # token: str = Depends(auth_service.oauth2_scheme)  # Uncomment if authentication is required
):
    try:
        result, total_requests, total_cost, total_tokens_used = await get_theme_bg_style(theme, user_input)
        return JSONResponse(content={"status": "success", "result": result, "total_requests":total_requests, "total_cost":total_cost, "total_tokens_used":total_tokens_used})
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={"status": "error", "error": e.detail}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "error": f"Internal Server Error: {str(e)}"}
        )

class ImageData(BaseModel):
    id: int = Field(
        default=1,
        description="Unique identifier for the image. Defaults to 1 if not provided.",
        example=1
    )
    image: str = Field(
        ...,
        description="URL of the image. This field is required.",
        example="http://example.com/image1.jpg"
    )
    is_cover: bool = Field(
        default=False,
        description="Indicates if the image is a cover image. Defaults to False.",
        example=False
    )
    is_back: bool = Field(
        default=False,
        description="Indicates if the image is a back image. Defaults to False.",
        example=False
    )

@router.post("/api/v1/images/reorder")
async def api_v1_images_reorder(
    theme: str = Body(..., description="Specify the theme (e.g., Travel & Vacation, Family & Friendship, Seasons & Nature):"),
    images: List[ImageData] = Body(..., description="List of image data"),
    page_size: str = Body('A4', description="Specify the page size (A3, A4, or A5)"),
    layout_width: int = Body(3508, description="Width of the background size in pixels. Example: 2480 (for A4 at 300 DPI)"),
    layout_height: int = Body(2480, description="Height of the background size in pixels. Example: 3508 (for A4 at 300 DPI)"),
    #token: str = Depends(auth_service.oauth2_scheme)
):
    try:
        # Convert Pydantic models to dictionaries
        images = [img.dict() for img in images]

        # Call the image organizer service
        pages, total_requests, total_cost, total_tokens_used = await image_organizer(theme, page_size, layout_width, layout_height, images)

        logger.info("api_v1_images_reorder pages: %s", pages)
        return JSONResponse(content={"status": "success", "pages": pages, "total_requests":total_requests, "total_cost":total_cost, "total_tokens_used":total_tokens_used})
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={"status": "error", "error": e.detail}
        )
    except ValueError as e:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "error": f"Invalid input: {str(e)}"}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "error": f"Internal Server Error: {str(e)}"}
        )
