import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import Map from "./components/Map.tsx";
import NavBar from "./components/NavBar";
import Nav from "./components/Nav";
import FeatureDetails from "./components/FeatureDetails";
import About from "./components/About";
import { AdminUsersPanel } from "./components/admin/AdminUsersPanel";
import CROSS_PLOT_SECTIONS from "./constants/crossPlotSections.ts";
import PHOTO_PANELS from "./constants/photoPanels.ts";

const API_BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}`;

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

const normalize = (str: string) =>
  str
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[_\-]/g, "")
    .trim();

function MapWorkspace() {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
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
          const res = await fetch(`${API_BASE}/api/v1/geologic/${layer}`);
          const data = await res.json();

          data.features = (data.features || []).map((feature: any) => ({
            ...feature,
            properties: {
              ...(feature.properties || {}),
              __layer: layer,
              hasCrossPlot:
                layer === "measured_sections_all_areas"
                  ? CROSS_PLOT_SECTIONS.some(
                      (s) =>
                        normalize(s) ===
                        normalize(
                          feature.properties?.NAME ??
                            feature.properties?.Name ??
                            ""
                        )
                    )
                  : false,
              hasPhoto:
                layer === "photo_panels"
                  ? PHOTO_PANELS.some(
                      (s) =>
                        normalize(s) ===
                        normalize(
                          feature.properties?.NAME ??
                            feature.properties?.Name ??
                            ""
                        )
                    )
                  : false,
            },
          }));
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

    void fetchLayers();
  }, [selectedLayers]);

  return (
    <>
      <div className="layout-container">
        <Nav />
        <NavBar
          selectedLayers={selectedLayers}
          handleLayerChange={handleLayerChange}
        />

        {selectedFeature && (
          <FeatureDetails
            properties={selectedFeature.properties}
            photoUrl={selectedFeature.photoUrl}
            onBack={() => setSelectedFeature(null)}
          />
        )}

        <div className="map-container">
        </div>
      </div>
      <div
        id="about-section"
        style={{
          scrollMarginTop: "110px",
        }}
      >
        <About />
      </div>
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<MapWorkspace />} />
      <Route path="/admins" element={<AdminUsersPanel />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;