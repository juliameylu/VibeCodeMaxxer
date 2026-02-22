import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, ExternalLink, Sparkles, Menu, MapPin, ClipboardList, GripHorizontal } from "lucide-react";
import { JarvisLogo } from "./JarvisLogo";
import { places } from "../data/places";

// ─── Browsing context memory ─────────────────────────────────────────────────
const BROWSE_HISTORY_KEY = "polyjarvis_browse_history";
const CONVERSATIONS_KEY = "polyjarvis_floating_convos";

interface BrowseEntry {
  path: string;
  label: string;
  timestamp: number;
  category?: string;
  placeId?: string;
}

function getBrowseHistory(): BrowseEntry[] {
  try { return JSON.parse(localStorage.getItem(BROWSE_HISTORY_KEY) || "[]"); } catch { return []; }
}

function logBrowse(entry: BrowseEntry) {
  try {
    const hist = getBrowseHistory();
    // Dedupe consecutive same paths
    if (hist.length > 0 && hist[0].path === entry.path) return;
    hist.unshift(entry);
    localStorage.setItem(BROWSE_HISTORY_KEY, JSON.stringify(hist.slice(0, 50)));
  } catch {}
}

function getRecentBrowseContext(): { places: string[]; categories: string[]; pages: string[] } {
  const hist = getBrowseHistory().slice(0, 15);
  const placeNames = hist.filter(h => h.placeId).map(h => h.label);
  const categories = [...new Set(hist.filter(h => h.category).map(h => h.category!))];
  const pages = [...new Set(hist.map(h => h.path.split("/")[1] || "dashboard"))];
  return { places: placeNames, categories, pages };
}

function getContextualGreeting(pathname: string): string | null {
  const ctx = getRecentBrowseContext();
  const page = pathname.split("/")[1] || "dashboard";

  // If user has been browsing specific places, suggest a plan
  if (ctx.places.length >= 2) {
    const recent = ctx.places.slice(0, 3).join(", ");
    return `I noticed you've been checking out ${recent}. Want me to build a plan with those spots?`;
  }

  // Page-specific context
  if (page === "explore") return "Browsing spots? I can help narrow it down or build a plan.";
  if (page === "jams") return "Working on a jam? I can suggest spots or help convert it to a plan.";
  if (page === "plans") return "Need help with your plans? I can add stops or suggest ideas.";
  if (page === "map") return "Exploring the map? Ask me about any area or category.";
  if (page === "event") return "Interesting spot! Want to add it to a plan or jam?";
  return null;
}

