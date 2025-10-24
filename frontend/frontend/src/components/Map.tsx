import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";


mapboxgl.accessToken = import.meta.env.MAPBOX_TOKEN || "pk.eyJ1Ijoic3VzaHJ1dGhtdXJha2FyZSIsImEiOiJjbWgzd3dzaXEwYm0yMnFxMGt0c2t1NmFtIn0.vuyviEsUmHvmrRIVIBZZ9w";

interface MapProps {
  geojson?: GeoJSON.FeatureCollection;
}

const Map: React.FC<MapProps> = ({ geojson }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-98, 38],
      zoom: 3,
    });

    map.current.addControl(new mapboxgl.NavigationControl());
  }, []);

  useEffect(() => {
    if (!map.current || !geojson) return;

    if (map.current.getSource("geojson-data")) {
      map.current.getSource("geojson-data")?.setData(geojson);
    } else {
      map.current.addSource("geojson-data", {
        type: "geojson",
        data: geojson,
      });

      map.current.addLayer({
        id: "geojson-layer",
        type: "line", // change to "fill" for polygons, "circle" for points
        source: "geojson-data",
        paint: {
          "line-color": "#FF0000",
          "line-width": 2,
        },
      });
    }
  }, [geojson]);

  return <div ref={mapContainer} style={{ width: "100%", height: "100vh" }} />;
};

export default Map;
