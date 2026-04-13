import { useEffect, useState } from "react"; // react hooks
import "./App.css"; // styling
import Map from "./components/Map.tsx";
import NavBar from "./components/NavBar";
import Nav from "./components/Nav";
import FeatureDetails from "./components/FeatureDetails";
import About from "./components/About";
import CROSS_PLOT_SECTIONS from "./constants/crossPlotSections.ts";
import PHOTO_PANELS from "./constants/photoPanels.ts";

// base URL for backend API
const API_BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}`;

// valid map layers
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
    .replace(/\s+/g, "")      // remove spaces
    .replace(/[_\-]/g, "")    // remove underscores/dashes
    .trim();

// root component of the application
function App() {
  // geoJSON state - data, function to update it
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(
    null
  );
  // layer state
  const [selectedLayers, setSelectedLayers] = useState<Layer[]>([]);

  // feature state -- stores feature clicked on the map
  const [selectedFeature, setSelectedFeature] = useState<{
    properties: Record<string, any>;
    photoUrl: string | null;
  } | null>(null);

  // layer toggle function
  const handleLayerChange = (layer: Layer) => {
    // checks if the layer is already selected. If it is, remove it. If not selected, add it
    setSelectedLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]
    );
  };

  // this runs when selectedLayers change
  useEffect(() => {
    //defines async function that fetches data from API
    const fetchLayers = async () => {
      if (selectedLayers.length === 0) { // no layers selected
        setGeojson(null);
        return;
      }

      // create array to store GeoJSON results from each layer
      const layerData: GeoJSON.FeatureCollection[] = [];

      for (const layer of selectedLayers) {
        try {
          const res = await fetch(`${API_BASE}/api/v1/geologic/${layer}`);
          const data = await res.json();

          // Add __layer and hasCrossPlot
          data.features = (data.features || []).map((feature: any) => ({
            ...feature,
            properties: {
              ...(feature.properties || {}),
              __layer: layer,
              hasCrossPlot:
                layer === "measured_sections_all_areas"
                  ? CROSS_PLOT_SECTIONS.some(
                      s =>
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
                      s =>
                        normalize(s) ===
                        normalize(
                          feature.properties?.NAME ?? feature.properties?.Name ?? ""
                        )
                    )
                  : false,
            },
          }));
          console.log({ data }); // prints API response to browser console
          layerData.push(data); // stores this layer's GeoJSON data
        } catch (error) { // error handling if API request fails
          console.error(`Error fetching ${layer}`, error);
        }
      }

      // creates new GeoJSON object
      const mergedGeojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: layerData.flatMap((fc) => fc.features || []),
      };

      setGeojson(mergedGeojson); // updates state so map re-renders
    };

    fetchLayers(); // runs the function
  }, [selectedLayers]); // dependency array --> run the effect whenever selectedLayers changes

  console.log({selectedFeature}) // logs currently selected map feature


  // returns UI for this component
  return (
      <>
        <div className="layout-container">
          <Nav />
          <NavBar
            selectedLayers={selectedLayers} // current layers
            handleLayerChange={handleLayerChange} // function to toggle layers
          />

          {selectedFeature && ( // conditionally render only if feature selected
            <FeatureDetails
              properties={selectedFeature.properties} // pass props
              photoUrl={selectedFeature.photoUrl} // pass photo URL
              onBack={() => setSelectedFeature(null)} // back button
            />
          )}
        
          
          <div className="map-container">
            <Map
              geojson={geojson} // pass geoJSON data
              onFeatureClick={setSelectedFeature} // When user clicks feature, set it
              showPhotoPanels={selectedLayers.includes("photo_panels")}
              showCrossPlots={selectedLayers.includes("measured_sections_all_areas")}
            />
          </div>
        </div>
        <div
          id="about-section"
          style={{
            scrollMarginTop: "110px", // prevents header overlap
          }}
        >
          <About />
        </div>
      </>
   );
}

export default App; // exports component so it can be used by the entry point in main.tsx