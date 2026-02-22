import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { clsx } from "clsx";
import { places } from "../data/places";
import { apiFetch } from "../../lib/apiClient";
import { listBackendPlans } from "../../lib/api/backend";

import { PageHeader } from "../components/PageHeader";
import { BottomNav } from "../components/BottomNav";
import { 
  Plus, Trash2, MapPin, Clock, ArrowLeft, ArrowRight, ChevronRight, Search, 
  ChevronDown, GripVertical, Shuffle, Pin, Calendar, Users, Pencil, CheckCircle2, 
  Palette, Star, Route, Timer, PartyPopper, Archive, Clipboard, Map, Palmtree, 
  Utensils, Guitar, BookOpen, Car, Tent, Coffee, Film, Music, Umbrella, Briefcase, 
  Dumbbell, Camera, Gamepad2, Ghost, Heart, Plane, Rocket, ShoppingBag, Smartphone, 
  Smile, Sun, Tv, Watch, Zap, Sparkles, X, Menu, Settings, ChevronUp,
  NotebookPen, MoreHorizontal, Eye
} from "lucide-react";

const PLANS_KEY = "polyjarvis_plans";

type EventSource = "custom" | "explore" | "jam" | "pinned" | "random";
type CreateStep = "emoji" | "name" | "datetime" | "events" | "confirm";
type PlanFilter = "all" | "upcoming" | "daily" | "trips";
type DetailTab = "timeline" | "notes" | "settings";

interface PlanEvent {
  id: string;
  name: string;
  location?: string;
  time?: string;
  note?: string;
  source: EventSource;
  sourceId?: string;
  icon?: string;
  completed?: boolean;
}

interface Plan {
  id: string;
  name: string;
  icon: string;
  date?: string;
  type?: "trip" | "daily" | "event";
  events: PlanEvent[];
  shareCode: string;
  createdAt: string;
  notes?: string;
  color?: string;
}

// Icon mapping
const iconMap: Record<string, any> = {
  "Clipboard": Clipboard, "Map": Map, "PartyPopper": PartyPopper, "Palmtree": Palmtree,
  "Utensils": Utensils, "Guitar": Guitar, "BookOpen": BookOpen, "Car": Car, "Tent": Tent,
  "Coffee": Coffee, "Film": Film, "Music": Music, "Umbrella": Umbrella, "Briefcase": Briefcase,
  "Dumbbell": Dumbbell, "Camera": Camera, "Gamepad2": Gamepad2, "Ghost": Ghost, "Heart": Heart,
  "Plane": Plane, "Rocket": Rocket, "ShoppingBag": ShoppingBag, "Smartphone": Smartphone,
  "Smile": Smile, "Sun": Sun, "Tv": Tv, "Watch": Watch, "Zap": Zap, "Star": Star, "Calendar": Calendar,
  "Users": Users, "MapPin": MapPin,
};

const RenderIcon = ({ name, size = 18, className }: { name: string, size?: number, className?: string }) => {
  const Icon = iconMap[name] || Star;
  return <Icon size={size} className={className} />;
};

const planIcons = Object.keys(iconMap);

const planTypes = [
  { id: "event" as const, label: "Event", icon: "PartyPopper", desc: "Plan an occasion", color: "from-rose-400/10 to-rose-900/5 border-rose-400/12" },
  { id: "daily" as const, label: "Daily", icon: "Calendar", desc: "Organize your day", color: "from-slate-400/10 to-slate-800/5 border-slate-400/12" },
  { id: "trip" as const, label: "Adventure", icon: "Map", desc: "Plan a trip", color: "from-[#F2E8CF]/10 to-[#F2E8CF]/5 border-[#F2E8CF]/12" },
];

const typeThemes: Record<string, { accent: string; bg: string; border: string; badge: string }> = {
  trip: { accent: "text-[#F2E8CF]", bg: "bg-[#F2E8CF]/10", border: "border-[#F2E8CF]/15", badge: "bg-[#F2E8CF]/12 text-[#F2E8CF] border-[#F2E8CF]/20" },
  daily: { accent: "text-slate-300", bg: "bg-slate-400/8", border: "border-slate-400/12", badge: "bg-slate-400/10 text-slate-300 border-slate-400/18" },
  event: { accent: "text-rose-300", bg: "bg-rose-400/8", border: "border-rose-400/12", badge: "bg-rose-400/10 text-rose-300 border-rose-400/18" },
};
const defaultTheme = { accent: "text-[#F2E8CF]", bg: "bg-[#F2E8CF]/10", border: "border-[#F2E8CF]/15", badge: "bg-[#F2E8CF]/15 text-[#F2E8CF] border-[#F2E8CF]/25" };
const getTheme = (type?: string) => typeThemes[type || ""] || defaultTheme;

const cinematicLabels: Record<string, string> = { trip: "Adventure", daily: "Schedule", event: "Event" };

