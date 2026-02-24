import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import fanGeologyColors from "../fanGeology.json";
import { PhotosService } from "../api/services/PhotosService";
import { OpenAPI } from "../api/core/OpenAPI";

OpenAPI.BASE = "https://api.outcropanalog.com";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface MapProps {
  geojson: GeoJSON.FeatureCollection | null;
  onFeatureClick?: (data: { 
    properties: Record<string, any>; 
    photoUrl: string | null;
  }) => void;
}

// Default colors for layers without "CYCLE"
const DEFAULT_COLOR = "#888888";

const Map: React.FC<MapProps> = ({ geojson, onFeatureClick }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const mapLoaded = useRef(false);

  const colors = fanGeologyColors;

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-104.834853, 31.828347],
      zoom: 8,
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

      // Normalize properties for color and labels
      const normalizedGeojson = {
        ...geojson,
        features: geojson.features.map((f) => ({
          ...f,
          properties: {
            ...(f.properties || {}),
            CYCLE: f.properties?.CYCLE || f.properties?.cycle || "Unknown",
            Name: f.properties?.Name || f.properties?.name || "",
            NAME: f.properties?.NAME || "",
          },
        })),
      };

      // Build color expression for "CYCLE"
      const colorExpression: any = ["match", ["get", "CYCLE"]];
      Object.entries(colors).forEach(([cycle, color]) => {
        colorExpression.push(cycle, color);
      });
      colorExpression.push(DEFAULT_COLOR);

      if (map.current.getSource("geojson-data")) {
        (map.current.getSource("geojson-data") as mapboxgl.GeoJSONSource).setData(
          normalizedGeojson
        );
      } else {
        map.current.addSource("geojson-data", {
          type: "geojson",
          data: normalizedGeojson,
        });

        // Fills for polygons
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

        // Lines
        map.current.addLayer({
          id: "geojson-line",
          type: "line",
          source: "geojson-data",
          paint: {
            "line-color": colorExpression,
            "line-width": 2,
          },
        });

        // Circles for points
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

        // Labels by Cycle
        map.current.addLayer({
          id: "geojson-label-cycle",
          type: "symbol",
          source: "geojson-data",
          layout: {
            "text-field": ["coalesce", ["get", "CYCLE"], ""],
            "text-size": 12,
          },
        });

        // Labels by Name
        map.current.addLayer({
          id: "geojson-label-name",
          type: "symbol",
          source: "geojson-data",
          layout: {
            "text-field": ["coalesce", ["get", "Name"], ["get", "NAME"], ""],
            "text-size": 12,
          },
        });

        const layerIds = ["geojson-fill", "geojson-line", "geojson-circle"];

        layerIds.forEach((layerId) => {
          map.current!.on("click", layerId, async (e) => {
            if (e?.features?.[0]?.properties && onFeatureClick) {
              const properties = e.features[0].properties;

              // grab photo
              if (properties.Hyperlink && properties.Hyperlink !== null) {
                try {
                  const photoData =
                    await PhotosService.getPhotoUrlByNameApiV1PhotosPhotourlPhotoNameGet(
                      properties.Hyperlink
                    );

                  onFeatureClick({
                    properties,
                    photoUrl: photoData?.url || null,
                  });
                } catch (error) {
                  console.error("Error fetching photo URL:", error);
                  onFeatureClick({ properties, photoUrl: null });
                }
              } else {
                onFeatureClick({ properties, photoUrl: null });
              }
            }
          });

          map.current!.on("mouseenter", layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = "pointer";
          });

          map.current!.on("mouseleave", layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = "";
          });
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