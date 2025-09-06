// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import ShinelStudiosHomepage from "./components/ShinelStudiosHomepage.jsx";
import VideoEditing from "./components/VideoEditing.jsx";
import GFX from "./components/GFX.jsx";
import Thumbnails from "./components/Thumbnails.jsx";
import Shorts from "./components/Shorts.jsx"; // you have this file too
import LoginPage from "./components/LoginPage.jsx"; // ✅ add this

export default function App() {
  return (
    <Routes>
      {/* Homepage */}
      <Route path="/" element={<ShinelStudiosHomepage />} />

      {/* Our Work pages */}
      <Route path="/video-editing" element={<VideoEditing />} />
      <Route path="/gfx" element={<GFX />} />
      <Route path="/thumbnails" element={<Thumbnails />} />
      <Route path="/shorts" element={<Shorts />} />

      {/* ✅ Login page */}
      <Route path="/login" element={<LoginPage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
