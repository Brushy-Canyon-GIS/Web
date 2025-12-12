"""
Pydantic models for geologic data API requests and responses.
"""
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional


class BoundingBox(BaseModel):
    """
    Geographic bounding box for spatial queries.
    Coordinates in WGS84 (EPSG:4326)
    """
    min_lng: float = Field(..., description="Minimum longitude (west)", ge=-180, le=180)
    min_lat: float = Field(..., description="Minimum latitude (south)", ge=-90, le=90)
    max_lng: float = Field(..., description="Maximum longitude (east)", ge=-180, le=180)
    max_lat: float = Field(..., description="Maximum latitude (north)", ge=-90, le=90)


class FilterParams(BaseModel):
    """
    Query parameters for filtering geologic features.
    """
    # Pagination
    limit: Optional[int] = Field(None, ge=1, description="Maximum number of features to return (None = no limit)")
    offset: int = Field(0, description="Number of features to skip", ge=0)
    
    # Spatial filter
    bbox: Optional[str] = Field(None, description="Bounding box: min_lng,min_lat,max_lng,max_lat")
    
    # Property filters (dynamic based on table)
    name: Optional[str] = Field(None, description="Filter by name (case-insensitive partial match)")
    map_symbol: Optional[str] = Field(None, description="Filter by map symbol")
    feature_type: Optional[str] = Field(None, description="Filter by feature type")
    region: Optional[str] = Field(None, description="Filter by region")
    fan_id: Optional[int] = Field(None, description="Filter by fan ID")


class GeoJSONFeature(BaseModel):
    """
    A single GeoJSON feature with geometry and properties.
    """
    type: str = "Feature"
    geometry: Optional[Dict[str, Any]] = Field(None, description="GeoJSON geometry object")
    properties: Dict[str, Any] = Field(default_factory=dict, description="Feature properties")


class GeoJSONFeatureCollection(BaseModel):
    """
    GeoJSON FeatureCollection response.
    """
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = Field(
        None, 
        description="Additional metadata about the collection"
    )


class TableInfo(BaseModel):
    """
    Information about a geologic data table.
    """
    name: str = Field(..., description="Table name")
    display_name: str = Field(..., description="Human-readable table name")
    feature_count: int = Field(..., description="Total number of features")
    geometry_type: Optional[str] = Field(None, description="Geometry type (POINT, LINESTRING, POLYGON, etc.)")
    description: Optional[str] = Field(None, description="Table description")


class TableListResponse(BaseModel):
    """
    Response containing list of available tables.
    """
    tables: List[TableInfo] = Field(default_factory=list)
    total: int = Field(..., description="Total number of tables")

