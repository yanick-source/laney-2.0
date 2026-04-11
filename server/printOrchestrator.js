const puppeteer = require("puppeteer");
const SFTPClient = require("ssh2-sftp-client");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
const SFTP_HOST = process.env.SFTP_HOST;
const SFTP_PORT = parseInt(process.env.SFTP_PORT || "22");
const SFTP_USERNAME = process.env.SFTP_USERNAME;
const SFTP_PASSWORD = process.env.SFTP_PASSWORD;
const SFTP_PRIVATE_KEY = process.env.SFTP_PRIVATE_KEY; // base64-encoded private key
const SFTP_REMOTE_PATH = process.env.SFTP_REMOTE_PATH || "/incoming";
const PRINT_WEBHOOK_URL = process.env.PRINT_WEBHOOK_URL;

// Book dimensions in CSS pixels at 96dpi for Puppeteer viewport
// Physical sizes: small=20x20cm, medium=30x21cm, large=21x30cm
const BOOK_DIMS = {
  small:  { widthPx: 756,  heightPx: 756,  widthCss: "20cm", heightCss: "20cm"  },
  medium: { widthPx: 1134, heightPx: 794,  widthCss: "30cm", heightCss: "21cm"  },
  large:  { widthPx: 794,  heightPx: 1134, widthCss: "21cm", heightCss: "30cm"  },
};

const SPINE_PX = 24; // ~6mm spine between front and back cover

// ── Main entry point ─────────────────────────────────────────────────────────

async function executePrintJob(job) {
  const { jobId, orderId, orderDetails } = job;
  const bookSize = orderDetails.bookSize || "medium";
  const dims = BOOK_DIMS[bookSize] || BOOK_DIMS.medium;

  const tempDir = path.join(os.tmpdir(), `laney-${jobId}`);
  await fs.mkdir(tempDir, { recursive: true });

  const contentPdfPath = path.join(tempDir, `${orderId}_content.pdf`);
  const coverPdfPath   = path.join(tempDir, `${orderId}_cover.pdf`);
  const manifestPath   = path.join(tempDir, `${orderId}_manifest.json`);

  console.log(`🖨️  Generating PDFs for ${orderId} (${bookSize})…`);

  await generateContentPdf(jobId, dims, contentPdfPath);
  console.log(`   ✓ Content PDF: ${contentPdfPath}`);

  await generateCoverPdf(jobId, dims, coverPdfPath);
  console.log(`   ✓ Cover PDF  : ${coverPdfPath}`);

  const manifest = buildManifest(job);
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`   ✓ Manifest   : ${manifestPath}`);

  if (SFTP_HOST && SFTP_USERNAME) {
    await uploadViaSftp(orderId, contentPdfPath, coverPdfPath, manifestPath);
  } else if (PRINT_WEBHOOK_URL) {
    await sendWebhook(manifest, contentPdfPath, coverPdfPath);
  } else {
    console.warn("⚠️  No SFTP or webhook configured. Files saved to:", tempDir);
  }

  return { tempDir, manifest };
}

// ── Puppeteer: Content PDF (all interior pages) ───────────────────────────────

async function generateContentPdf(jobId, dims, outputPath) {
  const printUrl =
    `${FRONTEND_URL}/print-view/${jobId}` +
    `?api=${encodeURIComponent(BACKEND_URL)}`;

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    // deviceScaleFactor: 2 gives 192dpi — acceptable for a first pass; bump to 3 for 288dpi
    await page.setViewport({ width: dims.widthPx, height: dims.heightPx, deviceScaleFactor: 2 });
    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 90_000 });

    // Wait for at least one .print-page to be rendered
    await page.waitForSelector(".print-page", { timeout: 30_000 });

    // Wait for all images to finish loading
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.querySelectorAll("img")).map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((res) => { img.onload = res; img.onerror = res; })
        )
      )
    );

    await page.pdf({
      path: outputPath,
      printBackground: true,
      width: dims.widthCss,
      height: dims.heightCss,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  } finally {
    await browser.close();
  }
}

