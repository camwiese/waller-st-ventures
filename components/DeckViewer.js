"use client";

import { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { COLORS, SANS } from "../constants/theme";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDF_OPTIONS = {
  standardFontDataUrl: "/pdf/standard_fonts/",
  cMapUrl: "/pdf/cmaps/",
  cMapPacked: true,
};

export default function DeckViewer({ isMobile, userEmail, pdfUrl }) {
  const [numPages, setNumPages] = useState(null);
  const [error, setError] = useState(false);
  const pageWidth = isMobile ? Math.min(window.innerWidth - 40, 720) : 720;

  const onDocumentLoadSuccess = useCallback(({ numPages: n }) => {
    setNumPages(n);
  }, []);

  if (error) {
    return (
      <div style={{
        fontFamily: SANS,
        fontSize: 14,
        color: COLORS.text500,
        padding: "48px 24px",
        textAlign: "center",
        background: COLORS.gray100,
        borderRadius: 8,
        border: `1px solid ${COLORS.border}`,
      }}>
        Unable to load deck. Please try again later.
      </div>
    );
  }

  return (
    <Document
      file={pdfUrl || "/api/deck"}
      onLoadSuccess={onDocumentLoadSuccess}
      onLoadError={() => setError(true)}
      options={PDF_OPTIONS}
      loading={
        <div style={{
          fontFamily: SANS,
          fontSize: 14,
          color: COLORS.text500,
          padding: "48px 24px",
          textAlign: "center",
        }}>
          Loading deck…
        </div>
      }
    >
      {numPages &&
        Array.from({ length: numPages }, (_, i) => (
          <div
            key={i}
            style={{
              position: "relative",
              marginBottom: i < numPages - 1 ? 16 : 0,
              borderRadius: 4,
              overflow: "hidden",
              border: `1px solid ${COLORS.border}`,
              background: COLORS.white,
            }}
          >
            <Page
              pageNumber={i + 1}
              width={pageWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
            {/* Watermark overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: isMobile ? 14 : 18,
                  fontWeight: 600,
                  color: "rgba(0, 0, 0, 0.06)",
                  transform: "rotate(-30deg)",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.05em",
                  textTransform: "lowercase",
                }}
              >
                {userEmail || ""}
              </div>
            </div>
          </div>
        ))}
    </Document>
  );
}
