"""
API routes for geologic data endpoints.
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional

from app.database import database
from app.models.geologic import (
    FilterParams,
    GeoJSONFeatureCollection,
    TableListResponse,
    TableInfo
)
from app.services.geologic_service import GeologicDataService


router = APIRouter(prefix="/geologic", tags=["Geologic Data"])


def get_service() -> GeologicDataService:
    """Dependency to get service instance."""
    return GeologicDataService(database)


@router.get(
    "/tables",
    response_model=TableListResponse,
    summary="List all available geologic data tables",
    description="Returns a list of all available geologic data tables with metadata."
)
async def list_tables(
    service: GeologicDataService = Depends(get_service)
) -> TableListResponse:
    """
    Get list of all available geologic data tables.
    """
    tables = await service.get_available_tables()
    return TableListResponse(tables=tables, total=len(tables))


@router.get(
    "/tables/{table_name}",
    response_model=TableInfo,
    summary="Get information about a specific table",
    description="Returns detailed information about a specific geologic data table."
)
async def get_table_info(
    table_name: str,
    service: GeologicDataService = Depends(get_service)
) -> TableInfo:
    """
    Get information about a specific table.
    """
    info = await service.get_table_info(table_name)
    if not info:
        raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")
    return info


@router.get(
    "/{table_name}",
    summary="Get all features from a table",
    description="Returns all features from the specified table as GeoJSON. Supports pagination.",
    response_description="GeoJSON FeatureCollection"
)
async def get_features(
    table_name: str,
    limit: Optional[int] = Query(None, ge=1, description="Maximum number of features to return (None = no limit)"),
    offset: int = Query(0, ge=0, description="Number of features to skip"),
    service: GeologicDataService = Depends(get_service)
):
    """
    Get all features from a geologic data table.
    
    Returns GeoJSON FeatureCollection format.
    """
    try:
        filters = FilterParams(limit=limit, offset=offset)
        result = await service.get_features_geojson(table_name, filters)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error querying table: {str(e)}")


@router.get(
    "/{table_name}/filter",
    summary="Filter features with query parameters",
    description="Returns filtered features from the specified table as GeoJSON. "
                "Supports filtering by properties and spatial bounding box.",
    response_description="GeoJSON FeatureCollection"
)
async def filter_features(
    table_name: str,
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of features to return"),
    offset: int = Query(0, ge=0, description="Number of features to skip"),
    bbox: Optional[str] = Query(
        None, 
        description="Bounding box: min_lng,min_lat,max_lng,max_lat (e.g., -104.5,31.5,-103.5,32.5)",
        example="-104.5,31.5,-103.5,32.5"
    ),
    name: Optional[str] = Query(None, description="Filter by name (case-insensitive partial match)"),
    map_symbol: Optional[str] = Query(None, description="Filter by map symbol"),
    feature_type: Optional[str] = Query(None, description="Filter by feature type"),
    region: Optional[str] = Query(None, description="Filter by region"),
    fan_id: Optional[int] = Query(None, description="Filter by fan ID"),
    service: GeologicDataService = Depends(get_service)
):
    """
    Get filtered features from a geologic data table.
    
    Supports multiple filter types:
    - Spatial filtering via bounding box
    - Property-based filtering (name, map_symbol, feature_type, region, fan_id)
    - Pagination (limit, offset)
    
    Returns GeoJSON FeatureCollection format.
    """
    try:
        filters = FilterParams(
            limit=limit,
            offset=offset,
            bbox=bbox,
            name=name,
            map_symbol=map_symbol,
            feature_type=feature_type,
            region=region,
            fan_id=fan_id
        )
        result = await service.get_features_geojson(table_name, filters)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error filtering table: {str(e)}")


@router.get(
    "/{table_name}/bbox",
    summary="Query features within a bounding box",
    description="Returns features that intersect with the specified bounding box.",
    response_description="GeoJSON FeatureCollection"
)
async def get_features_in_bbox(
    table_name: str,
    min_lng: float = Query(..., description="Minimum longitude (west)", ge=-180, le=180),
    min_lat: float = Query(..., description="Minimum latitude (south)", ge=-90, le=90),
    max_lng: float = Query(..., description="Maximum longitude (east)", ge=-180, le=180),
    max_lat: float = Query(..., description="Maximum latitude (north)", ge=-90, le=90),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of features to return"),
    offset: int = Query(0, ge=0, description="Number of features to skip"),
    service: GeologicDataService = Depends(get_service)
):
    """
    Get features within a bounding box.
    
    This is a convenience endpoint for spatial queries.
    Returns all features that intersect with the specified bounding box.
    
    Coordinates should be in WGS84 (EPSG:4326).
    """
    try:
        bbox_str = f"{min_lng},{min_lat},{max_lng},{max_lat}"
        filters = FilterParams(
            limit=limit,
            offset=offset,
            bbox=bbox_str
        )
        result = await service.get_features_geojson(table_name, filters)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error querying bounding box: {str(e)}")

