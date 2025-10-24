from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import database

app = FastAPI()

# CORS
origins = [
    "http://localhost:5173"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect/disconnect database on startup/shutdown
@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


@app.get("/")
async def root():
    query = """
    SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', json_agg(
            json_build_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(geometry)::json,
                'properties', json_build_object(
                    'OBJECTID', "OBJECTID",
                    'Name', "Name",
                    'ID', "ID",
                    'MAP_SYMBOL', "MAP_SYMBOL",
                    'Shape_Length', "Shape_Length"
                )
            )
        )
    ) AS geojson
    FROM atlas_maps;
    """
    result = await database.fetch_one(query)
    return result["geojson"]
