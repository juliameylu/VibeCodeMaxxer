import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Sun, Cloud, CloudRain, CloudSnow, Wind, X, Compass, Car, Navigation, Clock, Sparkles, Users, Plus, CalendarClock, Timer, Coffee, Mountain, TreePine, Home as HomeIcon, Lock, Unlock, ArrowRight, ArrowLeft, UtensilsCrossed, Waves, Map as MapIcon, Moon, Sunrise, Sunset, Pin, Layers, Bus, LocateFixed, MapPin } from "lucide-react";
import { places, getDistanceMiles, CAL_POLY_LAT, CAL_POLY_LNG, Place } from "../data/places";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "/utils/supabase/client";
import { BottomNav } from "../components/BottomNav";
import { JarvisLogo } from "../components/JarvisLogo";
import { PageHeader } from "../components/PageHeader";
import { MapContainer, TileLayer, Marker, useMap, Tooltip, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getUserPreferences, getPreferenceScore, getPersonalizedGreeting } from "../utils/preferences";
import { getSettings } from "../utils/settings";
import { getPolyTree, recordSession, getTreeSpecies, treeSpecies, savePolyTree, type PolyTreeData } from "../utils/polytree";
import { PolyTreeVis } from "../components/PolyTree";
import { listBackendFriends, listBackendUsers } from "../../lib/api/backend";
import { getSession } from "../../lib/auth/session";

const TASKS_KEY = "polyjarvis_tasks";
const FOCUS_LOG_KEY = "polyjarvis_focus_log";
const CHAT_HISTORY_KEY = "polyjarvis_chat_history";

const focusBgImage = "https://images.unsplash.com/photo-1684335796409-38db89822089?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaXN0eSUyMG1vdW50YWlucyUyMGZvcmVzdCUyMG1vb2R5JTIwZGFya3xlbnwxfHx8fDE3NzE3NDE1NDN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

interface Task {
  id: string;
  course: string;
  name: string;
  dueTime: string;
  dueDate: string;
  priority: boolean;
  done: boolean;
}

const defaultTasks: Task[] = [
  { id: "1", course: "IME 223", name: "Muda Analysis", dueTime: "11:59 PM", dueDate: "Today", priority: true, done: false },
  { id: "2", course: "IME 223", name: "Lab: Assembly Line Data", dueTime: "Tomorrow", dueDate: "Tomorrow", priority: false, done: false },
];

const weatherIcons: Record<string, typeof Sun> = {
  "Sunny": Sun, "Mostly Clear": Sun, "Partly Cloudy": Cloud, "Overcast": Cloud,
  "Cloudy": Cloud, "Foggy": Cloud, "Drizzle": CloudRain, "Freezing Drizzle": CloudRain,
  "Rainy": CloudRain, "Heavy Rain": CloudRain, "Rain Showers": CloudRain,
  "Snowy": CloudSnow, "Snow Grains": CloudSnow, "Thunderstorm": CloudRain,
  "Dawn": Sunrise, "Dusk": Sunset, "Clear Night": Moon, "Windy": Wind,
};

const jarvisMessages = [
  { condition: "Sunny", msg: (t: number) => `${t}\u00B0F and gorgeous out. Grab a friend, hit the beach?` },
  { condition: "Sunny", msg: (t: number) => `${t}\u00B0F, clear skies. Bishop Peak's calling your name.` },
  { condition: "Sunny", msg: (t: number) => `${t}\u00B0F and sunny. Tri-tip at Firestone then a beach run?` },
  { condition: "Mostly Clear", msg: (t: number) => `${t}\u00B0F, mostly clear. Perfect for a Poly Canyon stroll.` },
  { condition: "Partly Cloudy", msg: (t: number) => `${t}\u00B0F with some clouds. Still gorgeous. Patio weather at Novo.` },
  { condition: "Overcast", msg: (t: number) => `${t}\u00B0F and overcast. Coffee shop weather \u2014 Kreuzberg or Scout?` },
  { condition: "Cloudy", msg: (t: number) => `${t}\u00B0F and cloudy. Perfect excuse for ramen at Raku.` },
  { condition: "Foggy", msg: (t: number) => `${t}\u00B0F and foggy. Classic Central Coast. It'll burn off by noon.` },
  { condition: "Rainy", msg: (t: number) => `${t}\u00B0F and rainy. Rare in SLO \u2014 cozy up at Kreuzberg with a good book.` },
  { condition: "Drizzle", msg: (t: number) => `${t}\u00B0F, light drizzle. Farmer's market tonight?` },
  { condition: "Dawn", msg: (t: number) => `${t}\u00B0F at dawn. Golden hour from Bishop Peak? Just saying.` },
  { condition: "Dusk", msg: (t: number) => `${t}\u00B0F at dusk. Catch the sunset from Terrace Hill. Trust me.` },
  { condition: "Clear Night", msg: (t: number) => `${t}\u00B0F clear night. Stars are out over Poly Canyon.` },
  { condition: "any", msg: (t: number) => `${t}\u00B0F in SLO. What sounds good today?` },
  { condition: "any", msg: (t: number) => `${t}\u00B0F right now. Not bad. What's the move?` },
];

// Weather-aware blurbs from Jarvis training data
const weatherBlurbs: Record<string, string[]> = {
  sunny: ["That's a prime SLO day.", "Don't waste the sun.", "Golden light kind of afternoon.", "This is outdoor currency.", "Blue sky = low excuses.", "Peak coastal conditions.", "Clear skies hit different here.", "You'll regret staying inside.", "This is why you live here."],
  cloudy: ["Soft sky, soft schedule.", "Marine layer energy.", "Classic coastal gray.", "Calm light today.", "Moody but peaceful.", "Good thinking weather.", "Cloud cover makes downtown cozy.", "No harsh sun, just steady vibes.", "Quiet sky kind of day."],
  rain: ["Rain in SLO is rare. Lean into it.", "Slow day energy.", "Perfect excuse to stay inside.", "Coffee weather.", "Indoor culture day.", "Library-core atmosphere.", "No beach guilt today.", "Rain makes everything quieter.", "Stay dry, stay focused."],
  windy: ["Wind's up \u2014 skip exposed peaks.", "Bluff trails might fight back today.", "Not a Bishop Peak kind of afternoon.", "Downtown might be smarter.", "Coastal gust advisory for your plans.", "Save the summit for calmer air.", "Wind changes the vibe."],
  fog: ["Classic marine layer.", "Fog now, golden later.", "Gray morning, probably bright afternoon.", "Two-phase day.", "Use the gray for focus.", "Slow coastal morning.", "Fog makes everything feel cinematic.", "Let it burn off first.", "Calm start kind of day."],
};

const timeOfDaySuggestions: Record<string, { label: string; categories: string[]; icon: typeof Coffee }> = {
  morning: { label: "Morning picks", categories: ["Coffee Shops"], icon: Coffee },
  afternoon: { label: "Afternoon spots", categories: ["Food & Treats", "Hikes", "Beaches"], icon: Sun },
  evening: { label: "Tonight", categories: ["Food & Treats", "Live Music", "Breweries"], icon: Sunset },
  late_night: { label: "Late night", categories: ["Food & Treats", "Coffee Shops"], icon: Moon },
};

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "late_night";
}

function getWeatherCategory(condition: string): string {
  const c = condition.toLowerCase();
  if (["sunny", "mostly clear", "clear night", "dawn", "dusk"].some(k => c.includes(k))) return "sunny";
  if (["rain", "drizzle", "shower", "thunderstorm"].some(k => c.includes(k))) return "rain";
  if (c.includes("fog")) return "fog";
  if (c.includes("wind")) return "windy";
  return "cloudy";
}

const workMessages = [
  (t: number) => `${t}\u00B0F outside. It'll still be there after. Let's focus.`,
  (t: number) => `Lock in. ${t}\u00B0F is waiting for you when you're done.`,
  (t: number) => `Momentum first. ${t}\u00B0F reward later.`,
];

const timerPresets = [
  { label: "15 Min", seconds: 15 * 60 },
  { label: "25 Min", seconds: 25 * 60 },
  { label: "45 Min", seconds: 45 * 60 },
  { label: "60 Min", seconds: 60 * 60 },
];

const todayDeadlines = [
  { id: "d1", course: "IME 223", name: 'Term Project | "5S Analysis"', time: "8:10 AM" },
  { id: "d2", course: "IME 223", name: "Lab: Assembly Line Data", time: "11:00 AM" },
];

const weekDeadlines = [
  { id: "d3", course: "CSC 357", name: "Lab 5: Signals & Pipes", time: "Wed Feb 26" },
  { id: "d4", course: "ENGL 149", name: "Research Paper Draft 2", time: "Thu Feb 27" },
];


const defaultFriendsData = [
  { name: "Alex", status: "exploring", color: "#8BC34A", statusText: "Hiking Bishop Peak", available: true, icon: Mountain },
  { name: "Emma", status: "studying", color: "#F2E8CF", statusText: "Library grind", available: false, icon: Coffee },
  { name: "Jake", status: "chilling", color: "#64B5F6", statusText: "Scout Coffee", available: true, icon: Coffee },
  { name: "Sarah", status: "exploring", color: "#8BC34A", statusText: "Beach day!", available: true, icon: Sun },
  { name: "Marcus", status: "busy", color: "#EF5350", statusText: "Do not disturb", available: false, icon: X },
];

const stopReasons = [
  { id: "accident", label: "Accident", emoji: "🤷" },
  { id: "lazy", label: "Lazy", emoji: "😴" },
  { id: "sick", label: "Don't feel good", emoji: "🤒" },
  { id: "plans", label: "Have plans", emoji: "📅" },
];

