import { useEffect, useState } from "react";
import "./App.css";
import Map from "./components/Map";
import NavBar from "./components/Nav";
import FeatureDetails from "./components/FeatureDetails";
import { GeologicDataService } from "./api/services/GeologicDataService";
import { OpenAPI } from "./api/core/OpenAPI";

OpenAPI.BASE = "https://api.outcropanalog.com";

type Layer =
  | "AtlasMaps"
  | "FanGeology"
  | "Photo_Panels"
  | "Cross_Sections"
  | "Faults"
  | "measured_sections_all_areas"
  | "brushy_intersect_final2"
  | "Fan_Delivery_System"
  | "FieldtripStops"
  | "ftrip_m"
  | "GIS_Region_Small"
  | "Gradient_Regions"
  | "patterns";

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
            `http://api.outcropanalog.com/api/v1/geologic/${layer}`
          );
          const data = await res.json();
          console.log({ data });
          layerData.push(data);
        } catch (error) {
          console.error(`Error fetching ${layer}:`, error);
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
              <h3 className="options-title">Map Layers</h3>
              <div className="options-list">
                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="atlasMaps"
                    onChange={() => handleLayerChange("AtlasMaps")}
                    checked={selectedLayers.includes("AtlasMaps")}
                  />
                  Atlas Map
                </label>

                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="fanGeology"
                    onChange={() => handleLayerChange("FanGeology")}
                    checked={selectedLayers.includes("FanGeology")}
                  />
                  Fan Geology
                </label>

                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="photoPanels"
                    onChange={() => handleLayerChange("Photo_Panels")}
                    checked={selectedLayers.includes("Photo_Panels")}
                  />
                  Photo Panels
                </label>

                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="cross_sections"
                    onChange={() => handleLayerChange("Cross_Sections")}
                    checked={selectedLayers.includes("Cross_Sections")}
                  />
                  Cross Sections
                </label>

                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="faults"
                    onChange={() => handleLayerChange("Faults")}
                    checked={selectedLayers.includes("Faults")}
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
                    onChange={() => handleLayerChange("Fan_Delivery_System")}
                    checked={selectedLayers.includes("Fan_Delivery_System")}
                  />
                  Fan Delivery System
                </label>

                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="fieldtripstops"
                    onChange={() => handleLayerChange("FieldtripStops")}
                    checked={selectedLayers.includes("FieldtripStops")}
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
                    value="gis_region_small"
                    onChange={() => handleLayerChange("GIS_Region_Small")}
                    checked={selectedLayers.includes("GIS_Region_Small")}
                  />
                  Small GIS Regions
                </label>
                <label className="layer-option">
                  <input
                    type="checkbox"
                    value="gradient_regions"
                    onChange={() => handleLayerChange("Gradient_Regions")}
                    checked={selectedLayers.includes("Gradient_Regions")}
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
