from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Base de datos
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/agencias_db"
    REDIS_URL: str = "redis://localhost:6379"
    
    # Seguridad
    SECRET_KEY: str = "tu-super-secret-key-cambiar-en-produccion"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    MAGIC_LINK_EXPIRE_MINUTES: int = 15
    
    # AWS S3
    AWS_BUCKET_NAME: str = ""
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    
    # Email
    RESEND_API_KEY: Optional[str] = None
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Stripe
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    
    class Config:
        env_file = ".env"

settings = Settings()