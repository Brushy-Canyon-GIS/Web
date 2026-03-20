import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import fanGeologyColors from "../fanGeology.json";

/** 
 * This component renders an interactive map using Mapbox GL. It receives geoJSON
 * data and visualizes it as map layers. 
 */ 

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

/**This interfavce receives a GeoJSON dataset that represents map features. It also
 * optionally receives a flag to toggle photo panels and a callback for when a user clicks 
 * a feature. The callback keeps the component reusable because it doesn't assume how the
 * parent hands feature selection.
 */
interface MapProps {
  geojson: GeoJSON.FeatureCollection | null;
  showPhotoPanels?: boolean;
  showCrossPlots?: boolean;    // new cross plot variable
  onFeatureClick?: (data: { 
    properties: Record<string, any>; 
    photoUrl: string | null;
  }) => void;
}

/**
 * This helper checks whether a feature actually has a valid hyperlink property before
 * treating it as a photo panel.
 */
const hasNonEmptyHyperlink = (properties: Record<string, any> | null | undefined) => {
  const value = properties?.Hyperlink;
  return value !== null && value !== undefined && String(value).trim() !== "";
};

/**
 * This calculates the midpoint of a line feature by measuring segment lengths and interpolating
 * the halfway point. This ensures the midpoint is geometrically correct.
 */
