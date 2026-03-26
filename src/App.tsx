import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import UploadPage from "@/pages/UploadPage";
import ProcessingPage from "@/pages/ProcessingPage";
import EditorPage from "@/pages/EditorPage";
import CheckoutPage from "@/pages/CheckoutPage";

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
        <Route path="*" element={<Navigate to="/upload" replace />} />
      </Routes>
    </>
  );
}
