import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import MainPage from "./pages/MainPage";
import PlannerPage from "./pages/Planner/PlannerPage";
import PlacesPage from "./pages/Places/PlacesPage";
import EventsPage from "./pages/Events/EventsPage";
import TasksPage from "./pages/TasksPage";
import FocusPage from "./pages/FocusPage";
import DiscoverPage from "./pages/DiscoverPage";
import ProfilePage from "./pages/ProfilePage";
import FremontShowsPage from "./pages/FremontShowsPage";
import LoginPage from "./pages/Auth/LoginPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/places" element={<PlacesPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/focus" element={<FocusPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/fremont-shows" element={<FremontShowsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