// ─── Plan templates for Jarvis-initiated creation ─────────────────────────────
const planTemplates: Record<string, { name: string; icon: string; type: "trip" | "daily" | "event"; events: Omit<PlanEvent, "id">[] }> = {
  "Create Pismo Plan": {
    name: "Pismo Day Trip", icon: "Palmtree", type: "trip",
    events: [
      { name: "Get Zipcar / carpool", location: "Grand Ave Parking Structure", time: "9:30 AM", source: "custom", icon: "Car" },
      { name: "Pismo Beach Pier", location: "Pismo Beach, CA", time: "10:30 AM", source: "explore", icon: "Palmtree" },
      { name: "Lunch at Splash Cafe", location: "Splash Cafe, Pismo", time: "12:00 PM", source: "custom", icon: "Utensils" },
      { name: "Boardwalk & tide pools", location: "Shell Beach area", time: "1:30 PM", source: "custom", icon: "Star" },
      { name: "Golden hour on the sand", location: "Pismo Beach", time: "4:30 PM", source: "custom", icon: "Sun" },
      { name: "Drive home", location: "SLO", time: "6:00 PM", source: "custom", icon: "Car" },
    ],
  },
  "Create Morro Bay Plan": {
    name: "Morro Bay Adventure", icon: "Map", type: "trip",
    events: [
      { name: "Drive up Highway 1", location: "SLO → Morro Bay", time: "10:00 AM", source: "custom", icon: "Car" },
      { name: "Walk the Embarcadero", location: "Morro Bay Embarcadero", time: "10:30 AM", source: "custom", icon: "Star" },
      { name: "Kayak the harbor", location: "Rock Kayak Company", time: "11:30 AM", source: "custom", icon: "Palmtree" },
      { name: "Fish tacos at Giovanni's", location: "Giovanni's Fish Market", time: "1:00 PM", source: "custom", icon: "Utensils" },
      { name: "Walk to Morro Rock", location: "Morro Rock Beach", time: "2:30 PM", source: "custom", icon: "Camera" },
      { name: "Head home via Los Osos", location: "Los Osos", time: "4:30 PM", source: "custom", icon: "Car" },
    ],
  },
  "Create Avila Plan": {
    name: "Avila Beach Day", icon: "Palmtree", type: "trip",
    events: [
      { name: "Drive to Avila", location: "SLO → Avila Beach", time: "10:00 AM", source: "custom", icon: "Car" },
      { name: "Walk the boardwalk", location: "Avila Beach Boardwalk", time: "10:20 AM", source: "custom", icon: "Star" },
      { name: "Bob Jones Trail", location: "Avila Beach Drive", time: "11:00 AM", source: "custom", icon: "MapPin" },
      { name: "Fish & chips at Custom House", location: "Custom House, Avila", time: "12:30 PM", source: "custom", icon: "Utensils" },
      { name: "Beach time", location: "Avila Beach", time: "1:30 PM", source: "custom", icon: "Palmtree" },
      { name: "Avila Hot Springs", location: "Avila Hot Springs", time: "3:30 PM", source: "custom", icon: "Heart" },
    ],
  },
  "Create Paso Plan": {
    name: "Paso Robles Wine Day", icon: "Star", type: "trip",
    events: [
      { name: "Drive to Paso Robles", location: "SLO → Paso Robles", time: "10:00 AM", source: "custom", icon: "Car" },
      { name: "Coffee at Spearhead", location: "Downtown Paso", time: "10:30 AM", source: "custom", icon: "Coffee" },
      { name: "Eberle Winery tasting", location: "Eberle Winery", time: "11:30 AM", source: "custom", icon: "Star" },
      { name: "Lunch at The Hatch", location: "The Hatch Rotisserie", time: "1:00 PM", source: "custom", icon: "Utensils" },
      { name: "BarrelHouse Brewing", location: "BarrelHouse Brewing", time: "2:30 PM", source: "custom", icon: "Coffee" },
      { name: "Sunset drive home", location: "101 South", time: "5:00 PM", source: "custom", icon: "Car" },
    ],
  },
  "Create Cambria Plan": {
    name: "Cambria Day Trip", icon: "Camera", type: "trip",
    events: [
      { name: "Drive Highway 1 north", location: "SLO → Cambria", time: "9:00 AM", source: "custom", icon: "Car" },
      { name: "Moonstone Beach boardwalk", location: "Moonstone Beach", time: "10:00 AM", source: "custom", icon: "Palmtree" },
      { name: "Explore the village", location: "Cambria Village", time: "11:30 AM", source: "custom", icon: "ShoppingBag" },
      { name: "Lunch at Robin's", location: "Robin's Restaurant", time: "12:30 PM", source: "custom", icon: "Utensils" },
      { name: "Elephant Seal Rookery", location: "San Simeon", time: "2:30 PM", source: "custom", icon: "Camera" },
      { name: "Drive home", location: "Highway 1 South", time: "4:30 PM", source: "custom", icon: "Car" },
    ],
  },
  "Create Cayucos Plan": {
    name: "Cayucos Beach Day", icon: "Palmtree", type: "trip",
    events: [
      { name: "Drive to Cayucos", location: "SLO → Cayucos", time: "10:00 AM", source: "custom", icon: "Car" },
      { name: "Walk the pier", location: "Cayucos Pier", time: "10:30 AM", source: "custom", icon: "Star" },
      { name: "Brown Butter Cookie Co.", location: "Cayucos", time: "11:00 AM", source: "custom", icon: "Coffee" },
      { name: "Beach time", location: "Cayucos Beach", time: "11:30 AM", source: "custom", icon: "Palmtree" },
      { name: "Fish tacos at Ruddell's", location: "Ruddell's Smokehouse", time: "1:00 PM", source: "custom", icon: "Utensils" },
      { name: "Estero Bluffs walk", location: "Estero Bluffs State Park", time: "2:30 PM", source: "custom", icon: "MapPin" },
    ],
  },
  "Create Los Osos Plan": {
    name: "Los Osos & Montaña de Oro", icon: "Map", type: "trip",
    events: [
      { name: "Drive to Montaña de Oro", location: "SLO → Los Osos", time: "9:00 AM", source: "custom", icon: "Car" },
      { name: "Bluff Trail hike", location: "Montaña de Oro", time: "9:30 AM", source: "custom", icon: "MapPin" },
      { name: "Spooner's Cove tide pools", location: "Spooner's Cove", time: "11:30 AM", source: "custom", icon: "Palmtree" },
      { name: "Lunch at Celia's Garden", location: "Celia's Garden Café", time: "12:30 PM", source: "custom", icon: "Utensils" },
      { name: "Elfin Forest boardwalk", location: "Los Osos Elfin Forest", time: "2:00 PM", source: "custom", icon: "MapPin" },
    ],
  },
  "Create Arroyo Grande Plan": {
    name: "Arroyo Grande Village Day", icon: "Star", type: "trip",
    events: [
      { name: "Drive to AG Village", location: "SLO → Arroyo Grande", time: "10:00 AM", source: "custom", icon: "Car" },
      { name: "Walk Branch Street", location: "Branch Street, AG", time: "10:30 AM", source: "custom", icon: "ShoppingBag" },
      { name: "Doc Burnstein's ice cream", location: "Doc Burnstein's", time: "11:00 AM", source: "custom", icon: "Coffee" },
      { name: "Swinging Bridge photo", location: "Swinging Bridge", time: "11:30 AM", source: "custom", icon: "Camera" },
      { name: "Talley Vineyards tasting", location: "Talley Vineyards", time: "1:00 PM", source: "custom", icon: "Star" },
    ],
  },
  "Create Shell Beach Plan": {
    name: "Shell Beach & Tidepools", icon: "Palmtree", type: "trip",
    events: [
      { name: "Drive to Shell Beach", location: "SLO → Shell Beach", time: "10:00 AM", source: "custom", icon: "Car" },
      { name: "Tidepool exploring", location: "Shell Beach cliffs", time: "10:30 AM", source: "custom", icon: "Palmtree" },
      { name: "Dinosaur Caves Park", location: "Dinosaur Caves Park", time: "11:30 AM", source: "custom", icon: "Star" },
      { name: "Lunch at Zorro's", location: "Zorro's Cafe", time: "12:30 PM", source: "custom", icon: "Utensils" },
      { name: "Sunset from the bluffs", location: "Shell Beach Road", time: "4:30 PM", source: "custom", icon: "Camera" },
    ],
  },
  "Create Atascadero Plan": {
    name: "Atascadero Day Out", icon: "Map", type: "trip",
    events: [
      { name: "Drive to Atascadero", location: "SLO → Atascadero", time: "10:00 AM", source: "custom", icon: "Car" },
      { name: "Charles Paddock Zoo", location: "Charles Paddock Zoo", time: "10:30 AM", source: "custom", icon: "Star" },
      { name: "Burgers at Sylvester's", location: "Sylvester's Burgers", time: "12:00 PM", source: "custom", icon: "Utensils" },
      { name: "Jim Green Trail hike", location: "Heilmann Regional Park", time: "1:30 PM", source: "custom", icon: "MapPin" },
      { name: "Bristols Cider House", location: "Bristols Cider", time: "3:30 PM", source: "custom", icon: "Coffee" },
    ],
  },
  "Create Oceano Plan": {
    name: "Oceano Dunes Trip", icon: "Palmtree", type: "trip",
    events: [
      { name: "Drive to Oceano", location: "SLO → Oceano", time: "10:00 AM", source: "custom", icon: "Car" },
      { name: "Explore the dunes", location: "Oceano Dunes", time: "10:30 AM", source: "custom", icon: "Palmtree" },
      { name: "Beach walk at the Preserve", location: "Oceano Dunes Preserve", time: "12:00 PM", source: "custom", icon: "MapPin" },
      { name: "Taco truck lunch", location: "Grand Ave, Grover Beach", time: "1:30 PM", source: "custom", icon: "Utensils" },
      { name: "Figueroa Mountain taproom", location: "Grover Beach", time: "2:30 PM", source: "custom", icon: "Coffee" },
    ],
  },
};

const initialPlans: Plan[] = [];

function mapBackendPlanToUi(plan: any): Plan {
  const client = plan?.client_plan_payload || plan?.constraints_json?.client_plan_payload || {};
  const events = Array.isArray(client?.events) ? client.events : [];
  return {
    id: String(plan?.id || Date.now().toString()),
    name: String(client?.name || plan?.title || "Plan"),
    icon: String(client?.icon || "Clipboard"),
    date: client?.date || undefined,
    type: (client?.type || "event") as "trip" | "daily" | "event",
    events: events.map((event: any, index: number) => ({
      id: String(event?.id || `${plan?.id || "plan"}-evt-${index}`),
      name: String(event?.name || "Plan item"),
      location: event?.location || undefined,
      time: event?.time || undefined,
      note: event?.note || undefined,
      source: (event?.source || "custom") as EventSource,
      sourceId: event?.sourceId || undefined,
      icon: event?.icon || "Star",
      completed: Boolean(event?.completed),
    })),
    shareCode: String(plan?.id || "").slice(0, 8).toUpperCase() || "PLAN",
    createdAt: plan?.created_at ? new Date(plan.created_at).toLocaleDateString() : "Just now",
    notes: client?.notes || undefined,
  };
}

