"""
Service layer for photo panel operations.
Provides specialized access to photo_panels table.
"""
from typing import Dict, List, Optional, Any
from databases import Database
import json

from app.models.photos import PhotoInfo, PhotoDetailResponse, StoragePhoto
from app.config import settings


class PhotosService:
    """
    Service for handling photo panel queries and operations.
    """
    
    TABLE_NAME = "photo_panels"
    
    def __init__(self, database: Database):
        """
        Initialize the service with a database connection.
        
        Args:
            database: Database instance
        """
        self.db = database
    
    async def get_geometry_column(self) -> str:
        """Get the geometry column name for photo_panels table."""
        query = """
        SELECT f_geometry_column 
        FROM geometry_columns 
        WHERE f_table_schema = 'public' 
        AND f_table_name = :table_name
        LIMIT 1
        """
        result = await self.db.fetch_one(query, values={"table_name": self.TABLE_NAME})
        return result['f_geometry_column'] if result else 'geometry'
    
    async def list_photos(
        self,
        limit: int = 100,
        offset: int = 0,
        name: Optional[str] = None
    ) -> List[PhotoInfo]:
        """
        Get list of all photo panels.
        
        Args:
            limit: Maximum number of photos to return
            offset: Number of photos to skip
            name: Optional name filter (partial match)
            
        Returns:
            List of PhotoInfo objects
        """
        geom_col = await self.get_geometry_column()
        
        where_clause = ""
        params = {"limit": limit, "offset": offset}
        
        if name:
            where_clause = 'WHERE LOWER("NAME") LIKE LOWER(:name_pattern) OR LOWER("PM_NAME") LIKE LOWER(:name_pattern)'
            params["name_pattern"] = f"%{name}%"
        
        query = f"""
        SELECT 
            "ID" as id,
            COALESCE("NAME", "PM_NAME", 'Unknown') as name,
            "Hyperlink" as hyperlink,
            "MAPSYMBOL" as map_symbol,
            "STRAT_INTE" as strat_interval,
            "FEATURETYP" as feature_type,
            "LENGTH" as length,
            ST_AsGeoJSON("{geom_col}")::json as geometry
        FROM "{self.TABLE_NAME}"
        {where_clause}
        ORDER BY "ID"
        LIMIT :limit OFFSET :offset
        """
        
        results = await self.db.fetch_all(query, values=params)
        
        photos = []
        for row in results:
            # Parse geometry if it's a string
            geometry = row['geometry']
            if isinstance(geometry, str):
                geometry = json.loads(geometry)
            
            photos.append(PhotoInfo(
                id=row['id'],
                name=row['name'] or 'Unknown',
                hyperlink=row['hyperlink'],
                map_symbol=row['map_symbol'],
                strat_interval=row['strat_interval'],
                feature_type=row['feature_type'],
                length=row['length'],
                geometry=geometry
            ))
        
        return photos
    
    async def get_photo_by_id(self, photo_id: int) -> Optional[PhotoDetailResponse]:
        """
        Get detailed information about a specific photo.
        
        Args:
            photo_id: The photo ID
            
        Returns:
            PhotoDetailResponse or None if not found
        """
        geom_col = await self.get_geometry_column()
        
        query = f"""
        SELECT 
            "ID" as id,
            COALESCE("NAME", "PM_NAME", 'Unknown') as name,
            "Hyperlink" as hyperlink,
            "MAPSYMBOL" as map_symbol,
            "STRAT_INTE" as strat_interval,
            "FEATURETYP" as feature_type,
            "LENGTH" as length,
            ST_AsGeoJSON("{geom_col}")::json as geometry,
            row_to_json(t.*)::jsonb - '{geom_col}' as properties
        FROM "{self.TABLE_NAME}" t
        WHERE "ID" = :photo_id
        """
        
        result = await self.db.fetch_one(query, values={"photo_id": photo_id})
        
        if not result:
            return None
        
        # Parse properties if it's a string
        properties = result['properties']
        if isinstance(properties, str):
            properties = json.loads(properties)
        
        # Parse geometry if it's a string
        geometry = result['geometry']
        if isinstance(geometry, str):
            geometry = json.loads(geometry)
        
        return PhotoDetailResponse(
            id=result['id'],
            name=result['name'] or 'Unknown',
            hyperlink=result['hyperlink'],
            full_url=self._build_photo_url(result['hyperlink']),
            map_symbol=result['map_symbol'],
            strat_interval=result['strat_interval'],
            feature_type=result['feature_type'],
            length=result['length'],
            geometry=geometry,
            properties=properties or {}
        )
    
    async def get_photos_in_bbox(
        self,
        min_lng: float,
        min_lat: float,
        max_lng: float,
        max_lat: float,
        limit: int = 100,
        offset: int = 0
    ) -> List[PhotoInfo]:
        """
        Get photos within a bounding box.
        
        Args:
            min_lng: Minimum longitude (west)
            min_lat: Minimum latitude (south)
            max_lng: Maximum longitude (east)
            max_lat: Maximum latitude (north)
            limit: Maximum number of photos to return
            offset: Number of photos to skip
            
        Returns:
            List of PhotoInfo objects
        """
        geom_col = await self.get_geometry_column()
        
        query = f"""
        SELECT 
            "ID" as id,
            COALESCE("NAME", "PM_NAME", 'Unknown') as name,
            "Hyperlink" as hyperlink,
            "MAPSYMBOL" as map_symbol,
            "STRAT_INTE" as strat_interval,
            "FEATURETYP" as feature_type,
            "LENGTH" as length,
            ST_AsGeoJSON("{geom_col}")::json as geometry
        FROM "{self.TABLE_NAME}"
        WHERE ST_Intersects(
            "{geom_col}",
            ST_MakeEnvelope(:min_lng, :min_lat, :max_lng, :max_lat, 4326)
        )
        ORDER BY "ID"
        LIMIT :limit OFFSET :offset
        """
        
        params = {
            "min_lng": min_lng,
            "min_lat": min_lat,
            "max_lng": max_lng,
            "max_lat": max_lat,
            "limit": limit,
            "offset": offset
        }
        
        results = await self.db.fetch_all(query, values=params)
        
        photos = []
        for row in results:
            # Parse geometry if it's a string
            geometry = row['geometry']
            if isinstance(geometry, str):
                geometry = json.loads(geometry)
            
            photos.append(PhotoInfo(
                id=row['id'],
                name=row['name'] or 'Unknown',
                hyperlink=row['hyperlink'],
                map_symbol=row['map_symbol'],
                strat_interval=row['strat_interval'],
                feature_type=row['feature_type'],
                length=row['length'],
                geometry=geometry
            ))
        
        return photos
    
    async def get_photo_url(self, photo_id: int) -> Optional[str]:
        """
        Get the URL/hyperlink for a specific photo.
        
        Args:
            photo_id: The photo ID
            
        Returns:
            Photo URL/filename or None if not found
        """
        query = f"""
        SELECT "Hyperlink" as hyperlink
        FROM "{self.TABLE_NAME}"
        WHERE "ID" = :photo_id
        """
        
        result = await self.db.fetch_one(query, values={"photo_id": photo_id})
        
        if not result or not result['hyperlink']:
            return None
        
        return self._build_photo_url(result['hyperlink'])
    
    def _build_photo_url(self, hyperlink: Optional[str]) -> Optional[str]:
        """
        Build a full URL from the hyperlink field.
        
        Uses Supabase storage base URL to construct full photo URLs.
        
        Args:
            hyperlink: The hyperlink value from the database
            
        Returns:
            Full URL or None
        """
        if not hyperlink:
            return None
        
        # If it's already a full URL, return as-is
        if hyperlink.startswith(('http://', 'https://')):
            return hyperlink
        
        # Build full URL using Supabase storage
        return f"{settings.supabase_storage_url}/{hyperlink}"
    
    async def get_total_count(self) -> int:
        """Get total number of photos."""
        query = f'SELECT COUNT(*) as count FROM "{self.TABLE_NAME}"'
        result = await self.db.fetch_one(query)
        return result['count'] if result else 0
    
    # ==================== Storage Photos Methods ====================
    
    async def list_storage_photos(
        self,
        limit: int = 100,
        offset: int = 0,
        filename: Optional[str] = None
    ) -> List[StoragePhoto]:
        """
        Get list of all photos from the storage table with full URLs.
        
        Args:
            limit: Maximum number of photos to return
            offset: Number of photos to skip
            filename: Optional filename filter (partial match)
            
        Returns:
            List of StoragePhoto objects with full URLs
        """
        where_clause = ""
        params = {"limit": limit, "offset": offset}
        
        if filename:
            where_clause = "WHERE LOWER(filename) LIKE LOWER(:filename_pattern)"
            params["filename_pattern"] = f"%{filename}%"
        
        query = f"""
        SELECT 
            id::text as id,
            filename,
            url,
            created_at::text as created_at
        FROM photos
        {where_clause}
        ORDER BY filename
        LIMIT :limit OFFSET :offset
        """
        
        results = await self.db.fetch_all(query, values=params)
        
        photos = []
        for row in results:
            photos.append(StoragePhoto(
                id=row['id'],
                filename=row['filename'],
                url=row['url'],
                created_at=row['created_at']
            ))
        
        return photos
    
    async def get_storage_photo_by_id(self, photo_id: str) -> Optional[StoragePhoto]:
        """
        Get a specific photo from storage by UUID.
        
        Args:
            photo_id: The photo UUID
            
        Returns:
            StoragePhoto or None if not found
        """
        query = """
        SELECT 
            id::text as id,
            filename,
            url,
            created_at::text as created_at
        FROM photos
        WHERE id::text = :photo_id
        """
        
        result = await self.db.fetch_one(query, values={"photo_id": photo_id})
        
        if not result:
            return None
        
        return StoragePhoto(
            id=result['id'],
            filename=result['filename'],
            url=result['url'],
            created_at=result['created_at']
        )
    
    async def get_storage_photo_by_filename(self, filename: str) -> Optional[StoragePhoto]:
        """
        Get a specific photo from storage by filename.
        
        Args:
            filename: The photo filename
            
        Returns:
            StoragePhoto or None if not found
        """
        query = """
        SELECT 
            id::text as id,
            filename,
            url,
            created_at::text as created_at
        FROM photos
        WHERE LOWER(filename) = LOWER(:filename)
        """
        
        result = await self.db.fetch_one(query, values={"filename": filename})
        
        if not result:
            return None
        
        return StoragePhoto(
            id=result['id'],
            filename=result['filename'],
            url=result['url'],
            created_at=result['created_at']
        )
    
    async def get_storage_photos_count(self) -> int:
        """Get total number of photos in storage."""
        query = "SELECT COUNT(*) as count FROM photos"
        result = await self.db.fetch_one(query)
        return result['count'] if result else 0

