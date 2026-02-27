import { useEffect, useState } from "react";
import "./App.css";
import Map from "./components/Map";
import NavBar from "./components/Nav";
import FeatureDetails from "./components/FeatureDetails";

type Layer =
  | "atlas_maps"
  | "fan_geology"
  | "photo_panels"
  | "cross_sections"
  | "faults"
  | "gis_region_large"
  | "measured_sections_all_areas"
  | "brushy_intersect_final2"
  | "fan_delivery_system"
  | "fieldtripstops"
  | "ftrip_m"
  | "gis_region_small"
  | "gradient_regions"
  | "patterns"
  | "cutoffmeasuredsections";
  

function App() {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(
    null
  );
  const [selectedLayers, setSelectedLayers] = useState<Layer[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<{
    properties: Record<string, any>;
    photoUrl: string | null;
  } | null>(null);

  const handleLayerChange = (layer: Layer) => {
    setSelectedLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]
    );
  };

  useEffect(() => {
    const fetchLayers = async () => {
      if (selectedLayers.length === 0) {
        setGeojson(null);
        return;
      }

      const layerData: GeoJSON.FeatureCollection[] = [];

      for (const layer of selectedLayers) {
        try {
          const res = await fetch(
            `${import.meta.env.VITE_API_URL}/api/v1/geologic/${layer}`
          );
          const data = await res.json();
          console.log({ data });
          layerData.push(data);
        } catch (error) {
          console.error(`Error fetching ${layer}`, error);
        }
      }

      const mergedGeojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: layerData.flatMap((fc) => fc.features || []),
      };

      setGeojson(mergedGeojson);
    };

    fetchLayers();
  }, [selectedLayers]);

  console.log({selectedFeature})
  return (
    <>
      <NavBar />

      <div className="layout-container">
        <div className="options-panel">
          {selectedFeature ? (
            <FeatureDetails
              properties={selectedFeature.properties}
              photoUrl={selectedFeature.photoUrl}
              onBack={() => setSelectedFeature(null)}
            />
          ) : (
            <>
              <h3 className="options-title">Map Layers for Brushy Canyon</h3>
              <div className="options-list">
                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="atlasMap"
                    onChange={() => handleLayerChange("atlas_maps")}
                    checked={selectedLayers.includes("atlas_maps")}
                  />
                  Atlas Map
                </label>

                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="fanGeology"
                    onChange={() => handleLayerChange("fan_geology")}
                    checked={selectedLayers.includes("fan_geology")}
                  />
                  Fan Geology
                </label>

                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="photoPanels"
                    onChange={() => handleLayerChange("photo_panels")}
                    checked={selectedLayers.includes("photo_panels")}
                  />
                  Photo Panels
                </label>

                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="cross_sections"
                    onChange={() => handleLayerChange("cross_sections")}
                    checked={selectedLayers.includes("cross_sections")}
                  />
                  Cross Sections
                </label>

                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="faults"
                    onChange={() => handleLayerChange("faults")}
                    checked={selectedLayers.includes("faults")}
                  />
                  Faults
                </label>

                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="measured_sections_all_areas"
                    onChange={() =>
                      handleLayerChange("measured_sections_all_areas")
                    }
                    checked={selectedLayers.includes(
                      "measured_sections_all_areas"
                    )}
                  />
                  Measured Sections (All Areas)
                </label>

                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="brushy_intersect_final2"
                    onChange={() =>
                      handleLayerChange("brushy_intersect_final2")
                    }
                    checked={selectedLayers.includes("brushy_intersect_final2")}
                  />
                  Brushy Intersect Final 2
                </label>

                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="fan_delivery_system"
                    onChange={() => handleLayerChange("fan_delivery_system")}
                    checked={selectedLayers.includes("fan_delivery_system")}
                  />
                  Fan Delivery System
                </label>

                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="fieldtripstops"
                    onChange={() => handleLayerChange("fieldtripstops")}
                    checked={selectedLayers.includes("fieldtripstops")}
                  />
                  Field Trip Stops
                </label>
                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="ftrip_m"
                    onChange={() => handleLayerChange("ftrip_m")}
                    checked={selectedLayers.includes("ftrip_m")}
                  />
                  Field Trip Markers
                </label>
                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="gis_region_large"
                    onChange={() => handleLayerChange("gis_region_large")}
                    checked={selectedLayers.includes("gis_region_large")}
                  />
                  Large GIS Regions
                </label>
                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="gis_region_small"
                    onChange={() => handleLayerChange("gis_region_small")}
                    checked={selectedLayers.includes("gis_region_small")}
                  />
                  Small GIS Regions
                </label>
                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="gradient_regions"
                    onChange={() => handleLayerChange("gradient_regions")}
                    checked={selectedLayers.includes("gradient_regions")}
                  />
                  Gradient Regions
                </label>
                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="patterns"
                    onChange={() => handleLayerChange("patterns")}
                    checked={selectedLayers.includes("patterns")}
                  />
                  Patterns
                </label>
                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="cutoffmeasuredsections"
                    onChange={() => handleLayerChange("cutoffmeasuredsections")}
                    checked={selectedLayers.includes("cutoffmeasuredsections")}
                  />
                  Cut Off Measured Sections
                </label>
              </div>
            </>
          )}
      </div>

          <div className="map-container">
            <Map geojson={geojson} onFeatureClick={setSelectedFeature} />
          </div>
        </div>
    </>
  );
}

export default App;
