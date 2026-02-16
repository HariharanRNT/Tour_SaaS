
import boto3
import os
from dotenv import load_dotenv

# Load env vars from backend/.env
# Assuming script is run from project root, point to backend/.env
env_path = os.path.join(os.getcwd(), 'backend', '.env')
print(f"Loading env from {env_path}")
load_dotenv(env_path)

ACCESS_KEY = os.getenv('AWS_ACCESS_KEY_ID')
SECRET_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
REGION = os.getenv('AWS_REGION')
BUCKET = os.getenv('S3_BUCKET_NAME')

print(f"Bucket: {BUCKET}")
print(f"Region: {REGION}")
print(f"Access Key: {ACCESS_KEY[:4]}... if present")

if not all([ACCESS_KEY, SECRET_KEY, REGION, BUCKET]):
    print("ERROR: Missing AWS credentials in environment variables.")
    exit(1)

try:
    s3 = boto3.client(
        's3',
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        region_name=REGION
    )
    
    # Create valid dummy file
    file_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    
    print("Uploading test file...")
    s3.put_object(
        Bucket=BUCKET,
        Key='test_upload.png',
        Body=file_content,
        ContentType='image/png'
    )
    
    url = f"https://{BUCKET}.s3.{REGION}.amazonaws.com/test_upload.png"
    print(f"SUCCESS! File uploaded to: {url}")

except Exception as e:
    print(f"FAILED: {e}")
