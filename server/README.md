# Laney Print Server

Node.js backend that receives a photobook order, renders it to print-ready PDFs using Puppeteer, and delivers the files to the printer via SFTP or webhook.

## Architecture

```
React App (Vercel)          Print Server (Railway/Render)
─────────────────           ──────────────────────────────
CheckoutPage
  │ POST /api/print/job ──► store job in memory, return jobId
  │ POST /api/print/execute ► Puppeteer opens /print-view/:jobId
  │                           → renders all book pages at print quality
  │                           → generates content.pdf + cover.pdf
  │                           → builds order_manifest.json
  │                           → uploads 3 files via SFTP (or webhook)
  ◄ { success, orderId } ───
```

## Setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your values
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `FRONTEND_URL` | ✅ | Your Vercel app URL (e.g. https://laney.vercel.app) |
| `BACKEND_URL` | ✅ | This server's URL (e.g. https://laney-print.railway.app) |
| `SFTP_HOST` | ⬜ | Printer SFTP host (Option A) |
| `SFTP_USERNAME` | ⬜ | Printer SFTP username |
| `SFTP_PASSWORD` | ⬜ | Printer SFTP password |
| `SFTP_REMOTE_PATH` | ⬜ | Remote directory (default: `/incoming`) |
| `PRINT_WEBHOOK_URL` | ⬜ | Webhook URL to POST files to (Option B) |

Set either SFTP **or** PRINT_WEBHOOK_URL. If neither is set, files are saved to the OS temp directory for debugging.

## Deploy to Railway

1. Push this `/server` folder to a separate GitHub repo (or use a monorepo)
2. Create a new Railway project → Deploy from GitHub
3. Add all environment variables in Railway dashboard
4. Railway will run `npm start` automatically

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/print/job` | Create print job, returns `{ jobId, orderId }` |
| GET | `/api/print/job/:jobId` | Get job data (used by Puppeteer print view) |
| POST | `/api/print/execute/:jobId` | Run Puppeteer + SFTP/webhook |
| GET | `/api/print/status/:jobId` | Poll job status |
