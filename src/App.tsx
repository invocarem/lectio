import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { ContentsPage } from "./pages/ContentsPage";
import { LectioPage } from "./pages/LectioPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/contents" element={<ContentsPage />} />
      <Route path="/lectio/:chapterId/:passageIndex?" element={<LectioPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