// ─── Base Jarvis knowledge ───────────────────────────────────────────────────
const sloResponses: { keywords: string[]; response: string; path?: string; label?: string }[] = [
  { keywords: ["take me to explore", "go to explore", "open explore"], response: "Taking you to Explore!", path: "/explore", label: "Open Explore" },
  { keywords: ["take me home", "go home", "dashboard"], response: "Going home!", path: "/dashboard", label: "Go Home" },
  { keywords: ["make a jam", "create jam", "start jam", "new jam", "make jam", "lets jam", "let's jam", "want to jam"], response: "Let's set up a Jam! Open the full chat for the guided flow.", path: "/jarvis", label: "Open Jarvis" },
  { keywords: ["make a plan", "create plan", "plan a trip", "make me a plan", "build a plan", "plan those", "plan with those"], response: "Let's build a plan!", path: "/plans", label: "Create a Plan" },
  { keywords: ["beach", "ocean", "surf"], response: "Beaches near SLO:\n\n\ud83c\udfd6\ufe0f Avila Beach \u2014 15 min\n\ud83c\udf0a Pismo \u2014 20 min\n\ud83e\udea8 Morro Bay \u2014 25 min\n\ud83d\udc1a Shell Beach \u2014 18 min", path: "/explore?category=Beaches", label: "Browse Beaches" },
  { keywords: ["hike", "hiking", "trail"], response: "SLO hikes:\n\n\u26f0\ufe0f Bishop Peak \u2014 Best views, 3.5mi\n\ud83c\udfd4\ufe0f Cerro San Luis \u2014 3mi\n\ud83c\udf3f Poly Canyon \u2014 On campus\n\ud83c\udf32 Irish Hills \u2014 4mi loop", path: "/explore?category=Hikes", label: "Browse Hikes" },
  { keywords: ["coffee", "cafe"], response: "Coffee spots:\n\n\u2615 Scout Coffee \u2014 Lavender latte\n\ud83d\udcda Kreuzberg \u2014 Late hours\n\ud83c\udf3f Nautical Bean \u2014 Chill patio" },
  { keywords: ["food", "eat", "hungry", "dine", "taco", "pizza", "burger", "sushi"], response: "SLO food:\n\n\ud83e\udda9 Firestone \u2014 Tri-tip\n\ud83c\udf55 Woodstock's \u2014 Late night\n\ud83c\udf2e Taqueria Santa Cruz \u2014 $2-3 tacos", path: "/jarvis?mode=dine", label: "Open Dine Bot" },
  { keywords: ["study", "library"], response: "Study spots:\n\n\ud83d\udcda Kennedy Library \u2014 Floors 3-5\n\u2615 Scout Coffee \u2014 Good WiFi\n\ud83d\udcd6 Kreuzberg \u2014 Open late" },
  { keywords: ["bus", "transit"], response: "SLO Transit is free with your Cal Poly ID!\n\n\ud83d\ude8c Route 4 \u2014 Campus \u2194 Downtown\n\ud83d\ude8c Route 6 \u2014 Campus loop\n\ud83d\ude8c Route 12A \u2014 Campus \u2194 Morro Bay" },
  { keywords: ["farmers market", "farmer"], response: "Thursday night Farmer's Market!\n\ud83d\udcc5 6-9 PM, Higuera Street\n\ud83c\udf57 BBQ, produce, crafts, live music\nSLO tradition since the 1980s." },
  { keywords: ["weather", "temperature"], response: "SLO weather is amazing.\n\u2600\ufe0f ~280 sunny days/year\n\ud83c\udf21\ufe0f Summer: 72-80\u00b0F\n\u2744\ufe0f Winter: 44-65\u00b0F" },
  { keywords: ["help", "what can you do"], response: "I can recommend hikes, food, coffee, help plan trips, make jams, and navigate the app. I also remember what you browse and can suggest plans based on your interests!" },
  { keywords: ["hello", "hi", "hey", "yo"], response: "Hey! What are you looking to do?" },
  { keywords: ["bored", "nothing"], response: "Never bored in SLO!\n\n\ud83c\udf05 Sunset at Bishop Peak\n\u2615 Scout Coffee\n\ud83c\udfd6\ufe0f Beach day trip\n\ud83c\udfb5 SLO Brew show" },
  { keywords: ["bar", "nightlife", "party"], response: "SLO nightlife:\n\ud83c\udf7a The Library \u2014 College classic\n\ud83c\udf77 Luna Red \u2014 Craft cocktails\n\ud83c\udfb5 SLO Brew Rock \u2014 Live music\n\ud83c\udf78 Frog & Peach \u2014 Dive bar" },
  { keywords: ["date", "romantic"], response: "Date ideas:\n\ud83c\udf05 Sunset at Bishop Peak\n\ud83c\udf77 Edna Valley wine tasting\n\ud83c\udf70 Madonna Inn bakery\n\ud83c\udf0a Avila Beach sunset" },
  { keywords: ["cheap", "free", "budget"], response: "Free: Every hike, Farmer's Market, beaches\nUnder $10: Tacos at Santa Cruz, Scout coffee\n\nStudent discounts at most downtown shops!" },
  { keywords: ["what have i been looking at", "what did i browse", "browsing history", "what was i looking at"], response: "" }, // handled specially
  { keywords: ["suggest a plan", "plan suggestion", "what should i plan"], response: "" }, // handled specially
];

