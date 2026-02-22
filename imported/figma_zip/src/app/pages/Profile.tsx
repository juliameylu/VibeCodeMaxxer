import { Link, useNavigate } from "react-router";
import { User, Settings, LogOut, ChevronRight, CalendarDays, Heart, Users, ArrowRight, UserPlus, Leaf, BookOpen, Coffee, Lock } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { PageHeader } from "../components/PageHeader";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "/utils/supabase/client";

const STATUS_KEY = "polyjarvis_status";

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

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();

    const liked = localStorage.getItem("polyjarvis_liked");
    if (liked) setLikedCount(JSON.parse(liked).length);
    const events = localStorage.getItem("polyjarvis_my_events");
    if (events) setEventCount(JSON.parse(events).length);
    const saved = localStorage.getItem(STATUS_KEY);
    if (saved) setStatus(saved as StatusId);
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

  const currentStatus = statusOptions.find(s => s.id === status)!;

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-transparent">
        <div className="w-8 h-8 border-3 border-[#8BC34A]/20 border-t-[#8BC34A] rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-[100dvh] bg-transparent pb-24 flex flex-col items-center justify-center px-6">
        <PageHeader />
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-white/8 rounded-full mx-auto flex items-center justify-center mb-4">
            <User size={36} className="text-white/20" />
          </div>
          <h2 className="text-xl font-black text-white mb-2 uppercase tracking-wider">SIGN IN TO POLYJARVIS</h2>
          <p className="text-sm text-white/30 mb-6">Save events, manage groups, and get personalized recommendations.</p>
          <Link to="/signin">
            <button className="w-full py-3.5 bg-[#8BC34A] text-[#233216] rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform">
              SIGN IN <ArrowRight size={18} />
            </button>
          </Link>
          <Link to="/signin" className="block mt-3">
            <span className="text-sm text-[#8BC34A] font-bold">OR CREATE ACCOUNT</span>
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
          <div className="w-20 h-20 bg-[#8BC34A]/15 backdrop-blur-sm rounded-full border-3 border-[#8BC34A]/25 flex items-center justify-center text-3xl font-bold text-[#8BC34A]">
            {user.email?.[0].toUpperCase() || <User size={36} />}
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider">{user.user_metadata?.name || "STUDENT EXPLORER"}</h1>
            <p className="text-white/30 text-xs font-medium">{user.email}</p>
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
          <div className="bg-[#1a2e10]/90 backdrop-blur-xl border border-white/10 rounded-xl p-2 space-y-1">
            <p className="text-[9px] font-black text-white/25 uppercase tracking-widest px-2 pt-1">SET YOUR STATUS</p>
            {statusOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => changeStatus(opt.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  status === opt.id ? "bg-white/10" : "active:bg-white/5"
                }`}
              >
                <span className="text-lg">{opt.emoji}</span>
                <span className="text-sm font-bold" style={{ color: status === opt.id ? opt.color : "rgba(255,255,255,0.6)" }}>
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
        <div className="bg-white/8 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex justify-around text-center">
          <div>
            <div className="text-xl font-bold text-[#8BC34A]">{eventCount}</div>
            <div className="text-[9px] uppercase font-black text-white/25 tracking-wider">EVENTS</div>
          </div>
          <div>
            <div className="text-xl font-bold text-red-400">{likedCount}</div>
            <div className="text-[9px] uppercase font-black text-white/25 tracking-wider">LIKED</div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#F2E8CF]">SLO</div>
            <div className="text-[9px] uppercase font-black text-white/25 tracking-wider">HOME</div>
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

        <div className="pt-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 p-4 bg-red-500/10 rounded-xl border border-red-500/15 text-red-400 active:bg-red-500/15 transition-colors"
          >
            <LogOut size={18} />
            <span className="font-bold text-sm">SIGN OUT</span>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function MenuItem({ icon: Icon, label, desc }: { icon: any; label: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/8 active:bg-white/8 transition-colors">
      <div className="p-2 bg-white/8 rounded-lg"><Icon size={18} className="text-[#8BC34A]" /></div>
      <div className="flex-1">
        <p className="font-bold text-white/70 text-sm">{label}</p>
        <p className="text-[11px] text-white/25">{desc}</p>
      </div>
      <ChevronRight size={16} className="text-white/15" />
    </div>
  );
}