// ── Puppeteer: Cover Spread PDF (back | spine | front) ───────────────────────

async function generateCoverPdf(jobId, dims, outputPath) {
  const coverUrl =
    `${FRONTEND_URL}/print-cover/${jobId}` +
    `?api=${encodeURIComponent(BACKEND_URL)}`;

  const spreadWidthPx = dims.widthPx * 2 + SPINE_PX;

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: spreadWidthPx, height: dims.heightPx, deviceScaleFactor: 2 });
    await page.goto(coverUrl, { waitUntil: "networkidle0", timeout: 90_000 });
    await page.waitForSelector(".cover-spread", { timeout: 30_000 });

    await page.evaluate(() =>
      Promise.all(
        Array.from(document.querySelectorAll("img")).map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((res) => { img.onload = res; img.onerror = res; })
        )
      )
    );

    await page.pdf({
      path: outputPath,
      printBackground: true,
      width: `${spreadWidthPx}px`,
      height: `${dims.heightPx}px`,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  } finally {
    await browser.close();
  }
}

// ── Manifest JSON ─────────────────────────────────────────────────────────────

function buildManifest(job) {
  const { orderId, pages, orderDetails } = job;
  const SIZE_LABELS = { small: "20x20cm", medium: "30x21cm", large: "21x30cm" };
  const PRICES      = { small: "29.99",   medium: "39.99",   large: "49.99"   };

  return {
    orderId,
    submittedAt: new Date().toISOString(),
    customer: {
      name:  orderDetails.customerName,
      email: orderDetails.customerEmail,
    },
    specs: {
      size:      SIZE_LABELS[orderDetails.bookSize] || SIZE_LABELS.medium,
      paper:     orderDetails.paper   || "200gsm Gloss",
      binding:   orderDetails.binding || "Softcover",
      pageCount: pages.length,
      price:     PRICES[orderDetails.bookSize] || PRICES.medium,
    },
    files: {
      internal: `${orderId}_content.pdf`,
      cover:    `${orderId}_cover.pdf`,
    },
  };
}

// ── SFTP Upload ───────────────────────────────────────────────────────────────

async function uploadViaSftp(orderId, contentPath, coverPath, manifestPath) {
  const sftp = new SFTPClient();

  const connectOpts = {
    host: SFTP_HOST,
    port: SFTP_PORT,
    username: SFTP_USERNAME,
  };

  if (SFTP_PRIVATE_KEY) {
    // Store private key as base64 in env to keep it on one line
    connectOpts.privateKey = Buffer.from(SFTP_PRIVATE_KEY, "base64");
  } else {
    connectOpts.password = SFTP_PASSWORD;
  }

  try {
    await sftp.connect(connectOpts);
    await sftp.put(contentPath, `${SFTP_REMOTE_PATH}/${orderId}_content.pdf`);
    await sftp.put(coverPath,   `${SFTP_REMOTE_PATH}/${orderId}_cover.pdf`);
    await sftp.put(manifestPath,`${SFTP_REMOTE_PATH}/${orderId}_manifest.json`);
    console.log(`   ✓ SFTP upload complete → ${SFTP_REMOTE_PATH}`);
  } finally {
    await sftp.end();
  }
}

// ── Webhook (alternative to SFTP) ────────────────────────────────────────────

async function sendWebhook(manifest, contentPath, coverPath) {
  const [contentBuf, coverBuf] = await Promise.all([
    fs.readFile(contentPath),
    fs.readFile(coverPath),
  ]);

  const payload = {
    ...manifest,
    files: {
      content_pdf_base64: contentBuf.toString("base64"),
      cover_pdf_base64:   coverBuf.toString("base64"),
    },
  };

  const res = await fetch(PRINT_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Webhook failed: ${res.status} — ${await res.text()}`);
  }
  console.log(`   ✓ Webhook sent → ${PRINT_WEBHOOK_URL}`);
}

module.exports = { executePrintJob };