const lineMidpoint = (coordinates: number[][]): [number, number] | null => {
  if (!coordinates || coordinates.length === 0) return null;
  if (coordinates.length === 1) return [coordinates[0][0], coordinates[0][1]];

  let total = 0;
  const segments: Array<{ start: number[]; end: number[]; len: number }> = [];

  for (let i = 1; i < coordinates.length; i++) {
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

/**
 * This converts line-based photo panel features into point features at their midpoints
 * so they can be rendered with markers. This ultimately adapts the data to a format better
 * for visualization.
 */
const buildLineMidpointFeatures = ( collection: GeoJSON.FeatureCollection, layerType: "photo_panels"): 
  GeoJSON.FeatureCollection => {
  const features: GeoJSON.Feature[] = [];
    
  for (const feature of collection.features || []) {
    const props = (feature.properties || {}) as Record<string, any>;

    if (props.__layer !== layerType) continue;

    if (
      props.__layer === "photo_panels" &&
      !hasNonEmptyHyperlink(props)
    ) continue;

    const geometry = feature.geometry;
    if (!geometry) continue;

    if (geometry.type === "LineString") {
      const midpoint = lineMidpoint(geometry.coordinates as number[][]);
      if (midpoint) {
        console.log("Cross plot midpoint:", midpoint, "props:", props);
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



/**
 * Refs were used here instead of state because the Mapbox map object is mutable and 
 * should not trigger React re-renders. Refs allow the map instance to persist across renders.
 */
const Map: React.FC<MapProps> = ({ geojson, showPhotoPanels, showCrossPlots, onFeatureClick }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const mapLoaded = useRef(false);
  // const crossPlotMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const colors =  fanGeologyColors;

  /**
   * This effect runs once and initializes the Mapbox map. The map is configured 
   * with a satellite basemap, a center location, and a zoom level.
   */
  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      //style: "mapbox://styles/mapbox/streets-v11",
      style: "mapbox://styles/mapbox/standard-satellite",
      center: [-104.834853, 31.828347],
      zoom: 8,
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    map.current.on("load", () => {
      mapLoaded.current = true;
    });

    /**
     * This ensures the map instance is properly destroyed when the component unmounts to avoid 
     * memory leaks. 
     */
    return () => {
      map.current?.remove();
      map.current = null;
      mapLoaded.current = false;
    };
  }, []);

  /**
   * Whenever the GeoJSON data or UI settings change, the map udpates its source and layers.
   */
  useEffect(() => {
    if (!map.current) return;

    const data = geojson ?? {
      type: "FeatureCollection",
      features: [],
    };

    // adds photo panel pin for features with corresponding photo
    const addOrUpdatePhotoPin = () => {
      if (!map.current) return;
      if (!map.current.hasImage("photo-panel-pin"))  {
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
      /**
       * This mapbox expression dynamically assigns colors based on the features
       * geological cycle property. This allows styling directly in the map
       * rendering pipeline rather than preprocessing the data. 
       */
      const colorExpression: any = ["match", ["get", "CYCLE"]];
      
      Object.entries(colors).forEach(([cycle, color]) => {
        colorExpression.push(cycle, color);
      });
      
      colorExpression.push("#CCCCCC");

      /**
       * If the source already exists we update it, otherwise we create it, which prevents
       * re-creating the map layers every render.
       */
      if (map.current.getSource("geojson-data")) {
        const source = map.current.getSource(
          "geojson-data"
        ) as mapboxgl.GeoJSONSource;
        source.setData(data);
      } else {

        map.current.addSource("geojson-data", {
          type: "geojson",
          data: data,
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

        //geojson lines
        map.current.addLayer({
          id: "geojson-line",
          type: "line",
          source: "geojson-data",
          paint: {
            "line-color": [
              "case",
              ["==", ["get", "__layer"], "faults"],     // faults
              "#B22222",                              // firebrick red for faults
              colorExpression                         
            ],
            "line-width": [
              "case",
              ["==", ["get", "__layer"], "faults"],
              2,  
              3
            ],
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

        // feature labeling by Cycle
        map.current.addLayer({
          id: "geojson-cycle",
          type: "symbol",
          source: "geojson-data",

          layout: {
            "text-field": ["get", "CYCLE"],
            "text-size": 12,
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#000000",
            "text-halo-width": 2,
            "text-halo-blur": 1
          }
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
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#000000",
            "text-halo-width": 2,
            "text-halo-blur": 1
          } 
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
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#000000",
            "text-halo-width": 2,
            "text-halo-blur": 1
          }
        });

        // feature labeling by section arc for small gis region
        map.current.addLayer({
          id: "section-arc",
          type: "symbol",
          source: "geojson-data",

          layout: {
            "text-field": ["get", "SectionArc"],
            "text-size": 12,
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#000000",
            "text-halo-width": 2,
            "text-halo-blur": 1
          }
        });

        // feature labeling by Gradient for Gradient Regions
        map.current.addLayer({
          id: "gradient-region",
          type: "symbol",
          source: "geojson-data",

          layout: {
            "text-field": ["get", "Gradient"],
            "text-size": 12,
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#000000",
            "text-halo-width": 2,
            "text-halo-blur": 1
          }
        });

        // feature labeling by Gradient for Gradient Regions
        map.current.addLayer({
          id: "pattern-names",
          type: "symbol",
          source: "geojson-data",

          layout: {
            "text-field": ["get", "DESCRIPT"],
            "text-size": 12,
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#000000",
            "text-halo-width": 2,
            "text-halo-blur": 1
          }
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
          "geojson-cycle",
          "geojson-name1",
          "geojson-name2",
          "photo-panels-fill",
          "photo-panels-line",
          "photo-panels-circle",
          "photo-panels-pin",
        ];


          /**
           * When a user clicks a feature we extract its properties and optionally 
           * fetch the associated photo from the backend. The backend is returns 
           * a temp URL for the photo which is then passed to the parent component
           * through the callback.
           */
        layerIds.forEach((layerId) => {
          if (!map.current?.getLayer(layerId)) return;

          map.current.on("click", layerId, async (e) => {
            if (e?.features?.[0]?.properties && onFeatureClick) {
              const properties = e.features[0].properties;
              
              // grab photo
              if (properties.Hyperlink && properties.Hyperlink !== null) {
                try {
                  const res = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/v1/photos/photourl/${properties.Hyperlink}`
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

          /**
           * This changes mouse from cursor to pointer on geological features
           * to let the user know the features are interactive.
           */
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
      
      const photoPanelMidpoints = buildLineMidpointFeatures(data, "photo_panels");

      if (map.current.getSource("photo-panels-line-midpoints")) {
        (
          map.current.getSource("photo-panels-line-midpoints") as mapboxgl.GeoJSONSource
        ).setData(photoPanelMidpoints);
      } else {
        map.current.addSource("photo-panels-line-midpoints", {
          type: "geojson",
          data: photoPanelMidpoints,
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
                  `${import.meta.env.VITE_API_URL}/api/v1/photos/photourl/${properties.Hyperlink}`
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

      const crossPlotLayerIds = [
        "cross-plots-fill",
        "cross-plots-line",
        "cross-plots-pin",
        "cross-plots-multiline",
      ];

      crossPlotLayerIds.forEach((id) => {
        if (map.current?.getLayer(id)) {
          map.current.setLayoutProperty(
            id,
            "visibility",
            showCrossPlots ? "visible" : "none"
          );
        }
      });
    };

    if (mapLoaded.current) {
      addOrUpdatePhotoPin();
    } else {
      map.current.on("load", addOrUpdatePhotoPin);
    }
  }, [geojson, showPhotoPanels, colors]);

  /**
   * This is for crossplots
   */
  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance || !geojson) return;

    // Build crossplot point features
    const crossPlotPoints: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: geojson.features
        .map((feature: any) => {
          const props = feature.properties;
          const layer = props?.__layer;
          const displayName = props?.NAME ?? props?.Name ?? props?.name;

          if (
            layer !== "measured_sections_all_areas" ||
            !displayName ||
            !props?.hasCrossPlot
          ) return null;

          const geometry = feature.geometry;
          let coords: [number, number] | null = null;
          if (!geometry) return null;

          if (geometry.type === "Point") coords = geometry.coordinates;
          else if (geometry.type === "LineString")
            coords = lineMidpoint(geometry.coordinates);
          else if (geometry.type === "MultiLineString" && geometry.coordinates.length > 0)
            coords = lineMidpoint(geometry.coordinates[0]);

          if (!coords) return null;

          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: coords,
            },
            properties: props,
          };
        })
        .filter(Boolean) as GeoJSON.Feature[],
    };

    // Add or update source
    if (mapInstance.getSource("crossplot-points")) {
      (mapInstance.getSource("crossplot-points") as mapboxgl.GeoJSONSource)
        .setData(crossPlotPoints);
    } else {
      mapInstance.addSource("crossplot-points", {
        type: "geojson",
        data: crossPlotPoints,
      });

      // Add layer (pins)
      mapInstance.addLayer({
        id: "crossplot-pins",
        type: "symbol",
        source: "crossplot-points",
        layout: {
          "icon-image": "photo-panel-pin", // reuse your existing pin
          "icon-size": 0.8,
          "icon-allow-overlap": true,
        },
      });
    }

    // Toggle visibility
    if (mapInstance.getLayer("crossplot-pins")) {
      mapInstance.setLayoutProperty(
        "crossplot-pins",
        "visibility",
        showCrossPlots ? "visible" : "none"
      );
    }

}, [geojson, showCrossPlots]);

  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance || !geojson) return;

    // Build photo point features
    const photoPoints: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: geojson.features
        .map((feature: any) => {
          const props = feature.properties;
          const layer = props?.__layer;
          const displayName = props?.NAME ?? props?.Name ?? props?.name;
          const photoUrl = props?.photoUrl;
          const hasPhoto = props?.hasPhoto; // <-- check this property

          // Only features that are photo layer, have displayName, URL, and hasPhoto
          if (!layer || !displayName || !photoUrl || !hasPhoto) return null;

          const geometry = feature.geometry;
          let coords: [number, number] | null = null;
          if (!geometry) return null;

          if (geometry.type === "Point") coords = geometry.coordinates;
          else if (geometry.type === "LineString")
            coords = lineMidpoint(geometry.coordinates);
          else if (geometry.type === "MultiLineString" && geometry.coordinates.length > 0)
            coords = lineMidpoint(geometry.coordinates[0]);

          if (!coords) return null;

          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: coords,
            },
            properties: props,
          };
        })
        .filter(Boolean) as GeoJSON.Feature[],
    };

    // Add or update source
    if (mapInstance.getSource("photo-points")) {
      (mapInstance.getSource("photo-points") as mapboxgl.GeoJSONSource).setData(photoPoints);
    } else {
      mapInstance.addSource("photo-points", {
        type: "geojson",
        data: photoPoints,
      });

      // Add layer (pins)
      mapInstance.addLayer({
        id: "photo-pins",
        type: "symbol",
        source: "photo-points",
        layout: {
          "icon-image": "photo-panel-pin", // your pin icon
          "icon-size": 0.8,
          "icon-allow-overlap": true,
        },
      });
    }

    // Toggle visibility
    if (mapInstance.getLayer("photo-pins")) {
      mapInstance.setLayoutProperty(
        "photo-pins",
        "visibility",
        showPhotoPanels ? "visible" : "none"
      );
    }
  }, [geojson, showPhotoPanels]);
  /**
   * The map itself renders inside this container div. The ref allows Mapbox to mount
   * its WebGL canvas inside the element.
   */
  return <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />;
};

export default Map;