import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Sun, Cloud, CloudRain, CloudSnow, Wind, MapPin, Pin, X, Compass, Heart, Car, Bus, Plus, Navigation, HelpCircle, ChevronDown, ChevronUp, Calendar, Clock, Map } from "lucide-react";
import { places, getDistanceMiles, CAL_POLY_LAT, CAL_POLY_LNG, Place } from "../data/places";
import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "/utils/supabase/client";
import { BottomNav } from "../components/BottomNav";
import { JarvisLogo } from "../components/JarvisLogo";
import { PageHeader } from "../components/PageHeader";
import sloMapImg from "figma:asset/1bc6b2b31847dfd3a101c268e9ec59a0395e2579.png";

const TASKS_KEY = "polyjarvis_tasks";
const VISITED_KEY = "polyjarvis_visited";

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

const defaultTasks: Task[] = [
  { id: "1", course: "IME 223", name: "Muda Analysis", dueTime: "11:59 PM", dueDate: "Today", priority: true, done: false },
  { id: "2", course: "IME 223", name: "Lab: Assembly Line Data", dueTime: "Tomorrow", dueDate: "Tomorrow", priority: false, done: false },
];

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
  { condition: "Sunny", msg: (t: number) => `${t}°F and sunny — perfect day to explore outside!` },
  { condition: "Sunny", msg: (t: number) => `Beautiful ${t}°F day. Bishop Peak is calling your name.` },
  { condition: "Sunny", msg: (t: number) => `${t}°F with clear skies. Beach trip, anyone?` },
  { condition: "Cloudy", msg: (t: number) => `${t}°F and overcast. Great coffee shop weather.` },
  { condition: "Cloudy", msg: (t: number) => `Cloudy at ${t}°F — perfect for a museum or study sesh.` },
  { condition: "Rainy", msg: (t: number) => `${t}°F and rainy. Cozy up at Kreuzberg or the library.` },
  { condition: "any", msg: (t: number) => `Hey! It's ${t}°F in SLO. What's the move today?` },
  { condition: "any", msg: (t: number) => `${t}°F right now. You've got options — explore or lock in?` },
  { condition: "any", msg: (t: number) => `Good vibes at ${t}°F. Let me help you plan something fun.` },
  { condition: "any", msg: (t: number) => `It's ${t}°F outside. Farmers market is Thursday!` },
];

const workMessages = [
  (t: number) => `${t}°F outside, but let's focus first. You got this.`,
  (t: number) => `Lock in mode activated. ${t}°F waiting for you after.`,
  (t: number) => `Grind now, explore later. ${t}°F will still be there.`,
  (t: number) => `Focus session time. The beach isn't going anywhere (${t}°F).`,
];

const timerPresets = [
  { label: "15 MIN", seconds: 15 * 60 },
  { label: "25 MIN", seconds: 25 * 60 },
  { label: "45 MIN", seconds: 45 * 60 },
  { label: "60 MIN", seconds: 60 * 60 },
];

const todayDeadlines = [
  { id: "d1", course: "IME 223", name: 'Term Project | "5S Analysis"', time: "8:10 AM" },
  { id: "d2", course: "IME 223", name: "Lab: Assembly Line Data", time: "11:00 AM" },
];

const weekDeadlines = [
  { id: "d3", course: "CSC 357", name: "Lab 5: Signals & Pipes", time: "Wed Feb 26 · 11:59 PM" },
  { id: "d4", course: "ENGL 149", name: "Research Paper Draft 2", time: "Thu Feb 27 · 5:00 PM" },
  { id: "d5", course: "IME 223", name: "Homework 7", time: "Fri Feb 28 · 8:10 AM" },
];

