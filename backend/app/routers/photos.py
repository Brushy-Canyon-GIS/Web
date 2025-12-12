"""
API routes for photo panel endpoints.
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional

from app.database import database
from app.models.photos import PhotoInfo, PhotoListResponse, PhotoDetailResponse
from app.services.photos_service import PhotosService


router = APIRouter(prefix="/photos", tags=["Photos"])


def get_service() -> PhotosService:
    """Dependency to get service instance."""
    return PhotosService(database)


@router.get(
    "",
    response_model=PhotoListResponse,
    summary="List all photos",
    description="Returns a list of all photo panels with metadata."
)
async def list_photos(
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of photos to return"),
    offset: int = Query(0, ge=0, description="Number of photos to skip"),
    name: Optional[str] = Query(None, description="Filter by name (partial match)"),
    service: PhotosService = Depends(get_service)
) -> PhotoListResponse:
    """
    Get list of all photo panels.
    
    Supports pagination and optional name filtering.
    """
    photos = await service.list_photos(limit=limit, offset=offset, name=name)
    return PhotoListResponse(photos=photos, total=len(photos))


@router.get(
    "/bbox",
    response_model=PhotoListResponse,
    summary="Get photos in bounding box",
    description="Returns photos that intersect with the specified bounding box."
)
async def get_photos_in_bbox(
    min_lng: float = Query(..., description="Minimum longitude (west)", ge=-180, le=180),
    min_lat: float = Query(..., description="Minimum latitude (south)", ge=-90, le=90),
    max_lng: float = Query(..., description="Maximum longitude (east)", ge=-180, le=180),
    max_lat: float = Query(..., description="Maximum latitude (north)", ge=-90, le=90),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of photos to return"),
    offset: int = Query(0, ge=0, description="Number of photos to skip"),
    service: PhotosService = Depends(get_service)
) -> PhotoListResponse:
    """
    Get photos within a bounding box.
    
    Coordinates should be in WGS84 (EPSG:4326).
    """
    photos = await service.get_photos_in_bbox(
        min_lng=min_lng,
        min_lat=min_lat,
        max_lng=max_lng,
        max_lat=max_lat,
        limit=limit,
        offset=offset
    )
    return PhotoListResponse(photos=photos, total=len(photos))


@router.get(
    "/{photo_id}",
    response_model=PhotoDetailResponse,
    summary="Get photo details",
    description="Returns detailed information about a specific photo."
)
async def get_photo(
    photo_id: int,
    service: PhotosService = Depends(get_service)
) -> PhotoDetailResponse:
    """
    Get detailed information about a specific photo.
    """
    photo = await service.get_photo_by_id(photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail=f"Photo with ID {photo_id} not found")
    return photo


@router.get(
    "/{photo_id}/url",
    summary="Get photo URL",
    description="Returns the URL or filename for a specific photo."
)
async def get_photo_url(
    photo_id: int,
    service: PhotosService = Depends(get_service)
):
    """
    Get the URL/hyperlink for a specific photo.
    
    Returns the photo filename or full URL if available.
    """
    url = await service.get_photo_url(photo_id)
    if not url:
        raise HTTPException(status_code=404, detail=f"Photo with ID {photo_id} not found or has no hyperlink")
    return {"photo_id": photo_id, "url": url}


@router.get("/photourl/{photo_name:path}",  summary="Get photo url",
    description="Returns the url of the photo by its name")
async def get_photo_url_by_name(
    photo_name: str,
    service: PhotosService = Depends(get_service)
):
    url =  await service.get_photo_by_name(photo_name)
    if not url:
        raise HTTPException(status_code=404, detail=f"Photo with name {photo_name} not found")
    return {"photo_name": photo_name, "url": url}