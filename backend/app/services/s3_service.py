
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
        self.aws_access_key = settings.AWS_ACCESS_KEY_ID
        self.aws_secret_key = settings.AWS_SECRET_ACCESS_KEY
        self.region_name = settings.AWS_REGION
        self.bucket_name = settings.S3_BUCKET_NAME

        if not self.aws_access_key or not self.aws_secret_key:
            logger.warning("AWS credentials not found. S3 upload will be disabled.")
            self.s3_client = None
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
                logger.error(f"Failed to initialize S3 client: {e}")
                self.s3_client = None

    async def upload_file(self, file: UploadFile, folder: str = "packages") -> str:
        """
        Upload a file to S3 and return the public URL
        """
        if not self.s3_client:
            raise HTTPException(status_code=500, detail="S3 service not configured")
        
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
            # Standard S3 URL format: https://bucket-name.s3.region.amazonaws.com/key
            url = f"https://{self.bucket_name}.s3.{self.region_name}.amazonaws.com/{unique_filename}"
            
            return url
            
        except ClientError as e:
            logger.error(f"S3 Upload Error: {e}")
            raise HTTPException(status_code=500, detail=f"S3 Upload Failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unknown Upload Error: {e}")
            raise HTTPException(status_code=500, detail=f"Upload Failed: {str(e)}")

    async def generate_presigned_url(self, file_name: str, content_type: str, folder: str = "packages") -> dict:
        """
        Generate a presigned URL for direct upload to S3
        """
        if not self.s3_client:
            raise HTTPException(status_code=500, detail="S3 service not configured")
        
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
