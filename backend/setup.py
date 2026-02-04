"""Setup script to create .env file and initialize database"""
import os

# Create .env file
env_content = """# Application
APP_NAME=Tour SaaS API
APP_ENV=development
DEBUG=True
SECRET_KEY=dev-secret-key-change-in-production-12345
API_V1_PREFIX=/api/v1

# Database (SQLite for development)
DATABASE_URL=sqlite+aiosqlite:///./tour_saas.db
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=0

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=dev-jwt-secret-key-change-in-production-67890
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Razorpay (Test mode keys - replace with your keys)
RAZORPAY_KEY_ID=rzp_test_1234567890
RAZORPAY_KEY_SECRET=test_secret_key_1234567890

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=
FROM_EMAIL=noreply@toursaas.com
FROM_NAME=Tour SaaS

# AWS (for S3 storage)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_BUCKET_NAME=

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
"""

# Write .env file
with open('.env', 'w') as f:
    f.write(env_content)

print("[OK] .env file created successfully!")
print("\nNext steps:")
print("1. Update RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env with your Razorpay credentials")
print("2. Run: python init_db.py")
print("3. Run: python create_admin.py")
print("4. Run: uvicorn app.main:app --reload")
