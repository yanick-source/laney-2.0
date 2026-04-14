require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { executePrintJob } = require("./printOrchestrator");

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory job store (replace with Redis/DB for production at scale)
const jobs = new Map();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "100mb" }));

// ── Static admin UI ─────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));

// ── Health check ────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0" });
});

// ── Direct file send ─────────────────────────────────────────────────────────
// POST /api/send-files  (multipart/form-data)
// Fields: files (1–10 files), orderId (optional), notes (optional)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024, files: 10 }, // 200 MB per file
});

app.post("/api/send-files", upload.array("files", 10), async (req, res) => {
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  const orderId = req.body.orderId || `MANUAL-${Date.now()}`;
  const notes   = req.body.notes   || "";

  console.log(`📂 Manual file send: ${orderId} (${files.length} file(s))`);
  files.forEach((f) => console.log(`   • ${f.originalname} (${(f.size / 1024).toFixed(1)} KB)`));

  const SFTP_HOST     = process.env.SFTP_HOST;
  const SFTP_USERNAME = process.env.SFTP_USERNAME;
  const PRINT_WEBHOOK_URL = process.env.PRINT_WEBHOOK_URL;

  try {
    if (SFTP_HOST && SFTP_USERNAME) {
      await uploadFilesViaSftp(orderId, files);
    } else if (PRINT_WEBHOOK_URL) {
      await sendFilesViaWebhook(orderId, files, notes);
    } else {
      // Save to temp dir for inspection
      const os  = require("os");
      const fs  = require("fs").promises;
      const dir = require("path").join(os.tmpdir(), `laney-manual-${orderId}`);
      await fs.mkdir(dir, { recursive: true });
      for (const f of files) {
        await fs.writeFile(require("path").join(dir, f.originalname), f.buffer);
      }
      console.log(`   ✓ Saved to ${dir}`);
      return res.json({ success: true, orderId, savedTo: dir });
    }

    res.json({ success: true, orderId, fileCount: files.length });
  } catch (err) {
    console.error("File send failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

async function uploadFilesViaSftp(orderId, files) {
  const SFTPClient = require("ssh2-sftp-client");
  const sftp = new SFTPClient();
  const connectOpts = {
    host:     process.env.SFTP_HOST,
    port:     parseInt(process.env.SFTP_PORT || "22"),
    username: process.env.SFTP_USERNAME,
    password: process.env.SFTP_PASSWORD,
  };
  if (process.env.SFTP_PRIVATE_KEY) {
    connectOpts.privateKey = Buffer.from(process.env.SFTP_PRIVATE_KEY, "base64");
    delete connectOpts.password;
  }
  const remotePath = process.env.SFTP_REMOTE_PATH || "/incoming";
  try {
    await sftp.connect(connectOpts);
    for (const f of files) {
      const dest = `${remotePath}/${orderId}_${f.originalname}`;
      await sftp.put(f.buffer, dest);
      console.log(`   ✓ SFTP → ${dest}`);
    }
  } finally {
    await sftp.end();
  }
}

async function sendFilesViaWebhook(orderId, files, notes) {
  const payload = {
    orderId,
    notes,
    submittedAt: new Date().toISOString(),
    files: files.map((f) => ({
      name: f.originalname,
      mimeType: f.mimetype,
      data_base64: f.buffer.toString("base64"),
    })),
  };
  const res = await fetch(process.env.PRINT_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Webhook failed: ${res.status} — ${await res.text()}`);
  console.log(`   ✓ Webhook → ${process.env.PRINT_WEBHOOK_URL}`);
}

// ── 1. Create print job (store data, return jobId) ──────────────────────────
app.post("/api/print/job", (req, res) => {
  const { pages, orderDetails } = req.body;
  if (!pages || !orderDetails) {
    return res.status(400).json({ error: "Missing pages or orderDetails" });
  }

  const jobId = uuidv4();
  const orderId = `ORD-${Date.now()}`;

  jobs.set(jobId, {
    jobId,
    orderId,
    pages,
    orderDetails,
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  // Auto-clean after 2 hours
  setTimeout(() => jobs.delete(jobId), 2 * 60 * 60 * 1000);

  console.log(`📋 Print job created: ${orderId} (${pages.length} pages)`);
  res.json({ jobId, orderId });
});

// ── 2. Get job data (called by the React /print-view page) ──────────────────
app.get("/api/print/job/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

// ── 3. Execute the print job: Puppeteer → PDF → SFTP/Webhook ────────────────
app.post("/api/print/execute/:jobId", async (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });

  if (job.status === "processing") {
    return res.status(409).json({ error: "Job already processing" });
  }

  try {
    jobs.set(job.jobId, { ...job, status: "processing" });

    const result = await executePrintJob(job);

    jobs.set(job.jobId, { ...job, status: "completed", result });
    console.log(`✅ Print job completed: ${job.orderId}`);
    res.json({ success: true, orderId: job.orderId, ...result });
  } catch (error) {
    jobs.set(job.jobId, { ...job, status: "failed", error: error.message });
    console.error(`❌ Print job failed: ${job.orderId}`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── 4. Poll job status ───────────────────────────────────────────────────────
app.get("/api/print/status/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json({ status: job.status, orderId: job.orderId, error: job.error });
});

app.listen(PORT, () => {
  console.log(`🖨️  Laney Print Server running on port ${PORT}`);
  console.log(`   Frontend URL : ${process.env.FRONTEND_URL || "(not set)"}`);
  console.log(`   SFTP host    : ${process.env.SFTP_HOST || "(not set — webhook mode)"}`);
  console.log(`   Webhook URL  : ${process.env.PRINT_WEBHOOK_URL || "(not set)"}`);
});
