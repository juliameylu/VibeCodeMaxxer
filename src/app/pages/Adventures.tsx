import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { clsx } from "clsx";
import { copyToClipboard } from "../utils/clipboard";

const forestBg = "https://images.unsplash.com/photo-1641998113371-3e86f86a7253?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWxpZm9ybmlhJTIwZm9yZXN0JTIwdHJhaWwlMjBncmVlbiUyMG5hdHVyZXxlbnwxfHx8fDE3NzE3MTUzMTd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
const pismoBg = "https://images.unsplash.com/photo-1608020141578-4387488975c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaXNtbyUyMGJlYWNoJTIwY2FsaWZvcm5pYSUyMHN1bnNldCUyMG9jZWFufGVufDF8fHx8MTc3MTcxNTMxN3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

interface AdventureMember {
  id: string;
  name: string;
  isLeader: boolean;
  rsvp: "going" | "maybe" | "declined" | "pending";
  schedule?: string[]; // available times
}

interface Adventure {
  id: string;
  name: string;
  emoji: string;
  friendCode: string;
  members: AdventureMember[];
  isLeader: boolean;
  description?: string;
  location?: string;
  date?: string;
  time?: string;
  image?: string;
  needsCar: boolean;
  busyLevel: "chill" | "moderate" | "packed";
  zipcarNote?: string;
  createdAt: string;
}

const adventureEmojis = ["🏔️", "🏖️", "🌲", "☕", "🎸", "🏄", "🍕", "🎨", "🚴", "🌅", "🎣", "⛺"];

// Valid adventure codes for demo
const VALID_CODES = ["PISMO-7", "PEAK-42", "GRND-88"];

const initialAdventures: Adventure[] = [
  {
    id: "a1",
    name: "Pismo Beach Day",
    emoji: "🏖️",
    friendCode: "PISMO-7",
    members: [
      { id: "u1", name: "You", isLeader: true, rsvp: "going", schedule: ["Sat 10am-6pm", "Sun 12pm-5pm"] },
      { id: "u2", name: "Alex M.", isLeader: false, rsvp: "going", schedule: ["Sat 9am-4pm", "Sun 1pm-6pm"] },
      { id: "u3", name: "Emma R.", isLeader: false, rsvp: "maybe", schedule: ["Sat 11am-3pm"] },
    ],
    isLeader: true,
    description: "Beach day trip to Pismo! We'll hit the pier, grab fish tacos at Splash Cafe, and catch the sunset. Bring sunscreen and a towel.",
    location: "Pismo Beach, CA",
    date: "Sat, Feb 28",
    time: "10:00 AM",
    image: pismoBg,
    needsCar: true,
    busyLevel: "moderate",
    zipcarNote: "Nearest Zipcar: Grand Ave Parking Structure (0.3 mi) — Honda Civic available",
    createdAt: "3 hours ago",
  },
  {
    id: "a2",
    name: "Bishop Peak Sunrise",
    emoji: "🏔️",
    friendCode: "PEAK-42",
    members: [
      { id: "u1", name: "You", isLeader: false, rsvp: "going", schedule: ["Sun 6am-10am"] },
      { id: "u4", name: "Sarah K.", isLeader: true, rsvp: "going", schedule: ["Sun 5:30am-11am"] },
    ],
    isLeader: false,
    description: "Early morning hike to catch the sunrise from Bishop Peak. Meet at the Patricia Dr trailhead.",
    location: "Bishop Peak Trailhead, SLO",
    date: "Sun, Mar 1",
    time: "5:45 AM",
    needsCar: false,
    busyLevel: "chill",
    createdAt: "Yesterday",
  },
];

// Leaf SVG component for branding
function LeafLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <path
        d="M20 4C20 4 8 10 8 22C8 30 13 36 20 36C27 36 32 30 32 22C32 10 20 4 20 4Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M20 12V32M20 18L15 22M20 22L26 18M20 26L14 28"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