// ─── Inline Map helpers ──────────────────────────────────────────────────────
const categorySvgIcons: Record<string, { svg: string; bg: string }> = {
  "Coffee Shops":   { svg: `<path d="M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8zM6 2v2M10 2v2M14 2v2" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>`, bg: "#6D4C41" },
  "Food & Treats":  { svg: `<path d="M3 2l1 18h16l1-18M9 2v6a3 3 0 0 0 6 0V2" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>`, bg: "#E65100" },
  "Beaches":        { svg: `<path d="M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>`, bg: "#0288D1" },
  "Hikes":          { svg: `<path d="M8 3l4 8 4-8M4 21l4-8M20 21l-4-8M12 11v10" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`, bg: "#2E7D32" },
  "Study Spots":    { svg: `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V5a2 2 0 0 1 2-2h14v14H6.5A2.5 2.5 0 0 0 4 19.5z" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>`, bg: "#5C6BC0" },
  "Live Music":     { svg: `<path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" stroke="white" stroke-width="2.5" fill="none"/>`, bg: "#8E24AA" },
  "Breweries":      { svg: `<path d="M17 11h1a3 3 0 0 1 0 6h-1M4 8h12v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>`, bg: "#F57F17" },
  "Parks & Gardens": { svg: `<path d="M12 22V8M12 8C12 8 8 4 8 2c0 2 0 6 4 6zM12 8c0 0 4-4 4-6 0 2 0 6-4 6zM7 15c-2-1-5 0-5 3h5M17 15c2-1 5 0 5 3h-5" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`, bg: "#388E3C" },
  "Viewpoints":     { svg: `<circle cx="12" cy="12" r="4" stroke="white" stroke-width="2.5" fill="none"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="white" stroke-width="2.5" stroke-linecap="round"/>`, bg: "#FF6F00" },
  "Farmers Markets": { svg: `<path d="M7 21h10M12 3a5 5 0 0 1 5 5v3H7V8a5 5 0 0 1 5-5zM5 11h14l-1 10H6L5 11z" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`, bg: "#558B2F" },
  "Art":            { svg: `<circle cx="13.5" cy="6.5" r="2.5" stroke="white" stroke-width="2.5" fill="none"/><path d="M3 20c4-6 8-6 10-2 2-4 5-6 8-2" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>`, bg: "#7B1FA2" },
  "Museums":        { svg: `<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-5h6v5" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`, bg: "#1565C0" },
  "Movies":         { svg: `<rect x="2" y="4" width="20" height="16" rx="2" stroke="white" stroke-width="2.5" fill="none"/><path d="M2 8h20M2 16h20M8 4v16M16 4v16" stroke="white" stroke-width="2" fill="none"/>`, bg: "#C62828" },
  "Shopping":       { svg: `<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>`, bg: "#AD1457" },
  "Wineries":       { svg: `<path d="M8 22h8M12 14v8M12 14a5 5 0 0 0 5-5c0-3-5-9-5-9s-5 6-5 9a5 5 0 0 0 5 5z" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>`, bg: "#6A1B9A" },
  "History":        { svg: `<path d="M3 21h18M5 21V8l7-5 7 5v13M9 12h6M9 16h6" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`, bg: "#5D4037" },
  "Bowling":        { svg: `<circle cx="12" cy="14" r="8" stroke="white" stroke-width="2.5" fill="none"/><circle cx="10" cy="11" r="1" fill="white"/><circle cx="14" cy="11" r="1" fill="white"/><circle cx="12" cy="15" r="1" fill="white"/>`, bg: "#FF5722" },
  "Zoos & Aquariums": { svg: `<path d="M12 2C7 2 3 6 3 10c0 6 9 12 9 12s9-6 9-12c0-4-4-8-9-8z" stroke="white" stroke-width="2.5" fill="none"/><circle cx="10" cy="9" r="1" fill="white"/><circle cx="14" cy="9" r="1" fill="white"/>`, bg: "#00897B" },
  "Wellness":         { svg: `<path d="M12 21c-4-4-8-7-8-11a5 5 0 0110 0 5 5 0 0110 0c0 4-4 7-8 11z" stroke="white" stroke-width="2.5" fill="none"/>`, bg: "#00897B" },
  "Gym":              { svg: `<path d="M6 7v10M18 7v10" stroke="white" stroke-width="3" stroke-linecap="round"/><path d="M6 12h12" stroke="white" stroke-width="2.5" stroke-linecap="round"/><path d="M3 9v6M21 9v6" stroke="white" stroke-width="2.5" stroke-linecap="round"/>`, bg: "#FF5722" },
  "Games & Arcades":  { svg: `<rect x="3" y="7" width="18" height="10" rx="3" stroke="white" stroke-width="2" fill="none"/><circle cx="9" cy="12" r="1.5" fill="white"/><circle cx="15" cy="11" r="1" fill="white"/><circle cx="17" cy="13" r="1" fill="white"/>`, bg: "#5D4037" },
};

