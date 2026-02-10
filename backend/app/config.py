"""Application configuration settings"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Tour SaaS API"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str
    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 0
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Razorpay
    # Razorpay
    RAZORPAY_KEY_ID: str = "rzp_test_1234567890"
    RAZORPAY_KEY_SECRET: str = "test_secret_key_1234567890"

    # Razorpay - Subscriptions (Agent B2B)
    RAZORPAY_SUBSCRIPTION_KEY_ID: str = "rzp_test_1234567890"
    RAZORPAY_SUBSCRIPTION_KEY_SECRET: str = "test_secret_key_1234567890"

    # Razorpay - Bookings (Customer B2C)
    RAZORPAY_BOOKING_KEY_ID: str = "rzp_test_1234567890"
    RAZORPAY_BOOKING_KEY_SECRET: str = "test_secret_key_1234567890"
    
    # Amadeus Tours & Activities API
    AMADEUS_CLIENT_ID: str
    AMADEUS_CLIENT_SECRET: str
    AMADEUS_BASE_URL: str = "https://test.api.amadeus.com"
    
    # Geoapify Geocoding API
    GEOAPIFY_API_KEY: str
    
    # TripJack Flight API
    TRIPJACK_API_KEY: str
    TRIPJACK_BASE_URL: str = "https://apitest.tripjack.com"
    
    # Redis Cache
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    # Email
    EMAIL_PROVIDER: str = "smtp"
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "arunpandianreshandthosh2022@gmail.com"
    SMTP_PASSWORD: str = "ughyudissonfgngt"
    FROM_EMAIL: str = "arunpandianreshandthosh2022@gmail.com"
    FROM_NAME: str = "Tour SaaS"
    
    # AWS
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = ""
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://agent.local:3000"
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Google Gemini AI
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-1.5-pro"
    
    # Pexels API
    PEXELS_API_KEY: str
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
