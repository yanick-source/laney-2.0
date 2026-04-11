import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { PhotobookPage, PhotoElement, TextElement } from "@/types/editor";

interface PrintJob {
  jobId: string;
  orderId: string;
  pages: PhotobookPage[];
  orderDetails: { bookSize: "small" | "medium" | "large" };
}

const BOOK_CSS = {
  small:  { width: "20cm", height: "20cm"  },
  medium: { width: "30cm", height: "21cm"  },
  large:  { width: "21cm", height: "30cm"  },
};

const SPINE_CSS = "6mm";

function getBackgroundCss(page: PhotobookPage): string {
  const bg = page.background;
  if (bg.type === "gradient")
    return `linear-gradient(${bg.gradientAngle ?? 135}deg, ${bg.value}, ${bg.secondaryValue ?? "#fff"})`;
  if (bg.type === "image")
    return `url("${bg.value}") center/cover no-repeat`;
  return bg.value;
}

function renderElement(el: PhotoElement | TextElement) {
  const base: React.CSSProperties = {
    position:  "absolute",
    left:      `${el.x}%`,
    top:       `${el.y}%`,
    width:     `${el.width}%`,
    height:    `${el.height}%`,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    opacity:   el.opacity,
    zIndex:    el.zIndex,
  };

  if (el.type === "photo") {
    return (
      <div key={el.id} style={{ ...base, overflow: "hidden" }}>
        <img
          src={el.src}
          alt=""
          crossOrigin="anonymous"
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            objectPosition: `${el.cropX ?? 50}% ${el.cropY ?? 50}%`,
            transform: el.cropZoom && el.cropZoom !== 1 ? `scale(${el.cropZoom})` : undefined,
          }}
        />
      </div>
    );
  }

  if (el.type === "text") {
    const j: Record<string, string> = { left: "flex-start", center: "center", right: "flex-end" };
    return (
      <div
        key={el.id}
        style={{
          ...base,
          fontFamily: el.fontFamily, fontSize: `${el.fontSize}px`,
          fontWeight: el.fontWeight, color: el.color,
          textAlign: el.textAlign, lineHeight: el.lineHeight,
          display: "flex", alignItems: "center",
          justifyContent: j[el.textAlign] ?? "flex-start",
          wordBreak: "break-word", whiteSpace: "pre-wrap",
        }}
      >
        {el.content}
      </div>
    );
  }

  return null;
}

function PagePanel({ page, dims }: { page: PhotobookPage; dims: { width: string; height: string } }) {
  return (
    <div
      style={{
        position: "relative", width: dims.width, height: dims.height,
        overflow: "hidden", flexShrink: 0,
        background: getBackgroundCss(page),
      }}
    >
      {[...page.elements]
        .sort((a, b) => a.zIndex - b.zIndex)
        .map(renderElement)}
    </div>
  );
}

export default function PrintCoverPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const apiBase = searchParams.get("api") || "http://localhost:3001";

  const [job, setJob]     = useState<PrintJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    fetch(`${apiBase}/api/print/job/${jobId}`)
      .then((r) => { if (!r.ok) throw new Error(`Job not found (${r.status})`); return r.json(); })
      .then(setJob)
      .catch((e) => setError(e.message));
  }, [jobId, apiBase]);

  if (error) return <div style={{ color: "red", padding: "2rem" }}>Cover error: {error}</div>;
  if (!job)  return <div style={{ padding: "2rem" }}>Loading cover data…</div>;

  const dims = BOOK_CSS[job.orderDetails.bookSize] || BOOK_CSS.medium;
  const firstPage = job.pages[0];
  const lastPage  = job.pages[job.pages.length - 1];

  return (
    // cover-spread = single horizontal strip: [back cover] [spine] [front cover]
    <div
      className="cover-spread"
      style={{
        display:    "flex",
        flexDirection: "row",
        alignItems: "stretch",
        margin:     0,
        padding:    0,
        background: "#fff",
        height:     dims.height,
      }}
    >
      {/* Back cover (last page) */}
      <PagePanel page={lastPage} dims={dims} />

      {/* Spine */}
      <div
        style={{
          width:           SPINE_CSS,
          height:          dims.height,
          flexShrink:      0,
          backgroundColor: "#e0e0e0",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
        }}
      />

      {/* Front cover (first page) */}
      <PagePanel page={firstPage} dims={dims} />
    </div>
  );
}
