import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Map from './components/Map';
import { Link, Outlet } from 'react-router-dom';


function App() {
 const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | undefined>();

  useEffect(() => {
    // Fetch from Supabase endpoint that returns atlas_maps as GeoJSON
    fetch("http://localhost:8000/") // your FastAPI endpoint
      .then((res) => res.json())
      .then((data) => {setGeojson(JSON.parse(data)); console.log(JSON.parse(data))});
  }, []);

  return <>
    {/* {<Map geojson={geojson} /> */}
      <>
      <nav style={{ margin: '10px 0', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
        <Link to="/">Home</Link> |{' '}
        <Link to="/signin">Auth</Link>
      </nav>
      <main>
        <Outlet /> 
      </main>
    </></>;
  
}

export default App
