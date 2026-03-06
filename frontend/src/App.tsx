import { useEffect, useState } from "react";
import "./App.css";
import Map from "./components/Map";
import NavBar from "./components/NavBar";
import Nav from "./components/Nav";
// import About from "./components/About";
// import NavBar from "./components/Nav";
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
          data.features = (data.features || []).map((feature: any) => ({
            ...feature,
            properties: {
              ...(feature.properties || {}),
              __layer: layer,
            },
          }));
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
            <Map
              geojson={geojson}
              onFeatureClick={setSelectedFeature}
              showPhotoPanels={selectedLayers.includes("photo_panels")}
            />
          </div>
        </div>
        
      </>
   );
}

export default App;