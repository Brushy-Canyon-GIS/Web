import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import fanGeologyColors from "../fanGeology.json";

// const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface MapProps {
  geojson: GeoJSON.FeatureCollection | null;
  showPhotoPanels?: boolean;
  onFeatureClick?: (data: { 
    properties: Record<string, any>; 
    photoUrl: string | null;
  }) => void;
}

const hasNonEmptyHyperlink = (properties: Record<string, any> | null | undefined) => {
  const value = properties?.Hyperlink;
  return value !== null && value !== undefined && String(value).trim() !== "";
};

const lineMidpoint = (coordinates: number[][]): [number, number] | null => {
  if (!coordinates || coordinates.length === 0) return null;
  if (coordinates.length === 1) return [coordinates[0][0], coordinates[0][1]];

  let total = 0;
  const segments: Array<{ start: number[]; end: number[]; len: number }> = [];

  for (let i = 1; i < coordinates.length; i += 1) {
    const start = coordinates[i - 1];
    const end = coordinates[i];
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      segments.push({ start, end, len });
      total += len;
    }
  }

  if (total === 0 || segments.length === 0) return null;

  const target = total / 2;
  let acc = 0;

  for (const segment of segments) {
    if (acc + segment.len >= target) {
      const t = (target - acc) / segment.len;
      return [
        segment.start[0] + (segment.end[0] - segment.start[0]) * t,
        segment.start[1] + (segment.end[1] - segment.start[1]) * t,
      ];
    }
    acc += segment.len;
  }

  const last = segments[segments.length - 1].end;
  return [last[0], last[1]];
};

const buildLineMidpointFeatures = (
  collection: GeoJSON.FeatureCollection
): GeoJSON.FeatureCollection => {
  const features: GeoJSON.Feature[] = [];

  for (const feature of collection.features || []) {
    const props = (feature.properties || {}) as Record<string, any>;
    if (props.__layer !== "photo_panels" || !hasNonEmptyHyperlink(props)) continue;

    const geometry = feature.geometry;
    if (!geometry) continue;

    if (geometry.type === "LineString") {
      const midpoint = lineMidpoint(geometry.coordinates as number[][]);
      if (midpoint) {
        features.push({
          type: "Feature",
          properties: { ...props },
          geometry: { type: "Point", coordinates: midpoint },
        });
      }
    }

    if (geometry.type === "MultiLineString") {
      const lines = geometry.coordinates as number[][][];
      for (const line of lines) {
        const midpoint = lineMidpoint(line);
        if (midpoint) {
          features.push({
            type: "Feature",
            properties: { ...props },
            geometry: { type: "Point", coordinates: midpoint },
          });
        }
      }
    }
  }

  return { type: "FeatureCollection", features };
};

