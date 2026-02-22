import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPin, Pin, Users, Navigation, X, Layers,
  LocateFixed, Bus, ChevronDown, SlidersHorizontal, Search
} from "lucide-react";
import { places, CAL_POLY_LAT, CAL_POLY_LNG, getDistanceMiles, areaGroups, matchesArea } from "../data/places";
import { BottomNav } from "../components/BottomNav";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, useMap, Tooltip, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── Friends overlay data ────────────────────────────────────────────────────
const friendsOnMap = [
  { id: "f1", name: "Alex", lat: 35.2698, lng: -120.6700, status: "Hiking Bishop Peak", color: "#4CAF50", emoji: "\u{1F33F}" },
  { id: "f2", name: "Emma", lat: 35.3020, lng: -120.6610, status: "Kennedy Library", color: "#1E88E5", emoji: "\u{1F4DA}" },
  { id: "f3", name: "Jake", lat: 35.2810, lng: -120.6590, status: "Scout Coffee", color: "#FF9800", emoji: "\u2615" },
  { id: "f4", name: "Sarah", lat: 35.1283, lng: -120.6410, status: "Shell Beach", color: "#E91E63", emoji: "\u{1F3D6}\u{FE0F}" },
];

const categoryFilters = [
  { id: "All", label: "All" },
  { id: "Pinned", label: "Pinned" },
  { id: "Food & Treats", label: "Food" },
  { id: "Coffee Shops", label: "Coffee" },
  { id: "Hikes", label: "Hikes" },
  { id: "Beaches", label: "Beaches" },
  { id: "Shopping", label: "Shops" },
  { id: "Breweries", label: "Bars" },
  { id: "Study Spots", label: "Study" },
  { id: "Live Music", label: "Music" },
  { id: "Parks & Gardens", label: "Parks" },
  { id: "Art", label: "Art" },
  { id: "Movies", label: "Movies" },
  { id: "Wellness", label: "Wellness" },
  { id: "Museums", label: "Museums" },
  { id: "Gym", label: "Gym" },
  { id: "Viewpoints", label: "Views" },
];

// ─── SLO Bus Routes (SLO Transit) ───────────────────────────────────────────
const busRoutes = [
  {
    id: "route-4",
    name: "SLO Transit 4 — Cal Poly / Downtown",
    color: "#2196F3",
    stops: [
      [35.3050, -120.6625], [35.2990, -120.6620], [35.2900, -120.6600],
      [35.2830, -120.6595], [35.2790, -120.6640], [35.2770, -120.6595],
    ] as [number, number][],
  },
  {
    id: "route-6",
    name: "SLO Transit 6 — Cal Poly Loop",
    color: "#4CAF50",
    stops: [
      [35.3050, -120.6625], [35.2990, -120.6620], [35.2900, -120.6600],
      [35.2790, -120.6640], [35.2720, -120.6620], [35.2650, -120.6650],
    ] as [number, number][],
  },
  {
    id: "route-12a",
    name: "SLO Transit 12A — Campus / Morro Bay",
    color: "#FF9800",
    stops: [
      [35.2790, -120.6640], [35.2550, -120.6580], [35.2200, -120.6500],
      [35.1850, -120.6480], [35.1420, -120.6415],
    ] as [number, number][],
  },
];

