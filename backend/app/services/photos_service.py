import json
from typing import List, Optional
from databases import Database
from app.models.photos import PhotoInfo, PhotoDetailResponse


class PhotosService:
    """
    Service for handling photo panel queries using JSONB columns.
    Works with the 'photos' table (no PostGIS required).
    """

    TABLE_NAME = "photos"

    def __init__(self, database: Database):
        self.db = database

    async def list_photos(
        self,
        limit: int = 100,
        offset: int = 0,
        name: Optional[str] = None
    ) -> List[PhotoInfo]:
        """
        List photo panels with optional name filter and pagination.
        """
        where_clause = ""
        params = {"limit": limit, "offset": offset}

        if name:
            where_clause = 'WHERE LOWER(name) LIKE LOWER(:name_pattern)'
            params["name_pattern"] = f"%{name}%"

        query = f"""
        SELECT id, name, hyperlink, full_url, map_symbol,
               strat_interval, feature_type, length,
               geometry, properties
        FROM "{self.TABLE_NAME}"
        {where_clause}
        ORDER BY id
        LIMIT :limit OFFSET :offset
        """

        results = await self.db.fetch_all(query, values=params)
        photos = []

        for row in results:
            geom = row['geometry']
            props = row['properties']

            # Ensure JSON fields are loaded
            if isinstance(geom, str):
                geom = json.loads(geom)
            if isinstance(props, str):
                props = json.loads(props)

            photos.append(PhotoInfo(
                id=row['id'],
                name=row['name'] or 'Unknown',
                hyperlink=row['hyperlink'],
                map_symbol=row['map_symbol'],
                strat_interval=row['strat_interval'],
                feature_type=row['feature_type'],
                length=row['length'],
                geometry=geom
            ))

        return photos

    async def get_photo_by_id(self, photo_id: int) -> Optional[PhotoDetailResponse]:
        """
        Get detailed info for a single photo.
        """
        query = f"""
        SELECT *
        FROM "{self.TABLE_NAME}"
        WHERE id = :photo_id
        """
        result = await self.db.fetch_one(query, values={"photo_id": photo_id})

        if not result:
            return None

        geometry = result['geometry']
        properties = result['properties']

        if isinstance(geometry, str):
            geometry = json.loads(geometry)
        if isinstance(properties, str):
            properties = json.loads(properties)

        return PhotoDetailResponse(
            id=result['id'],
            name=result['name'] or 'Unknown',
            hyperlink=result['hyperlink'],
            full_url=result['full_url'],
            map_symbol=result['map_symbol'],
            strat_interval=result['strat_interval'],
            feature_type=result['feature_type'],
            length=result['length'],
            geometry=geometry,
            properties=properties or {}
        )

    async def get_photo_url(self, photo_id: int) -> Optional[str]:
        """
        Return the photo URL or filename.
        """
        query = f'SELECT full_url, hyperlink FROM "{self.TABLE_NAME}" WHERE id = :photo_id'
        result = await self.db.fetch_one(query, values={"photo_id": photo_id})
        if not result:
            return None
        return result['full_url'] or result['hyperlink']

    async def get_total_count(self) -> int:
        """Return total number of photos."""
        query = f'SELECT COUNT(*) AS count FROM "{self.TABLE_NAME}"'
        result = await self.db.fetch_one(query)
        return result['count'] if result else 0

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
        Filter photos whose geometry intersects a bounding box.
        Geometry is expected to be GeoJSON (Point/Polygon).
        Filtering is done in Python.
        """
        all_photos = await self.list_photos(limit=None, offset=0)
        filtered = []

        for photo in all_photos:
            geom = photo.geometry
            if not geom:
                continue

            # Only handle Point geometries here
            if geom.get('type') == 'Point':
                lng, lat = geom['coordinates']
                if min_lng <= lng <= max_lng and min_lat <= lat <= max_lat:
                    filtered.append(photo)
            # For Polygon / LineString, can implement more advanced bbox check if needed

        # Apply offset + limit
        return filtered[offset:offset + limit]