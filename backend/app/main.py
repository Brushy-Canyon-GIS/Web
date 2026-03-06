from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from .database import database
from .config import settings
from .routers import geologic_router, photos_router, cross_plot_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    Tolerates database connection failures so non-DB endpoints (e.g. cross plots)
    work when Postgres/Supabase is unreachable.
    """
    # Startup
    try:
        await database.connect()
        print("Database connected")
    except Exception as exc:
        print(f"WARNING: Database connection failed (continuing without DB): {exc}")
    yield
    # Shutdown
    try:
        await database.disconnect()
        print("Database disconnected")
    except Exception as exc:
        print(f"WARNING: Database disconnect failed: {exc}")


# Initialize FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API for serving geologic data as GeoJSON for interactive mapping",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    # allow_origins=settings.cors_origins,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(geologic_router, prefix=settings.api_v1_prefix)
app.include_router(photos_router, prefix=settings.api_v1_prefix)
app.include_router(cross_plot_router, prefix=settings.api_v1_prefix)

@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint - returns API information.
    """
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "description": "Geologic Data API for Brushy Canyon Formation study",
        "endpoints": {
            "docs": "/docs",
            "api": settings.api_v1_prefix,
            "tables": f"{settings.api_v1_prefix}/geologic/tables"
            "crossplots:" f"{settings.api_v1_prefix}/crossplots/{{section_name}}",
        }
    }

@app.get("/crossplot", tags=["Crossplot"])
async def crossplot():
    """
    Crossplot endpoint - returns API information.
    """
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "description": "Geologic Data API for Bell Canyon Formation study",
        "endpoints": {
            "docs": "/docs",
            "api": settings.api_v1_prefix,
            "tables": f"{settings.api_v1_prefix}/geologic/tables",
            "crossplots": f"{settings.api_v1_prefix}/crossplots/{{section_name}}",
        }
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    """
    try:
        # Test database connection
        await database.fetch_one("SELECT 1")
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }


# Legacy endpoint for backward compatibility (atlas_maps)
@app.get("/atlas_maps", tags=["Legacy"])
async def get_atlas_maps():
    """
    Legacy endpoint for atlas_maps data (for backward compatibility).
    
    Consider using /api/v1/geologic/atlas_maps instead.
    """
    query = """
    SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', json_agg(
            json_build_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(geometry)::json,
                'properties', json_build_object(
                    'OBJECTID', "OBJECTID",
                    'Name', "Name",
                    'ID', "ID",
                    'MAP_SYMBOL', "MAP_SYMBOL",
                    'Shape_Length', "Shape_Length"
                )
            )
        )
    ) AS geojson
    FROM atlas_maps;
    """
    result = await database.fetch_one(query)
    
    if result and result["geojson"]:
        return result["geojson"]
    
    # Return empty FeatureCollection if no data
    return {
        "type": "FeatureCollection",
        "features": []
    }
