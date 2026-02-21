import asyncio
import asyncpg
import json
import os

# --- CONFIGURE YOUR DATABASE ---
DB_USER = "cgiere"
DB_PASSWORD = "YOUR_PASSWORD"
DB_NAME = "geology"
DB_HOST = "localhost"

# --- PATHS ---
GEOJSON_FOLDER = "./geojson_files"  # folder containing all your .geojson files
PHOTOS_FILE = "./photos.json"       # JSON file containing all photo entries

# ----------------------------
# Insert GeoJSON features
# ----------------------------
async def insert_geojson(pool):
    async with pool.acquire() as conn:
        for filename in os.listdir(GEOJSON_FOLDER):
            if filename.endswith(".geojson"):
                layer_name = filename.replace(".geojson", "")
                filepath = os.path.join(GEOJSON_FOLDER, filename)
                with open(filepath) as f:
                    data = json.load(f)
                for feature in data.get("features", []):
                    props = feature.get("properties", {})
                    await conn.execute(
                        """
                        INSERT INTO geojson_layers
                        (layer_name, name, map_symbol, feature_type, region, fan_id, geometry)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        """,
                        layer_name,
                        props.get("name"),
                        props.get("map_symbol"),
                        props.get("feature_type"),
                        props.get("region"),
                        props.get("fan_id"),
                        json.dumps(feature.get("geometry"))
                    )
                print(f"Inserted {len(data.get('features', []))} features from {filename}")

# ----------------------------
# Insert Photos
# ----------------------------
async def insert_photos(pool):
    async with pool.acquire() as conn:
        with open(PHOTOS_FILE) as f:
            photos = json.load(f)
        for photo in photos:
            await conn.execute(
                """
                INSERT INTO photos
                (name, hyperlink, full_url, map_symbol, strat_interval, feature_type, length, geometry, properties)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """,
                photo.get("name"),
                photo.get("hyperlink"),
                photo.get("full_url"),
                photo.get("map_symbol"),
                photo.get("strat_interval"),
                photo.get("feature_type"),
                photo.get("length"),
                json.dumps(photo.get("geometry")),
                json.dumps(photo.get("properties", {}))
            )
        print(f"Inserted {len(photos)} photos")

# ----------------------------
# Main routine
# ----------------------------
async def main():
    pool = await asyncpg.create_pool(
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        host=DB_HOST,
        min_size=1,
        max_size=5
    )
    try:
        await insert_geojson(pool)
        await insert_photos(pool)
    finally:
        await pool.close()

if __name__ == "__main__":
    asyncio.run(main())