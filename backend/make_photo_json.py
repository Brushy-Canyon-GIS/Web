import os
import json

folder = './geojson_files/photos'
photos = []

for i, filename in enumerate(os.listdir(folder), start=1):
    if filename.lower().endswith('.jpg'):
        photos.append({
            "id": i,
            "name": os.path.splitext(filename)[0],
            "hyperlink": f"photos/{filename}"
        })

with open('./geojson_files/photos.json', 'w') as f:
    json.dump(photos, f, indent=2)