function findQuickResponse(input: string, pathname: string) {
  const lower = input.toLowerCase().trim();

  // Special: browsing history query
  if (["what have i been looking at", "what did i browse", "browsing history", "what was i looking at", "my history"].some(k => lower.includes(k))) {
    const ctx = getRecentBrowseContext();
    if (ctx.places.length > 0) {
      return {
        response: `Recently you've been checking out:\n${ctx.places.slice(0, 5).map(p => `\u2022 ${p}`).join("\n")}\n\nWant me to make a plan with these?`,
        keywords: [], path: "/plans", label: "Create Plan from History"
      };
    }
    return { response: "You haven't browsed many places yet. Go explore and I'll keep track!", keywords: [] };
  }

  // Special: plan suggestion based on browsing
  if (["suggest a plan", "plan suggestion", "what should i plan", "plan with those", "plan those spots", "yes make a plan", "yeah plan", "plan them"].some(k => lower.includes(k))) {
    const ctx = getRecentBrowseContext();
    if (ctx.places.length > 0) {
      return {
        response: `Based on your browsing, here's what I'd suggest:\n${ctx.places.slice(0, 4).map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\nI'll set this up as a plan for you!`,
        keywords: [], path: "/plans", label: "Create Plan"
      };
    }
    return { response: "Browse some spots first and I'll build a personalized plan for you!", keywords: [], path: "/explore", label: "Go Explore" };
  }

  // Check for place name mentions - auto-suggest
  const matchedPlace = places.find(p => lower.includes(p.name.toLowerCase().split(" ")[0].toLowerCase()) && p.name.toLowerCase().split(" ")[0].length > 3);
  if (matchedPlace) {
    return {
      response: `${matchedPlace.name} \u2014 ${matchedPlace.category}\n${matchedPlace.description || "Great spot in SLO!"}\n\u2b50 ${matchedPlace.rating} \u00b7 ${matchedPlace.price}`,
      keywords: [],
      path: `/event/${matchedPlace.id}`,
      label: `View ${matchedPlace.name}`,
    };
  }

  for (const entry of sloResponses) {
    if (!entry.response) continue; // skip special entries already handled
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) return entry;
    }
  }
  return { response: "Try asking about hikes, food, beaches, or say \"help\"!", keywords: [] };
}

const HIDDEN_PATHS = ["/", "/landing", "/signin", "/jarvis", "/tutorial"];

function saveConversation(messages: { role: "user" | "bot"; text: string; path?: string; label?: string }[]) {
  if (messages.length <= 1) return;
  try {
    const existing = JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) || "[]");
    const convo = { id: Date.now(), messages: messages.slice(0, 20), date: new Date().toISOString() };
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify([convo, ...existing].slice(0, 10)));
  } catch {}
}

function loadConversations(): { id: number; messages: any[]; date: string }[] {
  try { return JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) || "[]"); } catch { return []; }
}

// ─── Page label helpers ──────────────────────────────────────────────────────
function getPageLabel(pathname: string): string {
  if (pathname.startsWith("/event/")) {
    const id = pathname.split("/")[2];
    const place = places.find(p => p.id === id);
    return place?.name || "Event";
  }
  const map: Record<string, string> = {
    "/dashboard": "Dashboard", "/explore": "Explore", "/jams": "Jams",
    "/plans": "Plans", "/profile": "Profile", "/map": "Map",
    "/friends": "Friends", "/jarvis": "Jarvis",
  };
  return map[pathname] || "App";
}

function getPageCategory(pathname: string): string | undefined {
  if (pathname.startsWith("/event/")) {
    const id = pathname.split("/")[2];
    const place = places.find(p => p.id === id);
    return place?.category;
  }
  return undefined;
}

