import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Sun, Cloud, CloudRain, CloudSnow, Wind, MapPin, Pin, X, Compass, Car, Bus, Plus, Navigation, HelpCircle, ChevronDown, ChevronUp, Calendar, Clock, Map, Sparkles, Users, ClipboardList, Camera, LocateFixed } from "lucide-react";
import { places, getDistanceMiles, CAL_POLY_LAT, CAL_POLY_LNG, Place } from "../data/places";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "/utils/supabase/client";
import { BottomNav } from "../components/BottomNav";
import { JarvisLogo } from "../components/JarvisLogo";
import { MustangIcon } from "../components/MustangIcon";
import { PageHeader } from "../components/PageHeader";
import { getUserPreferences, getPreferenceScore, getPersonalizedGreeting } from "../utils/preferences";

const JAMS_KEY = "polyjarvis_jams";

const TASKS_KEY = "polyjarvis_tasks";
const VISITED_KEY = "polyjarvis_visited";
const FRIENDS_KEY = "polyjarvis_friends";
const LEGACY_SEED_CLEANUP_KEY = "polyjarvis_seed_cleanup_v1";
const HOME_LOCATION_KEY = "polyjarvis_home_location";

interface Task {
  id: string;
  course: string;
  name: string;
  dueTime: string;
  dueDate: string;
  priority: boolean;
  done: boolean;
}

interface VisitedPlace {
  id: string;
  name: string;
  visitedAt: string;
  minutesSpent: number;
}

type HomeLocation = {
  label: string;
  lat: number;
  lng: number;
};

type NominatimSearchResult = {
  display_name: string;
  lat: string;
  lon: string;
};

const defaultTasks: Task[] = [];

const insideFilters = [
  { id: "quick", label: "QUICK BITES" },
  { id: "coffee", label: "COFFEE & CAFES" },
  { id: "budget", label: "BUDGET" },
  { id: "late", label: "LATE NIGHT" },
  { id: "group", label: "GROUP-FRIENDLY" },
  { id: "healthy", label: "HEALTHY" },
  { id: "top", label: "TOP RATED" },
  { id: "trending", label: "NEW / TRENDING" },
];

const outsideFilters = [
  { id: "easy", label: "EASY WALKS" },
  { id: "hike", label: "HIKES" },
  { id: "beach", label: "BEACH" },
  { id: "view", label: "VIEWS / PHOTO SPOTS" },
];

const weatherIcons: Record<string, typeof Sun> = {
  Sunny: Sun,
  Cloudy: Cloud,
  Rainy: CloudRain,
  Snowy: CloudSnow,
  Windy: Wind,
};

const jarvisMessages = [
  { condition: "Sunny", msg: (t: number) => `${t}°F and clear. Don't waste the sun.` },
  { condition: "Sunny", msg: (t: number) => `${t}°F. Bishop Peak conditions. Just saying.` },
  { condition: "Sunny", msg: (t: number) => `${t}°F with clear skies. Beach or hike — your call.` },
  { condition: "Cloudy", msg: (t: number) => `${t}°F and overcast. Coffee shop weather. Use it.` },
  { condition: "Cloudy", msg: (t: number) => `Cloudy at ${t}°F. Low commitment day — museum, cafe, or lock in.` },
  { condition: "Rainy", msg: (t: number) => `${t}°F and rain. Rare in SLO. Kreuzberg + a good book.` },
  { condition: "Rainy", msg: (t: number) => `Rain day at ${t}°F. Slow down, don't grind harder.` },
  { condition: "Windy", msg: (t: number) => `${t}°F and windy. Skip exposed peaks. Coffee or indoor plans.` },
  { condition: "any", msg: (t: number) => `${t}°F in SLO. What's the move?` },
  { condition: "any", msg: (t: number) => `${t}°F. Explore or lock in — both are solid.` },
  { condition: "any", msg: (t: number) => `${t}°F right now. That's a good day.` },
  { condition: "any", msg: (t: number) => `${t}°F. Farmer's Market is Thursday. Just a reminder.` },
];

const workMessages = [
  (t: number) => `${t}°F outside. It'll still be there after. Let's focus.`,
  (t: number) => `Lock in. ${t}°F is waiting for you when you're done.`,
  (t: number) => `Momentum first. ${t}°F reward later.`,
  (t: number) => `The beach isn't going anywhere (${t}°F). Get this done.`,
  (t: number) => `90 focused minutes. Then you've earned the ${t}°F.`,
];

const timerPresets = [
  { label: "15 MIN", seconds: 15 * 60 },
  { label: "25 MIN", seconds: 25 * 60 },
  { label: "45 MIN", seconds: 45 * 60 },
  { label: "60 MIN", seconds: 60 * 60 },
];

const todayDeadlines: Array<{ id: string; course: string; name: string; time: string }> = [];
const weekDeadlines: Array<{ id: string; course: string; name: string; time: string }> = [];

// Imagine-you-here spot ideas
const imagineSpots = [
  { name: "Pismo Beach", emoji: "🏖️", desc: "You, golden sand, Pacific sunset..." },
  { name: "Bishop Peak", emoji: "⛰️", desc: "You at the summit, SLO below..." },
  { name: "Morro Bay", emoji: "🌊", desc: "You kayaking by Morro Rock..." },
  { name: "Downtown SLO", emoji: "🎵", desc: "You at Farmer's Market, live music..." },
  { name: "Avila Hot Springs", emoji: "♨️", desc: "You relaxing, stress melting away..." },
];

// Friend data is loaded from local storage to avoid seeded mock users.
const friendsData: Array<{ name: string; status: "exploring" | "studying" | "chilling" | "busy"; emoji: string; color: string; statusText: string; available: boolean }> = [];

