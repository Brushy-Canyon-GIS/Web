import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import fanGeologyColors from "../fanGeology.json";

mapboxgl.accessToken =
  import.meta.env.MAPBOX_TOKEN ||
  "pk.eyJ1Ijoic3VzaHJ1dGhtdXJha2FyZSIsImEiOiJjbWgzd3dzaXEwYm0yMnFxMGt0c2t1NmFtIn0.vuyviEsUmHvmrRIVIBZZ9w";

interface MapProps {
  geojson?: GeoJSON.FeatureCollection;
  cycleColors?: Record<string, string>;
}

const Map: React.FC<MapProps> = ({ geojson, cycleColors }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const mapLoaded = useRef(false);

  const colors =  fanGeologyColors;

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-98, 38],
      zoom: 3,
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    map.current.on("load", () => {
      mapLoaded.current = true;
    });

    return () => {
      map.current?.remove();
      map.current = null;
      mapLoaded.current = false;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !geojson) return;

    const addOrUpdateSource = () => {
      if (!map.current) return;

      const colorExpression: any = ["match", ["get", "CYCLE"]];
      
      Object.entries(colors).forEach(([cycle, color]) => {
        colorExpression.push(cycle, color);
      });
      
      colorExpression.push("#CCCCCC");

      if (map.current.getSource("geojson-data")) {
        const source = map.current.getSource(
          "geojson-data"
        ) as mapboxgl.GeoJSONSource;
        source.setData(geojson);
      } else {
        map.current.addSource("geojson-data", {
          type: "geojson",
          data: geojson,
        });


        map.current.addLayer({
          id: "geojson-fill",
          type: "fill",
          source: "geojson-data",
          filter: ["==", ["geometry-type"], "Polygon"],
          paint: {
            "fill-color": colorExpression,
            "fill-opacity": 0.6,
          },
        });


        map.current.addLayer({
          id: "geojson-line",
          type: "line",
          source: "geojson-data",
          paint: {
            "line-color": colorExpression,
            "line-width": 2,
          },
        });


        map.current.addLayer({
          id: "geojson-circle",
          type: "circle",
          source: "geojson-data",
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-radius": 6,
            "circle-color": colorExpression,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#FFFFFF",
          },
        });
      }
    };

    if (mapLoaded.current) {
      addOrUpdateSource();
    } else {
      map.current.on("load", addOrUpdateSource);
    }
  }, [geojson, colors]);

  return <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />;
};

export default Map;