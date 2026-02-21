from typing import List, Optional
from app.database import database
from app.models.geologic import FilterParams, GeoJSONFeatureCollection


class GeologicDataService:
    """
    Service for fetching geologic data directly from the database.
    Works with the geojson_layers table.
    """

    async def get_available_tables(self) -> List[str]:
        """
        Return all distinct layer names in the database.
        """
        query = "SELECT DISTINCT layer_name FROM geojson_layers ORDER BY layer_name"
        rows = await database.fetch_all(query)
        return [row['layer_name'] for row in rows]

    async def get_table_info(self, table_name: str) -> Optional[dict]:
        """
        Return metadata about a specific table (layer_name).
        """
        query = """
        SELECT COUNT(*) AS total,
               MIN(id) AS min_id,
               MAX(id) AS max_id
        FROM geojson_layers
        WHERE LOWER(layer_name) = LOWER(:table_name)
        """
        result = await database.fetch_one(query, values={"table_name": table_name})
        if result and result["total"] > 0:
            return {
                "name": table_name,
                "total": result["total"],
                "min_id": result["min_id"],
                "max_id": result["max_id"]
            }
        return None

    async def get_features_geojson(
        self, table_name: str, filters: FilterParams
    ) -> GeoJSONFeatureCollection:
        """
        Return features from a given layer as GeoJSON FeatureCollection.
        Supports limit, offset, and basic property filters.
        """
        # Build WHERE clause for optional filters
        where_clauses = ["LOWER(layer_name) = LOWER(:table_name)"]
        values = {"table_name": table_name}

        if filters.name:
            where_clauses.append("LOWER(name) LIKE LOWER(:name)")
            values["name"] = f"%{filters.name}%"
        if filters.map_symbol:
            where_clauses.append("map_symbol = :map_symbol")
            values["map_symbol"] = filters.map_symbol
        if filters.feature_type:
            where_clauses.append("feature_type = :feature_type")
            values["feature_type"] = filters.feature_type
        if filters.region:
            where_clauses.append("region = :region")
            values["region"] = filters.region
        if filters.fan_id:
            where_clauses.append("fan_id = :fan_id")
            values["fan_id"] = filters.fan_id

        where_sql = " AND ".join(where_clauses)

        query = f"""
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(
                json_build_object(
                    'type', 'Feature',
                    'geometry', geometry,
                    'properties', jsonb_build_object(
                        'id', id,
                        'name', name,
                        'map_symbol', map_symbol,
                        'feature_type', feature_type,
                        'region', region,
                        'fan_id', fan_id
                    )
                )
            ), '[]'::json)
        ) AS geojson
        FROM geojson_layers
        WHERE {where_sql}
        LIMIT :limit OFFSET :offset
        """
        values["limit"] = filters.limit
        values["offset"] = filters.offset

        result = await database.fetch_one(query, values=values)
        if result and result["geojson"]:
            return result["geojson"]

        return {"type": "FeatureCollection", "features": []}