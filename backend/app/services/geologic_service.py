import os
import json
import boto3
from typing import List
from app.models.geologic import FilterParams, GeoJSONFeatureCollection

s3_bucket = os.getenv("S3_BUCKET")
s3 = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION"),
)

class GeologicDataService:
    """
    Service for fetching geologic data from S3.
    """

    def __init__(self):
        pass  # no database needed

    async def get_available_tables(self) -> List[str]:
        """
        List all JSON files in the S3 bucket.
        """
        response = s3.list_objects_v2(Bucket=s3_bucket)
        tables = []
        for obj in response.get("Contents", []):
            key = obj["Key"]
            if key.endswith(".geojson"):
                tables.append(key.replace(".geojson", ""))
        return tables

    async def get_features_geojson(self, table_name: str, filters: FilterParams) -> GeoJSONFeatureCollection:
        """
        Return the GeoJSON for a given table.
        """
        key = f"{table_name}.geojson"
        try:
            obj = s3.get_object(Bucket=s3_bucket, Key=key)
            data = json.loads(obj['Body'].read())
        except s3.exceptions.NoSuchKey:
            raise ValueError(f"Table {table_name} not found in S3")

        # Apply basic filtering (offset + limit)
        features = data.get("features", [])
        start = filters.offset
        end = start + filters.limit if filters.limit else None
        filtered_features = features[start:end]

        return {
            "type": "FeatureCollection",
            "features": filtered_features
        }
