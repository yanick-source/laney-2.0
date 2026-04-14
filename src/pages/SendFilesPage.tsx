import { useState, useRef, useCallback } from "react";
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2, Send } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

const PRINT_SERVER_URL =
  import.meta.env.VITE_PRINT_SERVER_URL || "http://localhost:3001";

interface SelectedFile {
  file: File;
  id: string;
}

type Status = "idle" | "sending" | "success" | "error";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(name: string) {
  if (name.endsWith(".pdf")) return "📄";
  if (name.match(/\.(jpg|jpeg|png|webp)$/i)) return "🖼️";
  if (name.endsWith(".json")) return "📋";
  return "📎";
}

export default function SendFilesPage() {
  const [files, setFiles]         = useState<SelectedFile[]>([]);
  const [orderId, setOrderId]     = useState("");
  const [notes, setNotes]         = useState("");
  const [status, setStatus]       = useState<Status>("idle");
  const [resultMsg, setResultMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.file.name + f.file.size));
      const fresh = arr
        .filter((f) => !existing.has(f.name + f.size))
        .map((f) => ({ file: f, id: Math.random().toString(36).slice(2) }));
      return [...prev, ...fresh].slice(0, 10);
    });
  }, []);

  const removeFile = (id: string) =>
    setFiles((prev) => prev.filter((f) => f.id !== id));

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;

    setStatus("sending");
    const formData = new FormData();
    files.forEach(({ file }) => formData.append("files", file));
    formData.append("orderId", orderId.trim());
    formData.append("notes",   notes.trim());

    try {
      const res  = await fetch(`${PRINT_SERVER_URL}/api/send-files`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");

      setResultMsg(
        data.savedTo
          ? `Files saved locally:\n${data.savedTo}`
          : `Sent! Order ID: ${data.orderId} · ${data.fileCount} file(s) delivered`
      );
      setStatus("success");
      setFiles([]);
      setOrderId("");
      setNotes("");
    } catch (err) {
      setResultMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader />

      {/* Hero */}
      <div className="bg-gradient-to-b from-laney-peach/70 to-background py-12 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl icon-gradient-bg flex items-center justify-center mx-auto mb-4">
          <Send size={24} className="text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Send Files</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Upload files directly to the printer via SFTP or webhook.
        </p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Server: <span className="font-mono">{PRINT_SERVER_URL}</span>
        </p>
      </div>

      <div className="flex-1 flex justify-center px-6 py-10">
        <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-6">

          {/* Drop zone */}
          <div
            className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
          >
            <Upload size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="font-semibold text-foreground">
              Drag &amp; drop files here
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or <span className="text-primary font-medium">click to browse</span>
            </p>
            <p className="text-xs text-muted-foreground/60 mt-2">
              PDF, JPG, PNG, JSON · up to 10 files
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.json"
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="card-elevated p-4 space-y-2">
              {files.map(({ file, id }) => (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{fileIcon(file.name)}</span>
                    <span className="text-sm font-medium truncate">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Metadata */}
          <div className="card-elevated p-5 space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Order ID <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. ORD-20240414"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Notes <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 200gsm gloss, hardcover, rush order"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Result banner */}
          {status === "success" && (
            <div className="flex items-start gap-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4">
              <CheckCircle size={18} className="text-green-600 mt-0.5 shrink-0" />
              <pre className="text-sm text-green-700 dark:text-green-400 whitespace-pre-wrap font-sans">
                {resultMsg}
              </pre>
            </div>
          )}
          {status === "error" && (
            <div className="flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4">
              <AlertCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{resultMsg}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={files.length === 0 || status === "sending"}
            className="btn-gradient rounded-xl px-6 py-3.5 text-sm font-semibold w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {status === "sending" ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending {files.length} file{files.length !== 1 ? "s" : ""}…
              </>
            ) : (
              <>
                <Send size={16} />
                Send {files.length > 0 ? `${files.length} file${files.length !== 1 ? "s" : ""}` : "files"} to printer
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
}
