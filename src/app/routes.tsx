import { createBrowserRouter } from "react-router";
import { Root } from "./Root";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { Preferences } from "./pages/Preferences";
import { Explore } from "./pages/Explore";
import { SignIn } from "./pages/SignIn";
import { NotFound } from "./pages/NotFound";
import { Profile } from "./pages/Profile";
import { EventInfo } from "./pages/EventInfo";
import { Deadlines } from "./pages/Deadlines";
import { MyEvents } from "./pages/MyEvents";
import { Groups } from "./pages/Groups";
import { Jarvis } from "./pages/Jarvis";
import { Jams } from "./pages/Jams";
import { Tutorial } from "./pages/Tutorial";
import { Plans } from "./pages/Plans";
import { Friends } from "./pages/Friends";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Landing },
      { path: "landing", Component: Landing },
      { path: "dashboard", Component: Dashboard },
      { path: "preferences", Component: Preferences },
      { path: "explore", Component: Explore },
      { path: "event/:id", Component: EventInfo },
      { path: "signin", Component: SignIn },
      { path: "profile", Component: Profile },
      { path: "deadlines", Component: Deadlines },
      { path: "myevents", Component: MyEvents },
      { path: "groups", Component: Groups },
      { path: "jarvis", Component: Jarvis },
      { path: "ai", Component: Jarvis },
      { path: "jams", Component: Jams },
      { path: "tutorial", Component: Tutorial },
      { path: "plans", Component: Plans },
      { path: "friends", Component: Friends },
      { path: "*", Component: NotFound },
    ],
  },
]);