export function Adventures() {
  const [adventures, setAdventures] = useState<Adventure[]>(initialAdventures);
  const [selectedAdventure, setSelectedAdventure] = useState<Adventure | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [shareAdventure, setShareAdventure] = useState<Adventure | null>(null);
  const [showScheduleCompare, setShowScheduleCompare] = useState(false);

  // Create form
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newNeedsCar, setNewNeedsCar] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState("🏔️");

  // Join form
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  const generateCode = () => {
    const words = ["HIKE", "SURF", "PEAK", "BREW", "VIBE", "CALI", "POLY", "TREK", "CAMP", "RIDE"];
    const word = words[Math.floor(Math.random() * words.length)];
    const num = Math.floor(Math.random() * 99) + 1;
    return `${word}-${num}`;
  };

  const getJoinLink = (code: string) => `${window.location.origin}/adventures/join/${code}`;

  const handleCreate = () => {
    if (!newName.trim()) { toast.error("Give your adventure a name!"); return; }
    const code = generateCode();
    const newAdventure: Adventure = {
      id: Date.now().toString(),
      name: newName,
      emoji: selectedEmoji,
      friendCode: code,
      members: [{ id: "u1", name: "You", isLeader: true, rsvp: "going", schedule: [] }],
      isLeader: true,
      description: newDescription || undefined,
      location: newLocation || undefined,
      date: newDate || undefined,
      time: newTime || undefined,
      needsCar: newNeedsCar,
      busyLevel: "chill",
      createdAt: "Just now",
    };
    setAdventures([newAdventure, ...adventures]);
    setNewName(""); setNewDescription(""); setNewLocation(""); setNewDate(""); setNewTime(""); setNewNeedsCar(false);
    setShowCreateModal(false);
    toast.success("Adventure created! Share the code with your crew.");
    setShareAdventure(newAdventure);
    setShowShareSheet(true);
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    const codeUpper = joinCode.toUpperCase();

    // Check if already in this adventure
    const existing = adventures.find(a => a.friendCode.toUpperCase() === codeUpper);
    if (existing) {
      toast.info("You're already in this adventure!");
      setJoinCode("");
      setShowJoinModal(false);
      setSelectedAdventure(existing);
      return;
    }

    // Check if code is valid
    if (!VALID_CODES.includes(codeUpper)) {
      setJoinError("Invalid code. This adventure doesn't exist. Double-check and try again.");
      return;
    }

    const newAdventure: Adventure = {
      id: Date.now().toString(),
      name: `Adventure ${codeUpper}`,
      emoji: "🎯",
      friendCode: codeUpper,
      members: [
        { id: "leader", name: "Leader", isLeader: true, rsvp: "going", schedule: [] },
        { id: "u1", name: "You", isLeader: false, rsvp: "going", schedule: [] },
      ],
      isLeader: false,
      needsCar: false,
      busyLevel: "chill",
      createdAt: "Just now",
    };
    setAdventures([newAdventure, ...adventures]);
    setJoinCode("");
    setJoinError("");
    setShowJoinModal(false);
    toast.success(`Joined adventure ${codeUpper}!`);
  };

  const handleRsvp = (adventureId: string, status: "going" | "maybe" | "declined") => {
    setAdventures(prev => prev.map(a => {
      if (a.id === adventureId) {
        return {
          ...a,
          members: a.members.map(m => m.name === "You" ? { ...m, rsvp: status } : m)
        };
      }
      return a;
    }));
    if (selectedAdventure?.id === adventureId) {
      setSelectedAdventure(prev => prev ? {
        ...prev,
        members: prev.members.map(m => m.name === "You" ? { ...m, rsvp: status } : m)
      } : null);
    }
    toast.success(`RSVP updated: ${status}`);
  };

  const handleDelete = (id: string) => {
    setAdventures(adventures.filter(a => a.id !== id));
    setSelectedAdventure(null);
    toast.success("Left the adventure.");
  };

  const handleShareText = (adv: Adventure) => {
    const link = getJoinLink(adv.friendCode);
    const message = `Join my PolyJarvis Adventure "${adv.name}"! ${adv.description ? `\n${adv.description}` : ""}\n${adv.date ? `Date: ${adv.date} ${adv.time || ""}` : ""}\n${adv.location ? `Location: ${adv.location}` : ""}\n\nJoin: ${link}\nCode: ${adv.friendCode}`;
    if (navigator.share) {
      navigator.share({ title: `Join ${adv.name}`, text: message, url: link }).catch(() => {
        window.open(`sms:?body=${encodeURIComponent(message)}`, "_blank");
      });
    } else {
      window.open(`sms:?body=${encodeURIComponent(message)}`, "_blank");
    }
  };

  const handleCopyLink = (adv: Adventure) => {
    copyToClipboard(getJoinLink(adv.friendCode));
    toast.success("Invite link copied!");
  };

  const handleCopyCode = (code: string) => {
    copyToClipboard(code);
    toast.success("Adventure code copied!");
  };

  const busyColors = { chill: "text-green-600 bg-green-100", moderate: "text-yellow-700 bg-yellow-100", packed: "text-red-600 bg-red-100" };
  const busyLabels = { chill: "Chill vibes", moderate: "Moderately busy", packed: "Gonna be packed" };
  const rsvpColors = { going: "bg-green-500 text-white", maybe: "bg-yellow-500 text-white", declined: "bg-red-400 text-white", pending: "bg-gray-300 text-gray-600" };

  return (
    <div className="min-h-[100dvh] pb-20 flex flex-col relative overflow-hidden bg-transparent text-white">
      {/* Header */}
      <div className="relative z-10 px-5 pt-6 pb-4 border-b border-white/10 backdrop-blur-md bg-black/20">
        {!selectedAdventure ? (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="text-[#8BC34A]">
                <LeafLogo size={36} />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  Adventures
                </h1>
                <p className="text-xs text-white/50 font-medium tracking-wider uppercase">Plan. Explore. Together.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowJoinModal(true); setJoinError(""); }}
                className="p-2.5 bg-white/10 backdrop-blur-sm rounded-full text-white/70 hover:bg-white/20 transition-colors border border-white/10"
              >
                <Hash size={20} />
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-2.5 bg-[#8BC34A] rounded-full text-[#1a2e10] hover:bg-[#9CCC65] transition-colors shadow-lg shadow-[#8BC34A]/30"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedAdventure(null)} className="p-1 -ml-1 text-white/60 hover:text-white">
              <ArrowLeft size={24} />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white leading-tight flex items-center gap-2">
                <span className="text-xl">{selectedAdventure.emoji}</span>
                <span className="truncate">{selectedAdventure.name}</span>
              </h2>
              <button
                onClick={() => handleCopyCode(selectedAdventure.friendCode)}
                className="text-xs text-white/40 flex items-center gap-1 hover:text-[#8BC34A] transition-colors mt-0.5"
              >
                Code: <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded font-bold">{selectedAdventure.friendCode}</span>
                <Copy size={10} />
              </button>
            </div>
            <button
              onClick={() => { setShareAdventure(selectedAdventure); setShowShareSheet(true); }}
              className="p-2.5 bg-[#8BC34A]/20 rounded-full text-[#8BC34A] hover:bg-[#8BC34A]/30 transition-colors"
            >
              <Share2 size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto relative z-10">
        {!selectedAdventure ? (
          // Adventure List
          <div className="p-4 space-y-3">
            {adventures.length === 0 ? (
              <div className="text-center py-20 px-6">
                <div className="text-[#8BC34A] mx-auto w-fit mb-4"><LeafLogo size={72} /></div>
                <h3 className="text-xl font-bold text-white mb-2">No Adventures Yet</h3>
                <p className="text-white/50 text-base mb-6">Start an adventure to explore SLO with your crew.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-[#8BC34A] text-[#1a2e10] rounded-full font-bold text-base shadow-lg shadow-[#8BC34A]/30 hover:bg-[#9CCC65] transition-colors"
                >
                  Start an Adventure
                </button>
              </div>
            ) : (
              adventures.map((adv) => (
                <motion.div
                  key={adv.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-4 hover:bg-white/15 transition-all cursor-pointer active:scale-[0.98] group"
                  onClick={() => setSelectedAdventure(adv)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#8BC34A]/20 flex items-center justify-center text-2xl flex-shrink-0 border border-[#8BC34A]/20">
                      {adv.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-lg font-bold text-white truncate">{adv.name}</h3>
                        {adv.isLeader && <Crown size={14} className="text-[#C69214] flex-shrink-0 mt-1" />}
                      </div>
                      {adv.location && (
                        <p className="text-xs text-white/40 flex items-center gap-1 mb-1"><MapPin size={10} />{adv.location}</p>
                      )}
                      {adv.date && (
                        <p className="text-xs text-[#8BC34A]/80 flex items-center gap-1 mb-2"><Calendar size={10} />{adv.date} {adv.time && `at ${adv.time}`}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-xs text-white/50"><Users size={12} />{adv.members.length}</span>
                          {adv.needsCar && <span className="flex items-center gap-1 text-xs text-yellow-400/80"><Car size={12} />Car</span>}
                        </div>
                        <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        ) : (
          // Adventure Detail
          <div className="p-5 space-y-5">
            {/* Hero Image */}
            {selectedAdventure.image && (
              <div className="relative rounded-2xl overflow-hidden h-48 border border-white/10">
                <img src={selectedAdventure.image} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h2 className="text-2xl font-bold text-white drop-shadow-lg">{selectedAdventure.name}</h2>
                  {selectedAdventure.location && (
                    <p className="text-white/80 text-sm flex items-center gap-1 mt-1"><MapPin size={12} />{selectedAdventure.location}</p>
                  )}
                </div>
              </div>
            )}

            {/* Event Details Card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-[#8BC34A] uppercase tracking-widest flex items-center gap-1"><Leaf size={12} /> Adventure Details</h3>
              {selectedAdventure.description && (
                <p className="text-sm text-white/80 leading-relaxed">{selectedAdventure.description}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                {selectedAdventure.date && (
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <Calendar size={14} className="text-[#8BC34A] mb-1" />
                    <p className="text-xs text-white/40">Date</p>
                    <p className="text-sm font-bold text-white">{selectedAdventure.date}</p>
                  </div>
                )}
                {selectedAdventure.time && (
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <Clock size={14} className="text-[#8BC34A] mb-1" />
                    <p className="text-xs text-white/40">Time</p>
                    <p className="text-sm font-bold text-white">{selectedAdventure.time}</p>
                  </div>
                )}
              </div>

              {/* Busy Level */}
              <div className="flex items-center gap-2">
                <span className={clsx("text-xs font-bold px-3 py-1 rounded-full", busyColors[selectedAdventure.busyLevel])}>
                  {busyLabels[selectedAdventure.busyLevel]}
                </span>
                {selectedAdventure.needsCar && (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-yellow-900/50 text-yellow-300 border border-yellow-500/30 flex items-center gap-1">
                    <Car size={12} /> Car needed
                  </span>
                )}
              </div>
            </div>

            {/* Zipcar Map (for car-needed adventures) */}
            {selectedAdventure.needsCar && selectedAdventure.zipcarNote && (
              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 space-y-3">
                  <h3 className="text-xs font-bold text-[#8BC34A] uppercase tracking-widest flex items-center gap-1"><Car size={12} /> Nearest Zipcar</h3>
                  <p className="text-sm text-white/70">{selectedAdventure.zipcarNote}</p>
                </div>
                {/* Map placeholder */}
                <div className="relative h-40 bg-[#1a3a0f] border-t border-white/5">
                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* Simple map visualization */}
                    <svg viewBox="0 0 400 160" className="w-full h-full opacity-40">
                      <rect width="400" height="160" fill="#1a3a0f" />
                      {/* Grid lines */}
                      {[40,80,120,160,200,240,280,320,360].map(x => (
                        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="160" stroke="#2a5a1a" strokeWidth="0.5" />
                      ))}
                      {[40,80,120].map(y => (
                        <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} stroke="#2a5a1a" strokeWidth="0.5" />
                      ))}
                      {/* Roads */}
                      <line x1="0" y1="80" x2="400" y2="80" stroke="#3a7a2a" strokeWidth="3" />
                      <line x1="200" y1="0" x2="200" y2="160" stroke="#3a7a2a" strokeWidth="3" />
                      <line x1="100" y1="0" x2="300" y2="160" stroke="#3a7a2a" strokeWidth="1.5" />
                    </svg>
                  </div>
                  {/* Location marker */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
                    <div className="relative">
                      <div className="w-8 h-8 bg-[#8BC34A] rounded-full border-3 border-white shadow-lg flex items-center justify-center">
                        <Car size={14} className="text-white" />
                      </div>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#8BC34A] rotate-45" />
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="text-[10px] font-bold text-[#8BC34A] bg-[#1a2e10]/80 px-2 py-0.5 rounded-full">Grand Ave (0.3 mi)</span>
                      </div>
                    </div>
                  </div>
                  {/* You marker */}
                  <div className="absolute top-[40%] left-[35%]">
                    <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
                    <span className="text-[9px] font-bold text-blue-400 ml-5 -mt-3 absolute whitespace-nowrap">You</span>
                  </div>
                </div>
              </div>
            )}

            {/* RSVP Section */}
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-[#8BC34A] uppercase tracking-widest mb-3">Your RSVP</h3>
              <div className="flex gap-2">
                {(["going", "maybe", "declined"] as const).map(status => {
                  const myRsvp = selectedAdventure.members.find(m => m.name === "You")?.rsvp;
                  const labels = { going: "I'm Going!", maybe: "Maybe", declined: "Can't Make It" };
                  const icons = { going: "✅", maybe: "🤔", declined: "❌" };
                  return (
                    <button
                      key={status}
                      onClick={() => handleRsvp(selectedAdventure.id, status)}
                      className={clsx(
                        "flex-1 py-3 rounded-xl font-bold text-sm transition-all border",
                        myRsvp === status
                          ? "bg-[#8BC34A] text-[#1a2e10] border-[#8BC34A] shadow-lg"
                          : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                      )}
                    >
                      {icons[status]} {labels[status]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Share Section */}
            <div className="bg-gradient-to-br from-[#8BC34A]/20 to-[#4A6628]/30 backdrop-blur-md rounded-2xl p-5 space-y-3 border border-[#8BC34A]/20">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><TreePine size={18} className="text-[#8BC34A]" /> Invite Friends</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleShareText(selectedAdventure)}
                  className="flex-1 py-3 bg-white/10 backdrop-blur-sm rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 hover:bg-white/20 transition-colors border border-white/10"
                >
                  <MessageSquare size={16} /> Text
                </button>
                <button
                  onClick={() => handleCopyLink(selectedAdventure)}
                  className="flex-1 py-3 bg-white/10 backdrop-blur-sm rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 hover:bg-white/20 transition-colors border border-white/10"
                >
                  <LinkIcon size={16} /> Copy Link
                </button>
              </div>
              <div className="flex items-center justify-center gap-2 bg-black/20 rounded-lg py-2 px-3">
                <span className="font-mono text-lg font-bold tracking-widest text-[#8BC34A]">{selectedAdventure.friendCode}</span>
                <button onClick={() => handleCopyCode(selectedAdventure.friendCode)}>
                  <Copy size={14} className="text-white/40 hover:text-white" />
                </button>
              </div>
            </div>

            {/* Members */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#8BC34A] uppercase tracking-widest flex items-center gap-2">
                  <Users size={14} /> Crew ({selectedAdventure.members.length})
                </h3>
                <button
                  onClick={() => setShowScheduleCompare(!showScheduleCompare)}
                  className="text-xs text-white/40 hover:text-[#8BC34A] transition-colors font-bold flex items-center gap-1"
                >
                  <Clock size={12} /> {showScheduleCompare ? "Hide" : "Compare"} Schedules
                </button>
              </div>
              <div className="space-y-2">
                {selectedAdventure.members.map((member) => (
                  <div
                    key={member.id}
                    className="bg-white/8 backdrop-blur-sm rounded-xl border border-white/10 p-3 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-base font-bold text-white border border-white/10">
                      {member.name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{member.name}</span>
                        {member.isLeader && (
                          <span className="text-[10px] bg-[#C69214]/20 text-[#C69214] px-2 py-0.5 rounded-full font-bold">Leader</span>
                        )}
                        <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-bold", rsvpColors[member.rsvp])}>
                          {member.rsvp}
                        </span>
                      </div>
                      {showScheduleCompare && member.schedule && member.schedule.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {member.schedule.map((s, i) => (
                            <span key={i} className="text-[10px] bg-white/10 text-white/50 px-2 py-0.5 rounded font-mono">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Schedule Overlap */}
              {showScheduleCompare && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 bg-[#8BC34A]/10 border border-[#8BC34A]/20 rounded-xl p-3"
                >
                  <p className="text-xs font-bold text-[#8BC34A] mb-1">Best overlap:</p>
                  <p className="text-sm text-white/80 font-bold">Sat 11:00 AM - 3:00 PM</p>
                  <p className="text-xs text-white/40 mt-1">All 3 members are free during this window</p>
                </motion.div>
              )}
            </div>

            {/* Leave / Delete */}
            <button
              onClick={() => handleDelete(selectedAdventure.id)}
              className="w-full py-3 text-red-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-500/10 rounded-xl transition-colors border border-red-500/20"
            >
              <Trash2 size={16} />
              {selectedAdventure.isLeader ? "Delete Adventure" : "Leave Adventure"}
            </button>
          </div>
        )}
      </div>

      <BottomNav />

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a2e10] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center gap-2 mb-5">
                <LeafLogo size={24} className="text-[#8BC34A]" />
                <h3 className="text-xl font-bold text-white">New Adventure</h3>
              </div>

              <div className="space-y-4">
                {/* Emoji */}
                <div>
                  <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Pick a vibe</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {adventureEmojis.map((e) => (
                      <button
                        key={e}
                        onClick={() => setSelectedEmoji(e)}
                        className={clsx(
                          "w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all",
                          selectedEmoji === e
                            ? "bg-[#8BC34A] scale-110 shadow-lg shadow-[#8BC34A]/30"
                            : "bg-white/10 hover:bg-white/15"
                        )}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Adventure Name *</label>
                  <input type="text" placeholder="e.g. Pismo Beach Trip" value={newName} onChange={(e) => setNewName(e.target.value)}
                    className="w-full mt-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:border-[#8BC34A] outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Description</label>
                  <textarea placeholder="What's the plan?" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={2}
                    className="w-full mt-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:border-[#8BC34A] outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Location</label>
                  <div className="relative mt-1">
                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input type="text" placeholder="e.g. Pismo Beach, CA" value={newLocation} onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full bg-white/10 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/30 focus:border-[#8BC34A] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Date</label>
                    <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                      className="w-full mt-1 bg-white/10 border border-white/10 rounded-xl px-3 py-3 text-white focus:border-[#8BC34A] outline-none [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Time</label>
                    <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)}
                      className="w-full mt-1 bg-white/10 border border-white/10 rounded-xl px-3 py-3 text-white focus:border-[#8BC34A] outline-none [color-scheme:dark]"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 cursor-pointer">
                  <input type="checkbox" checked={newNeedsCar} onChange={(e) => setNewNeedsCar(e.target.checked)}
                    className="w-5 h-5 accent-[#8BC34A] rounded"
                  />
                  <div>
                    <span className="text-sm font-bold text-white flex items-center gap-1"><Car size={14} /> Needs a car?</span>
                    <span className="text-xs text-white/40">We'll show Zipcar locations</span>
                  </div>
                </label>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 text-white/40 font-bold rounded-xl hover:bg-white/5 transition-colors border border-white/10"
                  >
                    Cancel
                  </button>
                  <button onClick={handleCreate}
                    className="flex-1 py-3 bg-[#8BC34A] text-[#1a2e10] rounded-xl font-bold shadow-lg shadow-[#8BC34A]/30 hover:bg-[#9CCC65] transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Join Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a2e10] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-5">
                <LeafLogo size={24} className="text-[#8BC34A]" />
                <h3 className="text-xl font-bold text-white">Join Adventure</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Adventure Code</label>
                  <input
                    type="text"
                    placeholder="e.g. PISMO-7"
                    value={joinCode}
                    onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
                    className={clsx(
                      "w-full mt-1 bg-white/10 border rounded-xl px-4 py-3 font-mono text-lg uppercase text-center tracking-widest text-white placeholder:text-white/30 outline-none",
                      joinError ? "border-red-500" : "border-white/10 focus:border-[#8BC34A]"
                    )}
                  />
                  {joinError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-red-400 mt-2 flex items-start gap-1"
                    >
                      <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {joinError}
                    </motion.p>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => { setShowJoinModal(false); setJoinError(""); }}
                    className="flex-1 py-3 text-white/40 font-bold rounded-xl hover:bg-white/5 transition-colors border border-white/10"
                  >
                    Cancel
                  </button>
                  <button onClick={handleJoin}
                    className="flex-1 py-3 bg-[#8BC34A] text-[#1a2e10] rounded-xl font-bold shadow-lg shadow-[#8BC34A]/30 hover:bg-[#9CCC65] transition-colors"
                  >
                    Join
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Sheet */}
      <AnimatePresence>
        {showShareSheet && shareAdventure && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowShareSheet(false)}>
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#1a2e10] border-t border-white/10 rounded-t-3xl w-full max-w-lg p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
              <h3 className="text-xl font-bold text-white mb-1">Share "{shareAdventure.name}"</h3>
              <p className="text-sm text-white/40 mb-5">Invite your crew to this adventure</p>
              <div className="space-y-3">
                <button onClick={() => handleShareText(shareAdventure)}
                  className="w-full py-4 bg-[#8BC34A] text-[#1a2e10] rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg"
                >
                  <MessageSquare size={22} /> Send via Text
                </button>
                <button onClick={() => handleCopyLink(shareAdventure)}
                  className="w-full py-4 bg-white/10 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 border border-white/10"
                >
                  <LinkIcon size={22} /> Copy Invite Link
                </button>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <p className="text-xs text-white/40 uppercase tracking-wider font-bold mb-2">Or share this code</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-mono text-3xl font-bold tracking-widest text-[#8BC34A]">{shareAdventure.friendCode}</span>
                    <button onClick={() => handleCopyCode(shareAdventure.friendCode)} className="p-2 bg-white/10 rounded-lg">
                      <Copy size={16} className="text-white/60" />
                    </button>
                  </div>
                </div>
                <button onClick={() => setShowShareSheet(false)} className="w-full py-3 text-white/40 font-bold">Done</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Auto-Join Page
export function AdventureJoin() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const codeUpper = (code || "").toUpperCase();
    const timer = setTimeout(() => {
      if (VALID_CODES.includes(codeUpper)) {
        setJoining(false);
        toast.success(`Joined adventure ${codeUpper}!`);
      } else {
        setJoining(false);
        setFailed(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [code]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-transparent">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center space-y-6 max-w-sm relative z-10"
      >
        <div className="text-[#8BC34A] mx-auto w-fit"><LeafLogo size={80} /></div>
        {joining ? (
          <>
            <h1 className="text-2xl font-bold text-white">Joining Adventure...</h1>
            <p className="text-white/50 text-lg">Code: <span className="font-mono font-bold text-[#8BC34A]">{code}</span></p>
            <div className="w-12 h-12 border-4 border-[#8BC34A]/30 border-t-[#8BC34A] rounded-full animate-spin mx-auto" />
          </>
        ) : failed ? (
          <>
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={40} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Adventure Not Found</h1>
            <p className="text-white/50">The code <span className="font-mono font-bold text-red-400">{code}</span> doesn't match any adventure. Double-check and try again.</p>
            <button
              onClick={() => navigate("/adventures")}
              className="px-8 py-4 bg-white/10 text-white rounded-full font-bold text-lg border border-white/10"
            >
              Go to Adventures
            </button>
          </>
        ) : (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 10, stiffness: 200 }}>
              <div className="w-20 h-20 bg-[#8BC34A]/20 rounded-full flex items-center justify-center mx-auto">
                <Check size={40} className="text-[#8BC34A]" />
              </div>
            </motion.div>
            <h1 className="text-2xl font-bold text-white">You're In!</h1>
            <p className="text-white/50">Joined adventure with code <span className="font-mono font-bold text-[#8BC34A]">{code}</span></p>
            <button
              onClick={() => navigate("/adventures")}
              className="px-8 py-4 bg-[#8BC34A] text-[#1a2e10] rounded-full font-bold text-lg shadow-xl"
            >
              Open Adventures
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}