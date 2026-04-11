require("dotenv").config();
const express = require("express");
const cors = require("cors");
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

// ── Health check ────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0" });
});

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
