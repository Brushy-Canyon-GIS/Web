"""
Service layer for geologic data operations.
Encapsulates business logic and database interactions.
"""
from typing import Dict, List, Optional, Any
from databases import Database

from app.models.geologic import FilterParams, TableInfo, GeoJSONFeatureCollection
from app.utils.query_builder import build_geojson_query, get_table_display_name


class GeologicDataService:
    """
    Service for handling geologic data queries and operations.
    """
    
    # Tables to exclude from public API
    EXCLUDED_TABLES = {
        'spatial_ref_sys',  # PostGIS system table
        'geometry_columns',  # PostGIS system table
        'geography_columns',  # PostGIS system table
    }
    
    def __init__(self, database: Database):
        """
        Initialize the service with a database connection.
        
        Args:
            database: Database instance
        """
        self.db = database
    
    async def get_available_tables(self) -> List[TableInfo]:
        """
        Get list of all available geologic data tables.
        
        Returns:
            List of TableInfo objects
        """
        # Build excluded tables list for SQL
        excluded_list = ', '.join([f"'{table}'" for table in self.EXCLUDED_TABLES])
        
        query = f"""
        SELECT 
            t.table_name,
            gc.type as geometry_type,
            (SELECT COUNT(*) FROM information_schema.columns 
             WHERE table_name = t.table_name AND table_schema = 'public') as column_count
        FROM information_schema.tables t
        LEFT JOIN geometry_columns gc 
            ON gc.f_table_name = t.table_name 
            AND gc.f_table_schema = 'public'
        WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND t.table_name NOT IN ({excluded_list})
        ORDER BY t.table_name;
        """
        
        results = await self.db.fetch_all(query)
        
        tables = []
        for row in results:
            table_name = row['table_name']
            
            # Get feature count
            try:
                count_result = await self.db.fetch_one(
                    f'SELECT COUNT(*) as count FROM "{table_name}"'
                )
                feature_count = count_result['count'] if count_result else 0
            except Exception:
                feature_count = 0
            
            tables.append(TableInfo(
                name=table_name,
                display_name=get_table_display_name(table_name),
                feature_count=feature_count,
                geometry_type=row['geometry_type']
            ))
        
        return tables
    
    async def get_features_geojson(
        self,
        table_name: str,
        filters: Optional[FilterParams] = None
    ) -> Dict[str, Any]:
        """
        Get features from a table as GeoJSON.
        
        Args:
            table_name: Name of the table to query
            filters: Optional filter parameters
            
        Returns:
            GeoJSON FeatureCollection as dict
            
        Raises:
            ValueError: If table doesn't exist or is excluded
        """
        # Validate table exists and is not excluded
        if table_name in self.EXCLUDED_TABLES:
            raise ValueError(f"Table '{table_name}' is not accessible")
        
        # Check if table exists
        table_check = await self.db.fetch_one(
            """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = :table_name
            """,
            values={"table_name": table_name}
        )
        
        if not table_check:
            raise ValueError(f"Table '{table_name}' does not exist")
        
        # Determine geometry column name
        geom_col_query = """
        SELECT f_geometry_column 
        FROM geometry_columns 
        WHERE f_table_schema = 'public' 
        AND f_table_name = :table_name
        LIMIT 1
        """
        geom_result = await self.db.fetch_one(
            geom_col_query,
            values={"table_name": table_name}
        )
        
        geometry_column = geom_result['f_geometry_column'] if geom_result else 'geometry'
        
        # Build and execute query
        query, params = build_geojson_query(
            table_name=table_name,
            geometry_column=geometry_column,
            filters=filters
        )
        
        result = await self.db.fetch_one(query, values=params)
        
        if result and result['geojson']:
            geojson_data = result['geojson']
            # If it's a string, parse it; otherwise return as-is
            if isinstance(geojson_data, str):
                import json
                return json.loads(geojson_data)
            return geojson_data
        
        # Return empty FeatureCollection if no results
        return {
            "type": "FeatureCollection",
            "features": []
        }
    
    async def get_table_info(self, table_name: str) -> Optional[TableInfo]:
        """
        Get detailed information about a specific table.
        
        Args:
            table_name: Name of the table
            
        Returns:
            TableInfo object or None if not found
        """
        if table_name in self.EXCLUDED_TABLES:
            return None
        
        # Get geometry type
        geom_query = """
        SELECT type as geometry_type
        FROM geometry_columns
        WHERE f_table_schema = 'public'
        AND f_table_name = :table_name
        """
        geom_result = await self.db.fetch_one(
            geom_query,
            values={"table_name": table_name}
        )
        
        # Get feature count
        try:
            count_result = await self.db.fetch_one(
                f'SELECT COUNT(*) as count FROM "{table_name}"'
            )
            feature_count = count_result['count'] if count_result else 0
        except Exception:
            return None
        
        return TableInfo(
            name=table_name,
            display_name=get_table_display_name(table_name),
            feature_count=feature_count,
            geometry_type=geom_result['geometry_type'] if geom_result else None
        )

