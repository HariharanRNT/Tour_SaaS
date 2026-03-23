
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Body
from app.services.s3_service import s3_service
from app.api.deps import get_current_agent
from app.models import User
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    folder: str = "packages",
    current_agent: User = Depends(get_current_agent)
):
    """
    Upload a file to S3
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Validate file type (optional, but good practice)
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, and WebP are allowed.")
    
    try:
        url = await s3_service.upload_file(file, folder)
        return {"url": url}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="File upload failed")

@router.post("/presigned-url")
async def generate_presigned_url(
    file_name: str = Body(...),
    content_type: str = Body(...),
    folder: str = "packages",
    current_agent: User = Depends(get_current_agent)
):
    """
    Generate a presigned URL for direct upload to S3
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, and WebP are allowed.")
    
    try:
        data = await s3_service.generate_presigned_url(file_name, content_type, folder)
        return data
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to generate presigned URL: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate upload URL")
