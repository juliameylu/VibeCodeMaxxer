import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/Landing/LandingPage";
import PlannerPage from "./pages/Planner/PlannerPage";
import LoginPage from "./pages/Auth/LoginPage";
import PlacesPage from "./pages/Places/PlacesPage";
import EventsPage from "./pages/Events/EventsPage";
import TasksPage from "./pages/Flow/TasksPage";
import FocusPage from "./pages/Flow/FocusPage";
import DiscoverPage from "./pages/Flow/DiscoverPage";
import ProfilePage from "./pages/Flow/ProfilePage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/places" element={<PlacesPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/focus" element={<FocusPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