function createCategoryIcon(category: string, isPinned: boolean, isSelected: boolean) {
  const size = isSelected ? 38 : isPinned ? 32 : 28;
  const iconData = categorySvgIcons[category] || { svg: `<circle cx="12" cy="12" r="4" fill="white"/>`, bg: "#546E7A" };
  const pinExtra = isPinned ? `<div style="position:absolute;top:-5px;right:-5px;width:14px;height:14px;border-radius:50%;background:#F5E6D0;border:2px solid #233216;display:flex;align-items:center;justify-content:center;">
    <svg width="8" height="8" viewBox="0 0 24 24" fill="#233216" stroke="none"><path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8L8 14l-6-4.8h7.6z"/></svg>
  </div>` : "";
  return L.divIcon({
    className: "custom-category-marker",
    html: `<div style="position:relative;width:${size}px;height:${size}px;border-radius:${isSelected ? '10px' : '8px'};background:${iconData.bg};border:${isSelected ? '3px' : '2px'} solid rgba(255,255,255,0.9);box-shadow:0 3px 10px rgba(0,0,0,0.35)${isSelected ? `,0 0 14px ${iconData.bg}70` : ''};display:flex;align-items:center;justify-content:center;transition:all 0.2s;">
      <svg viewBox="0 0 24 24" width="${size * 0.55}" height="${size * 0.55}" style="display:block;">${iconData.svg}</svg>
      ${pinExtra}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createFriendMapIcon(color: string, initial: string) {
  return L.divIcon({
    className: "custom-friend-marker",
    html: `<div style="width:34px;height:34px;border-radius:50%;background:white;border:3px solid ${color};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:${color};font-family:'Nunito',sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.2);">${initial}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

const calPolyMapIcon = L.divIcon({
  className: "cal-poly-marker",
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#1B5E20;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const userLocIcon = L.divIcon({
  className: "user-loc-marker",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#1E88E5;border:3px solid white;box-shadow:0 0 12px rgba(30,136,229,0.5),0 2px 6px rgba(0,0,0,0.2);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const defaultFriendsOnMap = [
  { id: "f1", name: "Alex", lat: 35.2698, lng: -120.6700, status: "Hiking Bishop Peak", color: "#4CAF50", emoji: "\u{1F33F}" },
  { id: "f2", name: "Emma", lat: 35.3020, lng: -120.6610, status: "Kennedy Library", color: "#1E88E5", emoji: "\u{1F4DA}" },
  { id: "f3", name: "Jake", lat: 35.2810, lng: -120.6590, status: "Scout Coffee", color: "#FF9800", emoji: "\u2615" },
  { id: "f4", name: "Sarah", lat: 35.1283, lng: -120.6410, status: "Shell Beach", color: "#E91E63", emoji: "\u{1F3D6}\u{FE0F}" },
];

const mapCategoryFilters = [
  { id: "All", label: "All" },
  { id: "Pinned", label: "Pinned" },
  { id: "Coffee Shops", label: "Coffee" },
  { id: "Food & Treats", label: "Food" },
  { id: "Hikes", label: "Hikes" },
  { id: "Beaches", label: "Beaches" },
  { id: "Study Spots", label: "Study" },
  { id: "Live Music", label: "Music" },
  { id: "Viewpoints", label: "Views" },
];

const busRouteData = [
  { id: "route-4", name: "4 — Campus / Downtown", color: "#2196F3", stops: [[35.3050,-120.6625],[35.2990,-120.6620],[35.2900,-120.6600],[35.2830,-120.6595],[35.2790,-120.6640],[35.2770,-120.6595]] as [number,number][] },
  { id: "route-6", name: "6 — Cal Poly Loop", color: "#4CAF50", stops: [[35.3050,-120.6625],[35.2990,-120.6620],[35.2900,-120.6600],[35.2790,-120.6640],[35.2720,-120.6620],[35.2650,-120.6650]] as [number,number][] },
  { id: "route-12a", name: "12A — Campus / Morro Bay", color: "#FF9800", stops: [[35.2790,-120.6640],[35.2550,-120.6580],[35.2200,-120.6500],[35.1850,-120.6480],[35.1420,-120.6415]] as [number,number][] },
];

function DashMapFlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([lat, lng], zoom, { duration: 0.6 }); }, [map, lat, lng, zoom]);
  return null;
}

function DashRecenterBtn() {
  const map = useMap();
  return (
    <div className="absolute bottom-3 right-3" style={{ zIndex: 1000 }}>
      <button onClick={() => map.flyTo([CAL_POLY_LAT, CAL_POLY_LNG], 12, { duration: 0.6 })}
        className="w-9 h-9 bg-[#F5E6D0] rounded-xl shadow-lg text-[#233216] flex items-center justify-center active:scale-90 transition-transform">
        <LocateFixed size={16} />
      </button>
    </div>
  );
}

type DashMode = "explore" | "work" | "schedule" | "dine" | "map";
type FocusPhase = "active" | "hold-to-exit" | "confirm" | "why" | null;

export function Dashboard() {
  const navigate = useNavigate();
  const [session] = useState(() => getSession());
  const [mode, setMode] = useState<DashMode>("explore");
  const [userName, setUserName] = useState("Explorer");
  const [weather, setWeather] = useState({ temp: 72, condition: "Sunny" });
  const [pinnedEvents, setPinnedEvents] = useState<string[]>([]);

  // Work Mode State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskName, setNewTaskName] = useState("");
  const [timerActive, setTimerActive] = useState(false);
  const [timerDuration, setTimerDuration] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);

  // Focus fullscreen state
  const [focusPhase, setFocusPhase] = useState<FocusPhase>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number>(0);
  const [customReason, setCustomReason] = useState("");
  const [focusElapsed, setFocusElapsed] = useState(0);

  // Nearby state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<(Place & { distanceMi: number })[]>([]);
  const [locating, setLocating] = useState(false);
  const [showNearby, setShowNearby] = useState(false);

  // Inline map state
  const [mapSelectedPlace, setMapSelectedPlace] = useState<Place | null>(null);
  const [friendsData, setFriendsData] = useState(defaultFriendsData);
  const [friendsOnMap, setFriendsOnMap] = useState(defaultFriendsOnMap);
  const [mapSelectedFriend, setMapSelectedFriend] = useState<typeof defaultFriendsOnMap[0] | null>(null);
  const [mapShowFriends, setMapShowFriends] = useState(true);
  const [mapShowBus, setMapShowBus] = useState(false);
  const [mapFilter, setMapFilter] = useState("All");
  const [mapShowList, setMapShowList] = useState(false);
  const [mapUserLoc, setMapUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  // Jarvis message index
  const [msgIdx] = useState(() => Math.floor(Math.random() * jarvisMessages.length));
  const [workMsgIdx] = useState(() => Math.floor(Math.random() * workMessages.length));

  // PolyTree state
  const [polyTree, setPolyTree] = useState<PolyTreeData>(() => getPolyTree());
  const [showTreePicker, setShowTreePicker] = useState(false);
  const [showBranchOut, setShowBranchOut] = useState(false);

  // Analytics fullscreen state
  const [showAnalyticsFullscreen, setShowAnalyticsFullscreen] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState<"1W" | "1M" | "3M" | "All">("1W");

  const settings = useMemo(() => getSettings(), []);

  useEffect(() => {
    const saved = localStorage.getItem(TASKS_KEY);
    if (saved) {
      try { setTasks(JSON.parse(saved)); } catch { setTasks(defaultTasks); }
    } else {
      setTasks(defaultTasks);
      localStorage.setItem(TASKS_KEY, JSON.stringify(defaultTasks));
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function loadFriends() {
      const userId = String(session?.user_id || "").trim();
      if (!userId) return;
      try {
        const [friendsResponse, usersResponse] = await Promise.all([
          listBackendFriends(userId),
          listBackendUsers(),
        ]);
        if (!active) return;
        const friendIds = Array.isArray(friendsResponse?.friend_user_ids)
          ? friendsResponse.friend_user_ids.map((id: any) => String(id || ""))
          : [];
        const users = Array.isArray(usersResponse?.items) ? usersResponse.items : [];
        const palette = ["#8BC34A", "#64B5F6", "#F2E8CF", "#FF9800", "#EF5350", "#9575CD"];
        const rows = users
          .filter((user: any) => friendIds.includes(String(user?.user_id || user?.id || "")))
          .map((user: any, index: number) => {
            const displayName = String(user?.name || user?.display_name || user?.email || "Friend");
            const color = palette[index % palette.length];
            return {
              id: String(user?.user_id || user?.id || `friend-${index}`),
              name: displayName,
              status: "available",
              color,
              statusText: "On PolyJarvis",
              available: true,
              icon: Users,
            };
          });
        if (rows.length > 0) {
          setFriendsData(rows);
          setFriendsOnMap(rows.map((friend: any, index: number) => ({
            id: friend.id,
            name: friend.name,
            lat: CAL_POLY_LAT + (index % 3) * 0.004 - 0.004,
            lng: CAL_POLY_LNG + Math.floor(index / 3) * 0.004 - 0.004,
            status: friend.statusText,
            color: friend.color,
            emoji: "\u{1F4CD}",
          })));
        }
      } catch {
        // Keep fallback defaults when backend is unavailable.
      }
    }
    loadFriends();
    return () => {
      active = false;
    };
  }, [session?.user_id]);

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
  }, []);

  // Fetch live weather from Open-Meteo (free, no API key needed)
  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=35.28&longitude=-120.66&current=temperature_2m,weather_code&temperature_unit=fahrenheit")
      .then(r => r.json())
      .then(data => {
        if (data?.current) {
          const temp = Math.round(data.current.temperature_2m);
          const code = data.current.weather_code;
          let condition = "Sunny";
          // WMO weather codes → descriptive labels
          if (code === 0) {
            const hour = new Date().getHours();
            if (hour >= 5 && hour < 7) condition = "Dawn";
            else if (hour >= 18 && hour < 20) condition = "Dusk";
            else if (hour >= 20 || hour < 5) condition = "Clear Night";
            else condition = "Sunny";
          }
          else if (code === 1) condition = "Mostly Clear";
          else if (code === 2) condition = "Partly Cloudy";
          else if (code === 3) condition = "Overcast";
          else if (code >= 45 && code <= 48) condition = "Foggy";
          else if (code >= 51 && code <= 55) condition = "Drizzle";
          else if (code >= 56 && code <= 57) condition = "Freezing Drizzle";
          else if (code >= 61 && code <= 63) condition = "Rainy";
          else if (code >= 65 && code <= 67) condition = "Heavy Rain";
          else if (code >= 71 && code <= 75) condition = "Snowy";
          else if (code === 77) condition = "Snow Grains";
          else if (code >= 80 && code <= 82) condition = "Rain Showers";
          else if (code >= 95) condition = "Thunderstorm";
          setWeather({ temp, condition });
          // Cache for Jarvis to read
          try { localStorage.setItem("polyjarvis_weather_cache", JSON.stringify({ temp, condition })); } catch {}
        }
      })
      .catch(() => { /* keep default weather */ });
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
        setFocusElapsed(e => e + 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      setFocusPhase(null);
      // Record session for PolyTree growth
      const updatedTree = recordSession(timerDuration);
      setPolyTree(updatedTree);
      toast.success("Focus session complete! Your tree grew!");
      logFocusSession(timerDuration, "completed");
      // Show "Go Branch Out" prompt
      setTimeout(() => setShowBranchOut(true), 300);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, timerDuration]);

  const startFocusSession = () => {
    setTimerActive(true);
    setFocusPhase("active");
    setFocusElapsed(0);
  };

  const logFocusSession = (duration: number, reason: string) => {
    try {
      const existing = JSON.parse(localStorage.getItem(FOCUS_LOG_KEY) || "[]");
      const entry = { id: Date.now().toString(), date: new Date().toISOString(), planned: duration, elapsed: focusElapsed, reason };
      existing.unshift(entry);
      localStorage.setItem(FOCUS_LOG_KEY, JSON.stringify(existing.slice(0, 50)));

      const chatHistory = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || "[]");
      const mins = Math.floor(focusElapsed / 60);
      const jarvisNote = reason === "completed"
        ? `[Focus Complete] Finished a ${Math.floor(duration / 60)}-min session. Locked in.`
        : `[Focus Stopped] After ${mins} min (of ${Math.floor(duration / 60)}). Reason: ${reason}`;
      chatHistory.push({ role: "system", content: jarvisNote, timestamp: Date.now() });
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory.slice(-100)));
    } catch { /* silent */ }
  };

  const handleStopReason = (reason: string) => {
    logFocusSession(timerDuration, reason);
    setTimerActive(false);
    setFocusPhase(null);
    setTimeLeft(timerDuration);
    setHoldProgress(0);
    setCustomReason("");
    toast("Session ended. Jarvis noted why.");
  };

  const handleHoldStart = () => {
    holdStartRef.current = Date.now();
    holdTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - holdStartRef.current) / 3000;
      setHoldProgress(Math.min(1, elapsed));
      if (elapsed >= 1) {
        clearInterval(holdTimerRef.current!);
        holdTimerRef.current = null;
        setFocusPhase("confirm");
        setHoldProgress(0);
      }
    }, 30);
  };

  const handleHoldEnd = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(0);
  };

  const toggleTimer = () => {
    if (timerActive) {
      setFocusPhase("hold-to-exit");
    } else {
      startFocusSession();
    }
  };

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
    const newTask: Task = { id: Date.now().toString(), course: "Personal", name: newTaskName, dueTime: "Today", dueDate: "Today", priority: false, done: false };
    persistTasks([...tasks, newTask]);
    setNewTaskName("");
    toast.success("Task added");
  };

  const toggleTaskDone = (id: string) => persistTasks(tasks.map(t => (t.id === id ? { ...t, done: !t.done } : t)));

  const togglePin = (id: string) => {
    const updated = pinnedEvents.includes(id) ? pinnedEvents.filter(p => p !== id) : [...pinnedEvents, id];
    setPinnedEvents(updated);
    localStorage.setItem("pinnedEvents", JSON.stringify(updated));
  };

  const userPrefs = useMemo(() => getUserPreferences(), []);
  const personalizedGreeting = useMemo(() => getPersonalizedGreeting(userPrefs), [userPrefs]);

  const displayName = useMemo(() => {
    try {
      const raw = localStorage.getItem("polyjarvis_customize");
      if (raw) { const c = JSON.parse(raw); return c.displayName || ""; }
    } catch {}
    return "";
  }, []);

  const WeatherIcon = weatherIcons[weather.condition] || Sun;
  const weatherCat = getWeatherCategory(weather.condition);
  const weatherBlurbList = weatherBlurbs[weatherCat] || weatherBlurbs.cloudy;
  const weatherBlurb = weatherBlurbList[msgIdx % weatherBlurbList.length];
  const baseJarvisMsg = mode === "work"
    ? workMessages[workMsgIdx % workMessages.length](weather.temp)
    : (jarvisMessages.find((m, i) => i === msgIdx && (m.condition === weather.condition || m.condition === "any")) || jarvisMessages[jarvisMessages.length - 1]).msg(weather.temp);
  const namePrefix = displayName ? `Hey ${displayName}. ` : "";
  const jarvisMsg = (mode === "explore" && personalizedGreeting) ? `${namePrefix}${personalizedGreeting}` : `${namePrefix}${baseJarvisMsg}`;

  // Time-based place suggestions for the hero box
  const tod = getTimeOfDay();
  const todSuggestion = timeOfDaySuggestions[tod];
  const todPlaces = useMemo(() => {
    return places.filter(p => todSuggestion.categories.includes(p.category)).slice(0, 3);
  }, [todSuggestion]);
  const TodIcon = todSuggestion.icon;

  // Focus analytics data
  const focusAnalytics = useMemo(() => {
    try {
      const raw = localStorage.getItem(FOCUS_LOG_KEY);
      if (raw) {
        const sessions = JSON.parse(raw) as { date: string; planned: number; elapsed: number; reason: string }[];
        const now = Date.now();
        const filterByDays = (days: number) => sessions.filter(s => (now - new Date(s.date).getTime()) < days * 86400000);
        const totalMins = (arr: typeof sessions) => arr.reduce((acc, s) => acc + Math.floor(s.elapsed / 60), 0);
        const completed = (arr: typeof sessions) => arr.filter(s => s.reason === "completed").length;
        const week = filterByDays(7);
        const month = filterByDays(30);
        const quarter = filterByDays(90);
        return {
          week: { sessions: week.length, minutes: totalMins(week), completed: completed(week), data: week },
          month: { sessions: month.length, minutes: totalMins(month), completed: completed(month), data: month },
          quarter: { sessions: quarter.length, minutes: totalMins(quarter), completed: completed(quarter), data: quarter },
          all: { sessions: sessions.length, minutes: totalMins(sessions), completed: completed(sessions), data: sessions },
        };
      }
    } catch {}
    return { week: { sessions: 0, minutes: 0, completed: 0, data: [] }, month: { sessions: 0, minutes: 0, completed: 0, data: [] }, quarter: { sessions: 0, minutes: 0, completed: 0, data: [] }, all: { sessions: 0, minutes: 0, completed: 0, data: [] } };
  }, []);

  const handleFindNearby = () => {
    setLocating(true);
    const done = (lat: number, lng: number, isReal: boolean) => {
      const withDist = places.map(place => ({ ...place, distanceMi: getDistanceMiles(lat, lng, place.lat, place.lng) }));
      withDist.sort((a, b) => a.distanceMi - b.distanceMi);
      setNearbyPlaces(withDist);
      setUserLocation({ lat, lng, label: isReal ? "Your Location" : "Cal Poly Campus" });
      setLocating(false);
      setShowNearby(true);
      if (isReal) toast.success(`Found ${withDist.length} spots sorted by distance!`);
      else toast("Showing spots near Cal Poly campus");
    };
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => done(pos.coords.latitude, pos.coords.longitude, true),
        () => done(CAL_POLY_LAT, CAL_POLY_LNG, false),
        { enableHighAccuracy: false, timeout: 5000 }
      );
    } else {
      done(CAL_POLY_LAT, CAL_POLY_LNG, false);
    }
  };

  const activeTasks = tasks.filter(t => !t.done);
  const doneTasks = tasks.filter(t => t.done);
  const timerProgress = timerDuration > 0 ? ((timerDuration - timeLeft) / timerDuration) * 100 : 0;

  // Inline map computed
  const mapFilteredPlaces = useMemo(() => {
    if (mapFilter === "All") return places;
    if (mapFilter === "Pinned") return places.filter(p => pinnedEvents.includes(p.id));
    return places.filter(p => p.category === mapFilter);
  }, [mapFilter, pinnedEvents]);

  const mapPlaceDistance = mapSelectedPlace
    ? getDistanceMiles(CAL_POLY_LAT, CAL_POLY_LNG, mapSelectedPlace.lat, mapSelectedPlace.lng)
    : 0;

  const handleMapLocate = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setMapUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); toast.success("Location found!"); },
        () => toast("Couldn't get your location"),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const modes: { id: DashMode; label: string; icon: typeof Compass }[] = [
    { id: "explore", label: "Explore", icon: Compass },
    { id: "work", label: "Work", icon: Timer },
    { id: "schedule", label: "Schedule", icon: CalendarClock },
    { id: "dine", label: "Dine", icon: UtensilsCrossed },
    { id: "map", label: "Map", icon: MapIcon },
  ];

  // ─── FULLSCREEN FOCUS MODE ───
  if (focusPhase) {
    return (
      <AnimatePresence mode="wait">
        {focusPhase === "active" && (
          <motion.div
            key="focus-active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center select-none"
          >
            <img src={focusBgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/70" />

            <div className="relative z-10 flex flex-col items-center gap-6 px-8">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-[11px] font-bold text-white/50 capitalize tracking-wider"
              >
                Focus Mode
              </motion.p>

              <motion.p
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", damping: 20 }}
                className="text-7xl font-mono font-bold text-white tracking-tight drop-shadow-2xl"
              >
                {formatTime(timeLeft)}
              </motion.p>

              <div className="w-48 h-1 bg-white/15 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#F2E8CF] rounded-full"
                  animate={{ width: `${timerProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              <p className="text-xs text-white/40 mt-2">Hold screen for 3 seconds to exit</p>

              <div className="flex items-center gap-2 mt-4">
                <Lock size={12} className="text-[#F2E8CF]/60" />
                <span className="text-[10px] text-[#F2E8CF]/60 font-semibold tracking-wider">Locked In</span>
              </div>
            </div>

            <div
              className="absolute inset-0 z-20"
              onPointerDown={handleHoldStart}
              onPointerUp={handleHoldEnd}
              onPointerLeave={handleHoldEnd}
              onPointerCancel={handleHoldEnd}
            />

            <AnimatePresence>
              {holdProgress > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3"
                >
                  <div className="w-16 h-16 relative">
                    <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="3" />
                      <circle
                        cx="32" cy="32" r="28" fill="none"
                        stroke="#F2E8CF"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${holdProgress * 175.93} 175.93`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Unlock size={18} className="text-[#F2E8CF]" />
                    </div>
                  </div>
                  <p className="text-xs font-bold text-white/60">Hold to unlock...</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {focusPhase === "hold-to-exit" && (
          <motion.div
            key="focus-hold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center select-none"
          >
            <img src={focusBgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div className="relative z-10 flex flex-col items-center gap-6 px-8">
              <p className="text-[11px] font-bold text-[#F2E8CF]/60 capitalize tracking-wider">Paused</p>
              <p className="text-5xl font-mono font-bold text-white/80 tracking-tight">{formatTime(timeLeft)}</p>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setFocusPhase("active")}
                  className="px-6 py-3 bg-[#F2E8CF] text-[#233216] rounded-xl font-bold text-sm"
                >
                  Resume
                </button>
                <button
                  onClick={() => setFocusPhase("confirm")}
                  className="px-6 py-3 bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-bold text-sm"
                >
                  Stop
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {focusPhase === "confirm" && (
          <motion.div
            key="focus-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center select-none"
          >
            <img src={focusBgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-10 w-[90%] max-w-sm bg-white/10 backdrop-blur-2xl border border-white/15 rounded-2xl p-6 text-center"
            >
              <div className="w-14 h-14 bg-red-500/15 rounded-full mx-auto flex items-center justify-center mb-4">
                <Timer size={24} className="text-red-400" />
              </div>
              <h2 className="text-xl font-extrabold text-white capitalize tracking-wide mb-2">Are You Sure?</h2>
              <p className="text-sm text-white/50 mb-6">
                You've been focused for {Math.floor(focusElapsed / 60)} min. Keep the momentum?
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => { setFocusPhase("active"); }}
                  className="w-full py-3 bg-[#F2E8CF] text-[#233216] rounded-xl font-bold text-sm"
                >
                  Keep Going
                </button>
                <button
                  onClick={() => setFocusPhase("why")}
                  className="w-full py-3 bg-white/10 border border-white/15 text-white/70 rounded-xl font-bold text-sm"
                >
                  End Session
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {focusPhase === "why" && (
          <motion.div
            key="focus-why"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center select-none"
          >
            <img src={focusBgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-10 w-[90%] max-w-sm bg-white/10 backdrop-blur-2xl border border-white/15 rounded-2xl p-6"
            >
              <h2 className="text-lg font-bold text-white capitalize tracking-wide mb-1 text-center">Why Did You Stop?</h2>
              <p className="text-[11px] text-white/40 text-center mb-5">Jarvis uses this to learn your patterns</p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {stopReasons.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleStopReason(r.label)}
                    className="bg-white/10 border border-white/15 rounded-xl p-3 text-center active:bg-white/20 transition-colors"
                  >
                    <span className="text-xl block mb-1">{r.emoji}</span>
                    <span className="text-xs font-bold text-white/70">{r.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Or type your reason..."
                  className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#F2E8CF]/40"
                  onKeyDown={(e) => { if (e.key === "Enter" && customReason.trim()) handleStopReason(customReason.trim()); }}
                />
                <button
                  onClick={() => { if (customReason.trim()) handleStopReason(customReason.trim()); }}
                  className="bg-[#F2E8CF] text-[#233216] px-4 rounded-xl font-bold text-xs"
                >
                  Go
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-transparent pb-24 text-white">
      <PageHeader />

      {/* Header with Jarvis Bubble — mountain silhouette backdrop */}
      <div className="px-5 pb-2">
        <div className="relative rounded-2xl overflow-hidden border border-[#F2E8CF]/10">
          {/* Sky gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0e1a22]/90 via-[#0c1510]/85 to-[#050808]" />
          {/* Layered mountain silhouettes — more visible */}
          <svg className="absolute bottom-0 left-0 w-full pointer-events-none" viewBox="0 0 400 70" preserveAspectRatio="none" style={{ height: '58%' }}>
            <path d="M0 70 L0 48 L30 35 L55 42 L80 22 L110 32 L140 12 L165 25 L190 8 L215 20 L240 5 L260 18 L285 10 L310 25 L335 16 L355 30 L375 20 L400 34 L400 70Z" fill="#1a2e12" opacity="0.45" />
            <path d="M0 70 L0 56 L40 45 L70 52 L100 36 L130 46 L160 30 L185 40 L210 26 L240 38 L270 24 L300 36 L330 28 L360 40 L390 32 L400 42 L400 70Z" fill="#0f1f0a" opacity="0.6" />
            <path d="M0 70 L0 62 L50 54 L90 59 L120 48 L150 55 L180 44 L210 52 L240 42 L270 50 L300 44 L340 52 L370 46 L400 54 L400 70Z" fill="#080e05" opacity="0.85" />
          </svg>
          {/* Tiny stars */}
          <div className="absolute top-3 left-[15%] w-[3px] h-[3px] rounded-full bg-white/25 animate-pulse" style={{ animationDuration: '3s' }} />
          <div className="absolute top-5 left-[45%] w-[2px] h-[2px] rounded-full bg-white/20 animate-pulse" style={{ animationDuration: '4.5s' }} />
          <div className="absolute top-2 right-[22%] w-[2px] h-[2px] rounded-full bg-[#F2E8CF]/25 animate-pulse" style={{ animationDuration: '5s' }} />
          <div className="absolute top-4 right-[38%] w-[3px] h-[3px] rounded-full bg-[#F2E8CF]/15 animate-pulse" style={{ animationDuration: '3.8s' }} />
          <div className="absolute top-6 left-[70%] w-[2px] h-[2px] rounded-full bg-white/15 animate-pulse" style={{ animationDuration: '6s' }} />

          <div className="relative z-10 p-4 pb-5">
            <div className="flex items-center gap-2 mb-1.5">
              <WeatherIcon size={14} className="text-[#F2E8CF]" />
              <span className="text-[10px] font-semibold text-[#F2E8CF] tracking-wider">{weather.temp}&deg;F &middot; {weather.condition} &middot; San Luis Obispo</span>
            </div>
            <p className="text-sm font-medium leading-relaxed text-white/90">{weatherBlurb}</p>
            {/* Time-based suggestions */}
            <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-0.5">
              <TodIcon size={11} className="text-[#F2E8CF]/60 flex-shrink-0" />
              {todPlaces.map(p => (
                <Link key={p.id} to={`/event/${p.id}`} className="flex-shrink-0 text-[10px] font-semibold text-[#F2E8CF]/50 bg-[#F2E8CF]/8 px-2.5 py-1 rounded-full hover:text-[#F2E8CF] hover:bg-[#F2E8CF]/15 transition-colors truncate max-w-[120px]">
                  {p.name}
                </Link>
              ))}
              <Link to="/explore" className="flex-shrink-0 text-[10px] font-semibold text-white/30 hover:text-[#F2E8CF] transition-colors flex items-center gap-0.5">
                More <ArrowRight size={8} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Toggle — Explore / Work / Schedule / Dine / Map */}
      <div className="px-5 mt-3 mb-4">
        <div className="flex gap-0.5 bg-white/5 rounded-xl p-1 border border-white/8">
          {modes.map(m => {
            const MIcon = m.icon;
            return (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`flex-1 min-w-0 py-2.5 rounded-lg text-[10px] font-bold tracking-wider flex flex-col items-center justify-center gap-1 transition-all ${
                  mode === m.id ? "bg-[#F2E8CF] text-[#233216] shadow-sm" : "text-white/35 hover:text-white/50"
                }`}
              >
                <MIcon size={14} />
                <span className="leading-none">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {/* ═══ EXPLORE MODE ═══ */}
        {mode === "explore" && (
          <motion.div key="explore" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="px-5 pt-2">

            {/* Find Nearby */}
            <button onClick={handleFindNearby} disabled={locating}
              className="w-full py-3.5 bg-[#F5E6D0] text-[#233216] rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-[#F5E6D0]/20 active:scale-[0.97] transition-transform disabled:opacity-50 mb-4"
            >
              {locating ? (
                <><div className="w-4 h-4 border-2 border-[#233216]/25 border-t-[#233216] rounded-full animate-spin" /> Locating...</>
              ) : (
                <><Navigation size={16} /> Find Nearby Spots</>
              )}
            </button>

            {/* Nearby results */}
            <AnimatePresence>
              {showNearby && nearbyPlaces.length > 0 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold text-[#F2E8CF] capitalize tracking-wider">
                      {userLocation?.label || "Nearby"}
                    </p>
                    <button onClick={() => setShowNearby(false)} className="text-white/25"><X size={14} /></button>
                  </div>
                  <div className="space-y-2 max-h-[240px] overflow-y-auto">
                    {nearbyPlaces.slice(0, 6).map(place => {
                      const feet = place.distanceMi * 5280;
                      const distLabel = feet <= 500 ? `${Math.round(feet)} ft` : `${place.distanceMi.toFixed(1)} mi`;
                      return (
                        <div key={place.id} onClick={() => navigate(`/event/${place.id}`)} className="bg-white/10 border border-white/15 rounded-xl p-3 flex items-center gap-3 active:bg-white/15 transition-colors cursor-pointer">
                          <img src={place.image} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-xs text-white leading-tight">{place.name}</h3>
                            <p className="text-[10px] text-white/35">{place.category}</p>
                          </div>
                          <span className="text-[9px] font-bold bg-[#F2E8CF]/20 px-1.5 py-0.5 rounded text-[#F2E8CF] flex items-center gap-0.5 flex-shrink-0">
                            <Navigation size={7} /> {distLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Inside / Outside Decision */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Link to="/explore?category=Inside">
                <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden relative active:scale-[0.97] transition-all cursor-pointer group">
                  <img src="https://images.unsplash.com/photo-1764175760346-cd6f64383520?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3p5JTIwY29mZmVlJTIwc2hvcCUyMGluZG9vciUyMHdhcm0lMjBsaWdodGluZ3xlbnwxfHx8fDE3NzE3MzYzMjZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
                    <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/25">
                      <Coffee size={20} className="text-white" />
                    </div>
                    <span className="font-bold text-sm text-white capitalize tracking-wider drop-shadow-lg">Inside</span>
                    <span className="text-[9px] text-white/60 font-bold">Coffee, Study, Music</span>
                  </div>
                </div>
              </Link>
              <Link to="/explore?category=Outside">
                <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden relative active:scale-[0.97] transition-all cursor-pointer group">
                  <img src="https://images.unsplash.com/photo-1606417460325-bd75c8324ddc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWxpZm9ybmlhJTIwaGlraW5nJTIwdHJhaWwlMjBvdXRkb29yJTIwc3Vubnl8ZW58MXx8fHwxNzcxNzM2MzI2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-[#F2E8CF]/5" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
                    <div className="flex gap-1.5">
                      <div className="w-8 h-8 bg-[#F2E8CF]/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-[#F2E8CF]/30">
                        <Mountain size={16} className="text-[#F2E8CF]" />
                      </div>
                      <div className="w-8 h-8 bg-[#F2E8CF]/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-[#F2E8CF]/30">
                        <Waves size={16} className="text-[#F2E8CF]" />
                      </div>
                      <div className="w-8 h-8 bg-[#F2E8CF]/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-[#F2E8CF]/30">
                        <TreePine size={16} className="text-[#F2E8CF]" />
                      </div>
                    </div>
                    <span className="font-bold text-sm text-[#F2E8CF] capitalize tracking-wider drop-shadow-lg">Outside</span>
                    <span className="text-[9px] text-white/60 font-bold">Hikes, Beaches, Parks</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* (Tutorial moved to Profile/Settings) */}

            {/* Pinned Spots Quick Access */}
            {pinnedEvents.length > 0 && (() => {
              const pinnedPlaces = places.filter(p => pinnedEvents.includes(p.id)).slice(0, 4);
              return pinnedPlaces.length > 0 ? (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold text-[#F2E8CF] capitalize tracking-wider flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[#F2E8CF]" /> Your Pins
                    </p>
                    <Link to="/explore"><span className="text-[10px] font-bold text-white/30">View All</span></Link>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {pinnedPlaces.map(p => (
                      <div key={p.id} onClick={() => navigate(`/event/${p.id}`)}
                        className="flex-shrink-0 w-32 bg-white/10 border border-white/15 rounded-xl overflow-hidden active:scale-95 transition-transform cursor-pointer">
                        <img src={p.image} alt="" className="w-full h-16 object-cover" loading="lazy" />
                        <div className="p-2">
                          <p className="text-[10px] font-bold text-white/80 leading-tight">{p.name}</p>
                          <p className="text-[8px] text-white/35 mt-0.5">{p.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Friends Activity */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold text-[#F2E8CF] capitalize tracking-wider flex items-center gap-1.5"><Users size={11} /> Friends</p>
                <Link to="/friends"><span className="text-[10px] font-bold text-white/30">View All</span></Link>
              </div>
              <div className="space-y-2">
                {friendsData.map(f => {
                  const FIcon = f.icon;
                  return (
                    <div key={f.name}
                      className="w-full flex items-center gap-3 bg-white/6 rounded-lg px-3 py-2.5 text-left"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border"
                          style={{ backgroundColor: `${f.color}15`, borderColor: `${f.color}30`, color: f.color }}>
                          {f.name[0]}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1a2e10]" style={{ backgroundColor: f.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white/80">{f.name}</p>
                        <p className="text-[11px] text-white/40 truncate flex items-center gap-1"><FIcon size={10} /> {f.statusText}</p>
                      </div>
                      {f.available ? (
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate("/jams", { state: { createWithFriend: f.name } }); }}
                            className="flex items-center gap-1 text-[9px] font-bold text-[#233216] bg-[#F5E6D0] px-3.5 py-2 rounded-lg shadow-md shadow-[#F5E6D0]/15 active:scale-90 transition-all hover:shadow-lg"
                          >
                            <Users size={10} /> Jam
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate("/plans", { state: { startCreate: true } }); }}
                            className="flex items-center gap-1 text-[9px] font-bold text-[#233216] bg-[#8BC34A] px-3.5 py-2 rounded-lg shadow-md shadow-[#8BC34A]/15 active:scale-90 transition-all hover:shadow-lg"
                          >
                            Plan
                          </button>
                        </div>
                      ) : (
                        <span className="text-[8px] font-semibold text-white/25 bg-white/8 px-2.5 py-1.5 rounded-lg border border-white/8">Busy</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ WORK MODE ═══ */}
        {mode === "work" && (
          <motion.div key="work" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="px-5 pt-2">
            <h1 className="text-3xl font-extrabold text-[#F2E8CF] tracking-tight mb-4">Lock in.</h1>

            {/* Focus Timer */}
            <div className="bg-white/12 backdrop-blur-sm border border-white/15 rounded-2xl p-5 mb-5 relative overflow-hidden">
              <div className="absolute bottom-0 left-0 h-1 bg-white/5 w-full" />
              <motion.div className="absolute bottom-0 left-0 h-1 bg-[#F2E8CF] rounded-r" animate={{ width: `${timerProgress}%` }} transition={{ duration: 0.5 }} />
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-semibold text-[#F2E8CF] capitalize tracking-wider mb-1">Focus Timer</p>
                  <p className="text-4xl font-mono font-bold text-white tracking-tight">{formatTime(timeLeft)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={toggleTimer} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${timerActive ? "bg-red-500/20 text-red-400 border border-red-500/20" : "bg-[#F2E8CF] text-[#233216] shadow-md"}`}>
                    {timerActive ? "Pause" : "Start"}
                  </button>
                  {!timerActive && timeLeft !== timerDuration && (
                    <button onClick={() => setTimeLeft(timerDuration)} className="px-3 py-2.5 rounded-xl font-bold text-xs bg-white/12 text-white/60">Reset</button>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {timerPresets.map(p => (
                  <button key={p.seconds} onClick={() => selectDuration(p.seconds)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all ${timerDuration === p.seconds ? "bg-[#F2E8CF]/20 text-[#F2E8CF] border border-[#F2E8CF]/30" : "bg-white/8 text-white/35 border border-white/8"}`}
                  >{p.label}</button>
                ))}
              </div>
            </div>

            {/* Due Today — Canvas deadlines (moved above tasks) */}
            <div className="space-y-3 mb-5">
              <div>
                <p className="text-[10px] font-semibold text-red-400/80 capitalize tracking-wider mb-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> Due Today
                </p>
                {todayDeadlines.map(d => (
                  <div key={d.id} className="bg-red-500/8 border border-red-500/15 rounded-lg px-3 py-2 mb-1.5 flex items-center gap-3">
                    <button onClick={() => {
                      const el = document.getElementById(`deadline-${d.id}`);
                      if (el) el.classList.toggle("line-through");
                      toast.success("Crossed off!");
                    }} className="w-4 h-4 rounded border border-red-400/40 flex-shrink-0 hover:bg-red-400/20 transition-colors flex items-center justify-center text-[8px] text-red-400/60">
                    </button>
                    <div className="flex-1 min-w-0">
                      <p id={`deadline-${d.id}`} className="text-[11px] font-bold text-white/80 truncate transition-all">{d.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-white/35">{d.course}</span>
                        <span className="text-[9px] text-red-400/60">{d.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-white/25 capitalize tracking-wider mb-2">This Week</p>
                {weekDeadlines.map(d => (
                  <div key={d.id} className="bg-white/5 border border-white/8 rounded-lg px-3 py-2 mb-1.5 flex items-center gap-3">
                    <button onClick={() => {
                      const el = document.getElementById(`week-${d.id}`);
                      if (el) el.classList.toggle("line-through");
                    }} className="w-4 h-4 rounded border border-white/15 flex-shrink-0 hover:bg-white/10 transition-colors" />
                    <div className="flex-1 min-w-0">
                      <p id={`week-${d.id}`} className="text-[10px] font-bold text-white/55 truncate transition-all">{d.name}</p>
                      <span className="text-[9px] text-white/25">{d.course} &middot; {d.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[10px] font-semibold text-[#F2E8CF] capitalize tracking-wider">Tasks</h2>
              <div className="text-[9px] font-bold bg-white/12 text-white/50 px-2 py-0.5 rounded-full">
                {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </div>

            <div className="space-y-1.5 mb-3">
              {activeTasks.length === 0 && doneTasks.length === 0 && (
                <div className="bg-white/8 border border-white/10 rounded-lg p-4 text-center">
                  <p className="text-[11px] text-white/40 font-bold">No tasks yet</p>
                </div>
              )}
              {activeTasks.map(a => (
                <div key={a.id} className="bg-white/10 border border-white/12 rounded-lg px-3 py-2.5 flex items-center gap-2.5">
                  <button onClick={() => toggleTaskDone(a.id)} className="w-4 h-4 rounded-full border-2 border-white/25 flex-shrink-0 hover:border-[#F2E8CF] transition-colors" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-white/80 truncate">{a.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-[#F2E8CF]/70">{a.course}</span>
                      {a.priority && <span className="text-[8px] text-red-400/70">!</span>}
                      <span className="text-[9px] text-white/30">{a.dueTime}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {doneTasks.length > 0 && (
              <div className="mb-3">
                <p className="text-[9px] font-semibold text-white/20 capitalize tracking-wider mb-1.5">Done ({doneTasks.length})</p>
                <div className="space-y-1">
                  {doneTasks.map(a => (
                    <div key={a.id} className="bg-white/5 border border-white/8 rounded-lg px-3 py-2 flex items-center gap-2.5 opacity-40">
                      <button onClick={() => toggleTaskDone(a.id)} className="w-4 h-4 rounded-full bg-[#F2E8CF] flex items-center justify-center flex-shrink-0 text-[#233216] text-[8px] font-bold">✓</button>
                      <span className="text-[10px] line-through text-white/35 flex-1 truncate">{a.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Add Task */}
            <div className="flex gap-2 mb-5">
              <input type="text" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} placeholder="Add a new task..."
                className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#F2E8CF]/40"
                onKeyDown={(e) => e.key === "Enter" && addTask()} />
              <button onClick={addTask} className="bg-[#F5E6D0] text-[#233216] px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-[#F5E6D0]/15 active:scale-95 transition-transform flex items-center gap-1.5">
                <Plus size={14} /> Add
              </button>
            </div>

            {/* ═══ FOCUS ANALYTICS (Robinhood-style) ═══ */}
            <button onClick={() => setShowAnalyticsFullscreen(true)}
              className="w-full bg-gradient-to-br from-white/8 to-white/4 border border-white/10 rounded-2xl p-4 mb-5 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-[#F2E8CF]/70 tracking-wider">Focus Analytics</p>
                <span className="text-[9px] text-white/25 font-semibold">Tap to expand</span>
              </div>
              <p className="text-2xl font-extrabold text-white">{focusAnalytics.week.minutes > 60 ? `${Math.floor(focusAnalytics.week.minutes / 60)}h ${focusAnalytics.week.minutes % 60}m` : `${focusAnalytics.week.minutes}m`}</p>
              <p className="text-[10px] text-[#8BC34A]/70 font-semibold mt-0.5">{focusAnalytics.week.sessions} sessions this week &middot; {focusAnalytics.week.completed} completed</p>
              {/* Mini sparkline */}
              <div className="flex items-end gap-1 mt-3 h-8">
                {Array.from({ length: 7 }, (_, i) => {
                  const day = new Date();
                  day.setDate(day.getDate() - (6 - i));
                  const dayStr = day.toDateString();
                  const dayMins = focusAnalytics.week.data.filter(s => new Date(s.date).toDateString() === dayStr).reduce((a, s) => a + Math.floor(s.elapsed / 60), 0);
                  const maxMins = Math.max(...Array.from({ length: 7 }, (_, j) => {
                    const d = new Date(); d.setDate(d.getDate() - (6 - j));
                    return focusAnalytics.week.data.filter(s => new Date(s.date).toDateString() === d.toDateString()).reduce((a, s) => a + Math.floor(s.elapsed / 60), 0);
                  }), 1);
                  const h = Math.max(4, (dayMins / maxMins) * 32);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full rounded-sm bg-[#8BC34A]/40" style={{ height: `${h}px` }} />
                      <span className="text-[7px] text-white/20">{["S","M","T","W","T","F","S"][day.getDay()]}</span>
                    </div>
                  );
                })}
              </div>
            </button>

            {/* ═══ POLYTREE ═══ */}
            <div className="bg-gradient-to-br from-[#2D5016]/20 to-[#1B5E20]/10 border border-[#4CAF50]/15 rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-[#8BC34A] tracking-wider flex items-center gap-2">
                    <TreePine size={16} /> PolyTree
                  </h2>
                  <p className="text-[10px] text-white/30 mt-0.5">Grow your tree by completing study sessions</p>
                </div>
                {polyTree.currentStreak > 0 && (
                  <div className="flex items-center gap-1 bg-[#8BC34A]/15 px-2.5 py-1 rounded-full border border-[#8BC34A]/20">
                    <TreePine size={11} className="text-[#8BC34A]" />
                    <span className="text-[10px] font-bold text-[#8BC34A]">{polyTree.currentStreak} day{polyTree.currentStreak > 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>

              <PolyTreeVis data={polyTree} />

              <div className="flex justify-around mt-4 pt-3 border-t border-white/8">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{polyTree.totalSessions}</p>
                  <p className="text-[8px] font-semibold text-white/25 capitalize tracking-wider">Sessions</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{polyTree.totalMinutes >= 60 ? `${Math.floor(polyTree.totalMinutes / 60)}h ${polyTree.totalMinutes % 60}m` : `${polyTree.totalMinutes}m`}</p>
                  <p className="text-[8px] font-semibold text-white/25 capitalize tracking-wider">Total Focus</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{polyTree.growthPoints}</p>
                  <p className="text-[8px] font-semibold text-white/25 capitalize tracking-wider">Growth Pts</p>
                </div>
              </div>

              <button
                onClick={() => setShowTreePicker(!showTreePicker)}
                className="w-full mt-3 py-2 bg-white/6 border border-white/10 rounded-lg text-[10px] font-bold text-white/40 hover:text-white/60 transition-colors"
              >
                {showTreePicker ? "Close" : `Change Tree (${getTreeSpecies(polyTree.treeId).name})`}
              </button>

              <AnimatePresence>
                {showTreePicker && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-1.5 mt-3 max-h-52 overflow-y-auto">
                      {treeSpecies.map(tree => (
                        <button
                          key={tree.id}
                          onClick={() => {
                            const updated = { ...polyTree, treeId: tree.id };
                            setPolyTree(updated);
                            savePolyTree(updated);
                            setShowTreePicker(false);
                            toast.success(`Switched to ${tree.name}!`);
                          }}
                          className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all ${
                            polyTree.treeId === tree.id
                              ? "bg-[#8BC34A]/20 border border-[#8BC34A]/30"
                              : "bg-white/5 border border-white/8 active:bg-white/10"
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: tree.leafColor, opacity: 0.7 }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-white/70 truncate">{tree.name}</p>
                            <p className="text-[8px] text-white/25 truncate">{tree.region}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ═══ SCHEDULE MODE (placeholder bot) ═══ */}
        {mode === "schedule" && (
          <motion.div key="schedule" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="px-5 pt-2">
            <h1 className="text-3xl font-extrabold text-white tracking-tight capitalize mb-2">Schedule.</h1>
            <p className="text-sm text-white/40 mb-6">Your AI scheduling assistant.</p>

            <div className="bg-gradient-to-br from-[#F2E8CF]/10 to-[#64B5F6]/8 border border-[#F2E8CF]/15 rounded-2xl p-6 text-center mb-4">
              <div className="w-16 h-16 bg-[#F2E8CF]/15 rounded-2xl mx-auto flex items-center justify-center mb-4">
                <CalendarClock size={28} className="text-[#F2E8CF]" />
              </div>
              <h2 className="text-lg font-bold text-[#F2E8CF] capitalize tracking-wider mb-2">Scheduling Bot</h2>
              <p className="text-xs text-white/45 leading-relaxed mb-4">
                Auto-coordinate schedules with your crew. Find the perfect time for everyone, sync with your calendar, and let Jarvis handle the back-and-forth.
              </p>
              <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F2E8CF]/15 border border-[#F2E8CF]/20 rounded-full">
                <Sparkles size={12} className="text-[#F2E8CF]" />
                <span className="text-[10px] font-bold text-[#F2E8CF] tracking-wider">Coming Soon</span>
              </div>
            </div>

            <div className="bg-white/8 border border-white/12 rounded-xl p-4">
              <p className="text-[10px] font-semibold text-white/30 capitalize tracking-wider mb-2">What It Will Do</p>
              <div className="space-y-2">
                {["Sync with Google Calendar & Canvas", "Find free slots across your crew", "Auto-suggest meeting times", "Send reminders before events"].map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#F2E8CF]/40" />
                    <p className="text-xs text-white/50">{f}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ DINE MODE (reservation placeholder) ═══ */}
        {mode === "dine" && (
          <motion.div key="dine" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="px-5 pt-2">
            <h1 className="text-3xl font-extrabold text-white tracking-tight capitalize mb-2">Dine.</h1>
            <p className="text-sm text-white/40 mb-6">Reserve tables at SLO's best spots.</p>

            <div className="bg-gradient-to-br from-amber-500/10 to-orange-600/8 border border-amber-500/15 rounded-2xl p-6 text-center mb-4">
              <div className="w-16 h-16 bg-amber-500/15 rounded-2xl mx-auto flex items-center justify-center mb-4">
                <UtensilsCrossed size={28} className="text-amber-400" />
              </div>
              <h2 className="text-lg font-bold text-amber-400 capitalize tracking-wider mb-2">Reservation Maker</h2>
              <p className="text-xs text-white/45 leading-relaxed mb-4">
                Book tables at SLO's top restaurants. Browse menus, check wait times, and reserve for your crew — all in one place.
              </p>
              <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400/15 border border-amber-400/20 rounded-full">
                <UtensilsCrossed size={12} className="text-amber-400" />
                <span className="text-[10px] font-bold text-amber-400 tracking-wider">Coming Soon</span>
              </div>
            </div>

            <div className="bg-white/8 border border-white/12 rounded-xl p-4 mb-4">
              <p className="text-[10px] font-semibold text-white/30 capitalize tracking-wider mb-2">Popular SLO Restaurants</p>
              <div className="space-y-2">
                {[
                  { name: "Novo Restaurant & Lounge", cuisine: "Mediterranean", price: "$$" },
                  { name: "Splash Cafe", cuisine: "Seafood", price: "$$" },
                  { name: "Firestone Grill", cuisine: "BBQ", price: "$" },
                  { name: "Luna Red", cuisine: "Tapas", price: "$$$" },
                  { name: "Giuseppe's Cucina Rustica", cuisine: "Italian", price: "$$$" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 bg-white/5 rounded-lg border border-white/8">
                    <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-400">
                      <UtensilsCrossed size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white/70">{r.name}</p>
                      <p className="text-[9px] text-white/30">{r.cuisine} · {r.price}</p>
                    </div>
                    <span className="text-[9px] font-semibold text-amber-400/40 bg-amber-400/8 px-2 py-1 rounded-full">Soon</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/8 border border-white/12 rounded-xl p-4">
              <p className="text-[10px] font-semibold text-white/30 capitalize tracking-wider mb-2">What It Will Do</p>
              <div className="space-y-2">
                {["Browse menus & photos", "Real-time table availability", "Book for your crew with one tap", "Get wait time estimates", "Integration with Plans & Jams"].map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400/40" />
                    <p className="text-xs text-white/50">{f}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ MAP MODE (inline) ═══ */}
        {mode === "map" && (
          <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="pt-1">

            {/* Category filter chips */}
            <div className="px-4 mb-2 overflow-x-auto">
              <div className="flex gap-1.5 pb-1">
                {mapCategoryFilters.map(f => (
                  <button key={f.id} onClick={() => setMapFilter(f.id)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[9px] font-bold transition-all ${
                      mapFilter === f.id
                        ? f.id === "Pinned" ? "bg-[#F2E8CF] text-[#233216]" : "bg-white/20 text-white"
                        : "bg-white/5 text-white/35 border border-white/8"
                    }`}>
                    {f.id === "Pinned" && <Pin size={8} className="inline mr-1" fill={mapFilter === f.id ? "currentColor" : "none"} />}
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle buttons */}
            <div className="px-4 flex gap-1.5 mb-2 flex-wrap">
              <button onClick={() => setMapShowFriends(!mapShowFriends)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                  mapShowFriends ? "bg-[#4CAF50] text-white" : "bg-white/8 text-white/40 border border-white/10"
                }`}>
                <Users size={10} /> Friends
              </button>
              <button onClick={() => setMapShowList(!mapShowList)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                  mapShowList ? "bg-[#F2E8CF] text-[#233216]" : "bg-white/8 text-white/40 border border-white/10"
                }`}>
                <Layers size={10} /> List
              </button>
              <button onClick={() => setMapShowBus(!mapShowBus)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                  mapShowBus ? "bg-[#1E88E5] text-white" : "bg-white/8 text-white/40 border border-white/10"
                }`}>
                <Bus size={10} /> Bus
              </button>
              <button onClick={handleMapLocate}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                  mapUserLoc ? "bg-[#1E88E5] text-white" : "bg-white/8 text-white/40 border border-white/10"
                }`}>
                <Navigation size={10} /> {mapUserLoc ? "You" : "Locate"}
              </button>
            </div>

            {/* Leaflet map — warm tan theme */}
            <div className="relative mx-4 rounded-2xl overflow-hidden border border-[#F2E8CF]/20 shadow-xl"
              style={{ height: mapShowList ? "36vh" : "52vh", transition: "height 0.3s ease" }}>
              <style>{`
                .dash-map .leaflet-container { background: #F0E4D0; }
                .dash-map .leaflet-tile-pane { filter: sepia(18%) saturate(80%) brightness(105%) hue-rotate(8deg); }
                .dash-map .leaflet-control-zoom { display: none; }
                .dash-map .leaflet-control-attribution { display: none !important; }
                .custom-category-marker, .custom-friend-marker, .cal-poly-marker, .user-loc-marker { background: transparent !important; border: none !important; }
                .dash-map .leaflet-tooltip { background: #2a3a1e; border: 1px solid #F2E8CF30; border-radius: 8px; color: #F2E8CF; font-size: 11px; font-weight: 700; font-family: 'Nunito', sans-serif; padding: 3px 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
                .dash-map .leaflet-tooltip-top::before { border-top-color: #2a3a1e; }
              `}</style>
              <div className="dash-map w-full h-full">
                <MapContainer
                  center={[CAL_POLY_LAT, CAL_POLY_LNG]}
                  zoom={12}
                  zoomControl={false}
                  attributionControl={false}
                  className="w-full h-full"
                  style={{ background: "#F0E4D0" }}
                >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />

                  {mapShowBus && busRouteData.map(route => (
                    <Polyline key={route.id} positions={route.stops}
                      pathOptions={{ color: route.color, weight: 4, opacity: 0.7, dashArray: "8, 6" }}>
                      <Tooltip sticky>{route.name}</Tooltip>
                    </Polyline>
                  ))}

                  {mapSelectedPlace && <DashMapFlyTo lat={mapSelectedPlace.lat} lng={mapSelectedPlace.lng} zoom={14} />}
                  {mapSelectedFriend && <DashMapFlyTo lat={mapSelectedFriend.lat} lng={mapSelectedFriend.lng} zoom={14} />}

                  <Marker position={[CAL_POLY_LAT, CAL_POLY_LNG]} icon={calPolyMapIcon}>
                    <Tooltip direction="top" offset={[0, -12]}>Cal Poly</Tooltip>
                  </Marker>

                  {mapFilteredPlaces.map(place => {
                    const isPinned = pinnedEvents.includes(place.id);
                    const isSelected = mapSelectedPlace?.id === place.id;
                    return (
                      <Marker key={place.id} position={[place.lat, place.lng]}
                        icon={createCategoryIcon(place.category, isPinned, isSelected)}
                        eventHandlers={{ click: () => { setMapSelectedPlace(place); setMapSelectedFriend(null); } }}>
                        <Tooltip direction="top" offset={[0, -14]}>{place.name}</Tooltip>
                      </Marker>
                    );
                  })}

                  {mapShowFriends && friendsOnMap.map(friend => (
                    <Marker key={friend.id} position={[friend.lat, friend.lng]}
                      icon={createFriendMapIcon(friend.color, friend.name[0])}
                      eventHandlers={{ click: () => { setMapSelectedFriend(friend); setMapSelectedPlace(null); } }}>
                      <Tooltip direction="top" offset={[0, -20]}>{friend.emoji} {friend.name}</Tooltip>
                    </Marker>
                  ))}

                  {mapUserLoc && (
                    <Marker position={[mapUserLoc.lat, mapUserLoc.lng]} icon={userLocIcon}>
                      <Tooltip direction="top" offset={[0, -10]}>YOU</Tooltip>
                    </Marker>
                  )}

                  <DashRecenterBtn />
                </MapContainer>
              </div>

              {/* Legend */}
              <div className="absolute bottom-3 left-3 z-[500] bg-[#2a3a1e]/90 backdrop-blur-md rounded-xl px-3 py-2 border border-[#F2E8CF]/15 shadow-sm">
                <div className="flex items-center gap-3 text-[8px] font-bold text-[#F2E8CF]/60">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#546E7A]" /> Spot</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#4CAF50] border border-white" /> Friend</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#1E88E5] border border-white" /> You</span>
                  {mapShowBus && <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-[#2196F3]" /> Bus</span>}
                </div>
              </div>
            </div>

            {/* Selected place card */}
            <AnimatePresence>
              {mapSelectedPlace && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="mx-4 mt-3 bg-gradient-to-br from-[#1a2e12]/90 to-[#0d1a08]/90 backdrop-blur-xl border border-[#F2E8CF]/15 rounded-xl p-3.5">
                  <div className="flex items-center gap-3">
                    <img src={mapSelectedPlace.image} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white leading-tight">{mapSelectedPlace.name}</h3>
                      <p className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                        <MapPin size={9} /> {mapSelectedPlace.city} &middot; {mapSelectedPlace.price} &middot; {mapSelectedPlace.rating}★
                      </p>
                      <p className="text-[10px] text-white/25 mt-0.5">
                        {mapPlaceDistance < 1 ? `${Math.round(mapPlaceDistance * 5280)} ft from Cal Poly` : `${mapPlaceDistance.toFixed(1)} mi from Cal Poly`}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => navigate(`/event/${mapSelectedPlace.id}`, { state: { from: "/dashboard" } })}
                        className="px-3 py-1.5 bg-[#F5E6D0] text-[#233216] rounded-lg text-[10px] font-bold active:scale-95 transition-transform">
                        View
                      </button>
                      <button onClick={() => setMapSelectedPlace(null)} className="p-1 text-white/30"><X size={14} /></button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Selected friend card */}
            <AnimatePresence>
              {mapSelectedFriend && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="mx-4 mt-3 bg-gradient-to-br from-[#1a2e12]/90 to-[#0d1a08]/90 backdrop-blur-xl border border-[#F2E8CF]/15 rounded-xl p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold border-2 bg-white/10"
                      style={{ borderColor: mapSelectedFriend.color, color: mapSelectedFriend.color }}>
                      {mapSelectedFriend.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white">{mapSelectedFriend.name}</h3>
                      <p className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">{mapSelectedFriend.emoji} {mapSelectedFriend.status}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => { navigate("/jams", { state: { createWithFriend: mapSelectedFriend.name } }); }}
                        className="px-3 py-1.5 bg-[#F5E6D0] text-[#233216] rounded-lg text-[10px] font-bold active:scale-95 transition-transform">Jam</button>
                      <button onClick={() => setMapSelectedFriend(null)} className="p-1 text-white/30"><X size={14} /></button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Collapsible spot list */}
            <AnimatePresence>
              {mapShowList && !mapSelectedPlace && !mapSelectedFriend && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-4 mt-3">
                  <p className="text-[10px] font-semibold text-[#F2E8CF]/40 capitalize tracking-wider mb-2">
                    {mapFilter === "Pinned" ? `Pinned (${mapFilteredPlaces.length})` : mapFilter === "All" ? `All Spots (${mapFilteredPlaces.length})` : `${mapFilter} (${mapFilteredPlaces.length})`}
                  </p>
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                    {mapFilteredPlaces.slice(0, 10).map(place => (
                      <div key={place.id} onClick={() => { setMapSelectedPlace(place); setMapSelectedFriend(null); }}
                        className="flex items-center gap-3 p-2 rounded-lg bg-white/5 active:bg-white/10 transition-colors cursor-pointer">
                        <img src={place.image} className="w-8 h-8 rounded-md object-cover flex-shrink-0" loading="lazy" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-white/70 leading-tight">{place.name}</p>
                          <p className="text-[9px] text-white/30">{place.category} &middot; {place.price}</p>
                        </div>
                        {pinnedEvents.includes(place.id) && <Pin size={10} className="text-[#F2E8CF] flex-shrink-0" fill="currentColor" />}
                      </div>
                    ))}
                    {mapFilteredPlaces.length > 10 && (
                      <p className="text-[9px] text-white/20 text-center py-1">+{mapFilteredPlaces.length - 10} more</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bus route legend */}
            {mapShowBus && !mapSelectedPlace && !mapSelectedFriend && (
              <div className="px-4 mt-3">
                <div className="bg-gradient-to-br from-[#1a2e12]/80 to-[#0d1a08]/80 border border-[#F2E8CF]/15 rounded-xl p-3">
                  <p className="text-[9px] font-semibold text-[#F2E8CF]/40 capitalize tracking-wider mb-1.5">SLO Transit</p>
                  <div className="flex flex-wrap gap-3">
                    {busRouteData.map(r => (
                      <span key={r.id} className="flex items-center gap-1.5 text-[10px] font-bold text-white/50">
                        <span className="w-4 h-1 rounded-full" style={{ backgroundColor: r.color }} /> {r.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Open full map */}
            <div className="px-4 mt-3">
              <button onClick={() => navigate("/map")}
                className="w-full py-2.5 bg-white/6 border border-white/10 rounded-xl text-[10px] font-bold text-white/35 flex items-center justify-center gap-2 active:bg-white/10 transition-colors">
                <MapIcon size={12} /> Open Full Map
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* "Go Branch Out" celebration modal — outside mode AnimatePresence */}
      <AnimatePresence>
        {showBranchOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-md px-6"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 250 }}
              className="bg-gradient-to-b from-[#2D5016]/40 to-[#1B5E20]/30 backdrop-blur-2xl border border-[#4CAF50]/25 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl"
            >
              <PolyTreeVis data={polyTree} />
              <h2 className="text-2xl font-extrabold text-[#8BC34A] capitalize tracking-tight mt-3">
                Go Branch Out
              </h2>
              <p className="text-sm text-white/50 mt-2 mb-5">
                Session complete! Your {getTreeSpecies(polyTree.treeId).name} grew. Time to explore SLO.
              </p>
              {polyTree.currentStreak > 0 && (
                <div className="flex items-center justify-center gap-1.5 mb-4">
                  <TreePine size={14} className="text-[#8BC34A]" />
                  <span className="text-sm font-bold text-[#8BC34A]">{polyTree.currentStreak} day streak!</span>
                </div>
              )}
              <div className="space-y-2">
                <button
                  onClick={() => { setShowBranchOut(false); navigate("/explore"); }}
                  className="w-full py-3 bg-[#8BC34A] text-[#1a2e10] rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
                >
                  <Compass size={16} /> Explore SLO
                </button>
                <button
                  onClick={() => setShowBranchOut(false)}
                  className="w-full py-3 bg-white/8 border border-white/12 text-white/50 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                >
                  Keep Working
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ FULLSCREEN ANALYTICS (Robinhood-style) ═══ */}
      <AnimatePresence>
        {showAnalyticsFullscreen && (() => {
          const rangeData = analyticsRange === "1W" ? focusAnalytics.week : analyticsRange === "1M" ? focusAnalytics.month : analyticsRange === "3M" ? focusAnalytics.quarter : focusAnalytics.all;
          const rangeDays = analyticsRange === "1W" ? 7 : analyticsRange === "1M" ? 30 : analyticsRange === "3M" ? 90 : 180;
          const dailyData = Array.from({ length: rangeDays }, (_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (rangeDays - 1 - i));
            const dayStr = d.toDateString();
            return { date: d, mins: rangeData.data.filter(s => new Date(s.date).toDateString() === dayStr).reduce((a, s) => a + Math.floor(s.elapsed / 60), 0) };
          });
          const maxMins = Math.max(...dailyData.map(d => d.mins), 1);
          // Running total for chart line
          let runningTotal = 0;
          const linePoints = dailyData.map((d, i) => {
            runningTotal += d.mins;
            return { x: (i / (rangeDays - 1)) * 100, y: runningTotal };
          });
          const maxTotal = Math.max(runningTotal, 1);
          const svgPath = linePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${100 - (p.y / maxTotal) * 80}`).join(" ");
          const avgPerDay = rangeData.minutes > 0 ? Math.round(rangeData.minutes / Math.max(rangeData.sessions, 1)) : 0;
          return (
            <motion.div
              key="analytics-fullscreen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[80] bg-[#0a0f06] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-[max(12px,env(safe-area-inset-top))] pb-3">
                <button onClick={() => setShowAnalyticsFullscreen(false)} className="p-2 -ml-2 text-white/50 hover:text-white transition-colors flex items-center gap-1">
                  <ArrowLeft size={18} /> <span className="text-xs font-semibold">Back</span>
                </button>
                <span className="text-xs font-semibold text-white/40">Focus Analytics</span>
                <div className="w-10" />
              </div>

              {/* Total */}
              <div className="px-5 mb-2">
                <p className="text-[10px] font-semibold text-white/30 tracking-wider mb-1">Total Focus Time</p>
                <p className="text-4xl font-bold text-white tracking-tight">
                  {rangeData.minutes >= 60 ? `${Math.floor(rangeData.minutes / 60)}h ${rangeData.minutes % 60}m` : `${rangeData.minutes}m`}
                </p>
                <p className="text-sm text-[#8BC34A] font-semibold mt-1">
                  {rangeData.sessions} sessions &middot; {rangeData.completed} completed &middot; ~{avgPerDay}m avg
                </p>
              </div>

              {/* SVG Chart */}
              <div className="flex-1 px-5 py-4 min-h-0">
                <div className="w-full h-full relative">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                    {/* Grid lines */}
                    <line x1="0" y1="20" x2="100" y2="20" stroke="white" strokeOpacity="0.05" strokeWidth="0.3" />
                    <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeOpacity="0.05" strokeWidth="0.3" />
                    <line x1="0" y1="80" x2="100" y2="80" stroke="white" strokeOpacity="0.05" strokeWidth="0.3" />
                    {/* Fill under curve */}
                    <path d={`${svgPath} L 100 100 L 0 100 Z`} fill="url(#chartGradient)" />
                    {/* Line */}
                    <path d={svgPath} fill="none" stroke="#8BC34A" strokeWidth="0.8" strokeLinejoin="round" />
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8BC34A" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#8BC34A" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Range selector */}
              <div className="px-5 pb-2">
                <div className="flex gap-2 justify-center">
                  {(["1W", "1M", "3M", "All"] as const).map(r => (
                    <button key={r} onClick={() => setAnalyticsRange(r)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${analyticsRange === r ? "bg-[#8BC34A] text-[#0a0f06]" : "bg-white/5 text-white/35 border border-white/8"}`}
                    >{r}</button>
                  ))}
                </div>
              </div>

              {/* Stats grid */}
              <div className="px-5 pb-6">
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-white/5 border border-white/8 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-white">{rangeData.sessions}</p>
                    <p className="text-[9px] text-white/30 font-semibold">Sessions</p>
                  </div>
                  <div className="bg-white/5 border border-white/8 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-[#8BC34A]">{rangeData.completed}</p>
                    <p className="text-[9px] text-white/30 font-semibold">Completed</p>
                  </div>
                  <div className="bg-white/5 border border-white/8 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-[#F2E8CF]">{avgPerDay}m</p>
                    <p className="text-[9px] text-white/30 font-semibold">Avg / Session</p>
                  </div>
                </div>

                {/* Daily breakdown */}
                <div className="mt-4 flex items-end gap-0.5 h-20">
                  {dailyData.slice(-Math.min(rangeDays, 30)).map((d, i) => {
                    const h = Math.max(2, (d.mins / maxMins) * 80);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end">
                        <div className="w-full rounded-t-sm bg-[#8BC34A]/50 transition-all" style={{ height: `${h}px` }} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] text-white/15 font-semibold">
                    {dailyData[Math.max(0, dailyData.length - Math.min(rangeDays, 30))]?.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <span className="text-[8px] text-white/15 font-semibold">
                    {dailyData[dailyData.length - 1]?.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
