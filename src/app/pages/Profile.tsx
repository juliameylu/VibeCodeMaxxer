import { Link, useNavigate } from "react-router";
import { User, Settings, LogOut, ChevronRight, CalendarDays, ArrowRight, UserPlus, Leaf, BookOpen, Coffee, Lock, Camera, Sparkles, ThumbsUp, ThumbsDown, Eye, Pin, BarChart3, Palette, MapPin, Type } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { PageHeader } from "../components/PageHeader";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "/utils/supabase/client";
import { getSettings, updateSettings } from "../utils/settings";
import { places } from "../data/places";
import { trainingPrompts } from "../utils/preferences";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, ResponsiveContainer } from "recharts";

const STATUS_KEY = "polyjarvis_status";
const AVATAR_KEY = "polyjarvis_avatar";
const HEAD_CIRCLE_KEY = "polyjarvis_head_circle";
const TRAIN_KEY = "polyjarvis_training";
const BANNER_KEY = "polyjarvis_banner";
const BIO_KEY = "polyjarvis_bio";
const TAGS_KEY = "polyjarvis_tags";

const interestTagOptions = [
  "Hiking", "Beach Days", "Coffee Runs", "Study Groups", "Live Music",
  "Food Adventures", "Photography", "Surfing", "Wine Tasting", "Fitness",
  "Camping", "Art", "Gaming", "Film", "Yoga", "Cooking", "Road Trips",
  "Thrifting", "Farmers Markets", "Sunset Chasing"
];

const statusOptions = [
  { id: "exploring", emoji: "🌿", label: "Exploring", color: "#8BC34A", icon: Leaf },
  { id: "studying", emoji: "📚", label: "Studying", color: "#F2E8CF", icon: BookOpen },
  { id: "chilling", emoji: "☕", label: "Chilling", color: "#008080", icon: Coffee },
  { id: "busy", emoji: "🔒", label: "Busy", color: "#EF5350", icon: Lock },
] as const;

type StatusId = typeof statusOptions[number]["id"];