// ─── Better SVG icons for categories ─────────────────────────────────────────
const categorySvgIcons: Record<string, { svg: string; bg: string }> = {
  "Coffee Shops": {
    svg: `<path d="M5 8h10v7a4 4 0 01-4 4H9a4 4 0 01-4-4V8z" fill="rgba(255,255,255,0.3)" stroke="white" stroke-width="2"/>
          <path d="M15 10h1.5a2.5 2.5 0 010 5H15" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M7 3v3M10 3v3M13 3v3" stroke="white" stroke-width="2" stroke-linecap="round"/>`,
    bg: "#6D4C41"
  },
  "Food & Treats": {
    svg: `<path d="M3 6h18l-1.5 13a2 2 0 01-2 1.8H6.5a2 2 0 01-2-1.8L3 6z" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="2"/>
          <path d="M8 2v4M12 2v4M16 2v4" stroke="white" stroke-width="2.5" stroke-linecap="round"/>`,
    bg: "#E65100"
  },
  "Beaches": {
    svg: `<path d="M2 16c2-3 4-3 6 0s4 3 6 0 4-3 6 0" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <path d="M12 4l-3 8h6l-3-8z" fill="rgba(255,255,255,0.3)" stroke="white" stroke-width="1.5"/>
          <circle cx="18" cy="5" r="3" fill="rgba(255,255,255,0.4)" stroke="white" stroke-width="1.5"/>`,
    bg: "#0288D1"
  },
  "Hikes": {
    svg: `<path d="M4 20l5-14 3 6 4-9 5 17" stroke="white" stroke-width="2.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
          <path d="M7 14l2.5-7L12 13l3-7 4.5 14" fill="rgba(255,255,255,0.15)"/>
          <path d="M11 7l1-3 1 3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    bg: "#2E7D32"
  },
  "Study Spots": {
    svg: `<rect x="4" y="4" width="16" height="14" rx="1.5" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="2"/>
          <path d="M4 9h16" stroke="white" stroke-width="2"/>
          <path d="M8 13h4M8 16h6" stroke="white" stroke-width="1.5" stroke-linecap="round"/>`,
    bg: "#5C6BC0"
  },
  "Live Music": {
    svg: `<path d="M9 18V6l9-2v12" stroke="white" stroke-width="2.5" fill="none" stroke-linejoin="round"/>
          <circle cx="7" cy="18" r="3" fill="rgba(255,255,255,0.3)" stroke="white" stroke-width="2"/>
          <circle cx="16" cy="16" r="3" fill="rgba(255,255,255,0.3)" stroke="white" stroke-width="2"/>`,
    bg: "#8E24AA"
  },
  "Breweries": {
    svg: `<path d="M5 8h10v9a3 3 0 01-3 3H8a3 3 0 01-3-3V8z" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="2"/>
          <path d="M15 10h2a2 2 0 010 4h-2" stroke="white" stroke-width="2" fill="none"/>
          <path d="M7 12h6" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <path d="M8 3v3M12 3v3" stroke="white" stroke-width="2" stroke-linecap="round"/>`,
    bg: "#F57F17"
  },
  "Parks & Gardens": {
    svg: `<path d="M12 22V10" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M12 10c0 0-5-6-5-8s2.2-3 5 0c2.8-3 5-2 5 0s-5 8-5 8z" fill="rgba(255,255,255,0.3)" stroke="white" stroke-width="2"/>
          <path d="M6 18c-3-1-4 1-4 3h6M18 18c3-1 4 1 4 3h-6" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    bg: "#388E3C"
  },
  "Viewpoints": {
    svg: `<circle cx="12" cy="10" r="4" fill="rgba(255,255,255,0.25)" stroke="white" stroke-width="2"/>
          <circle cx="12" cy="10" r="1.5" fill="white"/>
          <path d="M4 20l4-6 3 3 2-4 3 4 4-5" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    bg: "#FF6F00"
  },
  "Farmers Markets": {
    svg: `<path d="M5 11h14l-1 9H6l-1-9z" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="2"/>
          <path d="M12 3c-3 0-6 3-6 6h12c0-3-3-6-6-6z" fill="rgba(255,255,255,0.15)" stroke="white" stroke-width="2"/>
          <path d="M8 20v-4M16 20v-4" stroke="white" stroke-width="1.5" stroke-linecap="round"/>`,
    bg: "#558B2F"
  },
  "Shopping": {
    svg: `<path d="M6 2l-2 5v13a2 2 0 002 2h12a2 2 0 002-2V7l-2-5H6z" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="2"/>
          <path d="M4 7h16" stroke="white" stroke-width="2"/>
          <path d="M16 10a4 4 0 01-8 0" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    bg: "#AD1457"
  },
  "Art": {
    svg: `<circle cx="7" cy="7" r="2.5" fill="rgba(255,255,255,0.3)" stroke="white" stroke-width="1.5"/>
          <path d="M3 20c4-8 8-8 10-2 1.5-4 4-7 8-3" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    bg: "#7B1FA2"
  },
  "Movies": {
    svg: `<rect x="3" y="5" width="18" height="14" rx="2" fill="rgba(255,255,255,0.15)" stroke="white" stroke-width="2"/>
          <polygon points="10,9 10,17 16,13" fill="white"/>`,
    bg: "#C62828"
  },
  "Museums": {
    svg: `<path d="M3 21h18M5 21V9l7-6 7 6v12" fill="rgba(255,255,255,0.15)" stroke="white" stroke-width="2" stroke-linejoin="round"/>
          <path d="M9 21v-6h6v6" stroke="white" stroke-width="2"/>
          <path d="M9 13h1M14 13h1" stroke="white" stroke-width="2" stroke-linecap="round"/>`,
    bg: "#1565C0"
  },
  "Wellness": {
    svg: `<path d="M12 21c-4-4-8-7-8-11a5 5 0 0110 0 5 5 0 0110 0c0 4-4 7-8 11z" fill="rgba(255,255,255,0.25)" stroke="white" stroke-width="2" stroke-linejoin="round"/>`,
    bg: "#00897B"
  },
  "Gym": {
    svg: `<path d="M6 7v10M18 7v10" stroke="white" stroke-width="3" stroke-linecap="round"/>
          <path d="M6 12h12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M3 9v6M21 9v6" stroke="white" stroke-width="2.5" stroke-linecap="round"/>`,
    bg: "#FF5722"
  },
  "Games & Arcades": {
    svg: `<rect x="3" y="7" width="18" height="10" rx="3" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="2"/>
          <circle cx="9" cy="12" r="1.5" fill="white"/>
          <circle cx="15" cy="11" r="1" fill="white"/>
          <circle cx="17" cy="13" r="1" fill="white"/>`,
    bg: "#5D4037"
  },
  "Bowling": {
    svg: `<circle cx="12" cy="14" r="7" fill="rgba(255,255,255,0.15)" stroke="white" stroke-width="2"/>
          <circle cx="10" cy="11" r="1.2" fill="white"/><circle cx="14" cy="11" r="1.2" fill="white"/>
          <circle cx="12" cy="15" r="1.2" fill="white"/>`,
    bg: "#FF5722"
  },
  "Water Sports": {
    svg: `<path d="M2 14c2-3 4-3 6 0s4 3 6 0 4-3 6 0" stroke="white" stroke-width="2" fill="none"/>
          <path d="M2 19c2-3 4-3 6 0s4 3 6 0 4-3 6 0" stroke="white" stroke-width="1.5" fill="none" opacity="0.5"/>
          <path d="M12 3v8M9 6l3-3 3 3" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    bg: "#0277BD"
  },
  "Hot Springs & Spas": {
    svg: `<path d="M12 21c-4-4-8-7-8-11a5 5 0 0110 0 5 5 0 0110 0c0 4-4 7-8 11z" fill="rgba(255,255,255,0.25)" stroke="white" stroke-width="2"/>`,
    bg: "#00897B"
  },
  "Day Trips": {
    svg: `<path d="M5 11l7-7 7 7M12 4v16" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    bg: "#546E7A"
  },
  "Wineries": {
    svg: `<path d="M8 22h8M12 15v7M12 15c3 0 5-2 5-5C17 7 12 2 12 2S7 7 7 10c0 3 2 5 5 5z" fill="rgba(255,255,255,0.25)" stroke="white" stroke-width="2"/>`,
    bg: "#6A1B9A"
  },
  "Zoos & Aquariums": {
    svg: `<path d="M12 2C7 2 3 6 3 10c0 6 9 12 9 12s9-6 9-12c0-4-4-8-9-8z" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="2"/>
          <circle cx="10" cy="9" r="1" fill="white"/><circle cx="14" cy="9" r="1" fill="white"/>
          <path d="M9 13c1.5 1 4.5 1 6 0" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    bg: "#00897B"
  },
};

