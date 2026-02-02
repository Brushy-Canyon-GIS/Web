"""
Pydantic models for photos API requests and responses.
"""
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional


class PhotoInfo(BaseModel):
    """
    Information about a single photo panel.
    """
    id: int = Field(..., description="Photo ID")
    name: str = Field(..., description="Photo panel name")
    hyperlink: Optional[str] = Field(None, description="Photo filename or URL")
    map_symbol: Optional[str] = Field(None, description="Map symbol code")
    strat_interval: Optional[str] = Field(None, description="Stratigraphic interval")
    feature_type: Optional[str] = Field(None, description="Feature type")
    length: Optional[float] = Field(None, description="Photo panel length")
    geometry: Optional[Dict[str, Any]] = Field(None, description="GeoJSON geometry")


class PhotoListResponse(BaseModel):
    """
    Response containing list of photos.
    """
    photos: List[PhotoInfo] = Field(default_factory=list)
    total: int = Field(..., description="Total number of photos returned")


class PhotoDetailResponse(BaseModel):
    """
    Detailed response for a single photo.
    """
    id: int = Field(..., description="Photo ID")
    name: str = Field(..., description="Photo panel name")
    hyperlink: Optional[str] = Field(None, description="Photo filename or URL")
    full_url: Optional[str] = Field(None, description="Full URL to photo if available")
    map_symbol: Optional[str] = Field(None, description="Map symbol code")
    strat_interval: Optional[str] = Field(None, description="Stratigraphic interval")
    feature_type: Optional[str] = Field(None, description="Feature type")
    length: Optional[float] = Field(None, description="Photo panel length")
    geometry: Optional[Dict[str, Any]] = Field(None, description="GeoJSON geometry")
    properties: Dict[str, Any] = Field(default_factory=dict, description="All properties")