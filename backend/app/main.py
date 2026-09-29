from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.connection import init_db
from app.api import auth, datasets, parcels, matching, conflicts, map, processing, reports, audit, imagery

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="GeoHarmonize: Every parcel has a history. Every decision has evidence. Multi-source spatial conflation, AI matching, topology validation, and conflict resolution.",
    version="2.0.0"
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Database & Seed data
@app.on_event("startup")
def on_startup():
    init_db()

# Mount API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(datasets.router, prefix=settings.API_V1_STR)
app.include_router(parcels.router, prefix=settings.API_V1_STR)
app.include_router(matching.router, prefix=settings.API_V1_STR)
app.include_router(conflicts.router, prefix=settings.API_V1_STR)
app.include_router(map.router, prefix=settings.API_V1_STR)
app.include_router(processing.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(imagery.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "product": settings.PROJECT_NAME,
        "tagline": settings.PROJECT_TAGLINE,
        "status": "operational",
        "api_docs": "/docs",
        "version": "1.0.0"
    }

@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "GeoHarmonize Backend", "postgis": "active"}
