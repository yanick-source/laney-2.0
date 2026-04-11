import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { PhotobookPage, PhotoElement, TextElement } from "@/types/editor";

interface PrintJob {
  jobId: string;
  orderId: string;
  pages: PhotobookPage[];
  orderDetails: {
    bookSize: "small" | "medium" | "large";
    customerName: string;
    customerEmail: string;
    binding?: string;
    paper?: string;
  };
}

// Physical CSS dimensions per book size (used by Puppeteer's page.pdf())
const BOOK_CSS = {
  small:  { width: "20cm", height: "20cm"  },
  medium: { width: "30cm", height: "21cm"  },
  large:  { width: "21cm", height: "30cm"  },
};

function getBackgroundCss(page: PhotobookPage): string {
  const bg = page.background;
  if (bg.type === "gradient") {
    return `linear-gradient(${bg.gradientAngle ?? 135}deg, ${bg.value}, ${bg.secondaryValue ?? "#fff"})`;
  }
  if (bg.type === "image") {
    return `url("${bg.value}") center/cover no-repeat`;
  }
  return bg.value;
}

function renderElement(el: PhotoElement | TextElement) {
  const base: React.CSSProperties = {
    position: "absolute",
    left:     `${el.x}%`,
    top:      `${el.y}%`,
    width:    `${el.width}%`,
    height:   `${el.height}%`,
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
            width:          "100%",
            height:         "100%",
            objectFit:      "cover",
            objectPosition: `${el.cropX ?? 50}% ${el.cropY ?? 50}%`,
            transform:
              el.cropZoom && el.cropZoom !== 1
                ? `scale(${el.cropZoom})`
                : undefined,
          }}
        />
      </div>
    );
  }

  if (el.type === "text") {
    const justifyMap: Record<string, string> = {
      left: "flex-start", center: "center", right: "flex-end",
    };
    return (
      <div
        key={el.id}
        style={{
          ...base,
          fontFamily:  el.fontFamily,
          fontSize:    `${el.fontSize}px`,
          fontWeight:  el.fontWeight,
          color:       el.color,
          textAlign:   el.textAlign,
          lineHeight:  el.lineHeight,
          display:     "flex",
          alignItems:  "center",
          justifyContent: justifyMap[el.textAlign] ?? "flex-start",
          wordBreak:   "break-word",
          whiteSpace:  "pre-wrap",
        }}
      >
        {el.content}
      </div>
    );
  }

  return null;
}

export default function PrintViewPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const apiBase = searchParams.get("api") || "http://localhost:3001";

  const [job, setJob]     = useState<PrintJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    fetch(`${apiBase}/api/print/job/${jobId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Job not found (${r.status})`);
        return r.json();
      })
      .then(setJob)
      .catch((e) => setError(e.message));
  }, [jobId, apiBase]);

  if (error) {
    return (
      <div style={{ fontFamily: "sans-serif", padding: "2rem", color: "red" }}>
        Print error: {error}
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
        Loading print data…
      </div>
    );
  }

  const bookSize = job.orderDetails.bookSize || "medium";
  const dims = BOOK_CSS[bookSize] || BOOK_CSS.medium;

  return (
    <div style={{ margin: 0, padding: 0, background: "#fff" }}>
      {job.pages.map((page) => (
        <div
          key={page.id}
          className="print-page"
          style={{
            position:      "relative",
            width:         dims.width,
            height:        dims.height,
            overflow:      "hidden",
            background:    getBackgroundCss(page),
            pageBreakAfter: "always",
            breakAfter:    "page",
          }}
        >
          {[...page.elements]
            .sort((a, b) => a.zIndex - b.zIndex)
            .map(renderElement)}
        </div>
      ))}
    </div>
  );
}
