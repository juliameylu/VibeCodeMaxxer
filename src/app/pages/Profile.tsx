import { Link, useNavigate } from "react-router";
import { User, Settings, LogOut, ChevronRight, CalendarDays, Users, ArrowRight, UserPlus, Leaf, BookOpen, Coffee, Lock, Camera, Sparkles, ThumbsUp, ThumbsDown } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { PageHeader } from "../components/PageHeader";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "/utils/supabase/client";

const STATUS_KEY = "polyjarvis_status";
const AVATAR_KEY = "polyjarvis_avatar";
const HEAD_CIRCLE_KEY = "polyjarvis_head_circle";
const TRAIN_KEY = "polyjarvis_training";

const trainingPrompts = [
  { id: "t1", category: "Vibe", label: "Beach vibes", emoji: "🏖️" },
  { id: "t2", category: "Vibe", label: "Mountain adventures", emoji: "⛰️" },
  { id: "t3", category: "Vibe", label: "Coffee shop culture", emoji: "☕" },
  { id: "t4", category: "Vibe", label: "Nightlife & bars", emoji: "🍸" },
  { id: "t5", category: "Food", label: "Mexican food", emoji: "🌮" },
  { id: "t6", category: "Food", label: "Sushi & Asian", emoji: "🍣" },
  { id: "t7", category: "Food", label: "Pizza & Italian", emoji: "🍕" },
  { id: "t8", category: "Food", label: "Healthy / Vegan", emoji: "🥗" },
  { id: "t9", category: "Activity", label: "Sunrise hikes", emoji: "🌅" },
  { id: "t10", category: "Activity", label: "Art & museums", emoji: "🎨" },
  { id: "t11", category: "Activity", label: "Live music", emoji: "🎵" },
  { id: "t12", category: "Activity", label: "Study spots", emoji: "📚" },
  { id: "t13", category: "Budget", label: "Budget-friendly ($)", emoji: "💰" },
  { id: "t14", category: "Budget", label: "Splurge-worthy ($$$)", emoji: "💎" },
  { id: "t15", category: "Transport", label: "Walking distance", emoji: "🚶" },
  { id: "t16", category: "Transport", label: "Worth the drive", emoji: "🚗" },
];