// ─── Photo-based marker ─────────────────────────────────────────────────────
function createPhotoIcon(imgUrl: string, isPinned: boolean, isSelected: boolean) {
  const size = isSelected ? 42 : isPinned ? 36 : 30;
  const pinBadge = isPinned ? `<div style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;border-radius:50%;background:#F5E6D0;border:2px solid #233216;display:flex;align-items:center;justify-content:center;">
    <svg width="7" height="7" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8L8 14l-6-4.8h7.6z" fill="#233216"/></svg>
  </div>` : "";
  return L.divIcon({
    className: "custom-place-marker",
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      <img src="${imgUrl}" style="width:${size}px;height:${size}px;border-radius:${isSelected ? '12px' : '50%'};object-fit:cover;border:${isSelected ? '3px' : '2.5px'} solid ${isSelected ? '#F5E6D0' : 'white'};box-shadow:0 3px 10px rgba(0,0,0,0.35)${isSelected ? ',0 0 14px rgba(245,230,208,0.4)' : ''};" />
      ${pinBadge}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createCategoryIcon(category: string, isPinned: boolean, isSelected: boolean) {
  const size = isSelected ? 38 : isPinned ? 32 : 28;
  const iconData = categorySvgIcons[category] || { svg: `<circle cx="12" cy="12" r="4" fill="white"/>`, bg: "#546E7A" };
  const pinBadge = isPinned ? `<div style="position:absolute;top:-5px;right:-5px;width:14px;height:14px;border-radius:50%;background:#F5E6D0;border:2px solid #233216;display:flex;align-items:center;justify-content:center;">
    <svg width="8" height="8" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8L8 14l-6-4.8h7.6z" fill="#233216"/></svg>
  </div>` : "";
  return L.divIcon({
    className: "custom-place-marker",
    html: `<div style="position:relative;width:${size}px;height:${size}px;border-radius:${isSelected ? '10px' : '8px'};background:${iconData.bg};border:${isSelected ? '3px' : '2px'} solid rgba(255,255,255,0.9);box-shadow:0 3px 10px rgba(0,0,0,0.35)${isSelected ? `,0 0 14px ${iconData.bg}70` : ''};display:flex;align-items:center;justify-content:center;">
      <svg viewBox="0 0 24 24" width="${size * 0.55}" height="${size * 0.55}" style="display:block;">${iconData.svg}</svg>
      ${pinBadge}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// ─── Cluster icon (for area collapsing) ──────────────────────────────────────
function createClusterIcon(count: number, label: string) {
  return L.divIcon({
    className: "custom-place-marker",
    html: `<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#2E7D32,#1B5E20);border:3px solid rgba(245,230,208,0.6);box-shadow:0 4px 12px rgba(0,0,0,0.4);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;">
      <span style="font-size:14px;font-weight:900;color:white;font-family:'Nunito',sans-serif;line-height:1;">${count}</span>
      <span style="font-size:7px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:capitalize;letter-spacing:0.5px;">${label}</span>
    </div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

function createFriendIcon(color: string, initial: string) {
  return L.divIcon({
    className: "custom-friend-marker",
    html: `<div style="width:40px;height:40px;border-radius:50%;background:white;border:3px solid ${color};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:${color};font-family:'Nunito',sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.2);">${initial}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

const calPolyIcon = L.divIcon({
  className: "cal-poly-marker",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#1B5E20;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const userLocationIcon = L.divIcon({
  className: "user-location-marker",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#1E88E5;border:3px solid white;box-shadow:0 0 12px rgba(30,136,229,0.5),0 2px 6px rgba(0,0,0,0.2);animation:userPulse 2s ease-in-out infinite;"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// ─── Map helper components ───────────────────────────────────────────────────
function MapFlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([lat, lng], zoom, { duration: 0.8 }); }, [map, lat, lng, zoom]);
  return null;
}

function RecenterButton() {
  const map = useMap();
  return (
    <div className="absolute bottom-3 right-3" style={{ zIndex: 1000 }}>
      <button
        onClick={() => map.flyTo([CAL_POLY_LAT, CAL_POLY_LNG], 12, { duration: 0.6 })}
        className="w-10 h-10 bg-[#F5E6D0] rounded-xl shadow-lg text-[#233216] flex items-center justify-center active:scale-90 transition-transform hover:bg-[#F2E8CF]"
      >
        <LocateFixed size={18} />
      </button>
    </div>
  );
}

export function MapPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const [selectedPlace, setSelectedPlace] = useState<typeof places[0] | null>(() => {
    if (focusId) {
      const found = places.find(p => p.id === focusId);
      return found || null;
    }
    return null;
  });
  const [selectedFriend, setSelectedFriend] = useState<typeof friendsOnMap[0] | null>(null);
  const [showFriends, setShowFriends] = useState(() => {
    try { const raw = localStorage.getItem("polyjarvis_customize"); if (raw) return JSON.parse(raw).showFriendsOnMap !== false; } catch {}
    return true;
  });
  const [showBusRoutes, setShowBusRoutes] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeArea, setActiveArea] = useState("all");
  const [showList, setShowList] = useState(false);
  const [showAreaMenu, setShowAreaMenu] = useState(false);
  const [usePhotoMarkers, setUsePhotoMarkers] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [collapsedAreas, setCollapsedAreas] = useState<Set<string>>(() => new Set());
  const [mapSearch, setMapSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  const distUnit = useMemo(() => {
    try { const raw = localStorage.getItem("polyjarvis_customize"); if (raw) return JSON.parse(raw).distanceUnit || "mi"; } catch {}
    return "mi";
  }, []);
  const formatDist = useCallback((distMi: number) => {
    if (distUnit === "km") {
      const km = distMi * 1.60934;
      return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
    }
    return distMi < 1 ? `${Math.round(distMi * 5280)} ft` : `${distMi.toFixed(1)} mi`;
  }, [distUnit]);

  const pinnedIds: string[] = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("pinnedEvents") || "[]"); } catch { return []; }
  }, []);
  const pinnedPlaces = useMemo(() => places.filter(p => pinnedIds.includes(p.id)), [pinnedIds]);

  const filteredPlaces = useMemo(() => {
    const isUnder21 = localStorage.getItem("polyjarvis_age_21") === "no";
    const adultCategories = new Set(["Breweries", "Wineries"]);

    let result = places.filter(p => !(isUnder21 && adultCategories.has(p.category)));
    // Category filter
    if (activeFilter === "Pinned") result = pinnedPlaces.filter(p => !(isUnder21 && adultCategories.has(p.category)));
    else if (activeFilter !== "All") result = result.filter(p => p.category === activeFilter);
    // Area filter
    if (activeArea !== "all") result = result.filter(p => matchesArea(p, activeArea));
    return result;
  }, [activeFilter, activeArea, pinnedPlaces]);

  // Group places by area for collapsing
  const { visiblePlaces, areaClusters } = useMemo(() => {
    const vis: typeof places = [];
    const clusters: { area: string; lat: number; lng: number; count: number; label: string }[] = [];

    if (collapsedAreas.size === 0) {
      return { visiblePlaces: filteredPlaces, areaClusters: [] };
    }

    const areaMap = new Map<string, typeof places>();
    for (const p of filteredPlaces) {
      const area = p.location;
      if (collapsedAreas.has(area)) {
        if (!areaMap.has(area)) areaMap.set(area, []);
        areaMap.get(area)!.push(p);
      } else {
        vis.push(p);
      }
    }

    for (const [area, areaPlaces] of areaMap) {
      if (areaPlaces.length > 0) {
        const avgLat = areaPlaces.reduce((s, p) => s + p.lat, 0) / areaPlaces.length;
        const avgLng = areaPlaces.reduce((s, p) => s + p.lng, 0) / areaPlaces.length;
        clusters.push({ area, lat: avgLat, lng: avgLng, count: areaPlaces.length, label: area.replace("Downtown ", "Dwntwn ").replace("San Luis Obispo", "SLO") });
      }
    }

    return { visiblePlaces: vis, areaClusters: clusters };
  }, [filteredPlaces, collapsedAreas]);

  const placeDistance = selectedPlace
    ? getDistanceMiles(CAL_POLY_LAT, CAL_POLY_LNG, selectedPlace.lat, selectedPlace.lng)
    : 0;

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: false, timeout: 8000 }
      );
    }
  }, []);

  const handleLocateMe = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); toast.success("Location found!"); },
        () => toast("Couldn't get your location"),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const toggleCollapseArea = (area: string) => {
    setCollapsedAreas(prev => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area); else next.add(area);
      return next;
    });
  };

  // Search results
  const searchResults = useMemo(() => {
    if (!mapSearch.trim()) return [];
    const q = mapSearch.toLowerCase();
    return places.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q)) ||
      p.city.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [mapSearch]);

  // Unique areas present in current filtered set
  const presentAreas = useMemo(() => {
    const areas = new Map<string, number>();
    for (const p of filteredPlaces) {
      areas.set(p.location, (areas.get(p.location) || 0) + 1);
    }
    return Array.from(areas.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredPlaces]);

  return (
    <div className="min-h-[100dvh] bg-transparent text-white pb-24">

      {/* Big Header */}
      <div className="px-5 pt-4 pb-1">
        <h1 className="text-3xl font-extrabold text-white capitalize tracking-tight">Map</h1>
        <p className="text-[10px] text-white/30 font-bold capitalize tracking-wider mt-0.5">{filteredPlaces.length} spots in SLO County</p>
      </div>

      {/* Search Bar */}
      <div className="px-4 mb-2 relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={14} />
          <input
            type="text"
            placeholder="Search spots, categories, cities..."
            value={mapSearch}
            onChange={e => { setMapSearch(e.target.value); setShowSearchResults(true); }}
            onFocus={() => setShowSearchResults(true)}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
            className="w-full bg-white/8 border border-white/12 rounded-xl py-2 pl-9 pr-9 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#F2E8CF]/30"
          />
          {mapSearch && (
            <button onClick={() => { setMapSearch(""); setShowSearchResults(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
              <X size={14} />
            </button>
          )}
        </div>
        {/* Search Results Dropdown */}
        <AnimatePresence>
          {showSearchResults && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute left-4 right-4 top-full mt-1 bg-[#1a2e12]/95 backdrop-blur-xl border border-white/15 rounded-xl overflow-hidden shadow-2xl z-50 max-h-[240px] overflow-y-auto"
            >
              {searchResults.map(place => {
                const dist = getDistanceMiles(CAL_POLY_LAT, CAL_POLY_LNG, place.lat, place.lng);
                return (
                  <button
                    key={place.id}
                    onClick={() => {
                      setSelectedPlace(place);
                      setSelectedFriend(null);
                      setMapSearch("");
                      setShowSearchResults(false);
                    }}
                    className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-white/8 active:bg-white/12 transition-colors border-b border-white/5 last:border-0"
                  >
                    <img src={place.image} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-white/80 truncate">{place.name}</p>
                      <p className="text-[9px] text-white/35">{place.category} &middot; {place.price} &middot; {formatDist(dist)}</p>
                    </div>
                    <MapPin size={12} className="text-[#F2E8CF]/40 flex-shrink-0" />
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Area Filter Row */}
      <div className="px-4 mb-1.5 overflow-x-auto">
        <div className="flex gap-1 pb-1">
          {areaGroups.map(a => (
            <button key={a.id} onClick={() => setActiveArea(a.id)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[8px] font-semibold tracking-wider transition-all ${
                activeArea === a.id
                  ? "bg-[#F2E8CF] text-[#233216]"
                  : "bg-white/5 text-white/30 border border-white/8"
              }`}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter Row */}
      <div className="px-4 mb-1.5 overflow-x-auto">
        <div className="flex gap-1 pb-1">
          {categoryFilters.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[8px] font-bold transition-all ${
                activeFilter === f.id
                  ? f.id === "Pinned"
                    ? "bg-[#F2E8CF] text-[#233216] shadow-lg shadow-[#F2E8CF]/25 ring-2 ring-[#F2E8CF]/40"
                    : "bg-[#F2E8CF]/20 text-[#F2E8CF] border border-[#F2E8CF]/30"
                  : f.id === "Pinned"
                    ? "bg-[#F2E8CF]/20 text-[#F2E8CF] border-2 border-[#F2E8CF]/35"
                    : "bg-white/5 text-white/30 border border-white/8"
              }`}
            >
              {f.id === "Pinned" && <Pin size={8} className="inline mr-0.5" fill={activeFilter === f.id || pinnedIds.length > 0 ? "currentColor" : "none"} />}
              {f.label}
              {f.id === "Pinned" && pinnedIds.length > 0 && (
                <span className={`ml-1 min-w-[14px] h-3.5 inline-flex items-center justify-center rounded-full text-[7px] font-semibold px-0.5 ${
                  activeFilter === f.id ? "bg-[#233216] text-[#F2E8CF]" : "bg-[#F2E8CF] text-[#233216]"
                }`}>{pinnedIds.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle filters */}
      <div className="px-4 flex gap-1.5 mb-2 flex-wrap">
        <button onClick={() => setShowFriends(!showFriends)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold transition-all ${
            showFriends ? "bg-[#4CAF50] text-white" : "bg-white/8 text-white/40 border border-white/10"
          }`}>
          <Users size={9} /> Friends
        </button>
        <button onClick={() => setShowList(!showList)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold transition-all ${
            showList ? "bg-[#F2E8CF] text-[#233216]" : "bg-white/8 text-white/40 border border-white/10"
          }`}>
          <Layers size={9} /> List
        </button>
        <button onClick={() => setShowBusRoutes(!showBusRoutes)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold tracking-wider transition-all ${
            showBusRoutes ? "bg-[#1E88E5] text-white shadow-lg shadow-[#1E88E5]/30 ring-1 ring-[#1E88E5]/50" : "bg-blue-500/15 text-blue-300 border-2 border-blue-400/30"
          }`}>
          <Bus size={12} /> Bus Routes
        </button>
        <button onClick={handleLocateMe}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold transition-all ${
            userLocation ? "bg-[#1E88E5] text-white" : "bg-white/8 text-white/40 border border-white/10"
          }`}>
          <Navigation size={9} /> {userLocation ? "You" : "Locate"}
        </button>
        <button onClick={() => setUsePhotoMarkers(!usePhotoMarkers)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold transition-all ${
            usePhotoMarkers ? "bg-amber-500/80 text-white" : "bg-white/8 text-white/40 border border-white/10"
          }`}>
          <SlidersHorizontal size={9} /> {usePhotoMarkers ? "Photos" : "Icons"}
        </button>
        {/* Collapse areas */}
        <button onClick={() => setShowAreaMenu(!showAreaMenu)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold transition-all ${
            collapsedAreas.size > 0 ? "bg-red-400/80 text-white" : "bg-white/8 text-white/40 border border-white/10"
          }`}>
          <ChevronDown size={9} /> Collapse
        </button>
      </div>

      {/* Area collapse menu */}
      <AnimatePresence>
        {showAreaMenu && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-4 mb-2">
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1">
              <p className="text-[8px] font-semibold text-white/25 capitalize tracking-wider mb-1">Collapse areas (hide individual pins)</p>
              {presentAreas.map(([area, count]) => (
                <button key={area} onClick={() => toggleCollapseArea(area)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-between transition-all ${
                    collapsedAreas.has(area) ? "bg-red-400/15 text-red-300 border border-red-400/20" : "bg-white/5 text-white/50 border border-white/8"
                  }`}>
                  <span>{area}</span>
                  <span className="text-[8px] font-bold">{count} spots {collapsedAreas.has(area) ? "(grouped)" : ""}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leaflet Map */}
      <div
        className="relative z-0 isolate mx-4 rounded-2xl overflow-hidden border border-[#F2E8CF]/20 shadow-xl"
        style={{ height: showList ? "34vh" : "48vh", transition: "height 0.3s ease" }}
      >
        <style>{`
          .leaflet-container { background: #F0E4D0; }
          .leaflet-tile-pane { filter: sepia(18%) saturate(80%) brightness(105%) hue-rotate(8deg); }
          .leaflet-control-zoom { display: none; }
          .leaflet-control-attribution { display: none !important; }
          .custom-place-marker, .custom-friend-marker, .cal-poly-marker, .user-location-marker { background: transparent !important; border: none !important; }
          .leaflet-popup-content-wrapper { background: #2a3a1e; border: 1px solid #F2E8CF30; border-radius: 12px; color: #F2E8CF; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
          .leaflet-popup-tip { background: #2a3a1e; border: 1px solid #F2E8CF30; }
          .leaflet-popup-close-button { color: #F2E8CF80 !important; }
          .leaflet-tooltip { background: #2a3a1e; border: 1px solid #F2E8CF30; border-radius: 8px; color: #F2E8CF; font-size: 11px; font-weight: 700; font-family: 'Nunito', sans-serif; padding: 3px 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
          .leaflet-tooltip-top::before { border-top-color: #2a3a1e; }
          @keyframes userPulse {
            0%, 100% { box-shadow: 0 0 12px rgba(30,136,229,0.4), 0 2px 6px rgba(0,0,0,0.2); }
            50% { box-shadow: 0 0 24px rgba(30,136,229,0.6), 0 2px 6px rgba(0,0,0,0.2); }
          }
        `}</style>

        <MapContainer
          center={[CAL_POLY_LAT, CAL_POLY_LNG]}
          zoom={12}
          zoomControl={false}
          attributionControl={false}
          className="w-full h-full"
          style={{ background: "#F0E4D0" }}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />

          {/* Bus Routes */}
          {showBusRoutes && busRoutes.map(route => (
            <Polyline key={route.id} positions={route.stops}
              pathOptions={{ color: route.color, weight: 6, opacity: 0.85, dashArray: "12, 8" }}>
              <Tooltip sticky>{route.name}</Tooltip>
            </Polyline>
          ))}

          {/* Fly to selected */}
          {selectedPlace && <MapFlyTo lat={selectedPlace.lat} lng={selectedPlace.lng} zoom={14} />}
          {selectedFriend && <MapFlyTo lat={selectedFriend.lat} lng={selectedFriend.lng} zoom={14} />}

          {/* Cal Poly center marker */}
          <Marker position={[CAL_POLY_LAT, CAL_POLY_LNG]} icon={calPolyIcon}>
            <Tooltip direction="top" offset={[0, -12]} permanent={false}>Cal Poly</Tooltip>
          </Marker>

          {/* Place markers */}
          {visiblePlaces.map(place => {
            const isPinned = pinnedIds.includes(place.id);
            const isSelected = selectedPlace?.id === place.id;
            const icon = usePhotoMarkers
              ? createPhotoIcon(place.image, isPinned, isSelected)
              : createCategoryIcon(place.category, isPinned, isSelected);
            const dist = getDistanceMiles(CAL_POLY_LAT, CAL_POLY_LNG, place.lat, place.lng);
            const distLabel = formatDist(dist);
            return (
              <Marker
                key={place.id}
                position={[place.lat, place.lng]}
                icon={icon}
                eventHandlers={{ click: () => { setSelectedPlace(place); setSelectedFriend(null); } }}
              >
                <Tooltip direction="top" offset={[0, -14]}>{`${place.name} · ${place.price} · ${distLabel}`}</Tooltip>
              </Marker>
            );
          })}

          {/* Area cluster markers */}
          {areaClusters.map(cluster => (
            <Marker
              key={`cluster-${cluster.area}`}
              position={[cluster.lat, cluster.lng]}
              icon={createClusterIcon(cluster.count, cluster.label)}
              eventHandlers={{ click: () => toggleCollapseArea(cluster.area) }}
            >
              <Tooltip direction="top" offset={[0, -28]}>Click to expand {cluster.area} ({cluster.count} spots)</Tooltip>
            </Marker>
          ))}

          {/* Friend markers */}
          {showFriends && friendsOnMap.map(friend => (
            <Marker
              key={friend.id}
              position={[friend.lat, friend.lng]}
              icon={createFriendIcon(friend.color, friend.name[0])}
              eventHandlers={{ click: () => { setSelectedFriend(friend); setSelectedPlace(null); } }}
            >
              <Tooltip direction="top" offset={[0, -24]}>{friend.emoji} {friend.name}</Tooltip>
            </Marker>
          ))}

          {/* User location */}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
              <Tooltip direction="top" offset={[0, -12]}>Your Location</Tooltip>
            </Marker>
          )}

          <RecenterButton />
        </MapContainer>

        {/* Legend overlay */}
        <div className="absolute bottom-3 left-3 z-[500] bg-[#2a3a1e]/90 backdrop-blur-md rounded-xl px-3 py-2 border border-[#F2E8CF]/15 shadow-sm">
          <div className="flex items-center gap-3 text-[8px] font-bold text-[#F2E8CF]/60">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#546E7A]" /> Spot</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#4CAF50] border border-white" /> Friend</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#1E88E5] border border-white" /> You</span>
            {showBusRoutes && <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-[#2196F3]" /> Bus</span>}
          </div>
        </div>
      </div>

      {/* Selected Place Info Card */}
      <AnimatePresence>
        {selectedPlace && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-4 mt-3 bg-gradient-to-br from-[#1a2e12]/90 to-[#0d1a08]/90 backdrop-blur-xl border border-white/15 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <img src={selectedPlace.image} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white leading-tight">{selectedPlace.name}</h3>
                <p className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                  <MapPin size={9} /> {selectedPlace.city} {"\u00B7"} {selectedPlace.price} {"\u00B7"} {selectedPlace.rating}{"\u2605"}
                </p>
                <p className="text-[10px] text-white/25 mt-0.5">
                  {formatDist(placeDistance)} from Cal Poly
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => navigate(`/event/${selectedPlace.id}`, { state: { from: "/map" } })}
                  className="px-3 py-1.5 bg-[#F5E6D0] text-[#233216] rounded-lg text-[10px] font-bold active:scale-95 transition-transform"
                >View</button>
                <button onClick={() => setSelectedPlace(null)} className="p-1 text-white/30">
                  <X size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Friend Info */}
      <AnimatePresence>
        {selectedFriend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-4 mt-3 bg-gradient-to-br from-[#1a2e12]/90 to-[#0d1a08]/90 backdrop-blur-xl border border-white/15 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 bg-white/10"
                style={{ borderColor: selectedFriend.color, color: selectedFriend.color }}
              >{selectedFriend.name[0]}</div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white">{selectedFriend.name}</h3>
                <p className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                  {selectedFriend.emoji} {selectedFriend.status}
                </p>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => { navigate("/jams", { state: { createWithFriend: selectedFriend.name } }); }}
                  className="px-3 py-1.5 bg-[#F5E6D0] text-[#233216] rounded-lg text-[10px] font-bold active:scale-95 transition-transform"
                >Jam</button>
                <button onClick={() => setSelectedFriend(null)} className="p-1 text-white/30">
                  <X size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsible spot list */}
      <AnimatePresence>
        {showList && !selectedPlace && !selectedFriend && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-4 mt-3"
          >
            <p className="text-[10px] font-bold text-white/25 capitalize tracking-wider mb-2">
              {activeFilter === "Pinned" ? `Pinned Spots (${filteredPlaces.length})` : activeFilter === "All" ? `All Spots (${filteredPlaces.length})` : `${activeFilter} (${filteredPlaces.length})`}
              {activeArea !== "all" && ` · ${areaGroups.find(a => a.id === activeArea)?.label || ""}`}
            </p>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {filteredPlaces.slice(0, 20).map(place => (
                <div
                  key={place.id}
                  onClick={() => { setSelectedPlace(place); setSelectedFriend(null); }}
                  className="flex items-center gap-3 p-2 rounded-lg bg-white/5 active:bg-white/10 transition-colors cursor-pointer"
                >
                  <img src={place.image} className="w-8 h-8 rounded-md object-cover flex-shrink-0" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-white/70 leading-tight">{place.name}</p>
                    <p className="text-[9px] text-white/30">{place.category} {"\u00B7"} {place.price} {"\u00B7"} {place.location}</p>
                  </div>
                  {pinnedIds.includes(place.id) && (
                    <Pin size={10} className="text-[#F2E8CF] flex-shrink-0" fill="currentColor" />
                  )}
                  <div
                    className="w-3 h-3 rounded flex-shrink-0"
                    style={{ backgroundColor: (categorySvgIcons[place.category] || { bg: "#546E7A" }).bg }}
                  />
                </div>
              ))}
              {filteredPlaces.length > 20 && (
                <p className="text-[9px] text-white/20 text-center py-1">+{filteredPlaces.length - 20} more</p>
              )}
            </div>
            {filteredPlaces.length === 0 && (
              <div className="text-center py-6">
                <Pin size={24} className="mx-auto text-white/15 mb-2" />
                <p className="text-xs text-white/30 font-bold">No spots match this filter</p>
                <button onClick={() => { setActiveFilter("All"); setActiveArea("all"); }} className="mt-2 px-4 py-1.5 bg-white/8 rounded-lg text-[10px] font-bold text-white/40">
                  Show All
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick spot count when list is hidden */}
      {!showList && !selectedPlace && !selectedFriend && (
        <div className="px-4 mt-3">
          <button
            onClick={() => setShowList(true)}
            className="w-full py-2.5 bg-white/6 border border-white/10 rounded-xl text-[10px] font-bold text-white/35 flex items-center justify-center gap-2 active:bg-white/10 transition-colors"
          >
            <Layers size={12} /> View {filteredPlaces.length} Spots as List
          </button>
        </div>
      )}

      {/* Bus Route Legend */}
      {showBusRoutes && !selectedPlace && !selectedFriend && (
        <div className="px-4 mt-3">
          <div className="bg-gradient-to-br from-[#1a2e12]/80 to-[#0d1a08]/80 backdrop-blur-xl border border-white/15 rounded-xl p-3">
            <p className="text-[9px] font-bold text-white/30 capitalize tracking-wider mb-2">SLO Transit Routes</p>
            <div className="space-y-1.5">
              {busRoutes.map(route => (
                <div key={route.id} className="flex items-center gap-2.5">
                  <div className="w-4 h-1 rounded-full" style={{ backgroundColor: route.color }} />
                  <p className="text-[10px] font-bold text-white/60">{route.name}</p>
                </div>
              ))}
            </div>
            <a
              href="https://www.slocity.org/government/department-directory/public-works/slo-transit"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 flex items-center gap-1.5 text-[9px] font-bold text-[#64B5F6] bg-[#64B5F6]/10 px-3 py-1.5 rounded-lg border border-[#64B5F6]/15 w-fit"
            >
              <Bus size={10} /> Open Website
            </a>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
