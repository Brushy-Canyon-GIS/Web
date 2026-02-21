from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import boto3
import json
import os

router = APIRouter(tags=["S3"])

# S3 client
s3 = boto3.client("s3", region_name=os.getenv("AWS_REGION", "us-east-2"))
BUCKET_NAME = os.getenv("S3_BUCKET")  # set in .env or environment

@router.get("/geojson/{filename}", summary="Fetch GeoJSON from S3")
async def get_geojson(filename: str):
    """
    Fetch a GeoJSON file from a private S3 bucket.
    """
    # auto-append .json if missing
    if not filename.endswith(".json"):
        filename += ".json"

    try:
        response = s3.get_object(Bucket=BUCKET_NAME, Key=f"geojson/{filename}")
        data = json.loads(response["Body"].read())
        return JSONResponse(content=data)
    except s3.exceptions.NoSuchKey:
        raise HTTPException(status_code=404, detail=f"File {filename} not found in S3")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))