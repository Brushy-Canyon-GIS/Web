"""
API routes for photo panel endpoints.
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional

from app.database import database
from app.models.photos import (
    PhotoInfo, 
    PhotoListResponse, 
    PhotoDetailResponse,
    StoragePhoto,
    StoragePhotoListResponse
)
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


# ==================== Storage Photos Endpoints ====================

@router.get(
    "/storage/list",
    response_model=StoragePhotoListResponse,
    summary="List all photos from storage",
    description="Returns all photos from Supabase storage with full URLs for frontend display."
)
async def list_storage_photos(
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of photos to return"),
    offset: int = Query(0, ge=0, description="Number of photos to skip"),
    filename: Optional[str] = Query(None, description="Filter by filename (partial match)"),
    service: PhotosService = Depends(get_service)
) -> StoragePhotoListResponse:
    """
    Get list of all photos from storage with full URLs.
    
    These are the actual photo files stored in Supabase storage.
    Use the 'url' field to display images in the frontend.
    """
    photos = await service.list_storage_photos(limit=limit, offset=offset, filename=filename)
    total = await service.get_storage_photos_count()
    return StoragePhotoListResponse(photos=photos, total=total)


@router.get(
    "/storage/{photo_id}",
    response_model=StoragePhoto,
    summary="Get storage photo by ID",
    description="Returns a specific photo from storage by UUID."
)
async def get_storage_photo(
    photo_id: str,
    service: PhotosService = Depends(get_service)
) -> StoragePhoto:
    """
    Get a specific photo from storage by UUID.
    
    Returns the full URL for frontend display.
    """
    photo = await service.get_storage_photo_by_id(photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail=f"Photo with ID {photo_id} not found in storage")
    return photo


@router.get(
    "/storage/filename/{filename}",
    response_model=StoragePhoto,
    summary="Get storage photo by filename",
    description="Returns a specific photo from storage by filename."
)
async def get_storage_photo_by_filename(
    filename: str,
    service: PhotosService = Depends(get_service)
) -> StoragePhoto:
    """
    Get a specific photo from storage by filename.
    
    Useful for linking photo_panels.Hyperlink to actual photo URLs.
    """
    photo = await service.get_storage_photo_by_filename(filename)
    if not photo:
        raise HTTPException(status_code=404, detail=f"Photo '{filename}' not found in storage")
    return photo

