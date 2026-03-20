import React, { useState, useCallback, useEffect } from "react";

//now uses the same base url as the rest of the app (if VITE_API_URL is missing, it defaults to http://localhost:8000)
const API_BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/api/v1`;

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

  
    // --- Cross Plot States ---
  const [crossPlotError, setCrossPlotError] = useState(false);
  const [crossPlotLoaded, setCrossPlotLoaded] = useState(false);
  const [crossPlotModalOpen, setCrossPlotModalOpen] = useState(false);

  // --- Photo States ---
  const [photoError, setPhotoError] = useState(false);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  // --- Callbacks ---
  const handleCrossPlotError = useCallback(() => setCrossPlotError(true), []);
  const handleCrossPlotLoad = useCallback(() => {
    setCrossPlotLoaded(true);
    setCrossPlotModalOpen(true);
  }, []);

  const handlePhotoError = useCallback(() => setPhotoError(true), []);
  const handlePhotoLoad = useCallback(() => {
    setPhotoLoaded(true);
    setPhotoModalOpen(true);
  }, []);

  useEffect(() => {
    setCrossPlotError(false);
    setCrossPlotLoaded(false);
    setCrossPlotModalOpen(false);

    setPhotoError(false);
    setPhotoLoaded(false);
    setPhotoModalOpen(false);
  }, [displayName, photoUrl]);

  return (
      <div
        className="feature-details"
        style={{ minWidth: "150px" }}
      >
      
      <button
        onClick={onBack}
        className="back-button"
        style={{
          marginTop: "60px",
          marginBottom: "16px",
          minWidth: "100px",
          background: "white",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 16px",
          cursor: "pointer",
          border: "1px solid #666",
          borderRadius: "6px",
          fontWeight: 500,
        }}
      >
        Back
      </button>

      <div className="details-content"> 
        <h4 style={{ marginTop: 0, marginBottom: "16px"}}>Feature Details</h4>

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
          <>
            <img
              src={crossPlotUrl}
              alt=""
              aria-hidden
              style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
              onLoad={handleCrossPlotLoad}
              onError={handleCrossPlotError}
            />
          </>
        )}

        {/* {crossPlotUrl && crossPlotError && (
          <p style={{ color: "#666", marginTop: 8, marginBottom: 16 }}>
            Cross plot unavailable for this section.
          </p>
        )} */}

        {crossPlotLoaded && crossPlotUrl && !crossPlotError && (
          <div style={{ marginBottom: "20px" }}>
            <button
              type="button"
              onClick={() => setCrossPlotModalOpen(true)}
              style={{
                padding: "10px 16px",
                cursor: "pointer",
                border: "1px solid #666",
                borderRadius: "6px",
                background: "#f5f5f5",
                fontWeight: 500,
              }}
            >
              Cross Plot
            </button>
          </div>
        )}

        {crossPlotModalOpen && crossPlotUrl && crossPlotLoaded && !crossPlotError && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cross plot"
            onClick={() => setCrossPlotModalOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0,0,0,0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              boxSizing: "border-box",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                maxWidth: "95vw",
                maxHeight: "95vh",
                background: "white",
                borderRadius: "12px",
                boxShadow: "0 8px 32px rgba(185, 184, 184, 0.4)",
                overflow: "auto",
              }}
            >
              <div
                style={{
                  padding: "16px 48px 8px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid #eee",
                }}
              >
                <strong>
                  Cross plot — {properties.Name ?? properties.NAME ?? displayName}
                </strong>
                <button
                  type="button"
                  onClick={() => setCrossPlotModalOpen(false)}
                  aria-label="Close"
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    width: "32px",
                    height: "32px",
                    padding: 0,
                    border: "none",
                    borderRadius: "4px",
                    background: "#afa0a0",
                    cursor: "pointer",
                    fontSize: "18px",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
              <img
                src={crossPlotUrl}
                alt={`Cross plot for ${displayName}`}
                style={{
                  display: "block",
                  width: "100%",
                  maxWidth: "900px",
                  height: "auto",
                  padding: "16px",
                }}
              />
            </div>
          </div>
        )}

                {/* --- Photo Preload & Modal --- */}
        {photoUrl && !photoError && (
          <img
            src={photoUrl}
            alt=""
            aria-hidden
            style={{ display: "none" }}
            onLoad={handlePhotoLoad}
            onError={handlePhotoError}
          />
        )}

        {photoLoaded && photoUrl && !photoError && (
          <button
            onClick={() => setPhotoModalOpen(true)}
            style={{
              padding: "10px 16px",
              cursor: "pointer",
              border: "1px solid #666",
              borderRadius: "6px",
              background: "#f5f5f5",
              fontWeight: 500,
              marginTop: "12px",
            }}
          >
            Photo
          </button>
        )}

        {photoModalOpen && photoUrl && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Photo"
            onClick={() => setPhotoModalOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(122, 116, 116, 0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              boxSizing: "border-box",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                maxWidth: "95vw",
                maxHeight: "95vh",
                background: "white",
                borderRadius: "12px",
                boxShadow: "0 8px 32px rgba(111, 109, 109, 0.4)",
                overflow: "auto",
              }}
            >
              <div style={{ padding: "16px 48px 8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #989494" }}>
                <strong>Photo — {displayName}</strong>
                <button
                  onClick={() => setPhotoModalOpen(false)}
                  aria-label="Close"
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    width: "32px",
                    height: "32px",
                    padding: 0,
                    border: "none",
                    borderRadius: "4px",
                    background: "#afa0a0",   // same style as your other modal
                    color: "#fff",           // 👈 makes the X visible
                    cursor: "pointer",
                    fontSize: "18px",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
              <img
                src={photoUrl}
                alt={`Photo for ${displayName}`}
                style={{ display: "block", width: "100%", maxWidth: "900px", height: "auto", padding: "16px" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeatureDetails;