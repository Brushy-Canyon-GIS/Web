"""
SQL query builder utilities for geologic data queries.
Handles dynamic GeoJSON generation and filtering.
"""
from typing import Dict, List, Tuple, Any, Optional
from app.models.geologic import FilterParams, BoundingBox


def build_geojson_query(
    table_name: str,
    geometry_column: str = "geometry",
    filters: Optional[FilterParams] = None,
    properties: Optional[List[str]] = None
) -> Tuple[str, Dict[str, Any]]:
    """
    Build a SQL query that returns GeoJSON format directly from PostGIS.
    
    Args:
        table_name: Name of the table to query
        geometry_column: Name of the geometry column
        filters: Optional filter parameters
        properties: List of property columns to include (None = all)
        
    Returns:
        Tuple of (query_string, parameters_dict)
    """
    params = {}
    where_conditions = []
    
    # Build WHERE clause if filters provided
    if filters:
        conditions, filter_params = build_filter_conditions(table_name, filters)
        where_conditions.extend(conditions)
        params.update(filter_params)
    
    where_clause = ""
    if where_conditions:
        where_clause = "WHERE " + " AND ".join(where_conditions)
    
    # Build the property columns list
    if properties is None:
        # Get all columns except geometry
        properties_json = """
            json_build_object(
                'properties', row_to_json(t.*)::jsonb - 'geometry'
            )->'properties'
        """
    else:
        # Build specific properties
        prop_pairs = [f"'{prop}', \"{prop}\"" for prop in properties]
        properties_json = f"json_build_object({', '.join(prop_pairs)})"
    
    # Build the main query
    # This returns a complete GeoJSON FeatureCollection
    query = f"""
    SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
            json_build_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON("{geometry_column}")::json,
                'properties', {properties_json}
            )
        ), '[]'::json)
    ) AS geojson
    FROM (
        SELECT * FROM "{table_name}"
        {where_clause}
        LIMIT :limit OFFSET :offset
    ) t
    """
    
    # Add pagination parameters
    params['limit'] = filters.limit if filters else 100
    params['offset'] = filters.offset if filters else 0
    
    return query, params


def build_filter_conditions(
    table_name: str,
    filters: FilterParams
) -> Tuple[List[str], Dict[str, Any]]:
    """
    Build WHERE clause conditions and parameters from filter params.
    
    Args:
        table_name: Name of the table being queried
        filters: Filter parameters
        
    Returns:
        Tuple of (conditions_list, parameters_dict)
    """
    conditions = []
    params = {}
    
    # Bounding box filter (spatial)
    if filters.bbox:
        try:
            coords = [float(x.strip()) for x in filters.bbox.split(',')]
            if len(coords) == 4:
                min_lng, min_lat, max_lng, max_lat = coords
                # Use ST_Intersects with a bounding box
                conditions.append("""
                    ST_Intersects(
                        geometry,
                        ST_MakeEnvelope(:min_lng, :min_lat, :max_lng, :max_lat, 4326)
                    )
                """)
                params.update({
                    'min_lng': min_lng,
                    'min_lat': min_lat,
                    'max_lng': max_lng,
                    'max_lat': max_lat
                })
        except (ValueError, AttributeError):
            pass  # Invalid bbox format, skip
    
    # Name filter (case-insensitive partial match)
    if filters.name:
        # Try multiple name columns that might exist
        name_conditions = []
        for col in ['Name', 'NAME', 'name']:
            name_conditions.append(f'LOWER(CAST("{col}" AS TEXT)) LIKE LOWER(:name_pattern)')
        conditions.append(f"({' OR '.join(name_conditions)})")
        params['name_pattern'] = f"%{filters.name}%"
    
    # Map symbol filter
    if filters.map_symbol:
        map_conditions = []
        for col in ['MAP_SYMBOL', 'MAPSYMBOL', 'map_symbol']:
            map_conditions.append(f'CAST("{col}" AS TEXT) = :map_symbol')
        conditions.append(f"({' OR '.join(map_conditions)})")
        params['map_symbol'] = filters.map_symbol
    
    # Feature type filter
    if filters.feature_type:
        conditions.append('CAST("FEATURETYP" AS TEXT) = :feature_type')
        params['feature_type'] = filters.feature_type
    
    # Region filter
    if filters.region:
        conditions.append('CAST("REGION" AS TEXT) = :region')
        params['region'] = filters.region
    
    # Fan ID filter
    if filters.fan_id is not None:
        conditions.append('CAST("FanID" AS INTEGER) = :fan_id')
        params['fan_id'] = filters.fan_id
    
    return conditions, params


def get_table_display_name(table_name: str) -> str:
    """
    Convert database table name to human-readable display name.
    
    Args:
        table_name: Database table name
        
    Returns:
        Human-readable name
    """
    # Special cases
    name_map = {
        'atlas_maps': 'Atlas Maps',
        'atlasmaps': 'Atlas Maps (Extended)',
        'fan_geology': 'Fan Geology',
        'fangeology': 'Fan Geology (Detailed)',
        'fan_delivery_system': 'Fan Delivery System',
        'fieldtripstops': 'Field Trip Stops',
        'ftrip_m': 'Field Trip Markers',
        'gis_region_large': 'Large GIS Regions',
        'gis_region_small': 'Small GIS Regions',
        'gradient_regions': 'Gradient Regions',
        'measured_sections_all_areas': 'Measured Sections',
        'photo_panels': 'Photo Panels',
        'geospatial_data': 'Geospatial Data (General)',
    }
    
    if table_name in name_map:
        return name_map[table_name]
    
    # Default: title case with underscores replaced by spaces
    return table_name.replace('_', ' ').title()

