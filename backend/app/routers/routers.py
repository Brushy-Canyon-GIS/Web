from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import boto3
import json
import os

router = APIRouter(tags=["S3"])

# S3 client
s3 = boto3.client("s3", region_name=os.getenv("AWS_REGION", "us-east-2"))
BUCKET_NAME = os.getenv("S3_BUCKET")  # set in .env or environment


# Map React layer names to actual S3 filenames
LAYER_TO_S3_KEY = {
    "atlas_maps": "AtlasMaps.geojson",
    "fan_geology": "FanGeology.geojson",
    "photo_panels": "Photo_Panels.geojson",
    "cross_sections": "Cross_Sections.geojson",
    "faults": "Faults.geojson",
    "measured_sections_all_areas": "measured_sections_all_areas.geojson",
    "brushy_intersect_final2": "brushy_intersect_final2.geojson",
    "fan_delivery_system": "Fan_Delivery_System.geojson",
    "fieldtripstops": "FieldtripStops.geojson",
    "ftrip_m": "ftrip_m.geojson",
    "gis_region_small": "GIS_Region_Small.geojson",
    "gradient_regions": "Gradient_Regions.geojson",
    "patterns": "patterns.geojson",
}

@router.get("/geojson/{layer}")
async def get_geojson(layer: str):
    s3_filename = LAYER_TO_S3_KEY.get(layer)
    if not s3_filename:
        raise HTTPException(status_code=404, detail=f"Layer {layer} not found")

    try:
        response = s3.get_object(Bucket=BUCKET_NAME, Key=f"geojson/{s3_filename}")
        data = json.loads(response["Body"].read())
        return JSONResponse(content=data)
    except s3.exceptions.NoSuchKey:
        raise HTTPException(status_code=404, detail=f"File {s3_filename} not found in S3")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))