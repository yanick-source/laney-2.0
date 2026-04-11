import type { PhotobookPage } from "@/types/editor";

const PRINT_SERVER_URL =
  import.meta.env.VITE_PRINT_SERVER_URL || "http://localhost:3001";

export type BookSize = "small" | "medium" | "large";
export type BindingType = "softcover" | "hardcover";
export type PaperType = "gloss" | "matte" | "velvet";

export interface OrderDetails {
  customerName: string;
  customerEmail: string;
  bookSize: BookSize;
  binding: BindingType;
  paper: PaperType;
}

export interface PrintJobResult {
  jobId: string;
  orderId: string;
}

export interface PrintExecuteResult {
  success: boolean;
  orderId: string;
}

// ── Blob URL → data URL conversion ──────────────────────────────────────────
// Puppeteer runs in a separate process and cannot read blob: URLs created by
// the browser. We convert them to base64 data URLs before sending to the server.

async function blobUrlToDataUrl(blobUrl: string): Promise<string> {
  const res = await fetch(blobUrl);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function normalisePagesForPrint(
  pages: PhotobookPage[]
): Promise<PhotobookPage[]> {
  return Promise.all(
    pages.map(async (page) => ({
      ...page,
      elements: await Promise.all(
        page.elements.map(async (el) => {
          if (el.type === "photo" && el.src.startsWith("blob:")) {
            return { ...el, src: await blobUrlToDataUrl(el.src) };
          }
          return el;
        })
      ),
    }))
  );
}

// ── API calls ────────────────────────────────────────────────────────────────

export async function createPrintJob(
  pages: PhotobookPage[],
  orderDetails: OrderDetails
): Promise<PrintJobResult> {
  const normalisedPages = await normalisePagesForPrint(pages);

  const res = await fetch(`${PRINT_SERVER_URL}/api/print/job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pages: normalisedPages, orderDetails }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Network error" }));
    throw new Error(err.error || `Failed to create print job (${res.status})`);
  }

  return res.json();
}

export async function executePrintJob(
  jobId: string
): Promise<PrintExecuteResult> {
  const res = await fetch(`${PRINT_SERVER_URL}/api/print/execute/${jobId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Print job failed (${res.status})`);
  }

  return res.json();
}

export async function pollJobStatus(
  jobId: string
): Promise<{ status: string; orderId: string; error?: string }> {
  const res = await fetch(`${PRINT_SERVER_URL}/api/print/status/${jobId}`);
  return res.json();
}

// ── One-shot helper used by CheckoutPage ────────────────────────────────────

export async function submitPrintOrder(
  pages: PhotobookPage[],
  orderDetails: OrderDetails
): Promise<{ orderId: string }> {
  const { jobId, orderId } = await createPrintJob(pages, orderDetails);
  await executePrintJob(jobId);
  return { orderId };
}