export function FloatingJarvis() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string; path?: string; label?: string }[]>([
    { role: "bot", text: "Hey! Need help? Ask me anything about SLO" },
  ]);
  const [input, setInput] = useState("");
  const hasAnimated = useRef(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  // Drag state for chat panel
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 });
  const isPanelDragging = useRef(false);
  const panelDragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const panelHasMoved = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Track browsing context
  const lastPathRef = useRef(pathname);
  useEffect(() => {
    if (pathname !== lastPathRef.current && !HIDDEN_PATHS.includes(pathname)) {
      lastPathRef.current = pathname;
      const label = getPageLabel(pathname);
      const category = getPageCategory(pathname);
      const placeId = pathname.startsWith("/event/") ? pathname.split("/")[2] : undefined;
      logBrowse({ path: pathname, label, timestamp: Date.now(), category, placeId });
    }
  }, [pathname]);

  // Contextual greeting when opening chat + reset drag position
  useEffect(() => {
    if (open) {
      setPanelPos({ x: 0, y: 0 });
      if (messages.length === 1) {
        const contextMsg = getContextualGreeting(pathname);
        if (contextMsg) {
          setMessages([{ role: "bot", text: contextMsg }]);
        }
      }
    }
  }, [open]);

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (HIDDEN_PATHS.includes(pathname)) return null;

  // ─── Chat panel drag handlers ──────────────────────────────────────────────
  const handlePanelPointerDown = (e: React.PointerEvent) => {
    isPanelDragging.current = true;
    panelHasMoved.current = false;
    panelDragStart.current = { x: e.clientX, y: e.clientY, posX: panelPos.x, posY: panelPos.y };
    panelRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePanelPointerMove = (e: React.PointerEvent) => {
    if (!isPanelDragging.current) return;
    const dx = e.clientX - panelDragStart.current.x;
    const dy = e.clientY - panelDragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) panelHasMoved.current = true;
    setPanelPos({
      x: panelDragStart.current.posX + dx,
      y: panelDragStart.current.posY + dy,
    });
  };

  const handlePanelPointerUp = () => {
    isPanelDragging.current = false;
    // Clamp within viewport
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    setPanelPos(prev => ({
      x: Math.max(-(screenW - 80), Math.min(screenW - 80, prev.x)),
      y: Math.max(-(screenH - 200), Math.min(screenH - 200, prev.y)),
    }));
  };

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    const resp = findQuickResponse(userMsg, pathname);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "bot", text: resp.response, path: (resp as any).path, label: (resp as any).label }]);
    }, 400);
  };

  const openFullJarvis = () => {
    saveConversation(messages);
    setOpen(false);
    navigate("/jarvis");
  };

  const startNew = () => {
    saveConversation(messages);
    const ctx = getContextualGreeting(pathname);
    setMessages([{ role: "bot", text: ctx || "Fresh start! What's the move?" }]);
    setShowHistory(false);
  };

  const loadOldConvo = (convo: { messages: any[] }) => {
    setMessages(convo.messages);
    setShowHistory(false);
  };

  const pastConvos = loadConversations();
  const browseCtx = getRecentBrowseContext();
  const hasBrowseHistory = browseCtx.places.length > 0;

  // Dynamic pills based on context
  const contextPills = (() => {
    const base = ["Best tacos?", "Hike spots", "Coffee"];
    if (hasBrowseHistory) {
      base.unshift("Plan those spots");
    }
    base.push("Make a plan", "I'm bored");
    return base.slice(0, 6);
  })();

  return (
    <>
      {/* Floating Jarvis button - static */}
      {!open && (
        <div className="fixed z-40 flex flex-col items-center gap-2 bottom-24 right-4">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-14 h-14 rounded-full animate-ping bg-[#F2E8CF]/10" style={{ animationDuration: "3s" }} />
          </div>
          <motion.button
            initial={hasAnimated.current ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            onAnimationComplete={() => { hasAnimated.current = true; }}
            onClick={() => setOpen(true)}
            className="w-14 h-14 bg-[#F2E8CF] rounded-full flex items-center justify-center shadow-xl shadow-[#F2E8CF]/25 relative z-10"
          >
            <JarvisLogo size={28} className="text-[#233216]" />
          </motion.button>
          {/* Context badge - shows when Jarvis has browsing context */}
          {hasBrowseHistory && (
            <div className="absolute -top-1 -left-1 w-5 h-5 bg-[#4A6628] rounded-full flex items-center justify-center border-2 border-[#F2E8CF] z-20">
              <MapPin size={9} className="text-[#F2E8CF]" />
            </div>
          )}
        </div>
      )}

      {/* Chat sheet */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.3, borderRadius: "50%" }}
            animate={{ opacity: 1, scale: 1, borderRadius: "16px" }}
            exit={{ opacity: 0, scale: 0.3, borderRadius: "50%" }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="fixed bottom-24 right-3 left-3 z-50 bg-[#0d1208]/90 backdrop-blur-2xl border border-[#F2E8CF]/15 shadow-2xl shadow-black/50 max-h-[60vh] flex flex-col overflow-hidden"
            style={{ borderRadius: 16, transform: `translate(${panelPos.x}px, ${panelPos.y}px)` }}
          >
            {/* Draggable header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-white/10 cursor-grab active:cursor-grabbing select-none"
              style={{ touchAction: "none" }}
              onPointerDown={handlePanelPointerDown}
              onPointerMove={handlePanelPointerMove}
              onPointerUp={handlePanelPointerUp}
            >
              <div className="flex items-center gap-2">
                <div className="bg-[#F2E8CF]/15 p-1.5 rounded-full">
                  <JarvisLogo size={18} className="text-[#F2E8CF]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white flex items-center gap-1">
                    Jarvis <Sparkles size={10} className="text-[#F2E8CF]" />
                  </p>
                  <p className="text-[9px] text-white/30 flex items-center gap-1">
                    <GripHorizontal size={8} className="text-white/20" />
                    {hasBrowseHistory ? `Tracking ${browseCtx.places.length} spots` : "Drag to move"}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-1.5 text-white/30 hover:text-white bg-white/5 rounded-lg"
                >
                  <Menu size={14} />
                </button>
                <button
                  onClick={openFullJarvis}
                  className="text-[10px] text-[#F2E8CF] font-bold bg-[#F2E8CF]/10 px-2.5 py-1 rounded-full active:scale-95 transition-transform"
                >
                  Full Chat
                </button>
                <button onClick={() => { saveConversation(messages); setOpen(false); }} className="p-1 text-white/40 hover:text-white">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Conversation history drawer */}
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-white/10"
                >
                  <div className="p-3 space-y-1.5 max-h-[25vh] overflow-y-auto">
                    <button onClick={startNew}
                      className="w-full text-left px-3 py-2 bg-[#F2E8CF]/10 border border-[#F2E8CF]/15 rounded-lg text-[11px] font-bold text-[#F2E8CF] active:scale-[0.97] transition-transform">
                      + New Conversation
                    </button>
                    {pastConvos.length === 0 ? (
                      <p className="text-[10px] text-white/25 text-center py-2">No past conversations</p>
                    ) : (
                      pastConvos.map(c => {
                        const firstUser = c.messages.find((m: any) => m.role === "user");
                        const label = firstUser?.text?.slice(0, 35) || "Conversation";
                        const d = new Date(c.date);
                        return (
                          <button key={c.id} onClick={() => loadOldConvo(c)}
                            className="w-full text-left px-3 py-2 bg-white/5 border border-white/8 rounded-lg active:bg-white/10 transition-colors">
                            <p className="text-[11px] font-bold text-white/60 truncate">{label}</p>
                            <p className="text-[9px] text-white/25">{d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px] max-h-[35vh]">
              {messages.map((msg, i) => (
                <div key={i}>
                  <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-line ${
                        msg.role === "user"
                          ? "bg-[#4A6628] text-white rounded-br-sm"
                          : "bg-white/10 text-white/80 border border-white/10 rounded-bl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                  {msg.path && msg.role === "bot" && (
                    <button
                      onClick={() => { navigate(msg.path!); setOpen(false); }}
                      className="flex items-center gap-1 text-[10px] font-bold text-[#F2E8CF] bg-[#F2E8CF]/10 px-2.5 py-1 rounded-full mt-1 ml-1 active:scale-95 transition-transform"
                    >
                      <ExternalLink size={9} /> {msg.label}
                    </button>
                  )}
                </div>
              ))}
              <div ref={msgEndRef} />
            </div>

            {/* Context-aware prompt pills */}
            {messages.length <= 2 && (
              <div className="px-3 pb-1 overflow-x-auto">
                <div className="flex gap-1.5">
                  {contextPills.map((pill, i) => (
                    <button key={i} onClick={() => { setInput(pill); setTimeout(() => { setInput(""); setMessages(p => [...p, { role: "user", text: pill }]); const r = findQuickResponse(pill, pathname); setTimeout(() => setMessages(p => [...p, { role: "bot", text: r.response, path: (r as any).path, label: (r as any).label }]), 400); }, 0); }}
                      className="bg-white/6 text-white/40 text-[10px] font-medium px-2.5 py-1 rounded-full border border-white/8 whitespace-nowrap active:bg-[#F2E8CF]/15 active:text-[#F2E8CF] transition-colors flex-shrink-0">
                      {pill}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-2 border-t border-white/10 flex gap-2">
              <input
                type="text"
                placeholder="Ask anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                className="flex-1 bg-white/10 rounded-full px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none border border-white/12"
              />
              <button onClick={send} className="bg-[#F2E8CF] text-[#1a2e10] p-2 rounded-full active:scale-90 transition-transform">
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}