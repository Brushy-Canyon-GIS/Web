import React, { useState } from "react";

const API_BASE = "http://localhost:8000/api/v1";

interface FeatureDetailsProps {
  properties: Record<string, any>;
  photoUrl: string | null;
  onBack: () => void;
}

const FeatureDetails: React.FC<FeatureDetailsProps> = ({
  properties,
  photoUrl,
  onBack,
}) => {
  const displayName =
    properties.NAME ?? properties.Name ?? properties.name ?? "";
  const crossPlotUrl = displayName
    ? `${API_BASE}/crossplots/${encodeURIComponent(displayName)}`
    : null;
  const [crossPlotError, setCrossPlotError] = useState(false);

  return (
    <div className="feature-details">
      <button
        onClick={onBack}
        className="back-button"
        style={{
          padding: "8px 16px",
          marginBottom: "16px",
          cursor: "pointer",
          border: "1px solid #ccc",
          borderRadius: "4px",
          background: "white",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        ← Back
      </button>

      <div className="details-content">
        <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Feature Details</h3>

        <div className="detail-item" style={{ marginBottom: "12px" }}>
          <strong>Name:</strong>
          <div style={{ marginTop: "4px" }}>{properties.Name ?? properties.NAME ?? "N/A"}</div>
        </div>

        <div className="detail-item" style={{ marginBottom: "12px" }}>
          <strong>Cycle:</strong>
          <div style={{ marginTop: "4px" }}>{properties.CYCLE || "N/A"}</div>
        </div>

        <div className="detail-item" style={{ marginBottom: "12px" }}>
          <strong>Fourth Order:</strong>
          <div style={{ marginTop: "4px" }}>
            {properties.FOURTH_ORD || "N/A"}
          </div>
        </div>

        {crossPlotUrl && !crossPlotError && (
          <div style={{ marginBottom: "20px" }}>
            <strong style={{ display: "block", marginBottom: "8px", color: "#666" }}>
              Cross plot (mean grain size vs thickness by facies):
            </strong>
            <img
              src={crossPlotUrl}
              alt={`Cross plot for ${displayName}`}
              style={{
                width: "100%",
                height: "auto",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                display: "block",
              }}
              onError={() => setCrossPlotError(true)}
            />
          </div>
        )}

     {photoUrl && (
         <strong
              style={{ display: "block", marginBottom: "8px", color: "#666" }}
            >
              Hyperlink Image:
            </strong>
          )}

        {photoUrl && (
          <div style={{ marginBottom: "20px" }}>
            <a href={photoUrl} target="_blank">
            <img
              src={photoUrl}
              alt="Hyperlink"
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "none", 
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                display: "block",
                objectFit: "contain", 
              }}
              onError={(e) => {
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                  parent.innerHTML = `<a href="${photoUrl}" target="_blank" rel="noopener noreferrer" style="color: #0066cc; word-break: break-all;">View Link →</a>`;
                }
              }}
            />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeatureDetails;