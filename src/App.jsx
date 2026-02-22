import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "./lib/auth/RequireAuth";
import SplashPage from "./pages/SplashPage";
import WelcomePage from "./pages/WelcomePage";
import AuthSignupPage from "./pages/AuthSignupPage";
import AuthSigninPage from "./pages/AuthSigninPage";
import OnboardingPreferencesPage from "./pages/OnboardingPreferencesPage";
import OnboardingCalendarPage from "./pages/OnboardingCalendarPage";
import HomeHubPage from "./pages/HomeHubPage";
import ExploreHubPage from "./pages/ExploreHubPage";
import ExploreCategoryPage from "./pages/ExploreCategoryPage";
import ItemInfoPage from "./pages/ItemInfoPage";
import MyEventsPage from "./pages/MyEventsPage";
import GroupsPage from "./pages/GroupsPage";
import StudyPage from "./pages/StudyPage";
import ConnectCanvasPage from "./pages/ConnectCanvasPage";
import PlansNewPage from "./pages/PlansNewPage";
import PlanResultsPage from "./pages/PlanResultsPage";
import PlanCardPage from "./pages/PlanCardPage";
import JoinInvitePage from "./pages/JoinInvitePage";
import JamPage from "./pages/JamPage";
import AIPage from "./pages/AIPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/splash" replace />} />
        <Route path="/splash" element={<SplashPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/auth/signup" element={<AuthSignupPage />} />
        <Route path="/auth/signin" element={<AuthSigninPage />} />

        <Route
          path="/onboarding/preferences"
          element={
            <RequireAuth allowOnboardingRoutes>
              <OnboardingPreferencesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/onboarding/calendar"
          element={
            <RequireAuth allowOnboardingRoutes>
              <OnboardingCalendarPage />
            </RequireAuth>
          }
        />

        <Route
          path="/home"
          element={
            <RequireAuth>
              <HomeHubPage />
            </RequireAuth>
          }
        />
        <Route
          path="/explore"
          element={
            <RequireAuth>
              <ExploreHubPage />
            </RequireAuth>
          }
        />
        <Route
          path="/explore/:category"
          element={
            <RequireAuth>
              <ExploreCategoryPage />
            </RequireAuth>
          }
        />
        <Route
          path="/item/:itemId"
          element={
            <RequireAuth>
              <ItemInfoPage />
            </RequireAuth>
          }
        />
        <Route
          path="/my-events"
          element={
            <RequireAuth>
              <MyEventsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/groups"
          element={
            <RequireAuth>
              <GroupsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/study"
          element={
            <RequireAuth>
              <StudyPage />
            </RequireAuth>
          }
        />
        <Route
          path="/connect/canvas"
          element={
            <RequireAuth>
              <ConnectCanvasPage />
            </RequireAuth>
          }
        />
        <Route
          path="/plans/new"
          element={
            <RequireAuth>
              <PlansNewPage />
            </RequireAuth>
          }
        />
        <Route
          path="/plans/results/:requestId"
          element={
            <RequireAuth>
              <PlanResultsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/plans/:planId"
          element={
            <RequireAuth>
              <PlanCardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/join/:token"
          element={
            <RequireAuth allowOnboardingRoutes>
              <JoinInvitePage />
            </RequireAuth>
          }
        />
        <Route
          path="/jam/:code"
          element={
            <RequireAuth allowOnboardingRoutes>
              <JamPage />
            </RequireAuth>
          }
        />
        <Route
          path="/ai"
          element={
            <RequireAuth>
              <AIPage />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          }
        />

        <Route path="/discover" element={<Navigate to="/explore" replace />} />
        <Route path="/tasks" element={<Navigate to="/study" replace />} />
        <Route path="/focus" element={<Navigate to="/study" replace />} />
        <Route path="/planner" element={<Navigate to="/plans/new" replace />} />
        <Route path="/places" element={<Navigate to="/explore" replace />} />
        <Route path="/events" element={<Navigate to="/explore/concerts" replace />} />
        <Route path="/fremont-shows" element={<Navigate to="/explore/concerts" replace />} />
        <Route path="*" element={<Navigate to="/splash" replace />} />
      </Routes>
    </Router>
  );
}