// Simple "events happening" data
const sloEvents = [
  { id: "ev1", name: "Downtown Farmers Market", when: "Thu", time: "6–9 PM", emoji: "🥕" },
  { id: "ev2", name: "SLO Brew Live Music", when: "Today", time: "8 PM", emoji: "🎵" },
  { id: "ev3", name: "Bishop Peak Sunset Hike", when: "Tomorrow", time: "5 PM", emoji: "🌅" },
  { id: "ev4", name: "Art After Dark", when: "Tomorrow", time: "6–9 PM", emoji: "🎨" },
  { id: "ev5", name: "Cal Poly Basketball", when: "Sat", time: "7 PM", emoji: "🏀" },
  { id: "ev6", name: "Pismo Car Show", when: "Sat", time: "10 AM", emoji: "🚗" },
];

export function Dashboard() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"explore" | "work">("explore");
  const [exploreView, setExploreView] = useState<"initial" | "inside" | "outside" | "nearby">("initial");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const [userName, setUserName] = useState("Explorer");
  const [weather] = useState({ temp: 72, condition: "Sunny" });
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
  const [eventFilter, setEventFilter] = useState("Today");

  // Nearby state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<(Place & { distanceMi: number })[]>([]);
  const [locating, setLocating] = useState(false);

  // Jarvis message index
  const [msgIdx] = useState(() => Math.floor(Math.random() * jarvisMessages.length));
  const [workMsgIdx] = useState(() => Math.floor(Math.random() * workMessages.length));

  // Load tasks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(TASKS_KEY);
    if (saved) {
      try { setTasks(JSON.parse(saved)); } catch { setTasks(defaultTasks); }
    } else {
      setTasks(defaultTasks);
      localStorage.setItem(TASKS_KEY, JSON.stringify(defaultTasks));
    }
    const v = localStorage.getItem(VISITED_KEY);
    if (v) try { setVisited(JSON.parse(v)); } catch { /* */ }
  }, []);

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
    if (pins) setPinnedEvents(JSON.parse(pins));
    const l = localStorage.getItem("polyjarvis_liked");
    if (l) setLikedIds(JSON.parse(l));
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

  const handleLike = (id: string) => {
    const updated = likedIds.includes(id) ? likedIds.filter(l => l !== id) : [...likedIds, id];
    setLikedIds(updated);
    localStorage.setItem("polyjarvis_liked", JSON.stringify(updated));
    if (!likedIds.includes(id)) toast("Added to favorites", { icon: "❤️" });
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
    return pool;
  }, [exploreView, activeFilter]);

  // Jarvis message
  const WeatherIcon = weatherIcons[weather.condition] || Sun;
  const jarvisMsg = mode === "work"
    ? workMessages[workMsgIdx % workMessages.length](weather.temp)
    : (jarvisMessages.find((m, i) => i === msgIdx && (m.condition === weather.condition || m.condition === "any")) || jarvisMessages[jarvisMessages.length - 1]).msg(weather.temp);

  // Geolocation
  const handleFindNearby = () => {
    setLocating(true);
    const showNearby = (lat: number, lng: number, isReal: boolean) => {
      const withDist = places.map(place => ({
        ...place,
        distanceMi: getDistanceMiles(lat, lng, place.lat, place.lng),
      }));
      withDist.sort((a, b) => a.distanceMi - b.distanceMi);
      setNearbyPlaces(withDist);
      setUserLocation({ lat, lng, label: isReal ? "Your Location" : "Cal Poly Campus" });
      setLocating(false);
      setView("nearby");
      if (isReal) toast.success(`Found ${withDist.length} spots sorted by distance!`);
      else toast("Showing spots near Cal Poly campus", { icon: "📍" });
    };
    const canUseGeo = "geolocation" in navigator;
    if (canUseGeo && navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state === "denied" || result.state === "prompt") {
          showNearby(CAL_POLY_LAT, CAL_POLY_LNG, false);
        } else {
          navigator.geolocation.getCurrentPosition(
            (pos) => showNearby(pos.coords.latitude, pos.coords.longitude, true),
            () => showNearby(CAL_POLY_LAT, CAL_POLY_LNG, false),
            { enableHighAccuracy: false, timeout: 5000 }
          );
        }
      }).catch(() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => showNearby(pos.coords.latitude, pos.coords.longitude, true),
          () => showNearby(CAL_POLY_LAT, CAL_POLY_LNG, false),
          { enableHighAccuracy: false, timeout: 3000 }
        );
      });
    } else if (canUseGeo) {
      navigator.geolocation.getCurrentPosition(
        (pos) => showNearby(pos.coords.latitude, pos.coords.longitude, true),
        () => showNearby(CAL_POLY_LAT, CAL_POLY_LNG, false),
        { enableHighAccuracy: false, timeout: 3000 }
      );
    } else {
      showNearby(CAL_POLY_LAT, CAL_POLY_LNG, false);
    }
  };

  const activeTasks = tasks.filter(t => !t.done);
  const doneTasks = tasks.filter(t => t.done);
  const filteredEvents = sloEvents.filter(e => e.when === eventFilter);

  // Timer progress
  const timerProgress = timerDuration > 0 ? ((timerDuration - timeLeft) / timerDuration) * 100 : 0;

  return (
    <div className="min-h-[100dvh] bg-transparent pb-24 text-white font-sans">
      <PageHeader />

      {/* Header with Jarvis Bubble */}
      <div className="px-5 pb-2">
        <div className="flex items-start gap-3">
          {/* Jarvis Bubble */}
          <div className="flex-1 bg-white/8 border border-[#8BC34A]/15 rounded-2xl rounded-tl-sm p-3.5 relative backdrop-blur-md">
            <div className="flex items-center gap-2 mb-1.5">
              <WeatherIcon size={14} className="text-[#8BC34A]" />
              <span className="text-[10px] font-bold text-[#8BC34A] uppercase tracking-wider">{weather.temp}°F · {weather.condition}</span>
            </div>
            <p className="text-sm font-medium leading-relaxed text-white/80">{jarvisMsg}</p>
            <Link to="/tutorial" className="absolute top-2.5 right-2.5 text-white/20 hover:text-[#8BC34A]">
              <HelpCircle size={15} />
            </Link>
          </div>
          {/* Jarvis Icon */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 bg-[#8BC34A]/15 border border-[#8BC34A]/20 rounded-xl flex items-center justify-center">
              <JarvisLogo size={24} className="text-[#8BC34A]" />
            </div>
          </div>
        </div>
      </div>

      {/* Mode Toggle — Explore / Work */}
      <div className="px-5 mt-4 mb-4">
        <div className="flex border-b border-white/10 pb-1 gap-6">
          <button
            onClick={() => setMode("explore")}
            className={`pb-2 text-xs font-black uppercase tracking-widest transition-all ${
              mode === "explore" ? "text-[#8BC34A] border-b-2 border-[#8BC34A] -mb-[5px]" : "text-white/25 hover:text-white/40"
            }`}
          >
            EXPLORE
          </button>
          <button
            onClick={() => setMode("work")}
            className={`pb-2 text-xs font-black uppercase tracking-widest transition-all ${
              mode === "work" ? "text-[#F2E8CF] border-b-2 border-[#F2E8CF] -mb-[5px]" : "text-white/25 hover:text-white/40"
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
            className="px-5 pt-2"
          >
            <h1 className="text-3xl font-black text-[#F2E8CF] tracking-tight uppercase mb-4">LOCK IN.</h1>

            {/* Focus Timer */}
            <div className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl p-5 mb-5 relative overflow-hidden">
              {/* Progress bar bg */}
              <div className="absolute bottom-0 left-0 h-1 bg-white/5 w-full" />
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-[#8BC34A] rounded-r"
                animate={{ width: `${timerProgress}%` }}
                transition={{ duration: 0.5 }}
              />

              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-black text-[#8BC34A] uppercase tracking-widest mb-1">FOCUS TIMER</p>
                  <p className="text-4xl font-mono font-bold text-white tracking-tight">{formatTime(timeLeft)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={toggleTimer}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      timerActive
                        ? "bg-red-500/20 text-red-400 border border-red-500/20"
                        : "bg-[#8BC34A] text-[#233216] shadow-md"
                    }`}
                  >
                    {timerActive ? "PAUSE" : "START"}
                  </button>
                  {!timerActive && timeLeft !== timerDuration && (
                    <button
                      onClick={() => setTimeLeft(timerDuration)}
                      className="px-3 py-2.5 rounded-xl font-bold text-xs bg-white/10 text-white/50"
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
                        ? "bg-[#8BC34A]/20 text-[#8BC34A] border border-[#8BC34A]/30"
                        : "bg-white/5 text-white/30 border border-white/5"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-black text-[#8BC34A] uppercase tracking-widest">TASKS</h2>
              <div className="text-[10px] font-black bg-white/10 text-white/50 px-2.5 py-0.5 rounded-full uppercase">
                {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </div>

            {/* Active Tasks */}
            <div className="space-y-2 mb-3">
              {activeTasks.length === 0 && doneTasks.length === 0 && (
                <div className="bg-white/5 border border-white/5 rounded-xl p-6 text-center">
                  <p className="text-xs text-white/30 font-bold">No tasks yet. Add one below!</p>
                </div>
              )}
              {activeTasks.map(a => (
                <div key={a.id} className="bg-white/8 border border-white/10 rounded-xl p-3.5 relative overflow-hidden group">
                  {a.priority && <div className="absolute top-0 right-0 bg-[#F2E8CF] text-[#233216] text-[9px] font-black px-2 py-0.5 rounded-bl-lg">PRIORITY</div>}
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTaskDone(a.id)}
                      className="w-5 h-5 mt-0.5 rounded-full border-2 border-white/20 flex items-center justify-center flex-shrink-0 hover:border-[#8BC34A] transition-colors"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-sm font-bold text-white">{a.name}</h3>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-[#8BC34A] bg-[#8BC34A]/10 px-1.5 py-0.5 rounded">{a.course}</span>
                          <button onClick={() => removeTask(a.id)} className="text-white/15 hover:text-red-400 transition-colors ml-1">
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-white/40">
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
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">COMPLETED ({doneTasks.length})</p>
                <div className="space-y-1.5">
                  {doneTasks.map(a => (
                    <div key={a.id} className="bg-white/4 border border-white/5 rounded-xl p-3 flex items-center gap-3 opacity-50">
                      <button
                        onClick={() => toggleTaskDone(a.id)}
                        className="w-5 h-5 rounded-full bg-[#8BC34A] flex items-center justify-center flex-shrink-0 text-[#233216] text-xs font-bold"
                      >✓</button>
                      <span className="text-xs line-through text-white/30 flex-1">{a.name}</span>
                      <button onClick={() => removeTask(a.id)} className="text-white/10 hover:text-red-400 transition-colors">
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
                className="flex-1 bg-white/8 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#8BC34A]/40"
                onKeyDown={(e) => e.key === "Enter" && addTask()}
              />
              <button onClick={addTask} className="bg-[#8BC34A] text-[#233216] p-2.5 rounded-xl">
                <Plus size={18} />
              </button>
            </div>

            {/* Inline Calendar Section */}
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-3"
            >
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-[#8BC34A]" />
                <span className="text-xs font-black text-white/50 uppercase tracking-widest">FULL CALENDAR</span>
              </div>
              {showCalendar ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
            </button>

            <AnimatePresence>
              {showCalendar && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden mb-5"
                >
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-black text-red-400/80 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> DUE TODAY
                      </p>
                      {todayDeadlines.map(d => (
                        <div key={d.id} className="bg-white/5 border border-white/5 rounded-lg p-3 mb-1.5 flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white/80 truncate">{d.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] text-white/30">{d.course}</span>
                              <span className="text-[9px] text-red-400/60">{d.time}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">THIS WEEK</p>
                      {weekDeadlines.map(d => (
                        <div key={d.id} className="bg-white/3 border border-white/5 rounded-lg p-2.5 mb-1.5 flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-white/50 truncate">{d.name}</p>
                            <span className="text-[9px] text-white/20">{d.course} · {d.time}</span>
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
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 active:bg-white/8 transition-colors">
                <div className="bg-[#8BC34A]/15 p-2 rounded-lg"><MapPin size={16} className="text-[#8BC34A]" /></div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-white/70">MY PLANS</p>
                  <p className="text-[10px] text-white/30">Create & share itineraries</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ) : (
          /* EXPLORE MODE (GO EXPLORE) */
          <motion.div
            key="explore"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="px-5 pt-2"
          >
            {exploreView === "initial" ? (
              <>
                <h1 className="text-3xl font-black text-[#8BC34A] tracking-tight uppercase mb-4">GO EXPLORE.</h1>

                {/* Events Widget */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black text-[#8BC34A] uppercase tracking-widest">HAPPENING SOON</p>
                    <div className="flex gap-1">
                      {["Today", "Tomorrow", "Thu", "Sat"].map(d => (
                        <button
                          key={d}
                          onClick={() => setEventFilter(d)}
                          className={`text-[9px] font-black px-2 py-1 rounded-md tracking-wider transition-all ${
                            eventFilter === d
                              ? "bg-[#8BC34A]/20 text-[#8BC34A]"
                              : "text-white/25 hover:text-white/40"
                          }`}
                        >
                          {d.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  {filteredEvents.length === 0 ? (
                    <p className="text-xs text-white/20 text-center py-2">Nothing scheduled for {eventFilter}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {filteredEvents.map(ev => (
                        <div key={ev.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                          <span className="text-lg">{ev.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white/70 truncate">{ev.name}</p>
                            <p className="text-[10px] text-white/30">{ev.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Decision Tree Buttons */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    onClick={() => setView("inside")}
                    className="aspect-square rounded-2xl bg-white/8 border border-white/10 p-4 flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-all"
                  >
                    <div className="w-12 h-12 bg-[#8BC34A]/15 rounded-full flex items-center justify-center text-2xl">🏠</div>
                    <span className="font-black text-base text-white uppercase tracking-wider">INSIDE</span>
                  </button>

                  <button
                    onClick={() => setView("outside")}
                    className="aspect-square rounded-2xl bg-[#8BC34A]/10 border border-[#8BC34A]/20 p-4 flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-all"
                  >
                    <div className="w-12 h-12 bg-[#8BC34A]/20 rounded-full flex items-center justify-center text-2xl">🌲</div>
                    <span className="font-black text-base text-[#8BC34A] uppercase tracking-wider">OUTSIDE</span>
                  </button>
                </div>

                <h2 className="text-[10px] font-black text-white/25 uppercase tracking-widest mb-3">OR TRY SOMETHING ELSE...</h2>

                {/* Quick Actions */}
                <div className="space-y-2.5">
                  <button
                    onClick={handleFindNearby}
                    disabled={locating}
                    className="w-full py-3.5 bg-white/8 border border-white/10 rounded-xl flex items-center justify-center gap-2 font-bold text-sm text-white/70 active:bg-white/12 disabled:opacity-50"
                  >
                    {locating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-[#8BC34A] rounded-full animate-spin" />
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
                      <button className="w-full py-3.5 bg-white/5 border border-white/8 rounded-xl flex items-center justify-center gap-2 font-bold text-xs text-white/40 hover:bg-white/8">
                        <Compass size={14} /> BROWSE ALL
                      </button>
                    </Link>
                    <button
                      onClick={() => setShowMap(!showMap)}
                      className="w-full py-3.5 bg-white/5 border border-white/8 rounded-xl flex items-center justify-center gap-2 font-bold text-xs text-white/40 hover:bg-white/8"
                    >
                      <Map size={14} /> MY MAP
                    </button>
                  </div>

                  {/* Plans link */}
                  <Link to="/plans">
                    <button className="w-full py-3.5 bg-[#8BC34A]/8 border border-[#8BC34A]/15 rounded-xl flex items-center justify-center gap-2 font-bold text-xs text-[#8BC34A]/60 hover:bg-[#8BC34A]/12">
                      <MapPin size={14} /> MY PLANS
                    </button>
                  </Link>
                </div>

                {/* Map section */}
                <AnimatePresence>
                  {showMap && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-4"
                    >
                      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                        {/* SLO Map header */}
                        <div className="relative h-36 overflow-hidden">
                          <img src={sloMapImg} alt="SLO Map" className="w-full h-full object-cover opacity-40" />
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0d1208]/95" />
                          <div className="absolute bottom-3 left-4 right-4">
                            <p className="text-[10px] font-black text-[#8BC34A] uppercase tracking-widest">SLO ADVENTURE MAP</p>
                            <p className="text-[9px] text-white/30 mt-0.5">Check in at spots to track your journey</p>
                          </div>
                        </div>
                        <div className="p-4">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">PLACES YOU'VE VISITED</p>
                        {visited.length === 0 ? (
                          <p className="text-xs text-white/20 text-center py-4">No check-ins yet. Visit a spot and mark it!</p>
                        ) : (
                          <div className="space-y-2">
                            {visited.slice(0, 8).map(v => (
                              <div key={v.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                                <div className="w-2 h-2 rounded-full bg-[#8BC34A]" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-white/60 truncate">{v.name}</p>
                                  <p className="text-[9px] text-white/25">{v.minutesSpent} min · {new Date(v.visitedAt).toLocaleDateString()}</p>
                                </div>
                              </div>
                            ))}
                            <p className="text-[10px] text-white/15 text-center mt-2">{visited.length} total check-ins</p>
                          </div>
                        )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Friends Activity */}
                <Link to="/friends" className="block mt-5">
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-black text-[#8BC34A] uppercase tracking-widest">FRIENDS ACTIVITY</p>
                      <span className="text-[9px] font-bold text-white/20">VIEW ALL</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {[
                        { name: "Alex", status: "exploring", emoji: "🌿", color: "#8BC34A" },
                        { name: "Emma", status: "studying", emoji: "📚", color: "#F2E8CF" },
                        { name: "Jake", status: "chilling", emoji: "☕", color: "#64B5F6" },
                        { name: "Sarah", status: "exploring", emoji: "🏖️", color: "#8BC34A" },
                        { name: "Marcus", status: "busy", emoji: "🔒", color: "#EF5350" },
                      ].map(f => (
                        <div key={f.name} className="flex flex-col items-center gap-1 min-w-[52px]">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border" style={{ backgroundColor: `${f.color}15`, borderColor: `${f.color}30`, color: f.color }}>
                              {f.name[0]}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1a2e10]" style={{ backgroundColor: f.color }} />
                          </div>
                          <span className="text-[9px] font-bold text-white/40">{f.name}</span>
                          <span className="text-[8px]">{f.emoji}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>

                {/* Reservation Bot Placeholder */}
                <div className="mt-4 bg-gradient-to-r from-[#8BC34A]/10 to-[#64B5F6]/10 border border-[#8BC34A]/15 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#8BC34A]/20 rounded-xl flex items-center justify-center text-lg flex-shrink-0">🤖</div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-[#8BC34A] uppercase tracking-wider">RESERVATION BOT</p>
                      <p className="text-[10px] text-white/35 mt-0.5">Auto-book restaurants & activities</p>
                    </div>
                    <span className="text-[8px] font-black bg-[#8BC34A]/20 text-[#8BC34A] px-2 py-1 rounded-full">COMING SOON</span>
                  </div>
                </div>
              </>
            ) : exploreView === "nearby" ? (
              /* NEARBY VIEW */
              <>
                <div className="flex items-center gap-3 mb-4">
                  <button onClick={() => setView("initial")} className="w-9 h-9 rounded-xl border border-white/15 flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0">
                    <ArrowLeftIcon />
                  </button>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight text-white">NEARBY SPOTS</h2>
                    {userLocation && (
                      <p className="text-[10px] text-white/30 font-bold">📍 {userLocation.label}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {nearbyPlaces.map(place => {
                    const liked = likedIds.includes(place.id);
                    const feet = place.distanceMi * 5280;
                    const distLabel = feet <= 500 ? `${Math.round(feet)} ft` : `${place.distanceMi.toFixed(1)} mi`;

                    return (
                      <div key={place.id} onClick={() => navigate(`/event/${place.id}`)} className="bg-white/8 border border-white/10 rounded-xl overflow-hidden active:scale-[0.98] transition-transform">
                        <div className="flex h-24">
                          <img src={place.image} className="w-24 h-full object-cover border-r border-white/10" loading="lazy" />
                          <div className="flex-1 p-3 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-sm leading-tight text-white line-clamp-1">{place.name}</h3>
                                <span className="text-[9px] font-bold bg-[#8BC34A]/20 px-1.5 py-0.5 rounded text-[#8BC34A] flex items-center gap-0.5 flex-shrink-0 ml-1">
                                  <Navigation size={7} /> {distLabel}
                                </span>
                              </div>
                              <p className="text-[11px] text-white/40 line-clamp-1">{place.description}</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex gap-1">
                                {place.price && <span className="text-[9px] font-bold bg-white/8 px-1.5 py-0.5 rounded text-white/40">{place.price}</span>}
                                {place.rating && <span className="text-[9px] font-bold bg-[#FBC02D]/10 px-1.5 py-0.5 rounded text-[#FBC02D] flex items-center gap-0.5">★ {place.rating}</span>}
                              </div>
                              <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); markVisited(place); }} className="text-white/20 hover:text-[#8BC34A]">
                                  <MapPin size={14} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleLike(place.id); }} className={liked ? "text-red-500" : "text-white/20 hover:text-red-400"}>
                                  <Heart size={14} fill={liked ? "currentColor" : "none"} />
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
                  <button onClick={() => setView("initial")} className="w-9 h-9 rounded-xl border border-white/15 flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0">
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
                          ? "bg-[#8BC34A] text-[#233216]"
                          : "bg-white/8 text-white/40 border border-white/10"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {recommendations.length === 0 ? (
                    <div className="text-center py-10 text-white/20">
                      <p className="text-sm">No spots found matching this filter.</p>
                      <button onClick={() => setActiveFilter(null)} className="text-[#8BC34A] font-bold mt-2 hover:underline text-xs">CLEAR FILTERS</button>
                    </div>
                  ) : (
                    recommendations.map(place => {
                      const liked = likedIds.includes(place.id);
                      return (
                        <div key={place.id} onClick={() => navigate(`/event/${place.id}`)} className="bg-white/8 border border-white/10 rounded-xl overflow-hidden active:scale-[0.98] transition-transform">
                          <div className="flex h-24">
                            <img src={place.image} className="w-24 h-full object-cover border-r border-white/10" loading="lazy" />
                            <div className="flex-1 p-3 flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between items-start mb-1">
                                  <h3 className="font-bold text-sm leading-tight text-white line-clamp-1">{place.name}</h3>
                                  <div className="flex gap-1 flex-shrink-0 ml-1">
                                    {place.price && <span className="text-[9px] font-bold bg-white/8 px-1.5 py-0.5 rounded text-white/40">{place.price}</span>}
                                    {place.rating && <span className="text-[9px] font-bold bg-[#FBC02D]/10 px-1.5 py-0.5 rounded text-[#FBC02D] flex items-center gap-0.5">★ {place.rating}</span>}
                                  </div>
                                </div>
                                <p className="text-[11px] text-white/40 line-clamp-1">{place.description}</p>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <div className="flex gap-2">
                                  <button onClick={(e) => { e.stopPropagation(); handleLike(place.id); }} className={liked ? "text-red-500" : "text-white/20 hover:text-red-400"}>
                                    <Heart size={14} fill={liked ? "currentColor" : "none"} />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); togglePin(place.id); }} className={pinnedEvents.includes(place.id) ? "text-[#F2E8CF]" : "text-white/20 hover:text-[#F2E8CF]"}>
                                    <Pin size={14} fill={pinnedEvents.includes(place.id) ? "currentColor" : "none"} />
                                  </button>
                                </div>
                                <div className="flex gap-2">
                                  {place.features?.includes("needs car") && <Car size={12} className="text-white/15" />}
                                  {place.features?.includes("bus available") && <Bus size={12} className="text-white/15" />}
                                </div>
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