const Map: React.FC<MapProps> = ({ geojson, showPhotoPanels, onFeatureClick }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const mapLoaded = useRef(false);

  const colors =  fanGeologyColors;


  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: "mapbox://styles/mapbox/streets-v11",
      //style: "mapbox://styles/mapbox/standard-satellite",
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

      if (!map.current.hasImage("photo-panel-pin")) {
        const size = 40;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.clearRect(0, 0, size, size);
          ctx.beginPath();
          ctx.arc(size / 2, 13, 9, 0, Math.PI * 2);
          ctx.fillStyle = "#D1495B";
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(size / 2, 30);
          ctx.lineTo(size / 2 - 7, 17);
          ctx.lineTo(size / 2 + 7, 17);
          ctx.closePath();
          ctx.fillStyle = "#D1495B";
          ctx.fill();
          ctx.beginPath();
          ctx.arc(size / 2, 13, 3, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.fill();
          const imageData = ctx.getImageData(0, 0, size, size);
          map.current.addImage("photo-panel-pin", imageData, { pixelRatio: 2 });
        }
      }

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

        // feature labeling by Cycle
        map.current.addLayer({
          id: "geojson-cycle",
          type: "symbol",
          source: "geojson-data",

          layout: {
            "text-field": ["get", "CYCLE"],
            "text-size": 12,
          },
        });

        // feature labeling by Name
        map.current.addLayer({
          id: "geojson-name1",
          type: "symbol",
          source: "geojson-data",

          layout: {
            "text-field": ["get", "Name"],
            "text-size": 12,
          },
        });

        // feature labeling by NAME
        map.current.addLayer({
          id: "geojson-name2",
          type: "symbol",
          source: "geojson-data",

          layout: {
            "text-field": ["get", "NAME"],
            "text-size": 12,
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

        const hasHyperlinkFilter: any[] = [
          ["==", ["get", "__layer"], "photo_panels"],
          ["!=", ["coalesce", ["to-string", ["get", "Hyperlink"]], ""], ""],
        ];

        map.current.addLayer({
          id: "photo-panels-fill",
          type: "fill",
          source: "geojson-data",
          filter: ["all", ["==", ["geometry-type"], "Polygon"], ...hasHyperlinkFilter],
          layout: {
            visibility: showPhotoPanels ? "visible" : "none",
          },
          paint: {
            "fill-color": "#FFB6C1",
            "fill-opacity": 0.6,
          },
        });

        map.current.addLayer({
          id: "photo-panels-line",
          type: "line",
          source: "geojson-data",
          filter: ["all", ["==", ["geometry-type"], "LineString"], ...hasHyperlinkFilter],
          layout: {
            visibility: showPhotoPanels ? "visible" : "none",
          },
          paint: {
            "line-color": "#FF9AAE",
            "line-width": 2,
          },
        });

        map.current.addLayer({
          id: "photo-panels-circle",
          type: "circle",
          source: "geojson-data",
          filter: ["all", ["==", ["geometry-type"], "Point"], ...hasHyperlinkFilter],
          layout: {
            visibility: showPhotoPanels ? "visible" : "none",
          },
          paint: {
            "circle-radius": 12,
            "circle-opacity": 0,
            "circle-stroke-opacity": 0,
          },
        });

        map.current.addLayer({
          id: "photo-panels-pin",
          type: "symbol",
          source: "geojson-data",
          filter: ["all", ["==", ["geometry-type"], "Point"], ...hasHyperlinkFilter],
          layout: {
            visibility: showPhotoPanels ? "visible" : "none",
            "icon-image": "photo-panel-pin",
            "icon-size": 0.9,
            "icon-allow-overlap": true,
          },
        });

        const layerIds = [
          "geojson-fill",
          "geojson-line",
          "geojson-circle",
          "photo-panels-fill",
          "photo-panels-line",
          "photo-panels-circle",
          "photo-panels-pin",
        ];

          layerIds.forEach((layerId) => {

          map.current!.on("click", layerId, async (e) => {
            if (e?.features?.[0]?.properties && onFeatureClick) {
              const properties = e.features[0].properties;
              
              // grab photo
              if (properties.Hyperlink && properties.Hyperlink !== null) {
                try {
                  const res = await fetch(
                    `http://localhost:8000/api/v1/photos/photourl/${properties.Hyperlink}`
                  );
                  const photoData = await res.json();
                  console.log({photoData})

               onFeatureClick({
                    properties,
                    photoUrl: photoData?.url?.url || null,
                  });
                } catch (error) {
                  console.error("Error fetching photo URL:", error);

                   onFeatureClick({
                    properties,
                    photoUrl: null,
                  });
                }
              } else {

                  onFeatureClick({
                    properties,
                    photoUrl: null,
                  });
              }
            }
          });


          map.current!.on("mouseenter", layerId, () => {
            if (map.current) {
              map.current.getCanvas().style.cursor = "pointer";
            }
          });

          map.current!.on("mouseleave", layerId, () => {
            if (map.current) {
              map.current.getCanvas().style.cursor = "";
            }
          });
        });

      }

      const lineMidpoints = buildLineMidpointFeatures(geojson);
      if (map.current.getSource("photo-panels-line-midpoints")) {
        (
          map.current.getSource("photo-panels-line-midpoints") as mapboxgl.GeoJSONSource
        ).setData(lineMidpoints);
      } else {
        map.current.addSource("photo-panels-line-midpoints", {
          type: "geojson",
          data: lineMidpoints,
        });

        map.current.addLayer({
          id: "photo-panels-line-midpoint-pin",
          type: "symbol",
          source: "photo-panels-line-midpoints",
          layout: {
            visibility: showPhotoPanels ? "visible" : "none",
            "icon-image": "photo-panel-pin",
            "icon-size": 0.85,
            "icon-allow-overlap": true,
          },
        });

        map.current.on("click", "photo-panels-line-midpoint-pin", async (e) => {
          if (e?.features?.[0]?.properties && onFeatureClick) {
            const properties = e.features[0].properties;

            if (properties.Hyperlink && properties.Hyperlink !== null) {
              try {
                const res = await fetch(
                  `http://localhost:8000/api/v1/photos/photourl/${properties.Hyperlink}`
                );
                const photoData = await res.json();

                onFeatureClick({
                  properties,
                  photoUrl: photoData?.url?.url || null,
                });
              } catch (error) {
                console.error("Error fetching photo URL:", error);
                onFeatureClick({
                  properties,
                  photoUrl: null,
                });
              }
            } else {
              onFeatureClick({
                properties,
                photoUrl: null,
              });
            }
          }
        });

        map.current.on("mouseenter", "photo-panels-line-midpoint-pin", () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = "pointer";
          }
        });

        map.current.on("mouseleave", "photo-panels-line-midpoint-pin", () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = "";
          }
        });
      }

      const photoPanelLayerIds = [
        "photo-panels-fill",
        "photo-panels-line",
        "photo-panels-circle",
        "photo-panels-pin",
        "photo-panels-line-midpoint-pin",
      ];

      photoPanelLayerIds.forEach((id) => {
        if (map.current?.getLayer(id)) {
          map.current.setLayoutProperty(
            id,
            "visibility",
            showPhotoPanels ? "visible" : "none"
          );
        }
      });
    };

    if (mapLoaded.current) {
      addOrUpdateSource();
    } else {
      map.current.on("load", addOrUpdateSource);
    }
  }, [geojson, colors, showPhotoPanels]);

  return <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />;
};

export default Map;
