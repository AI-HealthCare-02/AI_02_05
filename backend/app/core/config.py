from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    OPENAI_API_KEY: str
    CLOVA_OCR_URL: str
    CLOVA_OCR_SECRET: str
    AWS_ACCESS_KEY: str
    AWS_SECRET_KEY: str
    AWS_REGION: str = "ap-northeast-2"
    S3_BUCKET: str
    S3_PRESIGNED_EXPIRY: int = 300

    KAKAO_REST_API_KEY: str
    KAKAO_CLIENT_SECRET: str = ""
    KAKAO_REDIRECT_URI: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_EXPIRE_DAYS: int = 30

    DEBUG: bool = False

    class Config:
        env_file = ".env"


settings = Settings()
