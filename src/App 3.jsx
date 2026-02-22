import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import MainPage from "./pages/MainPage";
import TasksPage from "./pages/TasksPage";
import FocusPage from "./pages/FocusPage";
import DiscoverPage from "./pages/DiscoverPage";
import ProfilePage from "./pages/ProfilePage";
import FremontShowsPage from "./pages/FremontShowsPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/focus" element={<FocusPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/fremont-shows" element={<FremontShowsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
