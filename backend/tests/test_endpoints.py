"""
Essential endpoint tests for the Geologic Data API.

Tests cover main endpoints with happy path scenarios.
"""
import pytest


@pytest.mark.asyncio
async def test_root_endpoint(client):
    """Test that the root endpoint returns API information."""
    response = await client.get("/")
    
    assert response.status_code == 200
    data = response.json()
    
    assert "name" in data
    assert "version" in data
    assert "endpoints" in data
    assert data["name"] == "Geologic Data API"


@pytest.mark.asyncio
async def test_health_endpoint(client):
    """Test that the health check endpoint returns healthy status."""
    response = await client.get("/health")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] == "healthy"
    assert data["database"] == "connected"


@pytest.mark.asyncio
async def test_list_tables(client):
    """Test that the tables endpoint returns a list of tables."""
    response = await client.get("/api/v1/geologic/tables")
    
    assert response.status_code == 200
    data = response.json()
    
    assert "tables" in data
    assert "total" in data
    assert isinstance(data["tables"], list)
    assert data["total"] > 0
    
    # Check table structure
    if data["tables"]:
        table = data["tables"][0]
        assert "name" in table
        assert "display_name" in table
        assert "feature_count" in table


@pytest.mark.asyncio
async def test_get_features_atlas_maps(client):
    """Test that fetching features from atlas_maps returns GeoJSON."""
    response = await client.get("/api/v1/geologic/atlas_maps?limit=5")
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify GeoJSON structure
    assert data["type"] == "FeatureCollection"
    assert "features" in data
    assert isinstance(data["features"], list)
    
    # Check feature structure
    if data["features"]:
        feature = data["features"][0]
        assert feature["type"] == "Feature"
        assert "geometry" in feature
        assert "properties" in feature


@pytest.mark.asyncio
async def test_get_features_pagination(client):
    """Test that pagination works correctly."""
    # Get first page
    response1 = await client.get("/api/v1/geologic/atlas_maps?limit=2&offset=0")
    assert response1.status_code == 200
    data1 = response1.json()
    
    # Get second page
    response2 = await client.get("/api/v1/geologic/atlas_maps?limit=2&offset=2")
    assert response2.status_code == 200
    data2 = response2.json()
    
    # Verify different features returned
    if data1["features"] and data2["features"]:
        # Features should be different
        ids1 = [f["properties"].get("ID") or f["properties"].get("OBJECTID") for f in data1["features"]]
        ids2 = [f["properties"].get("ID") or f["properties"].get("OBJECTID") for f in data2["features"]]
        
        # At least some IDs should be different
        assert ids1 != ids2


@pytest.mark.asyncio
async def test_get_invalid_table_returns_404(client):
    """Test that requesting a non-existent table returns 404."""
    response = await client.get("/api/v1/geologic/nonexistent_table_xyz")
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_photos_list(client):
    """Test that the photos endpoint returns a list of photos."""
    response = await client.get("/api/v1/photos?limit=5")
    
    assert response.status_code == 200
    data = response.json()
    
    assert "photos" in data
    assert "total" in data
    assert isinstance(data["photos"], list)
    
    # Check photo structure
    if data["photos"]:
        photo = data["photos"][0]
        assert "id" in photo
        assert "name" in photo
        assert "geometry" in photo


@pytest.mark.asyncio
async def test_photos_get_by_id(client):
    """Test that fetching a photo by ID works."""
    # First get a photo ID from the list
    list_response = await client.get("/api/v1/photos?limit=1")
    list_data = list_response.json()
    
    if list_data["photos"]:
        # Get a known ID from the database
        response = await client.get("/api/v1/photos/350")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "name" in data
        assert "hyperlink" in data
        assert "properties" in data


@pytest.mark.asyncio
async def test_photos_invalid_id_returns_404(client):
    """Test that requesting a non-existent photo returns 404."""
    response = await client.get("/api/v1/photos/999999999")
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_features_filter_with_bbox(client):
    """Test that bounding box filtering works."""
    # Use coordinates that should include some features
    response = await client.get(
        "/api/v1/geologic/atlas_maps/filter?bbox=-105,31,-104,32&limit=5"
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["type"] == "FeatureCollection"
    assert "features" in data

