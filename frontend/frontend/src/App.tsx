import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Map from './components/Map';

function App() {
 const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | undefined>();

  useEffect(() => {
    // Fetch atlas_maps data from the new API
    // You can change the table name to visualize different datasets:
    // - atlas_maps, fan_geology, faults, fieldtripstops, etc.
    fetch("http://localhost:8000/api/v1/geologic/atlas_maps?limit=100")
      .then((res) => res.json())
      .then((data) => {
        setGeojson(data);
        console.log("Loaded features:", data.features.length);
      })
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  return <Map geojson={geojson} />;
}

export default App
