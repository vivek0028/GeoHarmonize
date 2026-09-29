import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "GeoHarmonize"
    PROJECT_TAGLINE: str = "Every parcel has a history. Every decision has evidence."
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "geoharmonize-super-secret-production-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    DATA_DIR: str = os.path.join(BASE_DIR, "data")
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads")
    PROCESSED_DIR: str = os.path.join(BASE_DIR, "processed")
    REPORTS_DIR: str = os.path.join(BASE_DIR, "reports")
    
    # Native PostgreSQL + PostGIS database connection
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://geoharmonize:geoharmonize@127.0.0.1:5435/geoharmonize"
    )
    
    # Target CRS for harmonization
    TARGET_CRS: str = "EPSG:4326"
    METRIC_CRS: str = "EPSG:3857"  # for accurate area/distance calculations

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.PROCESSED_DIR, exist_ok=True)
os.makedirs(settings.REPORTS_DIR, exist_ok=True)
