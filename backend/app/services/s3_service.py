
import boto3
from botocore.exceptions import NoCredentialsError, ClientError
import logging
from app.config import settings
from fastapi import UploadFile, HTTPException
import uuid
import os

logger = logging.getLogger(__name__)

class S3Service:
    def __init__(self):
        self.use_s3 = settings.USE_S3
        self.aws_access_key = settings.AWS_ACCESS_KEY_ID
        self.aws_secret_key = settings.AWS_SECRET_ACCESS_KEY
        self.region_name = settings.AWS_REGION
        self.bucket_name = settings.S3_BUCKET_NAME
        self.upload_dir = settings.UPLOAD_DIR
        self.api_url = settings.API_URL

        self.s3_client = None
        
        if self.use_s3:
            if not self.aws_access_key or not self.aws_secret_key:
                logger.warning("AWS credentials not found. S3 upload will be disabled, falling back to local storage.")
                self.use_s3 = False
            else:
                try:
                    self.s3_client = boto3.client(
                        's3',
                        aws_access_key_id=self.aws_access_key,
                        aws_secret_access_key=self.aws_secret_key,
                        region_name=self.region_name
                    )
                    logger.info("S3 Client initialized successfully")
                except Exception as e:
                    logger.error(f"Failed to initialize S3 client: {e}. Falling back to local storage.")
                    self.use_s3 = False

    async def upload_file(self, file: UploadFile, folder: str = "packages") -> str:
        """
        Upload a file and return the access URL
        """
        if self.use_s3 and self.s3_client:
            return await self._upload_to_s3(file, folder)
        else:
            return await self._upload_to_local(file, folder)

    async def _upload_to_s3(self, file: UploadFile, folder: str = "packages") -> str:
        if not self.bucket_name:
             raise HTTPException(status_code=500, detail="S3 bucket name not configured")

        try:
            # Generate unique filename
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{folder}/{uuid.uuid4()}{file_extension}"
            
            # Upload file
            self.s3_client.upload_fileobj(
                file.file,
                self.bucket_name,
                unique_filename,
                ExtraArgs={
                    "ContentType": file.content_type
                }
            )
            
            # Construct URL
            url = f"https://{self.bucket_name}.s3.{self.region_name}.amazonaws.com/{unique_filename}"
            return url
            
        except ClientError as e:
            logger.error(f"S3 Upload Error: {e}")
            # If S3 upload fails due to credentials, fall back to local in development
            if "InvalidAccessKeyId" in str(e) or "SignatureDoesNotMatch" in str(e):
                 logger.warning("S3 credentials invalid, falling back to local storage for this request.")
                 return await self._upload_to_local(file, folder)
            raise HTTPException(status_code=500, detail=f"S3 Upload Failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unknown Upload Error: {e}")
            raise HTTPException(status_code=500, detail=f"Upload Failed: {str(e)}")

    async def _upload_to_local(self, file: UploadFile, folder: str = "packages") -> str:
        """
        Save file to local filesystem
        """
        try:
            # Create full path for folder
            target_folder = os.path.join(self.upload_dir, folder)
            if not os.path.exists(target_folder):
                os.makedirs(target_folder, exist_ok=True)
            
            # Generate unique filename
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(target_folder, unique_filename)
            
            # Save the file
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            # Construct URL (relative to static mount)
            # URL will be: http://host:port/static/uploads/folder/filename
            # Assuming main.py mounts settings.UPLOAD_DIR to /static/uploads
            url = f"{self.api_url}/{self.upload_dir}/{folder}/{unique_filename}"
            return url
            
        except Exception as e:
            logger.error(f"Local Upload Error: {e}")
            raise HTTPException(status_code=500, detail=f"Local Upload Failed: {str(e)}")

    async def generate_presigned_url(self, file_name: str, content_type: str, folder: str = "packages") -> dict:
        """
        Generate a presigned URL for direct upload to S3.
        If using local storage, this returns an error as direct upload is not supported.
        """
        if not self.use_s3 or not self.s3_client:
             raise HTTPException(status_code=400, detail="Presigned URL is only support with S3. Use /upload endpoint instead.")
        
        try:
            # Generate unique filename
            file_extension = os.path.splitext(file_name)[1]
            unique_filename = f"{folder}/{uuid.uuid4()}{file_extension}"
            
            # Generate the presigned URL for PUT operation
            presigned_url = self.s3_client.generate_presigned_url(
                ClientMethod='put_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': unique_filename,
                    'ContentType': content_type
                },
                ExpiresIn=3600  # URL expires in 1 hour
            )
            
            # Construct final public URL
            file_url = f"https://{self.bucket_name}.s3.{self.region_name}.amazonaws.com/{unique_filename}"
            
            return {
                "upload_url": presigned_url,
                "file_url": file_url,
                "key": unique_filename
            }
            
        except ClientError as e:
            logger.error(f"S3 Presigned URL Error: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to generate presigned URL: {str(e)}")
        except Exception as e:
            logger.error(f"Unknown Presigned URL Error: {e}")
            raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

# Singleton instance
s3_service = S3Service()