export function Plans() {
  const navigate = useNavigate();
  const location = useLocation();
  const [plans, setPlans] = useState<Plan[]>(() => {
    try {
      const saved = localStorage.getItem(PLANS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialPlans;
  });
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const [detailTab, setDetailTab] = useState<DetailTab>("timeline");

  // Create wizard state
  const [createStep, setCreateStep] = useState<CreateStep>("emoji");
  const [newIcon, setNewIcon] = useState("Clipboard");
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newType, setNewType] = useState<"trip" | "daily" | "event">("event");
  const [newEvents, setNewEvents] = useState<PlanEvent[]>([]);
  const [eventSearch, setEventSearch] = useState("");

  // Add event state
  const [eventSource, setEventSource] = useState<EventSource>("random");
  const [eventName, setEventName] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventNote, setEventNote] = useState("");
  const [eventIcon, setEventIcon] = useState("Star");

  // Edit states
  const [editingPlanName, setEditingPlanName] = useState(false);
  const [editPlanNameValue, setEditPlanNameValue] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [editNotesValue, setEditNotesValue] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  }, [plans]);

  const refreshPlansFromBackend = useCallback(async () => {
    setPlansLoading(true);
    try {
      const response = await listBackendPlans();
      const rows = Array.isArray(response?.plans) ? response.plans : [];
      if (rows.length > 0) {
        setPlans(rows.map(mapBackendPlanToUi));
      } else {
        setPlans([]);
      }
    } catch {
      // Offline fallback from local cache
      try {
        const saved = localStorage.getItem(PLANS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setPlans(parsed);
        }
      } catch {
        setPlans([]);
      }
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPlansFromBackend();
    const interval = window.setInterval(refreshPlansFromBackend, 10000);
    return () => window.clearInterval(interval);
  }, [refreshPlansFromBackend]);

  // Handle incoming state (including Jarvis plan templates and Jam imports)
  const processedPlanState = useRef<string | null>(null);
  useEffect(() => {
    if (processedPlanState.current === location.key) return;
    const state = location.state as { startCreate?: boolean; planTemplate?: string; fromJam?: { id: string; name: string; events?: { id: string; name: string; placeId?: string }[] }; withFriend?: string } | null;
    if (state?.startCreate) {
      processedPlanState.current = location.key;
      const templateKey = state.planTemplate;
      if (templateKey && planTemplates[templateKey]) {
        startCreateWithTemplate(templateKey);
      } else if (state.fromJam) {
        // Import events from a Jam
        const jamEvents: PlanEvent[] = (state.fromJam.events || []).map((e, i) => ({
          id: `jam-${Date.now()}-${i}`,
          name: e.name,
          source: "jam" as EventSource,
          sourceId: e.placeId || e.id,
          icon: "Users",
          location: undefined,
        }));
        setNewIcon("Users");
        setNewName(state.fromJam.name);
        setNewDate("");
        setNewType("event");
        setNewEvents(jamEvents);
        setEventSearch("");
        setCreateStep("events");
        setView("create");
        toast.success(`Imported ${jamEvents.length} spots from "${state.fromJam.name}"`);
      } else if (state.withFriend) {
        // Pre-populate plan with a friend's name
        setNewIcon("Users");
        setNewName(`Plan with ${state.withFriend}`);
        setNewDate("");
        setNewType("event");
        setNewEvents([{
          id: `friend-${Date.now()}`,
          name: `Meet up with ${state.withFriend}`,
          source: "custom" as EventSource,
          icon: "Users",
        }]);
        setEventSearch("");
        setCreateStep("name");
        setView("create");
        toast.success(`Creating plan with ${state.withFriend}`);
      } else {
        startCreate();
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.key]);

  const generateCode = () => {
    const words = ["PLAN", "TRIP", "OUTING", "ROUTE"];
    return `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(Math.random() * 99) + 1}`;
  };

  const generateName = () => {
    const names = [
      "SLO Adventure", "Weekend Vibes", "Coffee Crawl", "Beach Day", 
      "Hiking Trip", "Downtown Roam", "Study Grind", "Foodie Tour",
      "Saturday Funday", "Campus Loop", "Night Out", "Sunset Chasing"
    ];
    setNewName(names[Math.floor(Math.random() * names.length)]);
  };

  const searchedPlaces = useMemo(() => {
    if (!eventSearch.trim()) return places.slice(0, 10);
    const q = eventSearch.toLowerCase();
    return places.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [eventSearch]);

  // Filtered plans
  const filteredPlans = useMemo(() => {
    if (planFilter === "all") return plans;
    if (planFilter === "trips") return plans.filter(p => p.type === "trip");
    if (planFilter === "daily") return plans.filter(p => p.type === "daily");
    if (planFilter === "upcoming") return plans.filter(p => p.date);
    return plans;
  }, [plans, planFilter]);

  // Create wizard
  const startCreate = () => {
    setCreateStep("emoji");
    setNewIcon("Clipboard");
    setNewName("");
    setNewDate("");
    setNewType("event");
    setNewEvents([]);
    setEventSearch("");
    setEventSource("random");
    setView("create");
  };

  // Create wizard pre-populated from a Jarvis template
  const startCreateWithTemplate = (templateKey: string) => {
    const template = planTemplates[templateKey];
    if (!template) { startCreate(); return; }
    const hydratedEvents: PlanEvent[] = template.events.map((e, i) => ({
      ...e,
      id: `tmpl-${Date.now()}-${i}`,
    }));
    setNewIcon(template.icon);
    setNewName(template.name);
    setNewDate("");
    setNewType(template.type);
    setNewEvents(hydratedEvents);
    setEventSearch("");
    // Skip to events step so user can review pre-populated stops
    setCreateStep("events");
    setView("create");
    toast.success(`Template loaded: ${template.name}`);
  };

  const finishCreate = async () => {
    if (!newName.trim()) return;
    const plan: Plan = {
      id: Date.now().toString(),
      name: newName,
      icon: newIcon,
      date: newDate || undefined,
      type: newType,
      events: newEvents,
      shareCode: generateCode(),
      createdAt: "Just now",
    };
    try {
      const created = await apiFetch("/api/plans", {
        method: "POST",
        body: {
          title: plan.name,
          constraints: {
            client_plan_payload: {
              name: plan.name,
              icon: plan.icon,
              date: plan.date || null,
              type: plan.type || "event",
              events: plan.events
            },
            weather: "clear",
            timeOfDay: "evening"
          }
        }
      });
      const backendPlan = created?.plan || null;
      if (backendPlan) {
        const mapped = mapBackendPlanToUi(backendPlan);
        setPlans((prev) => [mapped, ...prev.filter((item) => item.id !== mapped.id)]);
        setSelectedPlan(mapped);
      } else {
        setPlans([plan, ...plans]);
        setSelectedPlan(plan);
      }
      setView("detail");
      setDetailTab("timeline");
      toast.success(`"${plan.name}" created!`);
      refreshPlansFromBackend();
    } catch (error) {
      setPlans([plan, ...plans]);
      setSelectedPlan(plan);
      setView("detail");
      setDetailTab("timeline");
      toast.success(`"${plan.name}" created!`);
      const message = error instanceof Error ? error.message : "Could not sync plan to backend.";
      toast.error(`Saved locally only: ${message}`);
    }
  };

  const addRandomEvent = () => {
    const randomPlace = places[Math.floor(Math.random() * places.length)];
    const evt: PlanEvent = { 
      id: Date.now().toString(), 
      name: randomPlace.name, 
      source: "explore", 
      sourceId: randomPlace.id, 
      location: randomPlace.city, 
      icon: "MapPin" 
    };

    if (view === "create") {
      setNewEvents([...newEvents, evt]);
      toast.success(`Random pick: ${randomPlace.name}`);
    } else if (selectedPlan) {
      const updated = plans.map(p => p.id === selectedPlan.id ? { ...p, events: [...p.events, evt] } : p);
      setPlans(updated);
      setSelectedPlan({ ...selectedPlan, events: [...selectedPlan.events, evt] });
      toast.success(`Added ${randomPlace.name}`);
    }
  };

  const handleAddEvent = () => {
    let newEvent: PlanEvent;
    if (eventSource === "custom") {
      if (!eventName.trim()) return;
      newEvent = { id: Date.now().toString(), name: eventName, location: eventLocation || undefined, time: eventTime || undefined, note: eventNote || undefined, source: "custom", icon: eventIcon };
    } else {
      return;
    }

    if (view === "create") {
      setNewEvents([...newEvents, newEvent]);
    } else if (selectedPlan) {
      const updated = plans.map(p => p.id === selectedPlan.id ? { ...p, events: [...p.events, newEvent] } : p);
      setPlans(updated);
      setSelectedPlan(prev => prev ? { ...prev, events: [...prev.events, newEvent] } : null);
    }
    setEventName(""); setEventLocation(""); setEventTime(""); setEventNote(""); setEventIcon("Star");
    setShowAddEvent(false);
    toast.success("Stop added!");
  };

  const handleDeletePlan = (planId: string) => {
    setPlans(plans.filter(p => p.id !== planId));
    setSelectedPlan(null);
    setView("list");
    toast.success("Plan deleted.");
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!selectedPlan) return;
    const updatedEvents = selectedPlan.events.filter(e => e.id !== eventId);
    const updatedPlan = { ...selectedPlan, events: updatedEvents };
    setPlans(plans.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
    toast.success("Stop removed.");
  };

  const toggleEventComplete = (eventId: string) => {
    if (!selectedPlan) return;
    const updatedEvents = selectedPlan.events.map(e => e.id === eventId ? { ...e, completed: !e.completed } : e);
    const updatedPlan = { ...selectedPlan, events: updatedEvents };
    setPlans(plans.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
  };

  const moveEvent = (eventId: string, direction: "up" | "down") => {
    if (!selectedPlan) return;
    const idx = selectedPlan.events.findIndex(e => e.id === eventId);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === selectedPlan.events.length - 1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    const events = [...selectedPlan.events];
    [events[idx], events[newIdx]] = [events[newIdx], events[idx]];
    const updatedPlan = { ...selectedPlan, events };
    setPlans(plans.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
  };

  const savePlanName = () => {
    if (!selectedPlan || !editPlanNameValue.trim()) return;
    const updatedPlan = { ...selectedPlan, name: editPlanNameValue };
    setPlans(plans.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
    setEditingPlanName(false);
    toast.success("Plan name updated");
  };

  const savePlanNotes = () => {
    if (!selectedPlan) return;
    const updatedPlan = { ...selectedPlan, notes: editNotesValue || undefined };
    setPlans(plans.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
    setEditingNotes(false);
    toast.success("Notes saved");
  };

  const changePlanIcon = (icon: string) => {
    if (!selectedPlan) return;
    const updatedPlan = { ...selectedPlan, icon };
    setPlans(plans.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
    setShowIconPicker(false);
    toast.success("Icon updated");
  };



  const completedCount = selectedPlan?.events.filter(e => e.completed).length || 0;
  const totalCount = selectedPlan?.events.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const filterTabs: { id: PlanFilter; label: string; icon: any }[] = [
    { id: "all", label: "All", icon: Clipboard },
    { id: "upcoming", label: "Upcoming", icon: Calendar },
    { id: "trips", label: "Trips", icon: Map },
    { id: "daily", label: "Daily", icon: Clock },
  ];

  return (
    <div className="min-h-[100dvh] bg-transparent text-white pb-24 flex flex-col overflow-x-hidden font-[system-ui]">
      <PageHeader />

      <AnimatePresence mode="wait">
        {/* ═══ LIST VIEW ═══ */}
        {view === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-5 pt-2 flex-1"
          >
            {/* Inline header with back */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-white/40 text-xs font-semibold hover:text-white transition-colors">
                <ArrowLeft size={14} /> Home
              </button>
              <div className="text-center">
                <h1 className="text-base font-extrabold text-white">My Plans</h1>
                <p className="text-[10px] text-[#F2E8CF]/60 font-semibold">{plansLoading ? "Syncing..." : `${plans.length} plans`}</p>
              </div>
              <div className="w-14" /> {/* Spacer for centering */}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
              {filterTabs.map(f => {
                const FIcon = f.icon;
                return (
                  <button key={f.id} onClick={() => setPlanFilter(f.id)}
                    className={clsx("flex-shrink-0 px-3 py-2 rounded-xl text-[10px] font-semibold tracking-wider transition-all flex items-center gap-1.5",
                      planFilter === f.id ? "bg-[#F2E8CF] text-[#233216]" : "bg-white/8 text-white/35 border border-white/10"
                    )}
                  >
                    <FIcon size={11} /> {f.label}
                  </button>
                );
              })}
            </div>

            {/* Create button */}
            <button onClick={startCreate}
              className="w-full py-3.5 bg-[#F2E8CF] text-[#233216] rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#F2E8CF]/15 active:scale-[0.97] transition-transform mb-4"
            >
              <Plus size={16} /> New Plan
            </button>

            {filteredPlans.length === 0 ? (
              <div className="text-center py-16 px-6">
                <Clipboard size={48} strokeWidth={1} className="mx-auto text-white/15 mb-3" />
                <h3 className="text-lg font-semibold text-white/50 mb-1">{planFilter === "all" ? "No plans yet" : "No matching plans"}</h3>
                <p className="text-sm text-white/25 mb-5">{planFilter === "all" ? "Create a plan to organize your day or trip." : "Try a different filter."}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPlans.map(plan => {
                  const theme = getTheme(plan.type);
                  const completed = plan.events.filter(e => e.completed).length;
                  const total = plan.events.length;
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                  return (
                    <motion.div key={plan.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="bg-[#1a2e12]/80 border border-white/10 rounded-xl overflow-hidden active:scale-[0.98] transition-transform cursor-pointer shadow-md"
                      onClick={() => { setSelectedPlan(plan); setView("detail"); setDetailTab("timeline"); }}
                    >
                      {/* Top color bar */}
                      <div className={clsx("h-1", theme.bg)} style={{ width: `${Math.max(pct, 8)}%`, transition: "width 0.3s" }} />
                      
                      <div className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border", theme.bg, theme.border)}>
                            <RenderIcon name={plan.icon} size={22} className={theme.accent} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white text-base truncate">{plan.name}</h3>
                              {plan.type && (
                                <span className={clsx("text-[8px] font-semibold px-1.5 py-0.5 rounded-full border capitalize flex-shrink-0", theme.badge)}>
                                  {cinematicLabels[plan.type] || plan.type}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {plan.date && <span className="text-[11px] text-white/40 flex items-center gap-1"><Calendar size={9} /> {plan.date}</span>}
                              <span className="text-[11px] text-white/25">&middot;</span>
                              <span className={clsx("text-[11px] font-semibold", theme.accent)}>{total} stops</span>
                              {completed > 0 && (
                                <>
                                  <span className="text-[11px] text-white/25">&middot;</span>
                                  <span className="text-[11px] text-green-400/70 font-semibold">{completed}/{total} done</span>
                                </>
                              )}
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-white/20" />
                        </div>
                        
                        {/* Event preview chips */}
                        {total > 0 && (
                          <div className="mt-2.5 flex gap-1.5 overflow-hidden">
                            {plan.events.slice(0, 4).map(e => (
                              <span key={e.id} className={clsx(
                                "text-[10px] px-2 py-1 rounded-full truncate max-w-[100px] font-medium border flex items-center gap-1",
                                e.completed ? "bg-green-400/10 text-green-400/60 border-green-400/15 line-through" : "bg-white/8 text-white/50 border-white/8"
                              )}>
                                <RenderIcon name={e.icon || "MapPin"} size={9} className="opacity-70 flex-shrink-0" /> {e.name}
                              </span>
                            ))}
                            {total > 4 && <span className="text-[10px] text-white/30 self-center font-semibold">+{total - 4}</span>}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ CREATE WIZARD ═══ */}
        {view === "create" && (
          <motion.div
            key="create"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-5 flex-1 flex flex-col"
          >
            {/* Back */}
            <div className="flex items-center justify-between pt-2 mb-3">
              <button onClick={() => setView("list")} className="flex items-center gap-1.5 text-white/40 text-xs font-semibold hover:text-white transition-colors">
                <ArrowLeft size={14} /> Cancel
              </button>
              {/* Progress dots */}
              <div className="flex gap-1.5">
                {(["emoji", "name", "datetime", "events"] as CreateStep[]).map((s, i) => (
                  <div key={s} className={clsx("h-1.5 rounded-full transition-all", 
                    s === createStep ? "w-5 bg-[#F2E8CF]" : 
                    (["emoji", "name", "datetime", "events"].indexOf(createStep) > i ? "w-2.5 bg-[#F2E8CF]/40" : "w-2.5 bg-white/10")
                  )} />
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {/* Step 1: Type + Icon */}
                {createStep === "emoji" && (
                  <motion.div key="emoji" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="bg-[#1a2e12]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5 shadow-2xl"
                  >
                    <p className="text-[10px] text-white/30 capitalize tracking-wider font-semibold mb-1">Step 1 of 4</p>
                    <h2 className="text-2xl font-bold text-white mb-1">What kind of plan?</h2>
                    <p className="text-sm text-white/40 mb-5">Pick a type and give it a vibe.</p>

                    <div className="grid grid-cols-3 gap-2 mb-5">
                      {planTypes.map(t => (
                        <button key={t.id} onClick={() => setNewType(t.id)}
                          className={clsx("p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 text-center active:scale-95",
                            newType === t.id ? "bg-[#F2E8CF]/15 border-[#F2E8CF] scale-[1.02]" : "bg-white/5 border-white/10"
                          )}>
                          <RenderIcon name={t.icon} size={22} className={newType === t.id ? "text-[#F2E8CF]" : "text-white/50"} />
                          <p className={clsx("text-[9px] font-semibold capitalize", newType === t.id ? "text-[#F2E8CF]" : "text-white/50")}>{t.label}</p>
                        </button>
                      ))}
                    </div>

                    <p className="text-[10px] font-semibold text-white/30 capitalize tracking-wider mb-2">Choose an icon</p>
                    <div className="flex flex-wrap gap-1.5 mb-5 max-h-[120px] overflow-y-auto">
                      {planIcons.map(e => (
                        <button key={e} onClick={() => setNewIcon(e)} className={clsx("w-9 h-9 rounded-lg flex items-center justify-center transition-all", newIcon === e ? "bg-[#F2E8CF] scale-110 shadow-lg" : "bg-white/10")}>
                          <RenderIcon name={e} size={18} className={newIcon === e ? "text-[#233216]" : "text-white/70"} />
                        </button>
                      ))}
                    </div>

                    <button onClick={() => setCreateStep("name")} className="w-full py-3 bg-[#F2E8CF] text-[#233216] rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.97] transition-transform">
                      Next <ArrowRight size={16} />
                    </button>
                  </motion.div>
                )}

                {/* Step 2: Name */}
                {createStep === "name" && (
                  <motion.div key="name" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="bg-[#1a2e12]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5 shadow-2xl"
                  >
                    <p className="text-[10px] text-white/30 capitalize tracking-wider font-semibold mb-1">Step 2 of 4</p>
                    <h2 className="text-2xl font-bold text-white mb-1">Name your plan</h2>
                    <p className="text-sm text-white/40 mb-6">Make it memorable.</p>

                    <div className="flex justify-center mb-5">
                      <div className="w-16 h-16 rounded-2xl bg-[#F2E8CF]/15 border-2 border-[#F2E8CF]/30 flex items-center justify-center">
                        <RenderIcon name={newIcon} size={32} className="text-[#F2E8CF]" />
                      </div>
                    </div>

                    <div className="flex gap-2 mb-5">
                       <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Pismo Day Trip"
                         className="flex-1 bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-base text-white placeholder:text-white/25 focus:outline-none focus:border-[#F2E8CF]/40 font-bold tracking-wide"
                         autoFocus
                       />
                       <button onClick={generateName} className="px-3 bg-white/10 border border-white/15 rounded-xl text-[#F2E8CF] active:scale-95 transition-transform" title="Generate Name">
                          <Sparkles size={20} />
                       </button>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => setCreateStep("emoji")} className="flex-1 py-3 text-white/30 font-semibold rounded-xl border border-white/10 bg-white/5 active:scale-[0.97] transition-transform">Back</button>
                      <button onClick={() => setCreateStep("datetime")} disabled={!newName.trim()}
                        className="flex-1 py-3 bg-[#F2E8CF] text-[#233216] rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-40 active:scale-[0.97] transition-transform">
                        Next <ArrowRight size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Date */}
                {createStep === "datetime" && (
                  <motion.div key="datetime" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="bg-[#1a2e12]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5 shadow-2xl"
                  >
                    <p className="text-[10px] text-white/30 capitalize tracking-wider font-semibold mb-1">Step 3 of 4</p>
                    <h2 className="text-2xl font-bold text-white mb-1">When?</h2>
                    <p className="text-sm text-white/40 mb-6">Set a date for your plan.</p>

                    <div className="mb-6 min-w-0">
                      <label className="text-[10px] font-semibold text-[#F2E8CF]/50 capitalize tracking-wider block mb-2 flex items-center gap-1.5"><Calendar size={10} /> Date</label>
                      <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                        className="w-full max-w-full min-w-0 overflow-hidden bg-white/10 border border-white/15 rounded-xl px-3 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-[#F2E8CF]/40 [color-scheme:dark] [appearance:none] [-webkit-appearance:none]"
                        style={{ boxSizing: "border-box" }}
                      />
                    </div>

                    <p className="text-[10px] text-white/25 text-center mb-5 italic">You can skip this and set it later.</p>

                    <div className="flex gap-3">
                      <button onClick={() => setCreateStep("name")} className="flex-1 py-3 text-white/30 font-semibold rounded-xl border border-white/10 bg-white/5 active:scale-[0.97] transition-transform">Back</button>
                      <button onClick={() => setCreateStep("events")} className="flex-1 py-3 bg-[#F2E8CF] text-[#233216] rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.97] transition-transform">
                        Next <ArrowRight size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Add Events */}
                {createStep === "events" && (
                  <motion.div key="events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="bg-[#1a2e12]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5 shadow-2xl max-h-[75vh] flex flex-col"
                  >
                    <p className="text-[10px] text-white/30 capitalize tracking-wider font-semibold mb-1">Step 4 of 4</p>
                    <h2 className="text-2xl font-bold text-white mb-1">Add stops</h2>
                    <p className="text-sm text-white/40 mb-3">Pick from your pinned spots, jams, or add custom.</p>

                    <div className="flex gap-1.5 mb-3">
                      <button onClick={() => setEventSource("random")} className={clsx("flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-semibold transition-all active:scale-95", eventSource === "random" ? "bg-[#c4a46c] text-[#233216] border border-[#c4a46c]" : "bg-[#c4a46c]/12 border border-[#c4a46c]/18 text-[#c4a46c]")}>
                        <Shuffle size={12} /> Random
                      </button>
                      <button onClick={() => setEventSource("jam")} className={clsx("flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-semibold transition-all active:scale-95", eventSource === "jam" ? "bg-[#F2E8CF] text-[#233216] border border-[#F2E8CF]" : "bg-white/5 border border-white/10 text-white/40")}>
                        <Users size={12} /> Jams
                      </button>
                      <button onClick={() => setEventSource("pinned")} className={clsx("flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-semibold transition-all active:scale-95", eventSource === "pinned" ? "bg-[#F2E8CF] text-[#233216] border border-[#F2E8CF]" : "bg-white/5 border border-white/10 text-white/40")}>
                        <Pin size={12} /> Pinned
                      </button>
                      <button onClick={() => setEventSource("custom")} className={clsx("flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-semibold transition-all active:scale-95", eventSource === "custom" ? "bg-[#F2E8CF] text-[#233216] border border-[#F2E8CF]" : "bg-white/5 border border-white/10 text-white/40")}>
                        <Plus size={12} /> Custom
                      </button>
                    </div>

                    {/* Tab content area */}
                    <div className="flex-1 overflow-y-auto max-h-[140px] mb-3">
                      {/* RANDOM TAB */}
                      {eventSource === "random" && (() => {
                        const randomPicks = places.sort(() => Math.random() - 0.5).slice(0, 6);
                        return (
                          <div className="space-y-1">
                            <p className="text-[9px] text-[#c4a46c]/60 font-semibold mb-1.5">Tap to add a random spot</p>
                            {randomPicks.map(p => (
                              <button key={p.id} onClick={() => { setNewEvents([...newEvents, { id: Date.now().toString(), name: p.name, source: "explore", sourceId: p.id, location: p.city, icon: "MapPin" }]); toast.success(`Added ${p.name}`); }}
                                className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-[#c4a46c]/8 border border-[#c4a46c]/12 active:bg-[#c4a46c]/18 transition-colors text-left">
                                <img src={p.image} className="w-8 h-8 rounded-md object-cover flex-shrink-0" loading="lazy" />
                                <div className="flex-1 min-w-0"><p className="text-[11px] font-bold text-white/70 truncate">{p.name}</p><p className="text-[9px] text-[#c4a46c]/60">{p.category}</p></div>
                                <Plus size={14} className="text-[#c4a46c]/40" />
                              </button>
                            ))}
                          </div>
                        );
                      })()}

                      {/* JAMS TAB */}
                      {eventSource === "jam" && (() => {
                        let savedJams: { id: string; name: string; events?: { id: string; name: string; placeId?: string }[] }[] = [];
                        try { const raw = localStorage.getItem("polyjarvis_jams"); if (raw) savedJams = JSON.parse(raw); } catch {}
                        return savedJams.length === 0 ? (
                          <div className="text-center py-6"><Users size={24} className="mx-auto text-white/12 mb-2" /><p className="text-xs text-white/25">No jams yet</p></div>
                        ) : (
                          <div className="space-y-2">
                            {savedJams.map(jam => (
                              <div key={jam.id} className="bg-white/5 border border-white/8 rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-1.5"><Users size={12} className="text-[#F2E8CF]/60" /><span className="text-xs font-bold text-white">{jam.name}</span></div>
                                {jam.events && jam.events.length > 0 ? jam.events.map(ev => (
                                  <button key={ev.id} onClick={() => { setNewEvents([...newEvents, { id: Date.now().toString() + ev.id, name: ev.name, source: "jam", sourceId: jam.id, icon: "Users" }]); toast.success(`Added "${ev.name}"`); }}
                                    className="w-full flex items-center gap-2 p-1.5 rounded-lg text-left hover:bg-white/5 transition-colors">
                                    <MapPin size={10} className="text-[#008080]/60 flex-shrink-0" /><span className="text-[11px] text-white/60 flex-1 truncate">{ev.name}</span><Plus size={12} className="text-white/20" />
                                  </button>
                                )) : <p className="text-[10px] text-white/20 pl-5">No spots in this jam</p>}
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {/* PINNED TAB */}
                      {eventSource === "pinned" && (() => {
                        let pinnedIds: string[] = [];
                        try { pinnedIds = JSON.parse(localStorage.getItem("pinnedEvents") || "[]"); } catch {}
                        const pinnedPlaces = places.filter(p => pinnedIds.includes(p.id));
                        return pinnedPlaces.length === 0 ? (
                          <div className="text-center py-6"><Pin size={24} className="mx-auto text-white/12 mb-2" /><p className="text-xs text-white/25">No pinned spots yet</p><p className="text-[10px] text-white/15 mt-1">Pin places from Explore first</p></div>
                        ) : (
                          <div className="space-y-1">
                            {pinnedPlaces.map(p => (
                              <button key={p.id} onClick={() => { setNewEvents([...newEvents, { id: Date.now().toString(), name: p.name, source: "explore", sourceId: p.id, location: p.city, icon: "MapPin" }]); toast.success(`Added ${p.name}`); }}
                                className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-[#c4a46c]/8 border border-[#c4a46c]/12 active:bg-[#c4a46c]/18 transition-colors text-left">
                                <img src={p.image} className="w-8 h-8 rounded-md object-cover flex-shrink-0" loading="lazy" />
                                <div className="flex-1 min-w-0"><p className="text-[11px] font-bold text-white/70 truncate">{p.name}</p><p className="text-[9px] text-[#c4a46c]/60">{p.category}</p></div>
                                <Pin size={12} className="text-[#c4a46c]/50" fill="currentColor" />
                              </button>
                            ))}
                          </div>
                        );
                      })()}

                      {/* CUSTOM TAB — opens the custom modal */}
                      {eventSource === "custom" && (
                        <div className="text-center py-6">
                          <button onClick={() => setShowAddEvent(true)} className="px-5 py-3 bg-[#F2E8CF]/15 border border-[#F2E8CF]/20 rounded-xl text-sm font-bold text-[#F2E8CF] active:scale-95 transition-transform flex items-center gap-2 mx-auto">
                            <Plus size={14} /> Create Custom Stop
                          </button>
                          <p className="text-[9px] text-white/20 mt-2">Add a stop with your own name, location & time</p>
                        </div>
                      )}
                    </div>

                    {/* Added events */}
                    {newEvents.length > 0 && (
                      <div className="mb-3">
                         <p className="text-[9px] font-semibold text-white/30 capitalize tracking-wider mb-1.5">Your Plan ({newEvents.length})</p>
                         <div className="flex flex-col gap-1.5 max-h-[100px] overflow-y-auto">
                            {newEvents.map((e, idx) => (
                              <div key={e.id} className="flex items-center gap-2 bg-[#F2E8CF]/10 p-2 rounded-lg border border-[#F2E8CF]/10">
                                 <div className="w-5 h-5 rounded-full bg-[#F2E8CF]/20 flex items-center justify-center text-[10px] font-bold text-[#F2E8CF]">{idx + 1}</div>
                                 <RenderIcon name={e.icon || "Star"} size={12} className="text-[#F2E8CF]/60" />
                                 <span className="text-xs font-bold text-white/80 truncate flex-1">{e.name}</span>
                                 <button onClick={() => setNewEvents(newEvents.filter(x => x.id !== e.id))} className="text-white/30 hover:text-white/80"><Trash2 size={12} /></button>
                              </div>
                            ))}
                         </div>
                      </div>
                    )}

                    <div className="flex gap-3 mt-auto">
                      <button onClick={() => setCreateStep("datetime")} className="flex-1 py-3 text-white/30 font-semibold rounded-xl border border-white/10 bg-white/5">Back</button>
                      <button onClick={finishCreate} className="flex-1 py-3 bg-[#F2E8CF] text-[#233216] rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.97] transition-transform">
                        <CheckCircle2 size={16} /> Create
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ═══ DETAIL VIEW ═══ */}
        {view === "detail" && selectedPlan && (
          <motion.div
            key="detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col flex-1"
          >
            {/* Detail Header */}
            <div className="px-4 py-3 bg-[#0d1208]/95 border-b border-white/10 flex items-center justify-between shadow-sm z-20 sticky top-0">
              <button onClick={() => { setView("list"); setShowSettings(false); setEditingPlanName(false); setEditingNotes(false); }} className="p-2 -ml-2 text-white/60 hover:text-white transition-colors flex items-center gap-1">
                <ArrowLeft size={18} /> <span className="text-xs font-semibold">Back</span>
              </button>
              <div className="flex flex-col items-center">
                <h2 className="text-sm font-bold text-white capitalize tracking-wide truncate max-w-[180px]">{selectedPlan.name}</h2>
                <p className="text-[9px] text-white/40 font-semibold">{totalCount} stops</p>
              </div>
              <button onClick={() => setShowSettings(!showSettings)} className="p-2 -mr-2 text-white/60 hover:text-white transition-colors"><Menu size={20} /></button>
            </div>

            {/* Hero section */}
            {(() => {
              const theme = getTheme(selectedPlan.type);
              return (
                <div className="px-5 pt-5 pb-3">
                  <div className="flex items-start gap-4">
                    <button onClick={() => setShowIconPicker(true)} className={clsx("w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 relative group", theme.bg, theme.border)}>
                      <RenderIcon name={selectedPlan.icon} size={30} className={theme.accent} />
                      <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Pencil size={14} className="text-white" />
                      </div>
                    </button>
                    <div className="flex-1 min-w-0">
                      {editingPlanName ? (
                        <div className="flex gap-2 items-center">
                          <input value={editPlanNameValue} onChange={e => setEditPlanNameValue(e.target.value)} autoFocus
                            className="flex-1 bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 text-lg font-bold text-white focus:outline-none focus:border-[#F2E8CF]/40"
                            onKeyDown={e => e.key === "Enter" && savePlanName()}
                          />
                          <button onClick={savePlanName} className="p-1.5 bg-[#F2E8CF] text-[#233216] rounded-lg"><CheckCircle2 size={16} /></button>
                          <button onClick={() => setEditingPlanName(false)} className="p-1.5 bg-white/10 text-white/60 rounded-lg"><X size={16} /></button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditPlanNameValue(selectedPlan.name); setEditingPlanName(true); }} className="text-left group">
                          <h2 className="text-xl font-bold text-white tracking-wide group-hover:text-[#F2E8CF] transition-colors">{selectedPlan.name}</h2>
                        </button>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {selectedPlan.date && <span className="text-xs text-white/50 flex items-center gap-1"><Calendar size={10} /> {selectedPlan.date}</span>}
                        {selectedPlan.type && (
                          <span className={clsx("text-[8px] font-semibold px-1.5 py-0.5 rounded-full border capitalize", theme.badge)}>
                            {cinematicLabels[selectedPlan.type]}
                          </span>
                        )}

                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {totalCount > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-white/40">Progress</span>
                        <span className="text-[10px] font-semibold text-[#F2E8CF]">{completedCount}/{totalCount} done</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#F2E8CF] to-[#d4c9a8] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Tabs */}
            <div className="flex border-b border-white/10 bg-[#0d1208]/50 px-1">
              <button onClick={() => setDetailTab("timeline")} className={clsx("flex-1 py-3 text-xs font-semibold transition-colors border-b-2 flex items-center justify-center gap-1.5", detailTab === "timeline" ? "text-[#F2E8CF] border-[#F2E8CF]" : "text-white/30 border-transparent")}>
                <Route size={12} /> Timeline
              </button>
              <button onClick={() => setDetailTab("notes")} className={clsx("flex-1 py-3 text-xs font-semibold transition-colors border-b-2 flex items-center justify-center gap-1.5", detailTab === "notes" ? "text-[#F2E8CF] border-[#F2E8CF]" : "text-white/30 border-transparent")}>
                <NotebookPen size={12} /> Notes
              </button>
              <button onClick={() => setDetailTab("settings")} className={clsx("flex-1 py-3 text-xs font-semibold transition-colors border-b-2 flex items-center justify-center gap-1.5", detailTab === "settings" ? "text-[#F2E8CF] border-[#F2E8CF]" : "text-white/30 border-transparent")}>
                <Settings size={12} /> Settings
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto pb-32">
              {/* TIMELINE TAB */}
              {detailTab === "timeline" && (
                <div className="px-5 pt-4">
                  {/* Timeline */}
                  <div className="relative border-l-2 border-[#F2E8CF]/15 ml-4 space-y-1 pb-4">
                    {selectedPlan.events.map((e, i) => (
                      <div key={e.id} className="relative pl-7 group">
                        {/* Timeline dot — clickable checkbox */}
                        <button
                          onClick={() => toggleEventComplete(e.id)}
                          className={clsx("absolute -left-[11px] top-3 w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all cursor-pointer",
                            e.completed
                              ? "bg-green-400 border-green-400 shadow-sm shadow-green-400/30"
                              : "bg-[#1a2e12] border-[#F2E8CF]/40 hover:border-[#F2E8CF] hover:bg-[#F2E8CF]/10"
                          )}
                        >
                          {e.completed && <CheckCircle2 size={12} className="text-[#1a2e12]" />}
                        </button>
                        
                        <div className={clsx("p-3.5 rounded-xl border transition-all", e.completed ? "bg-green-400/8 border-green-400/15" : "bg-[#1a2e12]/70 border-white/12")}>
                          <div className="flex items-start gap-2.5">
                            <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                              e.completed ? "bg-green-400/15 text-green-400" : "bg-[#F2E8CF]/10 text-[#F2E8CF]"
                            )}>
                              <RenderIcon name={e.icon || "Star"} size={16} />
                            </div>
                            <div className="flex-1 min-w-0 py-0.5">
                              <h3 className={clsx("text-sm font-bold leading-tight", e.completed ? "text-green-400/70 line-through" : "text-white")}>{e.name}</h3>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {e.time && <span className="text-[10px] text-white/40 flex items-center gap-0.5"><Clock size={8} /> {e.time}</span>}
                                {e.location && <span className="text-[10px] text-white/40 flex items-center gap-0.5"><MapPin size={8} /> {e.location}</span>}
                              </div>
                              {e.note && <p className="text-[10px] text-white/30 italic mt-1">{e.note}</p>}
                            </div>
                            
                            {/* Actions — reorder & delete */}
                            <div className="flex flex-col gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => moveEvent(e.id, "up")} className="p-1 text-white/20 hover:text-white/60 rounded-md hover:bg-white/10 transition-colors"><ChevronUp size={12} /></button>
                              <button onClick={() => moveEvent(e.id, "down")} className="p-1 text-white/20 hover:text-white/60 rounded-md hover:bg-white/10 transition-colors"><ChevronDown size={12} /></button>
                              <button onClick={() => handleDeleteEvent(e.id)} className="p-1 text-red-400/40 hover:text-red-400 rounded-md hover:bg-red-400/10 transition-colors"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add stop button at end of timeline */}
                    <div className="relative pl-7">
                      <div className="absolute -left-[9px] top-3 w-4 h-4 rounded-full bg-[#1a2e12] border-2 border-white/20 flex items-center justify-center">
                        <Plus size={8} className="text-white/50" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowAddEvent(true)} className="flex-1 py-3 border border-dashed border-white/15 rounded-xl text-xs font-semibold text-white/30 flex items-center justify-center gap-2 hover:border-[#F2E8CF]/30 hover:text-[#F2E8CF] transition-colors">
                          <Plus size={13} /> Add Stop
                        </button>
                        <button onClick={addRandomEvent} className="px-4 py-3 border border-dashed border-[#d4c9a8]/18 rounded-xl text-xs font-semibold text-[#d4c9a8]/50 flex items-center justify-center gap-2 hover:border-[#d4c9a8]/35 hover:text-[#d4c9a8] transition-colors">
                          <Shuffle size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NOTES TAB */}
              {detailTab === "notes" && (
                <div className="px-5 pt-4">
                  <div className="bg-[#1a2e12]/60 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-white tracking-wide">Plan Notes</h3>
                      {!editingNotes && (
                        <button onClick={() => { setEditNotesValue(selectedPlan.notes || ""); setEditingNotes(true); }} className="p-1.5 bg-white/10 rounded-lg text-white/40 hover:text-[#F2E8CF] transition-colors">
                          <Pencil size={12} />
                        </button>
                      )}
                    </div>
                    
                    {editingNotes ? (
                      <div className="space-y-3">
                        <textarea
                          value={editNotesValue}
                          onChange={e => setEditNotesValue(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F2E8CF]/40 min-h-[150px] resize-none"
                          placeholder="Add notes, reminders, packing lists..."
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button onClick={() => setEditingNotes(false)} className="flex-1 py-2.5 border border-white/10 rounded-xl text-xs font-semibold text-white/40">Cancel</button>
                          <button onClick={savePlanNotes} className="flex-1 py-2.5 bg-[#F2E8CF] text-[#233216] rounded-xl text-xs font-bold active:scale-95 transition-transform">Save Notes</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {selectedPlan.notes ? (
                          <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{selectedPlan.notes}</p>
                        ) : (
                          <div className="text-center py-8">
                            <NotebookPen size={32} className="mx-auto text-white/15 mb-2" />
                            <p className="text-sm text-white/30 mb-3">No notes yet.</p>
                            <button onClick={() => { setEditNotesValue(""); setEditingNotes(true); }} className="px-4 py-2 bg-[#F2E8CF]/15 border border-[#F2E8CF]/20 rounded-xl text-[#F2E8CF] text-xs font-semibold">
                              Add Notes
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-[#F2E8CF]">{totalCount}</p>
                      <p className="text-[9px] text-white/30 font-semibold capitalize">Stops</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-green-400">{completedCount}</p>
                      <p className="text-[9px] text-white/30 font-semibold capitalize">Done</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-white/60">{totalCount - completedCount}</p>
                      <p className="text-[9px] text-white/30 font-semibold capitalize">Left</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SETTINGS TAB */}
              {detailTab === "settings" && (
                <div className="px-5 pt-4 space-y-3">
                  {/* Plan info */}
                  <div className="bg-[#1a2e12]/60 border border-white/10 rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-white tracking-wide mb-3">Plan Info</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-2 border-b border-white/5">
                        <span className="text-xs text-white/40">Created</span>
                        <span className="text-xs font-semibold text-white/70">{selectedPlan.createdAt}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-white/5">
                        <span className="text-xs text-white/40">Type</span>
                        <span className="text-xs font-semibold text-white/70 capitalize">{selectedPlan.type || "General"}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-white/5">
                        <span className="text-xs text-white/40">Date</span>
                        <span className="text-xs font-semibold text-white/70">{selectedPlan.date || "Not set"}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-xs text-white/40">Total stops</span>
                        <span className="text-xs font-semibold text-white/70">{totalCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Delete plan */}
                  <button onClick={() => handleDeletePlan(selectedPlan.id)}
                    className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white/40 font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform hover:text-red-400 hover:border-red-400/20 hover:bg-red-500/5"
                  >
                    <Trash2 size={15} /> Delete this plan
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Icon Picker Modal ═══ */}
      <AnimatePresence>
        {showIconPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowIconPicker(false)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-[#1a2e10]/95 backdrop-blur-2xl rounded-t-3xl p-5 border-t border-white/15"
            >
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-4" />
              <h3 className="text-sm font-bold text-white tracking-wide mb-4">Change Icon</h3>
              <div className="flex flex-wrap gap-2 max-h-[250px] overflow-y-auto">
                {planIcons.map(icon => (
                  <button key={icon} onClick={() => changePlanIcon(icon)}
                    className={clsx("w-11 h-11 rounded-xl flex items-center justify-center transition-all",
                      selectedPlan?.icon === icon ? "bg-[#F2E8CF] scale-110 shadow-lg" : "bg-white/10 hover:bg-white/15"
                    )}>
                    <RenderIcon name={icon} size={20} className={selectedPlan?.icon === icon ? "text-[#233216]" : "text-white/70"} />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Add Event Modal ═══ */}
      <AnimatePresence>
        {showAddEvent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowAddEvent(false)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-[#1a2e10]/95 backdrop-blur-2xl rounded-t-3xl p-5 border-t border-white/15 max-h-[75vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-4" />
              <h3 className="text-sm font-bold text-white tracking-wide mb-3">Add Stop</h3>
              
              <div className="flex gap-1.5 mb-4">
                 <button onClick={() => setEventSource("random")} className={clsx("flex-1 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1", eventSource === "random" ? "bg-[#c4a46c] text-[#233216] border-[#c4a46c]" : "bg-[#c4a46c]/10 text-[#c4a46c] border-[#c4a46c]/20")}><Shuffle size={12} /> Random</button>
                 <button onClick={() => setEventSource("jam")} className={clsx("flex-1 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1", eventSource === "jam" ? "bg-[#F2E8CF] text-[#233216] border-[#F2E8CF]" : "bg-white/5 text-white/40 border-white/10")}><Users size={12} /> Jams</button>
                 <button onClick={() => setEventSource("pinned")} className={clsx("flex-1 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1", eventSource === "pinned" ? "bg-[#F2E8CF] text-[#233216] border-[#F2E8CF]" : "bg-white/5 text-white/40 border-white/10")}><Pin size={12} /> Pinned</button>
                 <button onClick={() => setEventSource("custom")} className={clsx("flex-1 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1", eventSource === "custom" ? "bg-[#F2E8CF] text-[#233216] border-[#F2E8CF]" : "bg-white/5 text-white/40 border-white/10")}><Plus size={12} /> Custom</button>
              </div>

              {/* RANDOM TAB */}
              {eventSource === "random" && (() => {
                const randomPicks = places.sort(() => Math.random() - 0.5).slice(0, 8);
                return (
                  <div className="space-y-1">
                    <p className="text-[9px] text-[#c4a46c]/60 font-semibold mb-1.5">Tap to add a random spot</p>
                    {randomPicks.map(p => (
                      <button key={p.id} onClick={() => {
                        const evt: PlanEvent = { id: Date.now().toString(), name: p.name, source: "explore", sourceId: p.id, location: p.city, icon: "MapPin" };
                        if (view === "create") { setNewEvents([...newEvents, evt]); }
                        else if (selectedPlan) {
                          const updated = plans.map(pl => pl.id === selectedPlan.id ? { ...pl, events: [...pl.events, evt] } : pl);
                          setPlans(updated); setSelectedPlan({ ...selectedPlan, events: [...selectedPlan.events, evt] });
                        }
                        setShowAddEvent(false); toast.success(`Added ${p.name}`);
                      }} className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-[#c4a46c]/8 border border-[#c4a46c]/12 active:bg-[#c4a46c]/18 transition-colors">
                        <img src={p.image} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{p.name}</p>
                          <p className="text-xs text-[#c4a46c]/60">{p.category}</p>
                        </div>
                        <Plus size={16} className="text-[#c4a46c]/40 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* JAMS TAB */}
              {eventSource === "jam" && (() => {
                 let savedJams: { id: string; name: string; events?: { id: string; name: string; placeId?: string }[] }[] = [];
                 try { const raw = localStorage.getItem("polyjarvis_jams"); if (raw) savedJams = JSON.parse(raw); } catch {}
                 return (
                   <div className="space-y-2">
                     {savedJams.length === 0 ? (
                       <div className="text-center py-8">
                         <Users size={24} className="mx-auto text-white/12 mb-2" />
                         <p className="text-xs text-white/25">No jams yet</p>
                       </div>
                     ) : savedJams.map(jam => (
                       <div key={jam.id} className="bg-white/5 border border-white/8 rounded-xl p-3">
                         <div className="flex items-center gap-2 mb-1.5">
                           <Users size={12} className="text-[#F2E8CF]/60" />
                           <span className="text-xs font-bold text-white">{jam.name}</span>
                           <span className="text-[10px] text-white/30 ml-auto">{jam.events?.length || 0} spots</span>
                         </div>
                         {jam.events && jam.events.length > 0 ? (
                           <div className="space-y-1">
                             {jam.events.map(ev => (
                               <button key={ev.id} onClick={() => {
                                 const evt: PlanEvent = { id: Date.now().toString() + ev.id, name: ev.name, source: "jam", sourceId: jam.id, icon: "Users" };
                                 if (view === "create") { setNewEvents([...newEvents, evt]); }
                                 else if (selectedPlan) {
                                   const updated = plans.map(pl => pl.id === selectedPlan.id ? { ...pl, events: [...pl.events, evt] } : pl);
                                   setPlans(updated); setSelectedPlan({ ...selectedPlan, events: [...selectedPlan.events, evt] });
                                 }
                                 toast.success(`Added "${ev.name}" from jam`);
                               }} className="w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-white/5 transition-colors">
                                 <MapPin size={12} className="text-[#008080]/60 flex-shrink-0" />
                                 <span className="text-xs text-white/60 flex-1 truncate">{ev.name}</span>
                                 <Plus size={14} className="text-white/20" />
                               </button>
                             ))}
                           </div>
                         ) : (
                           <p className="text-[10px] text-white/20 pl-5">No spots in this jam</p>
                         )}
                       </div>
                     ))}
                   </div>
                 );
              })()}

              {/* PINNED TAB */}
              {eventSource === "pinned" && (() => {
                let pinnedIds: string[] = [];
                try { pinnedIds = JSON.parse(localStorage.getItem("pinnedEvents") || "[]"); } catch {}
                const pinnedPlaces = places.filter(p => pinnedIds.includes(p.id));
                return pinnedPlaces.length === 0 ? (
                  <div className="text-center py-8">
                    <Pin size={24} className="mx-auto text-white/12 mb-2" />
                    <p className="text-xs text-white/25">No pinned spots</p>
                    <p className="text-[10px] text-white/15 mt-1">Pin places from Explore first</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {pinnedPlaces.map(p => (
                      <button key={p.id} onClick={() => {
                        const evt: PlanEvent = { id: Date.now().toString(), name: p.name, source: "explore", sourceId: p.id, location: p.city, icon: "MapPin" };
                        if (view === "create") { setNewEvents([...newEvents, evt]); }
                        else if (selectedPlan) {
                          const updated = plans.map(pl => pl.id === selectedPlan.id ? { ...pl, events: [...pl.events, evt] } : pl);
                          setPlans(updated); setSelectedPlan({ ...selectedPlan, events: [...selectedPlan.events, evt] });
                        }
                        setShowAddEvent(false); toast.success(`Added ${p.name}`);
                      }} className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-[#c4a46c]/8 border border-[#c4a46c]/12 active:bg-[#c4a46c]/18 transition-colors">
                        <img src={p.image} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{p.name}</p>
                          <p className="text-xs text-[#c4a46c]/60">{p.category}</p>
                        </div>
                        <Pin size={12} className="text-[#c4a46c]/50 flex-shrink-0" fill="currentColor" />
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* CUSTOM TAB */}
              {eventSource === "custom" && (
                 <div className="space-y-3">
                    {/* Icon picker row */}
                    <div>
                      <label className="text-[10px] font-semibold text-white/30 capitalize tracking-wider mb-2 block">Icon</label>
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {["Star", "MapPin", "Utensils", "Coffee", "Car", "BookOpen", "Music", "Camera", "ShoppingBag", "Dumbbell", "Heart", "Palmtree"].map(ic => (
                          <button key={ic} onClick={() => setEventIcon(ic)}
                            className={clsx("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                              eventIcon === ic ? "bg-[#F2E8CF] scale-105" : "bg-white/10"
                            )}>
                            <RenderIcon name={ic} size={16} className={eventIcon === ic ? "text-[#233216]" : "text-white/60"} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <input type="text" placeholder="Stop name (e.g. Dinner)" value={eventName} onChange={e => setEventName(e.target.value)} className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F2E8CF]/40 text-sm" autoFocus />
                    <input type="text" placeholder="Location (optional)" value={eventLocation} onChange={e => setEventLocation(e.target.value)} className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F2E8CF]/40 text-sm" />
                    <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} className="w-full min-w-0 bg-white/10 border border-white/15 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-[#F2E8CF]/40 [color-scheme:dark] text-xs sm:text-sm" />
                    <input type="text" placeholder="Note (optional)" value={eventNote} onChange={e => setEventNote(e.target.value)} className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F2E8CF]/40 text-sm" />
                    <button onClick={handleAddEvent} className="w-full py-3.5 bg-[#F2E8CF] text-[#233216] rounded-xl font-bold mt-2 active:scale-[0.97] transition-transform text-sm">Add to Plan</button>
                 </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings sidebar */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.2, type: "spring", stiffness: 500, damping: 40 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-[#1a2e12] border-l border-white/10 z-40 p-6 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-white tracking-wide">Plan Settings</h3>
                <button onClick={() => setShowSettings(false)} className="p-1 text-white/40 hover:text-white"><X size={18} /></button>
              </div>

              <div className="space-y-2">
                <button onClick={() => { setDetailTab("timeline"); setShowSettings(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-left transition-colors group">
                  <Route size={16} className="text-white/40 group-hover:text-[#F2E8CF]" />
                  <span className="text-xs font-bold text-white/70 group-hover:text-white">Timeline</span>
                </button>
                <button onClick={() => { setDetailTab("notes"); setShowSettings(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-left transition-colors group">
                  <NotebookPen size={16} className="text-white/40 group-hover:text-[#F2E8CF]" />
                  <span className="text-xs font-bold text-white/70 group-hover:text-white">Notes</span>
                </button>

                <button onClick={addRandomEvent} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-left transition-colors group">
                  <Shuffle size={16} className="text-white/40 group-hover:text-[#c4a46c]" />
                  <span className="text-xs font-bold text-white/70 group-hover:text-white">Random Stop</span>
                </button>
              </div>

              <div className="mt-auto pt-4 border-t border-white/10 pb-4">
                <button onClick={() => { handleDeletePlan(selectedPlan!.id); setShowSettings(false); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-red-500/10 text-left transition-colors text-white/40 hover:text-red-400 border border-white/10 hover:border-red-500/20"
                >
                  <Trash2 size={16} />
                  <span className="text-xs font-semibold">Delete Plan</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