export function Dashboard() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"explore" | "work">("explore");
  const [exploreView, setExploreView] = useState<"initial" | "inside" | "outside" | "nearby">("initial");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const [userName, setUserName] = useState("Explorer");
  const [weather, setWeather] = useState({ temp: 72, condition: "Sunny" });
  const [pinnedEvents, setPinnedEvents] = useState<string[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);

  // Work Mode State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskName, setNewTaskName] = useState("");
  const [timerActive, setTimerActive] = useState(false);
  const [timerDuration, setTimerDuration] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [visited, setVisited] = useState<VisitedPlace[]>([]);
  const [friends, setFriends] = useState<typeof friendsData>([]);
  const [homeLocation, setHomeLocation] = useState<HomeLocation>(() => {
    try {
      const raw = localStorage.getItem(HOME_LOCATION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<HomeLocation>;
        if (parsed && typeof parsed.label === "string" && typeof parsed.lat === "number" && typeof parsed.lng === "number") {
          return { label: parsed.label, lat: parsed.lat, lng: parsed.lng };
        }
      }
      const legacyLabel = localStorage.getItem("polyjarvis_home") || "Cal Poly Campus";
      return { label: legacyLabel, lat: CAL_POLY_LAT, lng: CAL_POLY_LNG };
    } catch {
      return { label: "Cal Poly Campus", lat: CAL_POLY_LAT, lng: CAL_POLY_LNG };
    }
  });
  const [showHomeModal, setShowHomeModal] = useState(false);
  const [homeQuery, setHomeQuery] = useState("");
  const [homeResults, setHomeResults] = useState<HomeLocation[]>([]);
  const [homeSearching, setHomeSearching] = useState(false);
  const [settingCurrentHome, setSettingCurrentHome] = useState(false);

  // Nearby state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<(Place & { distanceMi: number })[]>([]);
  const [locating, setLocating] = useState(false);

  // Imagine widget
  const [imagineIdx] = useState(() => Math.floor(Math.random() * imagineSpots.length));
  const [imaginePhoto, setImaginePhoto] = useState<string | null>(() => {
    try { return localStorage.getItem("polyjarvis_imagine_photo"); } catch { return null; }
  });

  // Jam invite popup
  const [jamInviteFriend, setJamInviteFriend] = useState<(typeof friendsData)[number] | null>(null);

  // Jarvis message index
  const [msgIdx] = useState(() => Math.floor(Math.random() * jarvisMessages.length));
  const [workMsgIdx] = useState(() => Math.floor(Math.random() * workMessages.length));

  // Live weather from Open-Meteo (free, no key required)
  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=35.28&longitude=-120.66&current=temperature_2m,weather_code&temperature_unit=fahrenheit")
      .then((r) => r.json())
      .then((data) => {
        if (!data?.current) return;
        const temp = Math.round(data.current.temperature_2m);
        const code = Number(data.current.weather_code);
        let condition: "Sunny" | "Cloudy" | "Rainy" | "Snowy" | "Windy" = "Sunny";
        if ((code >= 1 && code <= 3) || (code >= 45 && code <= 48)) condition = "Cloudy";
        else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) condition = "Rainy";
        else if (code >= 71 && code <= 77) condition = "Snowy";
        setWeather({ temp, condition });
      })
      .catch(() => {
        // Keep fallback weather if API request fails
      });
  }, []);

  // Load tasks from localStorage
  useEffect(() => {
    if (!localStorage.getItem(LEGACY_SEED_CLEANUP_KEY)) {
      const maybeLegacyTasks = localStorage.getItem(TASKS_KEY);
      if (maybeLegacyTasks) {
        try {
          const parsed = JSON.parse(maybeLegacyTasks);
          const legacyNames = new Set(["Muda Analysis", "Lab: Assembly Line Data"]);
          const looksLikeLegacySeed =
            Array.isArray(parsed) &&
            parsed.length > 0 &&
            parsed.every((t) => typeof t?.name === "string" && legacyNames.has(t.name));
          if (looksLikeLegacySeed) {
            localStorage.removeItem(TASKS_KEY);
          }
        } catch {
          localStorage.removeItem(TASKS_KEY);
        }
      }
      localStorage.removeItem("polyjarvis_friends_seeded");
      localStorage.setItem(LEGACY_SEED_CLEANUP_KEY, "1");
    }

    const saved = localStorage.getItem(TASKS_KEY);
    if (saved) {
      try { setTasks(JSON.parse(saved)); } catch { setTasks(defaultTasks); }
    } else {
      setTasks(defaultTasks);
    }
    const v = localStorage.getItem(VISITED_KEY);
    if (v) try { setVisited(JSON.parse(v)); } catch { /* */ }

    const savedFriends = localStorage.getItem(FRIENDS_KEY);
    if (savedFriends) {
      try {
        const parsed = JSON.parse(savedFriends);
        if (Array.isArray(parsed)) {
          const mapped = parsed.map((f: { name?: string; status?: string; statusEmoji?: string; statusText?: string }) => {
            const status = f.status === "exploring" || f.status === "studying" || f.status === "chilling" || f.status === "busy" ? f.status : "chilling";
            const color = status === "exploring" ? "#8BC34A" : status === "studying" ? "#F2E8CF" : status === "busy" ? "#EF5350" : "#64B5F6";
            return {
              name: f.name || "Friend",
              status,
              emoji: f.statusEmoji || "👋",
              color,
              statusText: f.statusText || "Connected",
              available: status !== "busy",
            };
          });
          setFriends(mapped);
        }
      } catch {
        setFriends([]);
      }
    }
  }, []);

  const saveHomeLocation = useCallback((loc: HomeLocation) => {
    setHomeLocation(loc);
    localStorage.setItem(HOME_LOCATION_KEY, JSON.stringify(loc));
    localStorage.setItem("polyjarvis_home", loc.label);
  }, []);

  const searchHomeAddress = useCallback(async () => {
    const q = homeQuery.trim();
    if (!q || q.length < 3) {
      setHomeResults([]);
      return;
    }
    setHomeSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("Search failed");
      const data = (await res.json()) as NominatimSearchResult[];
      const mapped: HomeLocation[] = (Array.isArray(data) ? data : [])
        .map((item) => ({
          label: item.display_name,
          lat: Number(item.lat),
          lng: Number(item.lon),
        }))
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
        .slice(0, 6);
      setHomeResults(mapped);
    } catch {
      toast.error("Couldn't search addresses right now.");
    } finally {
      setHomeSearching(false);
    }
  }, [homeQuery]);

  const setHomeToCurrentLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not available on this device.");
      return;
    }
    setSettingCurrentHome(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`;
          const res = await fetch(url, { headers: { Accept: "application/json" } });
          if (res.ok) {
            const data = (await res.json()) as { display_name?: string };
            if (data.display_name) label = data.display_name;
          }
        } catch {
          // Fallback to coordinates label.
        }
        saveHomeLocation({ label, lat, lng });
        setShowHomeModal(false);
        toast.success("Home set to your current location.");
        setSettingCurrentHome(false);
      },
      () => {
        setSettingCurrentHome(false);
        toast.error("Could not access your current location.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [saveHomeLocation]);

  const persistTasks = useCallback((updated: Task[]) => {
    setTasks(updated);
    localStorage.setItem(TASKS_KEY, JSON.stringify(updated));
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.name) setUserName(user.user_metadata.name.split(" ")[0]);
    };
    init();
    const pins = localStorage.getItem("pinnedEvents");
    if (pins) {
      setPinnedEvents(JSON.parse(pins));
      setLikedIds(JSON.parse(pins));
    }
  }, []);

  // Timer logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      toast.success("Focus session complete! 🎉");
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const toggleTimer = () => setTimerActive(!timerActive);
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const selectDuration = (seconds: number) => {
    if (timerActive) return;
    setTimerDuration(seconds);
    setTimeLeft(seconds);
  };

  const addTask = () => {
    if (!newTaskName.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      course: "Personal",
      name: newTaskName,
      dueTime: "Today",
      dueDate: "Today",
      priority: false,
      done: false,
    };
    persistTasks([...tasks, newTask]);
    setNewTaskName("");
    toast.success("Task added");
  };

  const toggleTaskDone = (id: string) => {
    persistTasks(tasks.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const removeTask = (id: string) => {
    persistTasks(tasks.filter(t => t.id !== id));
    toast.success("Task removed");
  };

  const togglePin = (id: string) => {
    const updated = pinnedEvents.includes(id) ? pinnedEvents.filter(p => p !== id) : [...pinnedEvents, id];
    setPinnedEvents(updated);
    localStorage.setItem("pinnedEvents", JSON.stringify(updated));
    toast.success(pinnedEvents.includes(id) ? "Unpinned" : "Pinned!");
  };

  const setView = (v: "initial" | "inside" | "outside" | "nearby") => {
    setExploreView(v);
    setActiveFilter(null);
  };

  const markVisited = (place: Place) => {
    const entry: VisitedPlace = {
      id: place.id,
      name: place.name,
      visitedAt: new Date().toISOString(),
      minutesSpent: Math.floor(Math.random() * 90) + 15,
    };
    const updated = [entry, ...visited.filter(v => v.id !== place.id)];
    setVisited(updated);
    localStorage.setItem(VISITED_KEY, JSON.stringify(updated));
    toast.success(`Checked in at ${place.name}!`);
  };

  // User preferences from Train Jarvis
  const userPrefs = useMemo(() => getUserPreferences(), []);
  const personalizedGreeting = useMemo(() => getPersonalizedGreeting(userPrefs), [userPrefs]);

  const recommendations = useMemo(() => {
    let pool = places;
    if (exploreView === "inside") {
      pool = pool.filter(p =>
        ["Coffee Shops", "Study Spots", "Movies", "Bowling", "Museums", "Live Music", "Breweries", "Food & Treats", "Art", "Escape Rooms", "Games & Arcades", "Shopping", "Gym"].includes(p.category)
      );
    } else if (exploreView === "outside") {
      pool = pool.filter(p =>
        ["Hikes", "Beaches", "Parks & Gardens", "Farmers Markets", "Viewpoints", "Water Sports", "Day Trips"].includes(p.category) ||
        p.features?.includes("outdoor seating")
      );
    }
    if (activeFilter) {
      switch (activeFilter) {
        case "quick": pool = pool.filter(p => p.features?.includes("quick bite")); break;
        case "coffee": pool = pool.filter(p => p.category === "Coffee Shops"); break;
        case "budget": pool = pool.filter(p => p.price === "$" || p.price === "Free"); break;
        case "late": pool = pool.filter(p => p.features?.includes("late night")); break;
        case "group": pool = pool.filter(p => p.features?.includes("group friendly")); break;
        case "healthy": pool = pool.filter(p => p.features?.includes("healthy")); break;
        case "top": pool = pool.filter(p => p.rating >= 4.8); break;
        case "trending": pool = pool.filter(p => p.features?.includes("trending")); break;
        case "easy": pool = pool.filter(p => p.features?.includes("easy walk")); break;
        case "hike": pool = pool.filter(p => p.category === "Hikes"); break;
        case "beach": pool = pool.filter(p => p.category === "Beaches"); break;
        case "view": pool = pool.filter(p => p.features?.includes("viewpoint")); break;
      }
    }
    // Sort by preference score (descending) when training data exists
    if (userPrefs.hasTrainingData) {
      pool = [...pool].sort((a, b) => {
        const scoreA = getPreferenceScore(a, userPrefs);
        const scoreB = getPreferenceScore(b, userPrefs);
        return scoreB - scoreA;
      });
    }
    return pool;
  }, [exploreView, activeFilter, userPrefs]);

  // Jarvis message (personalized when training data exists)
  const WeatherIcon = weatherIcons[weather.condition] || Sun;
  const baseJarvisMsg = mode === "work"
    ? workMessages[workMsgIdx % workMessages.length](weather.temp)
    : (jarvisMessages.find((m, i) => i === msgIdx && (m.condition === weather.condition || m.condition === "any")) || jarvisMessages[jarvisMessages.length - 1]).msg(weather.temp);
  const jarvisMsg = (mode === "explore" && personalizedGreeting)
    ? personalizedGreeting
    : baseJarvisMsg;

  // Geolocation
  const handleFindNearby = () => {
    setLocating(true);
    const showNearby = (lat: number, lng: number, isReal: boolean, labelOverride?: string) => {
      const withDist = places.map(place => ({
        ...place,
        distanceMi: getDistanceMiles(lat, lng, place.lat, place.lng),
      }));
      withDist.sort((a, b) => a.distanceMi - b.distanceMi);
      setNearbyPlaces(withDist);
      setUserLocation({ lat, lng, label: labelOverride || (isReal ? "Your Location" : homeLocation.label || "Home") });
      setLocating(false);
      setView("nearby");
      if (isReal) toast.success(`Found ${withDist.length} spots sorted by distance!`);
      else toast(`Showing spots near ${labelOverride || homeLocation.label || "home"}`, { icon: "📍" });
    };
    const canUseGeo = "geolocation" in navigator;
    if (canUseGeo && navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state === "denied" || result.state === "prompt") {
          showNearby(homeLocation.lat, homeLocation.lng, false, homeLocation.label);
        } else {
          navigator.geolocation.getCurrentPosition(
            (pos) => showNearby(pos.coords.latitude, pos.coords.longitude, true, "Your Location"),
            () => showNearby(homeLocation.lat, homeLocation.lng, false, homeLocation.label),
            { enableHighAccuracy: false, timeout: 5000 }
          );
        }
      }).catch(() => {
        showNearby(homeLocation.lat, homeLocation.lng, false, homeLocation.label);
      });
    } else if (canUseGeo) {
      navigator.geolocation.getCurrentPosition(
        (pos) => showNearby(pos.coords.latitude, pos.coords.longitude, true, "Your Location"),
        () => showNearby(homeLocation.lat, homeLocation.lng, false, homeLocation.label),
        { enableHighAccuracy: false, timeout: 3000 }
      );
    } else {
      showNearby(homeLocation.lat, homeLocation.lng, false, homeLocation.label);
    }
  };

  const activeTasks = tasks.filter(t => !t.done);
  const doneTasks = tasks.filter(t => t.done);
  const todayTaskDeadlines = activeTasks.filter((t) => t.dueDate === "Today");
  const weekTaskDeadlines = activeTasks.filter((t) => t.dueDate !== "Today");

  // Timer progress
  const timerProgress = timerDuration > 0 ? ((timerDuration - timeLeft) / timerDuration) * 100 : 0;

  const imagineSpot = imagineSpots[imagineIdx];

  return (
    <div className="min-h-[100dvh] bg-transparent pb-24 text-white font-sans">
      <PageHeader />

      {/* Header with Jarvis Bubble */}
      <div className="px-5 pb-2">
        <div className="flex items-start gap-3">
          {/* Jarvis Bubble */}
          <div className="flex-1 bg-white/12 border border-[#F2E8CF]/15 rounded-2xl rounded-tl-sm p-3.5 relative backdrop-blur-md">
            <div className="flex items-center gap-2 mb-1.5">
              <WeatherIcon size={14} className="text-[#F2E8CF]" />
              <span className="text-[10px] font-bold text-[#F2E8CF] uppercase tracking-wider">{weather.temp}°F · {weather.condition}</span>
            </div>
            <p className="text-sm font-medium leading-relaxed text-white/90">{jarvisMsg}</p>
          </div>
          {/* Jarvis Icon */}
          <div className="flex flex-col items-center gap-1">
            <Link
              to="/jarvis"
              className="w-11 h-11 bg-[#F2E8CF]/15 border border-[#F2E8CF]/20 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Open Jarvis"
            >
              <JarvisLogo size={24} className="text-[#F2E8CF]" />
            </Link>
          </div>
        </div>
      </div>

      {/* Home quick links — above mode toggle */}
      <div className="px-5 mt-3 mb-2">
        <div className="flex gap-2">
          <Link to="/plans" className="flex-1">
            <div className="bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 flex items-center gap-2 active:bg-white/12 transition-colors">
              <ClipboardList size={13} className="text-[#F2E8CF]" />
              <span className="text-[10px] font-black text-white/50 uppercase tracking-wider">PLANS</span>
            </div>
          </Link>
          <Link to="/jams" className="flex-1">
            <div className="bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 flex items-center gap-2 active:bg-white/12 transition-colors">
              <Users size={13} className="text-[#F2E8CF]" />
              <span className="text-[10px] font-black text-white/50 uppercase tracking-wider">JAMS</span>
            </div>
          </Link>
          <Link to="/tutorial" className="flex-none">
            <div className="bg-[#F2E8CF]/10 border border-[#F2E8CF]/15 rounded-xl px-3 py-2.5 flex items-center gap-1.5 active:bg-[#F2E8CF]/20 transition-colors">
              <HelpCircle size={13} className="text-[#F2E8CF]" />
              <span className="text-[10px] font-black text-[#F2E8CF]/70 uppercase tracking-wider">HELP</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Mode Toggle — Explore / Work */}
      <div className="px-5 mt-4 mb-4">
        {/* Home location chip */}
        <div className="flex items-center gap-2 mb-3 bg-white/6 border border-white/10 rounded-xl px-3 py-2">
          <MapPin size={12} className="text-[#F2E8CF]" />
          <span className="text-[10px] font-bold text-white/40">HOME:</span>
          <span className="text-[10px] font-bold text-white/60 truncate">{homeLocation.label}</span>
          <button
            onClick={() => setShowHomeModal(true)}
            className="ml-auto text-[8px] font-bold text-[#F2E8CF] bg-[#F2E8CF]/10 px-2 py-0.5 rounded"
          >
            EDIT
          </button>
        </div>

        <div className="flex border-b border-white/15 pb-1 gap-6">
          <button
            onClick={() => setMode("explore")}
            className={`pb-2 text-xs font-black uppercase tracking-widest transition-all ${
              mode === "explore" ? "text-white border-b-2 border-white -mb-[5px]" : "text-white/30 hover:text-white/45"
            }`}
          >
            EXPLORE
          </button>
          <button
            onClick={() => setMode("work")}
            className={`pb-2 text-xs font-black uppercase tracking-widest transition-all ${
              mode === "work" ? "text-[#F2E8CF] border-b-2 border-[#F2E8CF] -mb-[5px]" : "text-white/30 hover:text-white/45"
            }`}
          >
            WORK
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === "work" ? (
          /* WORK MODE (LOCK IN) */
          <motion.div
            key="work"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-5 pt-2"
          >
            <h1
              className="text-3xl font-black text-[#F2E8CF] tracking-tight uppercase mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              LOCK IN.
            </h1>

            {/* Focus Timer */}
            <div className="bg-white/12 backdrop-blur-sm border border-white/15 rounded-2xl p-5 mb-5 relative overflow-hidden">
              {/* Progress bar bg */}
              <div className="absolute bottom-0 left-0 h-1 bg-white/5 w-full" />
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-[#F2E8CF] rounded-r"
                animate={{ width: `${timerProgress}%` }}
                transition={{ duration: 0.5 }}
              />

              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-black text-[#F2E8CF] uppercase tracking-widest mb-1">FOCUS TIMER</p>
                  <p className="text-4xl font-mono font-bold text-white tracking-tight">{formatTime(timeLeft)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={toggleTimer}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      timerActive
                        ? "bg-red-500/20 text-red-400 border border-red-500/20"
                        : "bg-[#F2E8CF] text-[#233216] shadow-md"
                    }`}
                  >
                    {timerActive ? "PAUSE" : "START"}
                  </button>
                  {!timerActive && timeLeft !== timerDuration && (
                    <button
                      onClick={() => setTimeLeft(timerDuration)}
                      className="px-3 py-2.5 rounded-xl font-bold text-xs bg-white/12 text-white/60"
                    >
                      RESET
                    </button>
                  )}
                </div>
              </div>

              {/* Duration presets */}
              <div className="flex gap-2">
                {timerPresets.map(p => (
                  <button
                    key={p.seconds}
                    onClick={() => selectDuration(p.seconds)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition-all ${
                      timerDuration === p.seconds
                        ? "bg-[#F2E8CF]/20 text-[#F2E8CF] border border-[#F2E8CF]/30"
                        : "bg-white/8 text-white/35 border border-white/8"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-black text-[#F2E8CF] uppercase tracking-widest">TASKS</h2>
              <div className="text-[10px] font-black bg-white/12 text-white/60 px-2.5 py-0.5 rounded-full uppercase">
                {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </div>

            {/* Active Tasks */}
            <div className="space-y-2 mb-3">
              {activeTasks.length === 0 && doneTasks.length === 0 && (
                <div className="bg-white/8 border border-white/10 rounded-xl p-6 text-center">
                  <p className="text-xs text-white/40 font-bold">No tasks yet. Add one below!</p>
                </div>
              )}
              {activeTasks.map(a => (
                <div key={a.id} className="bg-white/12 border border-white/15 rounded-xl p-3.5 relative overflow-hidden group">
                  {a.priority && <div className="absolute top-0 right-0 bg-[#F2E8CF] text-[#233216] text-[9px] font-black px-2 py-0.5 rounded-bl-lg">PRIORITY</div>}
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTaskDone(a.id)}
                      className="w-5 h-5 mt-0.5 rounded-full border-2 border-white/25 flex items-center justify-center flex-shrink-0 hover:border-[#F2E8CF] transition-colors"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-sm font-bold text-white">{a.name}</h3>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-[#F2E8CF] bg-[#F2E8CF]/10 px-1.5 py-0.5 rounded">{a.course}</span>
                          <button onClick={() => removeTask(a.id)} className="text-white/20 hover:text-red-400 transition-colors ml-1">
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-white/45">
                        <Clock size={10} />
                        Due: {a.dueTime}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Done Tasks */}
            {doneTasks.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-black text-white/25 uppercase tracking-widest mb-2">COMPLETED ({doneTasks.length})</p>
                <div className="space-y-1.5">
                  {doneTasks.map(a => (
                    <div key={a.id} className="bg-white/6 border border-white/8 rounded-xl p-3 flex items-center gap-3 opacity-50">
                      <button
                        onClick={() => toggleTaskDone(a.id)}
                        className="w-5 h-5 rounded-full bg-[#F2E8CF] flex items-center justify-center flex-shrink-0 text-[#233216] text-xs font-bold"
                      >✓</button>
                      <span className="text-xs line-through text-white/35 flex-1">{a.name}</span>
                      <button onClick={() => removeTask(a.id)} className="text-white/15 hover:text-red-400 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Add Task */}
            <div className="flex gap-2 mb-5">
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="Add a new task..."
                className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#F2E8CF]/40"
                onKeyDown={(e) => e.key === "Enter" && addTask()}
              />
              <button onClick={addTask} className="bg-[#F2E8CF] text-[#233216] p-2.5 rounded-xl">
                <Plus size={18} />
              </button>
            </div>

            {/* Imagine You Here Widget */}
            <div className="bg-gradient-to-r from-[#F2E8CF]/10 to-[#64B5F6]/10 border border-[#F2E8CF]/15 rounded-xl overflow-hidden mb-4">
              {imaginePhoto && (
                <div className="relative h-28 overflow-hidden">
                  <img src={imaginePhoto} alt="You here" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
                    <Sparkles size={10} className="text-[#F2E8CF]" />
                    <span className="text-[10px] font-black text-white/90 uppercase tracking-wider drop-shadow-md">{imagineSpot.name}</span>
                  </div>
                  <button
                    onClick={() => { setImaginePhoto(null); localStorage.removeItem("polyjarvis_imagine_photo"); toast.success("Photo removed"); }}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white/70 active:scale-90 transition-transform"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#F2E8CF]/15 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    {imagineSpot.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Sparkles size={11} className="text-[#F2E8CF]" />
                      <p className="text-[10px] font-black text-[#F2E8CF] uppercase tracking-wider">IMAGINE YOU HERE</p>
                    </div>
                    <p className="text-sm font-bold text-white/80">{imagineSpot.name}</p>
                    <p className="text-[11px] text-white/40 italic">{imagineSpot.desc}</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-[#64B5F6] bg-[#64B5F6]/15 px-2.5 py-1.5 rounded-full border border-[#64B5F6]/20 whitespace-nowrap flex items-center gap-1 cursor-pointer active:scale-95 transition-transform">
                      <Camera size={10} /> PHOTO
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
                          const reader = new FileReader();
                          reader.onload = () => {
                            const url = reader.result as string;
                            setImaginePhoto(url);
                            localStorage.setItem("polyjarvis_imagine_photo", url);
                            toast.success("Photo uploaded! Imagine yourself there 🌅");
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    <button
                      onClick={() => navigate("/explore")}
                      className="text-[9px] font-black text-[#F2E8CF] bg-[#F2E8CF]/15 px-2.5 py-1.5 rounded-full border border-[#F2E8CF]/20 whitespace-nowrap"
                    >
                      LET'S GO
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Inline Calendar Section */}
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="w-full flex items-center justify-between bg-white/8 border border-white/12 rounded-xl px-4 py-3 mb-3"
            >
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-[#F2E8CF]" />
                <span className="text-xs font-black text-white/55 uppercase tracking-widest">FULL CALENDAR</span>
              </div>
              {showCalendar ? <ChevronUp size={14} className="text-white/35" /> : <ChevronDown size={14} className="text-white/35" />}
            </button>

            <AnimatePresence>
              {showCalendar && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mb-5"
                >
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-black text-red-400/80 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> DUE TODAY
                      </p>
                      {(todayTaskDeadlines.length ? todayTaskDeadlines : todayDeadlines).map(d => (
                        <div key={d.id} className="bg-white/8 border border-white/8 rounded-lg p-3 mb-1.5 flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white/80 truncate">{d.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] text-white/35">{d.course}</span>
                              <span className="text-[9px] text-red-400/60">{("time" in d ? d.time : d.dueTime) || "No time"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white/25 uppercase tracking-widest mb-2">THIS WEEK</p>
                      {(weekTaskDeadlines.length ? weekTaskDeadlines : weekDeadlines).map(d => (
                        <div key={d.id} className="bg-white/5 border border-white/8 rounded-lg p-2.5 mb-1.5 flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/25 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-white/55 truncate">{d.name}</p>
                            <span className="text-[9px] text-white/25">{d.course} · {("time" in d ? d.time : `${d.dueDate} · ${d.dueTime || "No time"}`)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Plans link */}
            <Link to="/plans" className="block mb-8">
              <div className="bg-white/8 border border-white/12 rounded-xl px-4 py-3 flex items-center gap-3 active:bg-white/12 transition-colors">
                <div className="bg-[#F2E8CF]/15 p-2 rounded-lg"><MapPin size={16} className="text-[#F2E8CF]" /></div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-white/75">MY PLANS</p>
                  <p className="text-[10px] text-white/35">Create & share itineraries</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ) : (
          /* EXPLORE MODE (GO EXPLORE) */
          <motion.div
            key="explore"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-5 pt-2"
          >
            {exploreView === "initial" ? (
              <>
                <h1
                  className="text-3xl font-black text-white tracking-tight uppercase mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  GO EXPLORE.
                </h1>

                {/* Decision Tree Buttons */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <button
                    onClick={() => setView("inside")}
                    className="aspect-square rounded-2xl bg-white/12 border border-white/15 p-4 flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-all"
                  >
                    <div className="w-12 h-12 bg-[#F2E8CF]/15 rounded-full flex items-center justify-center text-2xl">🏠</div>
                    <span className="font-black text-base text-white uppercase tracking-wider">INSIDE</span>
                  </button>

                  <button
                    onClick={() => setView("outside")}
                    className="aspect-square rounded-2xl bg-[#F2E8CF]/8 border border-[#F2E8CF]/15 p-4 flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-all"
                  >
                    <div className="w-12 h-12 bg-[#F2E8CF]/15 rounded-full flex items-center justify-center text-2xl">🌲</div>
                    <span className="font-black text-base text-[#F2E8CF] uppercase tracking-wider">OUTSIDE</span>
                  </button>
                </div>

                <h2 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">OR TRY SOMETHING ELSE...</h2>

                {/* Quick Actions */}
                <div className="space-y-2.5">
                  <button
                    onClick={handleFindNearby}
                    disabled={locating}
                    className="w-full py-3.5 bg-white/10 border border-white/15 rounded-xl flex items-center justify-center gap-2 font-bold text-sm text-white/75 active:bg-white/15 disabled:opacity-50"
                  >
                    {locating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/25 border-t-[#F2E8CF] rounded-full animate-spin" />
                        LOCATING...
                      </>
                    ) : (
                      <>
                        <Navigation size={16} /> FIND NEARBY SPOTS
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-2.5">
                    <Link to="/explore">
                      <button className="w-full py-3.5 bg-white/8 border border-white/12 rounded-xl flex items-center justify-center gap-2 font-bold text-xs text-white/50 hover:bg-white/12">
                        <Compass size={14} /> BROWSE ALL
                      </button>
                    </Link>
                    <button
                      onClick={() => setShowMap(!showMap)}
                      className="w-full py-3.5 bg-white/8 border border-white/12 rounded-xl flex items-center justify-center gap-2 font-bold text-xs text-white/50 hover:bg-white/12"
                    >
                      <Map size={14} /> MY MAP
                    </button>
                  </div>

                  {/* Plans link */}
                  <Link to="/plans">
                    <button className="w-full py-3.5 bg-[#F2E8CF]/8 border border-[#F2E8CF]/15 rounded-xl flex items-center justify-center gap-2 font-bold text-xs text-[#F2E8CF]/70 hover:bg-[#F2E8CF]/12">
                      <MapPin size={14} /> MY PLANS
                    </button>
                  </Link>
                </div>

                {/* Interactive Map section */}
                <AnimatePresence>
                  {showMap && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden mt-4"
                    >
                      <div className="bg-white/10 border border-white/15 rounded-xl overflow-hidden">
                        <div className="p-3 border-b border-white/10">
                          <p className="text-[10px] font-black text-[#F2E8CF] uppercase tracking-widest">SLO ADVENTURE MAP</p>
                          <p className="text-[9px] text-white/35 mt-0.5">Pinch to zoom · Tap pins to see details</p>
                        </div>
                        <div className="h-64 relative">
                          <iframe
                            src="https://www.openstreetmap.org/export/embed.html?bbox=-120.80%2C35.20%2C-120.55%2C35.38&layer=mapnik"
                            className="w-full h-full border-0"
                            style={{ filter: "invert(0.9) hue-rotate(180deg) saturate(0.5) brightness(0.8)" }}
                            loading="lazy"
                            title="SLO Map"
                          />
                        </div>
                        <div className="p-3">
                          <div className="flex items-center gap-4 mb-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#8BC34A] border border-white/50" />
                              <span className="text-[9px] text-white/45 font-bold">VISITED</span>
                            </div>
                            <span className="text-[9px] text-white/25 ml-auto">{visited.length} check-ins</span>
                          </div>

                          {/* Friends on map legend */}
                          <div className="flex items-center gap-4 mb-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#64B5F6] border border-white/50" />
                              <span className="text-[9px] text-white/45 font-bold">FRIENDS</span>
                            </div>
                            <div className="flex -space-x-1.5 ml-auto">
                              {["A", "E", "J"].map((initial, i) => (
                                <div key={i} className="w-4 h-4 rounded-full bg-[#64B5F6]/30 border border-white/20 flex items-center justify-center text-[6px] font-bold text-white/60">
                                  {initial}
                                </div>
                              ))}
                              <span className="text-[8px] text-white/25 ml-1.5 self-center">3 active</span>
                            </div>
                          </div>

                          {visited.length > 0 && (
                            <div className="space-y-1 mt-2">
                              {visited.slice(0, 5).map(v => (
                                <div key={v.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5">
                                  <div className="w-2 h-2 rounded-full bg-[#8BC34A]" />
                                  <span className="text-[10px] font-bold text-white/50 truncate flex-1">{v.name}</span>
                                  <span className="text-[8px] text-white/25">{new Date(v.visitedAt).toLocaleDateString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Nearby places quick view with category icons */}
                          <div className="mt-3 border-t border-white/8 pt-2">
                            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5">NEARBY SPOTS</p>
                            <div className="flex gap-1.5 overflow-x-auto pb-1">
                              {places.slice(0, 6).map(p => (
                                <button
                                  key={p.id}
                                  onClick={() => navigate(`/event/${p.id}`)}
                                  className="flex-shrink-0 bg-white/6 rounded-lg px-2 py-1.5 border border-white/8 active:bg-white/10 transition-colors"
                                >
                                  <p className="text-[8px] font-bold text-white/60 truncate max-w-[70px]">{getCatEmoji(p.category)} {p.name}</p>
                                  <p className="text-[7px] text-white/25">{p.distance}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                          {/* Pinned spots on map */}
                          {(() => {
                            const pins: string[] = (() => { try { return JSON.parse(localStorage.getItem("pinnedEvents") || "[]"); } catch { return []; } })();
                            const pinned = places.filter(p => pins.includes(p.id)).slice(0, 4);
                            if (pinned.length === 0) return null;
                            return (
                              <div className="mt-2 border-t border-white/8 pt-2">
                                <p className="text-[9px] font-black text-[#F2E8CF]/50 uppercase tracking-widest mb-1.5">📌 YOUR PINS</p>
                                <div className="flex gap-1.5 overflow-x-auto pb-1">
                                  {pinned.map(p => (
                                    <button
                                      key={p.id}
                                      onClick={() => navigate(`/event/${p.id}`)}
                                      className="flex-shrink-0 bg-[#F2E8CF]/8 rounded-lg px-2 py-1.5 border border-[#F2E8CF]/15 active:bg-[#F2E8CF]/15 transition-colors"
                                    >
                                      <p className="text-[8px] font-bold text-[#F2E8CF]/70 truncate max-w-[70px]">{getCatEmoji(p.category)} {p.name}</p>
                                      <p className="text-[7px] text-white/25">{p.distance}</p>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Friends Activity - bigger font, invite to jam */}
                <div className="mt-5">
                  <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-black text-[#F2E8CF] uppercase tracking-wider">FRIENDS ACTIVITY</p>
                      <Link to="/friends">
                        <span className="text-[10px] font-bold text-white/30 hover:text-white/50">VIEW ALL</span>
                      </Link>
                    </div>
                    <div className="space-y-2">
                      {(friends.length ? friends : friendsData).map(f => (
                        <button
                          key={f.name}
                          onClick={() => f.available && setJamInviteFriend(f)}
                          className="w-full flex items-center gap-3 bg-white/6 rounded-lg px-3 py-2.5 active:bg-white/10 transition-colors text-left"
                        >
                          <div className="relative flex-shrink-0">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border"
                              style={{ backgroundColor: `${f.color}15`, borderColor: `${f.color}30`, color: f.color }}
                            >
                              {f.name[0]}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1a2e10]" style={{ backgroundColor: f.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white/80">{f.name}</p>
                            <p className="text-[11px] text-white/40 truncate">{f.emoji} {f.statusText}</p>
                          </div>
                          {f.available && (
                            <span className="text-[8px] font-black text-[#F2E8CF]/60 bg-[#F2E8CF]/10 px-2 py-1 rounded-full border border-[#F2E8CF]/15">
                              INVITE
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reservation Bot Placeholder */}
                <div className="mt-4 bg-gradient-to-r from-[#F2E8CF]/8 to-[#64B5F6]/8 border border-[#F2E8CF]/12 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F2E8CF]/15 rounded-xl flex items-center justify-center text-lg flex-shrink-0">🤖</div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-[#F2E8CF] uppercase tracking-wider">RESERVATION BOT</p>
                      <p className="text-[10px] text-white/40 mt-0.5">Auto-book restaurants & activities</p>
                    </div>
                    <span className="text-[8px] font-black bg-[#F2E8CF]/15 text-[#F2E8CF] px-2 py-1 rounded-full">COMING SOON</span>
                  </div>
                </div>
              </>
            ) : exploreView === "nearby" ? (
              /* NEARBY VIEW */
              <>
                <div className="flex items-center gap-3 mb-4">
                  <button onClick={() => setView("initial")} className="w-9 h-9 rounded-xl border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0">
                    <ArrowLeftIcon />
                  </button>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight text-white">NEARBY SPOTS</h2>
                    {userLocation && (
                      <p className="text-[10px] text-white/35 font-bold">📍 {userLocation.label}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {nearbyPlaces.map(place => {
                    const pinned = pinnedEvents.includes(place.id);
                    const feet = place.distanceMi * 5280;
                    const distLabel = feet <= 500 ? `${Math.round(feet)} ft` : `${place.distanceMi.toFixed(1)} mi`;

                    return (
                      <div key={place.id} onClick={() => navigate(`/event/${place.id}`)} className="bg-white/10 border border-white/15 rounded-xl overflow-hidden active:scale-[0.98] transition-transform">
                        <div className="flex h-24">
                          <img src={place.image} className="w-24 h-full object-cover border-r border-white/15" loading="lazy" />
                          <div className="flex-1 p-3 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-sm leading-tight text-white line-clamp-1">{place.name}</h3>
                                <span className="text-[9px] font-bold bg-[#F2E8CF]/20 px-1.5 py-0.5 rounded text-[#F2E8CF] flex items-center gap-0.5 flex-shrink-0 ml-1">
                                  <Navigation size={7} /> {distLabel}
                                </span>
                              </div>
                              <p className="text-[11px] text-white/45 line-clamp-1">{place.description}</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex gap-1">
                                {place.price && <span className="text-[9px] font-bold bg-white/10 px-1.5 py-0.5 rounded text-white/50">{place.price}</span>}
                                {place.rating && <span className="text-[9px] font-bold bg-[#FBC02D]/10 px-1.5 py-0.5 rounded text-[#FBC02D] flex items-center gap-0.5"><MustangIcon size={9} fill="currentColor" /> {place.rating}</span>}
                              </div>
                              <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); markVisited(place); }} className="text-white/25 hover:text-[#F2E8CF]">
                                  <MapPin size={14} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); togglePin(place.id); }} className={pinned ? "text-[#F2E8CF]" : "text-white/25 hover:text-[#F2E8CF]"}>
                                  <Pin size={14} fill={pinned ? "currentColor" : "none"} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Detail View (Inside/Outside List) with Filters */
              <>
                <div className="flex items-center gap-3 mb-4">
                  <button onClick={() => setView("initial")} className="w-9 h-9 rounded-xl border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0">
                    <ArrowLeftIcon />
                  </button>
                  <h2 className="text-xl font-black uppercase tracking-tight text-white">
                    {exploreView === "inside" ? "INSIDE SPOTS" : "OUTSIDE ADVENTURES"}
                  </h2>
                </div>

                {/* CHIP FILTERS */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {(exploreView === "inside" ? insideFilters : outsideFilters).map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => setActiveFilter(activeFilter === filter.id ? null : filter.id)}
                      className={`px-2.5 py-1.5 rounded-full text-[10px] font-black tracking-wider transition-all ${
                        activeFilter === filter.id
                          ? "bg-[#F2E8CF] text-[#233216]"
                          : "bg-white/10 text-white/45 border border-white/12"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {recommendations.length === 0 ? (
                    <div className="text-center py-10 text-white/25">
                      <p className="text-sm">No spots found matching this filter.</p>
                      <button onClick={() => setActiveFilter(null)} className="text-[#F2E8CF] font-bold mt-2 hover:underline text-xs">CLEAR FILTERS</button>
                    </div>
                  ) : (
                    recommendations.map(place => {
                      const pinned = pinnedEvents.includes(place.id);
                      const needsCar = place.features?.includes("needs car");
                      const hasBus = place.features?.includes("bus available");
                      // Personalized preference rating from training data
                      const prefRating = getPreferenceScore(place, userPrefs);

                      return (
                        <div key={place.id} onClick={() => navigate(`/event/${place.id}`)} className="bg-white/10 border border-white/15 rounded-xl overflow-hidden active:scale-[0.98] transition-transform">
                          <div className="flex h-28">
                            <img src={place.image} className="w-24 h-full object-cover border-r border-white/15" loading="lazy" />
                            <div className="flex-1 p-3 flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between items-start mb-1">
                                  <h3 className="font-bold text-sm leading-tight text-white line-clamp-1">{place.name}</h3>
                                  <div className="flex gap-1 flex-shrink-0 ml-1">
                                    {place.price && <span className="text-[9px] font-bold bg-white/12 px-1.5 py-0.5 rounded text-white/55">{place.price}</span>}
                                    {place.rating && <span className="text-[9px] font-bold bg-[#FBC02D]/10 px-1.5 py-0.5 rounded text-[#FBC02D] flex items-center gap-0.5"><MustangIcon size={9} fill="currentColor" /> {place.rating}</span>}
                                  </div>
                                </div>
                                <p className="text-[11px] text-white/45 line-clamp-1">{place.description}</p>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <div className="flex gap-2 items-center">
                                  <button onClick={(e) => { e.stopPropagation(); togglePin(place.id); }} className={pinned ? "text-[#F2E8CF]" : "text-white/30 hover:text-[#F2E8CF]"}>
                                    <Pin size={14} fill={pinned ? "currentColor" : "none"} />
                                  </button>
                                  {/* Transport icons */}
                                  {needsCar && (
                                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-orange-300/70 bg-orange-300/10 px-1.5 py-0.5 rounded">
                                      <Car size={10} /> CAR
                                    </span>
                                  )}
                                  {hasBus && (
                                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-blue-300/70 bg-blue-300/10 px-1.5 py-0.5 rounded">
                                      <Bus size={10} /> BUS
                                    </span>
                                  )}
                                </div>
                                {/* Preference rating */}
                                <span className="text-[9px] font-black text-[#F2E8CF] bg-[#F2E8CF]/10 px-1.5 py-0.5 rounded-full">
                                  {prefRating}/10
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Home Location Modal */}
      <AnimatePresence>
        {showHomeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[62] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => setShowHomeModal(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-[#1a2e10]/95 border-t border-white/15 sm:border sm:rounded-2xl rounded-t-3xl p-5"
            >
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-4 sm:hidden" />
              <h3 className="text-lg font-black text-white uppercase mb-1">Set Home Address</h3>
              <p className="text-xs text-white/40 mb-3">Pick an actual address or use your current location.</p>

              <div className="flex gap-2 mb-2">
                <input
                  value={homeQuery}
                  onChange={(e) => setHomeQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") searchHomeAddress();
                  }}
                  placeholder="Search address (e.g., 1 Grand Ave, SLO)"
                  className="flex-1 bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#F2E8CF]/40"
                />
                <button
                  onClick={searchHomeAddress}
                  className="px-3 py-2.5 rounded-xl bg-[#F2E8CF]/15 border border-[#F2E8CF]/20 text-[#F2E8CF] text-xs font-black"
                >
                  {homeSearching ? "..." : "SEARCH"}
                </button>
              </div>

              <button
                onClick={setHomeToCurrentLocation}
                disabled={settingCurrentHome}
                className="w-full mb-3 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/8 border border-white/12 text-white/75 text-xs font-bold"
              >
                <LocateFixed size={13} className="text-[#F2E8CF]" />
                {settingCurrentHome ? "Getting location..." : "Use Current Location"}
              </button>

              <div className="max-h-56 overflow-y-auto space-y-1.5 mb-3">
                {homeResults.length === 0 ? (
                  <p className="text-[11px] text-white/35 py-2">No results yet. Search an address above.</p>
                ) : (
                  homeResults.map((res, idx) => (
                    <button
                      key={`${res.label}-${idx}`}
                      onClick={() => {
                        saveHomeLocation(res);
                        setShowHomeModal(false);
                        setHomeResults([]);
                        setHomeQuery("");
                        toast.success("Home location updated.");
                      }}
                      className="w-full text-left bg-white/8 border border-white/10 rounded-lg px-3 py-2 hover:bg-white/12 transition-colors"
                    >
                      <p className="text-[11px] text-white/80 line-clamp-2">{res.label}</p>
                    </button>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowHomeModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/45 text-xs font-bold"
                >
                  CLOSE
                </button>
                <button
                  onClick={() => {
                    saveHomeLocation({ label: "Cal Poly Campus", lat: CAL_POLY_LAT, lng: CAL_POLY_LNG });
                    setShowHomeModal(false);
                    toast.success("Home reset to Cal Poly Campus.");
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#F2E8CF]/15 border border-[#F2E8CF]/20 text-[#F2E8CF] text-xs font-bold"
                >
                  RESET DEFAULT
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Jam Invite Popup */}
      <AnimatePresence>
        {jamInviteFriend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center px-6"
            onClick={() => setJamInviteFriend(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-[#1a2e10]/95 backdrop-blur-2xl rounded-2xl p-6 border border-white/15"
            >
              <div className="text-center mb-5">
                <div
                  className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-xl font-bold border mb-3"
                  style={{ backgroundColor: `${jamInviteFriend.color}15`, borderColor: `${jamInviteFriend.color}30`, color: jamInviteFriend.color }}
                >
                  {jamInviteFriend.name[0]}
                </div>
                <h3 className="text-lg font-black text-white uppercase">{jamInviteFriend.name}</h3>
                <p className="text-[11px] text-white/40">{jamInviteFriend.emoji} {jamInviteFriend.statusText}</p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    // Create a new jam with this friend and persist to localStorage
                    const words = ["PEAK", "WAVE", "BREW", "SURF", "HIKE", "CHILL", "CREW"];
                    const code = `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(Math.random() * 99) + 1}`;
                    const newJam = {
                      id: Date.now().toString(),
                      name: `Jam with ${jamInviteFriend.name}`,
                      emoji: jamInviteFriend.emoji,
                      code,
                      isOwner: true,
                      createdAt: "Just now",
                      members: [
                        { id: "you", name: "You", rsvp: "going" },
                        { id: `friend-${jamInviteFriend.name}`, name: jamInviteFriend.name, rsvp: "pending" },
                      ],
                    };
                    // Save to localStorage so Jams page picks it up
                    try {
                      const existing = JSON.parse(localStorage.getItem(JAMS_KEY) || "[]");
                      localStorage.setItem(JAMS_KEY, JSON.stringify([newJam, ...existing]));
                    } catch {
                      localStorage.setItem(JAMS_KEY, JSON.stringify([newJam]));
                    }
                    toast.success(`Created jam with ${jamInviteFriend.name}! Code: ${code}`);
                    setJamInviteFriend(null);
                    navigate("/jams");
                  }}
                  className="w-full py-3 bg-[#F2E8CF] text-[#233216] rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Users size={16} /> CREATE JAM WITH {jamInviteFriend.name.toUpperCase()}
                </button>
                <button
                  onClick={() => {
                    setJamInviteFriend(null);
                    navigate("/jams", { state: { createWithFriend: jamInviteFriend.name } });
                  }}
                  className="w-full py-3 bg-white/8 border border-white/12 text-white/60 rounded-xl font-bold text-sm"
                >
                  CUSTOMIZE JAM NAME
                </button>
                <button
                  onClick={() => setJamInviteFriend(null)}
                  className="w-full py-2 text-white/30 text-sm font-bold"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

function getCatEmoji(category: string): string {
  const map: Record<string, string> = {
    "Food & Treats": "🌮", "Beaches": "🏖️", "Hikes": "⛰️", "Coffee Shops": "☕",
    "Study Spots": "📚", "Farmers Markets": "🥕", "Live Music": "🎵", "Movies": "🎬",
    "Bowling": "🎳", "Art": "🎨", "Museums": "🏛️", "Viewpoints": "🌅",
    "Parks & Gardens": "🌳", "Breweries": "🍺", "Zoos & Aquariums": "🐼",
    "Shopping": "🛍️", "Water Sports": "🏄", "Day Trips": "🚗", "Gym": "💪",
    "Escape Rooms": "🔑", "Games & Arcades": "🎮", "Theater & Comedy": "🎭",
    "History": "📜", "Outdoors": "🏕️",
  };
  return map[category] || "📍";
}