const statusOptions = [
  { id: "exploring", emoji: "🌿", label: "EXPLORING", color: "#8BC34A", icon: Leaf },
  { id: "studying", emoji: "📚", label: "STUDYING", color: "#F2E8CF", icon: BookOpen },
  { id: "chilling", emoji: "☕", label: "CHILLING", color: "#64B5F6", icon: Coffee },
  { id: "busy", emoji: "🔒", label: "BUSY", color: "#EF5350", icon: Lock },
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
  const [headCircleUrl, setHeadCircleUrl] = useState<string | null>(null);
  const [showHeadEditor, setShowHeadEditor] = useState(false);
  const [editorImage, setEditorImage] = useState<string | null>(null);
  const [editorZoom, setEditorZoom] = useState(1.2);
  const [editorOffsetX, setEditorOffsetX] = useState(0);
  const [editorOffsetY, setEditorOffsetY] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const headCircle = localStorage.getItem(HEAD_CIRCLE_KEY);
    if (headCircle) setHeadCircleUrl(headCircle);
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
      setEditorImage(dataUrl);
      setEditorZoom(1.2);
      setEditorOffsetX(0);
      setEditorOffsetY(0);
      setShowHeadEditor(true);
    };
    reader.readAsDataURL(file);
  };

  const saveHeadCircle = () => {
    if (!editorImage) return;
    const img = new Image();
    img.onload = () => {
      const size = 512;
      const radius = 220;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      const baseScale = Math.max((radius * 2) / img.width, (radius * 2) / img.height);
      const scale = baseScale * editorZoom;
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const drawX = (size - drawW) / 2 + editorOffsetX;
      const drawY = (size - drawH) / 2 + editorOffsetY;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      const circleData = canvas.toDataURL("image/png");
      setAvatarUrl(circleData);
      setHeadCircleUrl(circleData);
      localStorage.setItem(AVATAR_KEY, circleData);
      localStorage.setItem(HEAD_CIRCLE_KEY, circleData);
      setShowHeadEditor(false);
      toast.success("Profile photo and head circle saved!");
    };
    img.src = editorImage;
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
          <h2 className="text-xl font-black text-white mb-2 uppercase tracking-wider">SIGN IN TO POLYJARVIS</h2>
          <p className="text-sm text-white/35 mb-6">Save events, manage groups, and get personalized recommendations.</p>
          <Link to="/signin">
            <button className="w-full py-3.5 bg-white text-[#233216] rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform">
              SIGN IN <ArrowRight size={18} />
            </button>
          </Link>
          <Link to="/signin" className="block mt-3">
            <span className="text-sm text-[#F2E8CF] font-bold">OR CREATE ACCOUNT</span>
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-transparent pb-24 text-white">
      <PageHeader />

      {/* Header */}
      <div className="bg-gradient-to-b from-white/5 to-transparent pt-4 pb-14 px-6 text-center rounded-b-[2.5rem] relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center gap-3">
          {/* Avatar with camera overlay */}
          <div className="relative group">
            <div className="w-20 h-20 bg-[#F2E8CF]/15 backdrop-blur-sm rounded-full border-3 border-[#F2E8CF]/25 flex items-center justify-center text-3xl font-bold text-[#F2E8CF] overflow-hidden">
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          {headCircleUrl && (
            <div className="text-[10px] text-white/45">
              Profile ready for Explore "Me Here" cards
            </div>
          )}
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider">{user.user_metadata?.name || "STUDENT EXPLORER"}</h1>
            <p className="text-white/35 text-xs font-medium">{user.email}</p>
          </div>

          {/* Status badge — tappable */}
          <button
            onClick={() => setShowStatusPicker(!showStatusPicker)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border transition-all active:scale-95"
            style={{
              backgroundColor: `${currentStatus.color}15`,
              borderColor: `${currentStatus.color}30`,
            }}
          >
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentStatus.color }} />
            <span className="text-xs font-black tracking-wider" style={{ color: currentStatus.color }}>
              {currentStatus.emoji} {currentStatus.label}
            </span>
            <ChevronRight size={12} className="text-white/20 rotate-90" />
          </button>
        </div>
      </div>

      {/* Status picker dropdown */}
      {showStatusPicker && (
        <div className="px-5 -mt-4 relative z-30 mb-2">
          <div className="bg-[#1a2e10]/95 backdrop-blur-xl border border-white/15 rounded-xl p-2 space-y-1">
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest px-2 pt-1">SET YOUR STATUS</p>
            {statusOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => changeStatus(opt.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  status === opt.id ? "bg-white/12" : "active:bg-white/6"
                }`}
              >
                <span className="text-lg">{opt.emoji}</span>
                <span className="text-sm font-bold" style={{ color: status === opt.id ? opt.color : "rgba(255,255,255,0.65)" }}>
                  {opt.label}
                </span>
                {status === opt.id && (
                  <div className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className={`px-5 ${showStatusPicker ? "-mt-0" : "-mt-7"} relative z-20`}>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/15 flex justify-around text-center">
          <div>
            <div className="text-xl font-bold text-[#F2E8CF]">{eventCount}</div>
            <div className="text-[9px] uppercase font-black text-white/30 tracking-wider">EVENTS</div>
          </div>
          <div onClick={() => navigate("/plans")} className="cursor-pointer active:scale-95 transition-transform">
            <div className="text-xl font-bold text-[#F2E8CF]">{likedCount}</div>
            <div className="text-[9px] uppercase font-black text-white/30 tracking-wider">PINNED</div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#64B5F6]">SLO</div>
            <div className="text-[9px] uppercase font-black text-white/30 tracking-wider">HOME</div>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="px-5 mt-6 space-y-2">
        <Link to="/friends">
          <MenuItem icon={UserPlus} label="FRIENDS" desc="View friends & invite new ones" />
        </Link>
        <Link to="/myevents">
          <MenuItem icon={CalendarDays} label="MY EVENTS" desc="Confirmed & maybe events" />
        </Link>
        <Link to="/groups">
          <MenuItem icon={Users} label="GROUPS" desc="Manage people & invites" />
        </Link>
        <Link to="/preferences">
          <MenuItem icon={Settings} label="PREFERENCES" desc="Update interests & transport" />
        </Link>

        {/* Train Jarvis Widget */}
        <div className="pt-3">
          <div className="bg-gradient-to-r from-[#F2E8CF]/10 to-[#64B5F6]/10 border border-[#F2E8CF]/15 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowTrainer(!showTrainer)}
              className="w-full flex items-center gap-3 p-4"
            >
              <div className="p-2 bg-[#F2E8CF]/15 rounded-lg">
                <Sparkles size={18} className="text-[#F2E8CF]" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-[#F2E8CF] text-sm">TRAIN JARVIS</p>
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
                <p className="text-[9px] font-black text-white/25 uppercase tracking-widest mb-3">
                  {currentPrompt.category} · SWIPE TO TRAIN
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
                    <ThumbsDown size={16} /> NOPE
                  </button>
                  <button
                    onClick={() => handleTrainSwipe(true)}
                    className="flex-1 py-3 bg-[#8BC34A]/15 border border-[#8BC34A]/20 rounded-xl text-[#8BC34A] font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <ThumbsUp size={16} /> LOVE IT
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
                  className="mt-3 px-4 py-2 bg-[#F2E8CF] text-[#233216] rounded-full text-xs font-black tracking-wider active:scale-95 transition-transform flex items-center gap-1.5 mx-auto"
                >
                  <Sparkles size={12} /> SEE YOUR PICKS
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 p-4 bg-red-500/12 rounded-xl border border-red-500/20 text-red-400 active:bg-red-500/18 transition-colors"
          >
            <LogOut size={18} />
            <span className="font-bold text-sm">SIGN OUT</span>
          </button>
        </div>
      </div>

      <BottomNav />

      {/* Head circle editor */}
      {showHeadEditor && editorImage && (
        <div className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-sm flex items-center justify-center px-5">
          <div className="w-full max-w-sm bg-[#1a2e10]/95 border border-white/15 rounded-2xl p-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Set Head Circle</h3>
            <p className="text-[11px] text-white/45 mt-1 mb-3">Position your face inside the circle for "Me Here" generation.</p>

            <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-white/15 bg-black/30">
              <img
                src={editorImage}
                alt="Editor"
                className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                style={{ transform: `translate(${editorOffsetX}px, ${editorOffsetY}px) scale(${editorZoom})` }}
              />
              <div className="absolute inset-0 pointer-events-none">
                <div
                  className="absolute border-2 border-[#F2E8CF] rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                  style={{ width: "70%", height: "70%", left: "15%", top: "15%" }}
                />
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <label className="block text-[10px] font-bold text-white/55 uppercase tracking-wider">
                Zoom
                <input
                  type="range"
                  min={1}
                  max={2.8}
                  step={0.01}
                  value={editorZoom}
                  onChange={(e) => setEditorZoom(Number(e.target.value))}
                  className="w-full mt-1"
                />
              </label>
              <label className="block text-[10px] font-bold text-white/55 uppercase tracking-wider">
                Move Left / Right
                <input
                  type="range"
                  min={-140}
                  max={140}
                  step={1}
                  value={editorOffsetX}
                  onChange={(e) => setEditorOffsetX(Number(e.target.value))}
                  className="w-full mt-1"
                />
              </label>
              <label className="block text-[10px] font-bold text-white/55 uppercase tracking-wider">
                Move Up / Down
                <input
                  type="range"
                  min={-140}
                  max={140}
                  step={1}
                  value={editorOffsetY}
                  onChange={(e) => setEditorOffsetY(Number(e.target.value))}
                  className="w-full mt-1"
                />
              </label>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowHeadEditor(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/8 border border-white/12 text-white/65 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={saveHeadCircle}
                className="flex-1 py-2.5 rounded-xl bg-[#F2E8CF] text-[#233216] text-xs font-black uppercase tracking-wider"
              >
                Save Circle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, desc }: { icon: any; label: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white/8 rounded-xl border border-white/12 active:bg-white/12 transition-colors">
      <div className="p-2 bg-white/10 rounded-lg"><Icon size={18} className="text-[#F2E8CF]" /></div>
      <div className="flex-1">
        <p className="font-bold text-white/75 text-sm">{label}</p>
        <p className="text-[11px] text-white/30">{desc}</p>
      </div>
      <ChevronRight size={16} className="text-white/20" />
    </div>
  );
}
