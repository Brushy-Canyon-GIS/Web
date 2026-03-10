// src/components/NavBar.tsx
import React from "react";

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

interface NavBarProps {
  selectedLayers: Layer[];
  handleLayerChange: (layer: Layer) => void;
}

const NavBar: React.FC<NavBarProps> = ({ selectedLayers, handleLayerChange }) => {
  const layers = [
    // { key: "atlas_maps", label: "Atlas Map" },
    { key: "fan_geology", label: "Geologic Map" },
    { key: "measured_sections_all_areas", label: "Measured Sections" },
    { key: "photo_panels", label: "Photo Panels" },
    { key: "cross_sections", label: "Cross Sections" },
    { key: "faults", label: "Faults" },
    // { key: "brushy_intersect_final2", label: "Brushy Intersect Final 2" },
    { key: "fan_delivery_system", label: "Fan Delivery System" },
    { key: "fieldtripstops", label: "Field Trip Stops" },
    { key: "ftrip_m", label: "Field Trip Markers" },
    { key: "gis_region_large", label: "Large GIS Regions" },
    { key: "gis_region_small", label: "Small GIS Regions" },
    { key: "gradient_regions", label: "Gradient Regions" },
    { key: "patterns", label: "Patterns" },
    // { key: "cutoffmeasuredsections", label: "Cut Off Measured Sections" },
  ];

  return (
    <div className="options-panel">
      <h3 className="options-title">Map Layers for Brushy Canyon</h3>
      <div className="options-list">
        {layers.map(({ key, label }) => (
          <label key={key} className="layer-option">
            <input
              type="checkbox"
              value={key}
              checked={selectedLayers.includes(key as Layer)}
              onChange={() => handleLayerChange(key as Layer)}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
};

export default NavBar;