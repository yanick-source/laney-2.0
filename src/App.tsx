import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import UploadPage from "@/pages/UploadPage";
import ProcessingPage from "@/pages/ProcessingPage";
import EditorPage from "@/pages/EditorPage";
import CheckoutPage from "@/pages/CheckoutPage";
import PrintViewPage from "@/pages/PrintViewPage";
import PrintCoverPage from "@/pages/PrintCoverPage";
import SendFilesPage from "@/pages/SendFilesPage";

export default function App() {
  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        <Route path="/" element={<Navigate to="/upload" replace />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/start" element={<Navigate to="/upload" replace />} />
        <Route path="/:sessionId" element={<ProcessingPage />} />
        <Route path="/editor/:bookId" element={<EditorPage />} />
        <Route path="/checkout/:bookId" element={<CheckoutPage />} />
        <Route path="/sendfiles" element={<SendFilesPage />} />
        {/* Print-only routes — navigated to by Puppeteer on the print server */}
        <Route path="/print-view/:jobId" element={<PrintViewPage />} />
        <Route path="/print-cover/:jobId" element={<PrintCoverPage />} />
        <Route path="*" element={<Navigate to="/upload" replace />} />
      </Routes>
    </>
  );
}