export function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [likedCount, setLikedCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [status, setStatus] = useState<StatusId>("exploring");
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const pinnedSectionRef = useRef<HTMLDivElement>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);

  // Train Jarvis state
  const [likes, setLikes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(TRAIN_KEY + "_likes") || "[]"); } catch { return []; }
  });
  const [dislikes, setDislikes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(TRAIN_KEY + "_dislikes") || "[]"); } catch { return []; }
  });
  const [showTrainer, setShowTrainer] = useState(false);

  const remainingPrompts = trainingPrompts.filter(p => !likes.includes(p.id) && !dislikes.includes(p.id));
  const currentPrompt = remainingPrompts[0];

  const handleTrainSwipe = (like: boolean) => {
    if (!currentPrompt) return;
    if (like) {
      const updated = [...likes, currentPrompt.id];
      setLikes(updated);
      localStorage.setItem(TRAIN_KEY + "_likes", JSON.stringify(updated));
      toast.success(`${currentPrompt.emoji} Got it! You like ${currentPrompt.label}`);
    } else {
      const updated = [...dislikes, currentPrompt.id];
      setDislikes(updated);
      localStorage.setItem(TRAIN_KEY + "_dislikes", JSON.stringify(updated));
    }
    if (remainingPrompts.length <= 1) {
      toast.success("Training complete! Heading to your personalized picks...");
      setShowTrainer(false);
      // Navigate to Explore "For You" after a brief delay
      setTimeout(() => {
        navigate("/explore", { state: { category: "For You" } });
      }, 800);
    }
  };

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();

    const liked = localStorage.getItem("pinnedEvents");
    if (liked) setLikedCount(JSON.parse(liked).length);
    const events = localStorage.getItem("polyjarvis_my_events");
    if (events) setEventCount(JSON.parse(events).length);
    const saved = localStorage.getItem(STATUS_KEY);
    if (saved) setStatus(saved as StatusId);
    const avatar = localStorage.getItem(AVATAR_KEY);
    if (avatar) setAvatarUrl(avatar);
    const banner = localStorage.getItem(BANNER_KEY);
    if (banner) setBannerUrl(banner);
    const savedBio = localStorage.getItem(BIO_KEY);
    if (savedBio) setBio(savedBio);
    try { const savedTags = JSON.parse(localStorage.getItem(TAGS_KEY) || "[]"); setTags(savedTags); } catch {}
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/");
  };

  const changeStatus = (newStatus: StatusId) => {
    setStatus(newStatus);
    localStorage.setItem(STATUS_KEY, newStatus);
    setShowStatusPicker(false);
    const s = statusOptions.find(o => o.id === newStatus)!;
    toast.success(`Status set to ${s.emoji} ${s.label}`);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarUrl(dataUrl);
      localStorage.setItem(AVATAR_KEY, dataUrl);
      localStorage.setItem(HEAD_CIRCLE_KEY, dataUrl);
      toast.success("Profile picture updated!");
    };
    reader.readAsDataURL(file);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setBannerUrl(dataUrl);
      localStorage.setItem(BANNER_KEY, dataUrl);
      toast.success("Banner updated!");
    };
    reader.readAsDataURL(file);
  };

  const saveBio = () => {
    const trimmed = bioInput.trim();
    setBio(trimmed);
    localStorage.setItem(BIO_KEY, trimmed);
    setEditingBio(false);
    if (trimmed) toast.success("Bio saved");
  };

  const toggleTag = (tag: string) => {
    const updated = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag].slice(0, 8);
    setTags(updated);
    localStorage.setItem(TAGS_KEY, JSON.stringify(updated));
  };

  const currentStatus = statusOptions.find(s => s.id === status)!;

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-transparent">
        <div className="w-8 h-8 border-3 border-[#F2E8CF]/20 border-t-[#F2E8CF] rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-[100dvh] bg-transparent pb-24 flex flex-col items-center justify-center px-6">
        <PageHeader />
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-white/10 rounded-full mx-auto flex items-center justify-center mb-4">
            <User size={36} className="text-white/25" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 capitalize tracking-wide">Sign In to PolyJarvis</h2>
          <p className="text-sm text-white/35 mb-6">Save events, manage groups, and get personalized recommendations.</p>
          <Link to="/signin">
            <button className="w-full py-3.5 bg-white text-[#233216] rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform">
              Sign In <ArrowRight size={18} />
            </button>
          </Link>
          <Link to="/signin" className="block mt-3">
            <span className="text-sm text-[#F2E8CF] font-bold">Or Create Account</span>
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-transparent pb-24 text-white">
      <PageHeader />

      {/* Header with Banner */}
      <div className="relative overflow-hidden rounded-b-[2.5rem]">
        {/* Banner */}
        <div className="h-28 relative">
          {bannerUrl ? (
            <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1a2e10]/60 to-[#0d1208]/40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0d1208]/80" />
          <button onClick={() => bannerInputRef.current?.click()}
            className="absolute top-3 right-3 p-1.5 bg-black/40 backdrop-blur-sm rounded-lg text-white/60 active:scale-90 transition-transform">
            <Camera size={14} />
          </button>
          <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
        </div>

        {/* Avatar overlapping banner */}
        <div className="relative z-10 flex flex-col items-center -mt-12 pb-5 px-6 text-center">
          <div className="relative group">
            <div className="w-20 h-20 bg-[#F2E8CF]/15 backdrop-blur-sm rounded-full border-3 border-[#F2E8CF]/25 flex items-center justify-center text-3xl font-bold text-[#F2E8CF] overflow-hidden shadow-xl shadow-black/30">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user.email?.[0].toUpperCase() || <User size={36} />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 bg-[#F2E8CF] rounded-full flex items-center justify-center border-2 border-[#1a2e10] active:scale-90 transition-transform"
            >
              <Camera size={13} className="text-[#233216]" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>
          <div className="mt-2">
            <h1 className="text-xl font-bold">{user.user_metadata?.name || "Student Explorer"}</h1>
            <p className="text-white/35 text-xs font-medium">{user.email}</p>
          </div>

          {/* Bio */}
          <div className="mt-2 w-full max-w-[280px]">
            {editingBio ? (
              <div className="flex gap-2">
                <input value={bioInput} onChange={e => setBioInput(e.target.value)} onKeyDown={e => e.key === "Enter" && saveBio()}
                  placeholder="Write a short bio..." maxLength={120}
                  className="flex-1 bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-[#F2E8CF]/30" autoFocus />
                <button onClick={saveBio} className="px-2 py-1.5 bg-[#F2E8CF] text-[#233216] rounded-lg text-[10px] font-bold">OK</button>
              </div>
            ) : (
              <button onClick={() => { setEditingBio(true); setBioInput(bio); }} className="text-xs text-white/40 italic hover:text-white/60 transition-colors">
                {bio || "Tap to add a bio..."}
              </button>
            )}
          </div>

          {/* Interest Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center mt-2.5 max-w-[300px]">
              {tags.map(tag => (
                <span key={tag} className="text-[9px] font-bold text-[#F2E8CF]/70 bg-[#F2E8CF]/10 border border-[#F2E8CF]/15 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}
          <button onClick={() => setShowTagPicker(!showTagPicker)} className="text-[9px] font-bold text-white/25 mt-1.5 active:scale-95 transition-transform">
            {tags.length > 0 ? "Edit interests" : "+ Add interests"}
          </button>

          {/* Status badge — tappable */}
          <button
            onClick={() => setShowStatusPicker(!showStatusPicker)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border transition-all active:scale-95 mt-2"
            style={{ backgroundColor: `${currentStatus.color}15`, borderColor: `${currentStatus.color}30` }}
          >
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentStatus.color }} />
            <span className="text-xs font-bold tracking-wide" style={{ color: currentStatus.color }}>
              {currentStatus.label}
            </span>
            <ChevronRight size={12} className="text-white/20 rotate-90" />
          </button>
        </div>
      </div>

      {/* Tag Picker */}
      {showTagPicker && (
        <div className="px-5 -mt-2 relative z-30 mb-2">
          <div className="bg-[#1a2e10]/95 backdrop-blur-xl border border-white/15 rounded-xl p-3">
            <p className="text-[9px] font-semibold text-white/30 capitalize tracking-wider mb-2">Pick Up to 8 Interests</p>
            <div className="flex flex-wrap gap-1.5">
              {interestTagOptions.map(tag => (
                <button key={tag} onClick={() => toggleTag(tag)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all active:scale-95 ${
                    tags.includes(tag) ? "bg-[#F2E8CF] text-[#233216]" : "bg-white/8 text-white/40 border border-white/10"
                  }`}>{tag}</button>
              ))}
            </div>
            <button onClick={() => setShowTagPicker(false)} className="w-full mt-2 py-1.5 text-[10px] font-bold text-white/30">Done</button>
          </div>
        </div>
      )}

      {/* Status picker dropdown */}
      {showStatusPicker && (
        <div className="px-5 -mt-4 relative z-30 mb-2">
          <div className="bg-[#1a2e10]/95 backdrop-blur-xl border border-white/15 rounded-xl p-2 space-y-1">
            <p className="text-[9px] font-semibold text-white/30 capitalize tracking-wider px-2 pt-1">Set Your Status</p>
            {statusOptions.map(opt => {
              const StatusIcon = opt.icon;
              return (
              <button
                key={opt.id}
                onClick={() => changeStatus(opt.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  status === opt.id ? "bg-white/12" : "active:bg-white/6"
                }`}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${opt.color}20` }}>
                  <StatusIcon size={16} style={{ color: opt.color }} />
                </div>
                <span className="text-sm font-bold" style={{ color: status === opt.id ? opt.color : "rgba(255,255,255,0.65)" }}>
                  {opt.label}
                </span>
                {status === opt.id && (
                  <div className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                )}
              </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="px-5 mt-4 relative z-20">
        <div className="bg-transparent backdrop-blur-sm rounded-2xl p-4 border border-white/30 flex justify-around text-center shadow-lg">
          <div>
            <div className="text-xl font-bold text-[#F2E8CF]">{eventCount}</div>
            <div className="text-[9px] capitalize font-semibold text-white/50 tracking-wider">Events</div>
          </div>
          <div className="cursor-pointer active:scale-95 transition-transform"
            onClick={() => pinnedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            <div className="text-xl font-bold text-[#F2E8CF]">{likedCount}</div>
            <div className="text-[9px] capitalize font-semibold text-white/50 tracking-wider">Pinned</div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#F2E8CF]">SLO</div>
            <div className="text-[9px] capitalize font-semibold text-white/50 tracking-wider">Home</div>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="px-5 mt-6 space-y-2">
        <Link to="/friends">
          <MenuItem icon={UserPlus} label="Friends" desc="View friends & invite new ones" />
        </Link>
        <Link to="/myevents">
          <MenuItem icon={CalendarDays} label="My Events" desc="Confirmed & maybe events" />
        </Link>

        {/* Settings — contains Preferences, Tutorial, Display options */}
        <div className="pt-2">
          <p className="text-[10px] font-semibold text-white/30 capitalize tracking-wider px-1 mb-2">Settings</p>
          <div className="space-y-2">
            <Link to="/preferences">
              <MenuItem icon={Settings} label="Preferences" desc="Update interests & transport" />
            </Link>
            <Link to="/tutorial">
              <MenuItem icon={Sparkles} label="App Tutorial" desc="Learn how to use PolyJarvis" />
            </Link>
          </div>
        </div>

        {/* Pinned Places Section */}
        <div ref={pinnedSectionRef}>
          <PinnedSection navigate={navigate} />
        </div>

        {/* Customize Section */}
        <div className="pt-3">
          <CustomizeSection />
        </div>

        {/* Analytics Section */}
        <div className="pt-3">
          <AnalyticsSection />
        </div>

        {/* Train Jarvis Widget */}
        <div className="pt-3">
          <div className="bg-gradient-to-r from-[#F2E8CF]/10 to-[#F2E8CF]/5 border border-[#F2E8CF]/15 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowTrainer(!showTrainer)}
              className="w-full flex items-center gap-3 p-4"
            >
              <div className="p-2 bg-[#F2E8CF]/15 rounded-lg">
                <Sparkles size={18} className="text-[#F2E8CF]" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-[#F2E8CF] text-sm">Train Jarvis</p>
                <p className="text-[10px] text-white/35">
                  {remainingPrompts.length > 0
                    ? `${likes.length + dislikes.length}/${trainingPrompts.length} preferences set`
                    : "All done! Jarvis knows your style"}
                </p>
              </div>
              <ChevronRight size={14} className={`text-white/20 transition-transform ${showTrainer ? "rotate-90" : ""}`} />
            </button>

            {showTrainer && currentPrompt && (
              <div className="px-4 pb-4 pt-1">
                <p className="text-[9px] font-semibold text-white/25 capitalize tracking-wider mb-3">
                  {currentPrompt.category} · Swipe to Train
                </p>
                <div className="bg-white/10 border border-white/15 rounded-xl p-5 text-center mb-3">
                  <span className="text-4xl block mb-2">{currentPrompt.emoji}</span>
                  <p className="text-base font-bold text-white">{currentPrompt.label}</p>
                  <p className="text-[10px] text-white/30 mt-1">Do you like this?</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleTrainSwipe(false)}
                    className="flex-1 py-3 bg-red-500/15 border border-red-500/20 rounded-xl text-red-400 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <ThumbsDown size={16} /> Nope
                  </button>
                  <button
                    onClick={() => handleTrainSwipe(true)}
                    className="flex-1 py-3 bg-[#8BC34A]/15 border border-[#8BC34A]/20 rounded-xl text-[#8BC34A] font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <ThumbsUp size={16} /> Love It
                  </button>
                </div>
                <p className="text-[9px] text-white/20 text-center mt-2">
                  {remainingPrompts.length - 1} remaining
                </p>
              </div>
            )}

            {showTrainer && !currentPrompt && (
              <div className="px-4 pb-4 pt-1 text-center">
                <p className="text-2xl mb-2">🎉</p>
                <p className="text-sm font-bold text-[#F2E8CF]">All preferences set!</p>
                <p className="text-xs text-white/30 mt-1">Jarvis will personalize your recommendations</p>
                <button
                  onClick={() => navigate("/explore", { state: { category: "For You" } })}
                  className="mt-3 px-4 py-2 bg-[#F2E8CF] text-[#233216] rounded-full text-xs font-bold tracking-wide active:scale-95 transition-transform flex items-center gap-1.5 mx-auto"
                >
                  <Sparkles size={12} /> See Your Picks
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 text-white/40 hover:text-red-400 hover:border-red-400/20 active:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            <span className="font-semibold text-sm">Sign Out</span>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function SettingsToggles() {
  const [settings, setSettings] = useState(() => getSettings());

  const toggle = (key: "showTutorial") => {
    const updated = updateSettings({ [key]: !settings[key] });
    setSettings(updated);
    toast.success(`Tutorial ${updated[key] ? "enabled" : "hidden"}`);
  };

  return (
    <div className="bg-white/8 border border-white/12 rounded-xl p-4 space-y-3">
      <p className="text-[9px] font-semibold text-white/30 capitalize tracking-wider">Display</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-white/40" />
          <span className="text-sm font-bold text-white/65">Show Tutorial</span>
        </div>
        <button
          onClick={() => toggle("showTutorial")}
          className={`w-10 h-6 rounded-full transition-all flex items-center px-0.5 ${settings.showTutorial ? "bg-[#F2E8CF]" : "bg-white/15"}`}
        >
          <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.showTutorial ? "translate-x-4" : "translate-x-0"}`} />
        </button>
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, desc }: { icon: any; label: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-transparent rounded-xl border border-white/20 active:bg-white/5 transition-colors shadow-sm">
      <div className="p-2 bg-white/10 rounded-lg"><Icon size={18} className="text-[#F2E8CF]" /></div>
      <div className="flex-1">
        <p className="font-semibold text-white text-sm">{label}</p>
        <p className="text-[11px] text-white/50">{desc}</p>
      </div>
      <ChevronRight size={16} className="text-white/30" />
    </div>
  );
}

function PinnedSection({ navigate }: { navigate: any }) {
  const pinnedIds: string[] = (() => {
    try { return JSON.parse(localStorage.getItem("pinnedEvents") || "[]"); } catch { return []; }
  })();
  const pinnedPlaces = places.filter(p => pinnedIds.includes(p.id));

  if (pinnedPlaces.length === 0) {
    return (
      <div className="pt-3">
        <div className="bg-[#c4a46c]/10 border border-[#c4a46c]/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Pin size={14} className="text-[#c4a46c]" />
            <p className="text-[9px] font-semibold text-[#c4a46c]/70 capitalize tracking-wider">My Pinned Spots</p>
          </div>
          <p className="text-xs text-white/40 mb-3">Pin places from Explore to save them here.</p>
          <button onClick={() => navigate("/explore")} className="px-4 py-2 bg-[#c4a46c]/20 border border-[#c4a46c]/25 rounded-lg text-[10px] font-bold text-[#c4a46c] active:scale-95 transition-transform">
            Browse Explore
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-3">
      <div className="bg-[#c4a46c]/10 border border-[#c4a46c]/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Pin size={14} className="text-[#c4a46c]" />
            <p className="text-[9px] font-semibold text-[#c4a46c]/70 capitalize tracking-wider">My Pinned Spots ({pinnedPlaces.length})</p>
          </div>
          <button onClick={() => navigate("/explore")} className="text-[9px] font-bold text-[#c4a46c]">View All</button>
        </div>
        <div className="space-y-1.5">
          {pinnedPlaces.slice(0, 5).map(place => (
            <div
              key={place.id}
              onClick={() => navigate(`/event/${place.id}`)}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-[#1a2e10]/60 border border-[#c4a46c]/12 active:bg-[#c4a46c]/15 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 border border-white/10">
                <img src={place.image} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white/80 truncate">{place.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-[#c4a46c]/70 font-semibold">{place.category}</span>
                  <span className="text-[9px] text-white/15">&middot;</span>
                  <span className="text-[9px] text-white/40">{place.price}</span>
                </div>
              </div>
              <Pin size={12} className="text-[#c4a46c] flex-shrink-0" fill="currentColor" />
            </div>
          ))}
          {pinnedPlaces.length > 5 && (
            <p className="text-[9px] text-[#c4a46c]/50 text-center pt-1">+{pinnedPlaces.length - 5} more</p>
          )}
        </div>
      </div>
    </div>
  );
}

const CUSTOMIZE_KEY = "polyjarvis_customize";
const accentColors = [
  { id: "cream", label: "Cream", hex: "#F5E6D0" },
  { id: "sage", label: "Sage", hex: "#8BC34A" },
  { id: "teal", label: "Teal", hex: "#008080" },
  { id: "coral", label: "Coral", hex: "#FF7043" },
  { id: "lavender", label: "Lavender", hex: "#CE93D8" },
  { id: "gold", label: "Gold", hex: "#FFD54F" },
];
const mapStyles = [
  { id: "photos", label: "Photo Markers" },
  { id: "icons", label: "Category Icons" },
];
const jarvisVibes = [
  { id: "chill", label: "Chill", emoji: "🤙", desc: "Laid-back West Coast energy" },
  { id: "hype", label: "Hype", emoji: "🔥", desc: "Gets excited about everything" },
  { id: "sarcastic", label: "Sarcastic", emoji: "😏", desc: "Witty, dry humor, roasts you" },
];

interface CustomizeData {
  displayName: string;
  accentColor: string;
  mapStyle: string;
  jarvisVibe: string;
  distanceUnit: "mi" | "km";
  showFriendsOnMap: boolean;
}

function getCustomize(): CustomizeData {
  try {
    const raw = localStorage.getItem(CUSTOMIZE_KEY);
    if (raw) return { ...defaultCustomize, ...JSON.parse(raw) };
  } catch {}
  return defaultCustomize;
}

const defaultCustomize: CustomizeData = {
  displayName: "",
  accentColor: "cream",
  mapStyle: "photos",
  jarvisVibe: "chill",
  distanceUnit: "mi",
  showFriendsOnMap: true,
};

function CustomizeSection() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CustomizeData>(() => getCustomize());
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(data.displayName);

  const save = (partial: Partial<CustomizeData>) => {
    const updated = { ...data, ...partial };
    setData(updated);
    localStorage.setItem(CUSTOMIZE_KEY, JSON.stringify(updated));
  };

  const saveName = () => {
    save({ displayName: nameInput.trim() });
    setEditingName(false);
    if (nameInput.trim()) toast.success(`Display name set to "${nameInput.trim()}"`);
  };

  return (
    <div className="bg-gradient-to-br from-[#1a2e12]/60 to-[#0d1a08]/60 border border-white/12 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-4">
        <div className="p-2 bg-[#F2E8CF]/15 rounded-lg">
          <Palette size={18} className="text-[#F2E8CF]" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold text-[#F2E8CF] text-sm">Customize</p>
          <p className="text-[10px] text-white/35">Theme, map style, Jarvis personality</p>
        </div>
        <ChevronRight size={14} className={`text-white/20 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">

          {/* Display Name */}
          <div>
            <p className="text-[10px] font-semibold text-white/30 tracking-wider mb-2">Display Name</p>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveName()}
                  placeholder="Your name..."
                  className="flex-1 bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#F2E8CF]/30"
                  autoFocus
                />
                <button onClick={saveName} className="px-3 py-2 bg-[#F2E8CF] text-[#233216] rounded-lg text-xs font-semibold">Save</button>
              </div>
            ) : (
              <button onClick={() => { setEditingName(true); setNameInput(data.displayName); }}
                className="w-full flex items-center gap-2 bg-white/6 border border-white/10 rounded-lg px-3 py-2.5 text-left">
                <Type size={14} className="text-white/30" />
                <span className="text-sm text-white/60">{data.displayName || "Tap to set name"}</span>
              </button>
            )}
          </div>

          {/* Accent Color */}
          <div>
            <p className="text-[10px] font-semibold text-white/30 tracking-wider mb-2">Accent Color</p>
            <div className="flex gap-2 flex-wrap">
              {accentColors.map(c => (
                <button
                  key={c.id}
                  onClick={() => { save({ accentColor: c.id }); toast.success(`Accent color: ${c.label}`); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                    data.accentColor === c.id ? "ring-2 ring-offset-1 ring-offset-transparent bg-white/15 text-white" : "bg-white/5 text-white/35 border border-white/10"
                  }`}
                  style={{ ringColor: c.hex }}
                >
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.hex }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Map Marker Style */}
          <div>
            <p className="text-[10px] font-semibold text-white/30 tracking-wider mb-2">Map Markers</p>
            <div className="flex gap-2">
              {mapStyles.map(s => (
                <button
                  key={s.id}
                  onClick={() => { save({ mapStyle: s.id }); toast.success(`Map markers: ${s.label}`); }}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
                    data.mapStyle === s.id ? "bg-[#F2E8CF] text-[#233216]" : "bg-white/8 text-white/35 border border-white/10"
                  }`}
                >
                  <MapPin size={12} className="inline mr-1" />{s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Distance Units */}
          <div>
            <p className="text-[10px] font-semibold text-white/30 tracking-wider mb-2">Distance Units</p>
            <div className="flex gap-2">
              {(["mi", "km"] as const).map(unit => (
                <button
                  key={unit}
                  onClick={() => { save({ distanceUnit: unit }); toast.success(`Distance: ${unit === "mi" ? "Miles" : "Kilometers"}`); }}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
                    data.distanceUnit === unit ? "bg-[#F2E8CF] text-[#233216]" : "bg-white/8 text-white/35 border border-white/10"
                  }`}
                >
                  {unit === "mi" ? "Miles" : "Kilometers"}
                </button>
              ))}
            </div>
          </div>

          {/* Jarvis Personality */}
          <div>
            <p className="text-[10px] font-semibold text-white/30 tracking-wider mb-2">Jarvis Personality</p>
            <div className="grid grid-cols-2 gap-1.5">
              {jarvisVibes.map(v => (
                <button
                  key={v.id}
                  onClick={() => { save({ jarvisVibe: v.id }); toast.success(`Jarvis vibe: ${v.emoji} ${v.label}`); }}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all ${
                    data.jarvisVibe === v.id ? "bg-[#F2E8CF]/15 border-2 border-[#F2E8CF]/30" : "bg-white/5 border border-white/8"
                  }`}
                >
                  <span className="text-xl">{v.emoji}</span>
                  <span className={`text-[10px] font-bold ${data.jarvisVibe === v.id ? "text-[#F2E8CF]" : "text-white/40"}`}>{v.label}</span>
                  <span className="text-[8px] text-white/20">{v.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Show Friends */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-white/30" />
              <span className="text-sm font-bold text-white/55">Friends on Map</span>
            </div>
            <button
              onClick={() => save({ showFriendsOnMap: !data.showFriendsOnMap })}
              className={`w-10 h-6 rounded-full transition-all flex items-center px-0.5 ${data.showFriendsOnMap ? "bg-[#F2E8CF]" : "bg-white/15"}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${data.showFriendsOnMap ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>

          {/* Reset */}
          <button
            onClick={() => {
              localStorage.removeItem(CUSTOMIZE_KEY);
              setData(defaultCustomize);
              toast.success("Customizations reset to default");
            }}
            className="w-full py-2 bg-red-500/8 border border-red-500/15 rounded-lg text-red-400/60 text-[10px] font-bold active:scale-95 transition-transform"
          >
            Reset to Defaults
          </button>
        </div>
      )}
    </div>
  );
}

function AnalyticsSection() {
  const pinnedIds: string[] = (() => {
    try { return JSON.parse(localStorage.getItem("pinnedEvents") || "[]"); } catch { return []; }
  })();
  const pinnedPlaces = places.filter(p => pinnedIds.includes(p.id));

  // Build category counts from pinned places
  const categoryMap: Record<string, number> = {};
  pinnedPlaces.forEach(p => {
    categoryMap[p.category] = (categoryMap[p.category] || 0) + 1;
  });

  // Pareto: sorted descending by count
  const chartData = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));

  // Also show all-places category distribution for context
  const allCategoryMap: Record<string, number> = {};
  places.forEach(p => {
    allCategoryMap[p.category] = (allCategoryMap[p.category] || 0) + 1;
  });
  const allChartData = Object.entries(allCategoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([category, count]) => ({ category: category.length > 8 ? category.slice(0, 7) + "." : category, count }));

  const [showAll, setShowAll] = useState(false);
  const displayData = showAll ? allChartData : (chartData.length > 0 ? chartData : allChartData);

  const barColors = ["#F2E8CF", "#8BC34A", "#64B5F6", "#FF9800", "#CE93D8", "#4FC3F7", "#FF7043", "#66BB6A"];

  return (
    <div className="bg-gradient-to-br from-[#1a2e12]/60 to-[#0d1a08]/60 border border-white/12 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-[#F2E8CF]" />
          <p className="text-[9px] font-semibold text-white/30 capitalize tracking-wider">Analytics</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setShowAll(false)} className={`text-[8px] font-bold px-2 py-1 rounded-full ${!showAll ? "bg-[#F2E8CF] text-[#233216]" : "bg-white/8 text-white/30"}`}>Pinned</button>
          <button onClick={() => setShowAll(true)} className={`text-[8px] font-bold px-2 py-1 rounded-full ${showAll ? "bg-[#F2E8CF] text-[#233216]" : "bg-white/8 text-white/30"}`}>All Spots</button>
        </div>
      </div>

      {displayData.length > 0 ? (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={displayData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <XAxis dataKey="category" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <RechartsTooltip
              contentStyle={{ background: "rgba(13,26,8,0.9)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 11, color: "white" }}
              cursor={{ fill: "rgba(242,232,208,0.05)" }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {displayData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-6">
          <p className="text-xs text-white/30">Pin some places to see your analytics!</p>
        </div>
      )}

      <p className="text-[9px] text-white/20 text-center mt-1">
        {showAll ? `${places.length} total spots in SLO` : `${pinnedPlaces.length} pinned spots by category`}
      </p>
    </div>
  );
}
