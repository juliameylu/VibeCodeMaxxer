import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { BottomNav } from "../components/BottomNav";
import { PageHeader } from "../components/PageHeader";
import { copyToClipboard } from "../utils/clipboard";
import { Leaf, BookOpen, Coffee, XCircle, UserPlus, Search, MessageSquare, Mail, Copy, Users, MapPin, Lock as LockIcon, Eye, EyeOff } from "lucide-react";

interface Friend {
  id: string;
  name: string;
  initial: string;
  status: "exploring" | "studying" | "chilling" | "busy";
  statusEmoji: string;
  statusText: string;
  addedAt: string;
  visitedPlaces?: string[];
  profilePublic?: boolean;
}

const FRIENDS_KEY = "polyjarvis_friends";
const LEGACY_SEED_CLEANUP_KEY = "polyjarvis_seed_cleanup_v1";
const USER_STATUS_KEY = "polyjarvis_my_status";
const USER_STATUS_TEXT_KEY = "polyjarvis_my_status_text";

const statusConfig = {
  exploring: { color: "#8BC34A", bg: "bg-[#8BC34A]/20", border: "border-[#8BC34A]/30", label: "EXPLORING", icon: Leaf },
  studying: { color: "#F2E8CF", bg: "bg-[#F2E8CF]/20", border: "border-[#F2E8CF]/30", label: "STUDYING", icon: BookOpen },
  chilling: { color: "#64B5F6", bg: "bg-[#64B5F6]/20", border: "border-[#64B5F6]/30", label: "CHILLING", icon: Coffee },
  busy: { color: "#EF5350", bg: "bg-[#EF5350]/20", border: "border-[#EF5350]/30", label: "BUSY", icon: XCircle },
};

export function Friends() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "exploring" | "studying" | "chilling" | "busy">("all");
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showJamInvite, setShowJamInvite] = useState(false);
  const [myStatus, setMyStatus] = useState<"exploring" | "studying" | "chilling" | "busy">("chilling");
  const [myStatusText, setMyStatusText] = useState("");

  const inviteLink = "https://polyjarvis.app/invite/abc123";

  useEffect(() => {
    if (!localStorage.getItem(LEGACY_SEED_CLEANUP_KEY)) {
      localStorage.removeItem("polyjarvis_friends_seeded");
      localStorage.setItem(LEGACY_SEED_CLEANUP_KEY, "1");
    }

    const saved = localStorage.getItem(FRIENDS_KEY);
    if (!saved) {
      setFriends([]);
    } else {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const normalized: Friend[] = parsed.map((item: Partial<Friend>, index: number) => {
            const status: Friend["status"] =
              item.status === "exploring" || item.status === "studying" || item.status === "chilling" || item.status === "busy"
                ? item.status
                : "chilling";
            const name = item.name || `Friend ${index + 1}`;
            return {
              id: item.id || `friend-${index}`,
              name,
              initial: item.initial || name[0]?.toUpperCase() || "?",
              status,
              statusEmoji: item.statusEmoji || "👋",
              statusText: item.statusText || "Connected",
              addedAt: item.addedAt || "Recently",
              visitedPlaces: Array.isArray(item.visitedPlaces) ? item.visitedPlaces : [],
              profilePublic: item.profilePublic !== false,
            };
          });
          setFriends(normalized);
        } else {
          setFriends([]);
        }
      } catch {
        setFriends([]);
      }
    }

    const savedStatus = localStorage.getItem(USER_STATUS_KEY);
    if (savedStatus === "exploring" || savedStatus === "studying" || savedStatus === "chilling" || savedStatus === "busy") {
      setMyStatus(savedStatus);
    }
    const savedStatusText = localStorage.getItem(USER_STATUS_TEXT_KEY);
    if (savedStatusText) setMyStatusText(savedStatusText);
  }, []);

  const filteredFriends = friends.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || f.status === filter;
    return matchesSearch && matchesFilter;
  });

  const exploringCount = friends.filter(f => f.status === "exploring").length;
  const studyingCount = friends.filter(f => f.status === "studying").length;

  const handleCopyLink = () => {
    copyToClipboard(inviteLink);
    toast.success("Link copied to clipboard!");
    setShowInvite(false);
  };

  const handleSMS = () => {
    const msg = `Join me on PolyJarvis! Your SLO lifestyle assistant: ${inviteLink}`;
    window.open(`sms:?body=${encodeURIComponent(msg)}`, "_blank");
    setShowInvite(false);
  };

  const handleGmail = () => {
    const subject = "Join me on PolyJarvis!";
    const body = `Hey!\n\nI've been using PolyJarvis to explore SLO and plan adventures. You should join!\n\n${inviteLink}\n\nSee you there!`;
    window.open(`https://mail.google.com/mail/?view=cm&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
    setShowInvite(false);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Join PolyJarvis",
        text: "Join me on PolyJarvis - your SLO lifestyle assistant!",
        url: inviteLink,
      }).catch(() => {});
      setShowInvite(false);
    }
  };

  const handleStatusChange = (status: "exploring" | "studying" | "chilling" | "busy") => {
    setMyStatus(status);
    localStorage.setItem(USER_STATUS_KEY, status);
    toast.success(`Status updated: ${statusConfig[status].label.toLowerCase()}`);
  };

  const handleStatusTextBlur = () => {
    const trimmed = myStatusText.trim();
    if (!trimmed) {
      localStorage.removeItem(USER_STATUS_TEXT_KEY);
      setMyStatusText("");
      return;
    }
    localStorage.setItem(USER_STATUS_TEXT_KEY, trimmed);
  };

  const handleFriendClick = (friend: Friend) => {
    setSelectedFriend(friend);
  };

  const handleJamInvite = () => {
    if (selectedFriend) {
      toast.success(`Jam invite sent to ${selectedFriend.name}!`);
      setShowJamInvite(false);
      navigate("/jams");
      setSelectedFriend(null);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-transparent text-white pb-24">
      <PageHeader />

      {/* Header */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-wider">FRIENDS</h1>
            <p className="text-[10px] text-white/35 font-bold uppercase tracking-wider">
              {friends.length} FRIENDS · {exploringCount} EXPLORING · {studyingCount} STUDYING
            </p>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="p-2.5 bg-[#F2E8CF] rounded-xl text-[#1a2e10] active:scale-90 transition-transform shadow-lg shadow-[#F2E8CF]/15"
          >
            <UserPlus size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={15} />
          <input
            type="text"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/10 border border-white/15 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#F2E8CF]/40"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(["all", "exploring", "studying", "chilling", "busy"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider whitespace-nowrap transition-all ${
                filter === f
                  ? f === "all" ? "bg-white/20 text-white" : `${statusConfig[f].bg} text-white border ${statusConfig[f].border}`
                  : "bg-white/8 text-white/35 border border-white/8"
              }`}
            >
              {f === "all" ? "ALL" : statusConfig[f].label}
            </button>
          ))}
        </div>

        <div className="mt-3 bg-white/10 border border-white/15 rounded-xl p-3">
          <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-2">MY STATUS</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(["exploring", "studying", "chilling", "busy"] as const).map((status) => {
              const cfg = statusConfig[status];
              return (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider whitespace-nowrap transition-all border ${
                    myStatus === status ? `${cfg.bg} ${cfg.border} text-white` : "bg-white/8 border-white/8 text-white/35"
                  }`}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            value={myStatusText}
            onChange={(e) => setMyStatusText(e.target.value)}
            onBlur={handleStatusTextBlur}
            placeholder='What are you doing? e.g. "Library grind"'
            className="mt-2 w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#F2E8CF]/40"
          />
        </div>
      </div>

      {/* Friends List */}
      <div className="px-5 space-y-2">
        {filteredFriends.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">👥</p>
            <p className="text-sm text-white/35 font-bold">No friends found</p>
            <p className="text-xs text-white/20 mt-1">Try a different filter or invite some friends!</p>
          </div>
        ) : (
          filteredFriends.map(friend => {
            const config = statusConfig[friend.status];
            const StatusIcon = config.icon;
            const isAvailable = friend.status !== "busy";
            return (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => handleFriendClick(friend)}
                className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl p-3.5 flex items-center gap-3 active:bg-white/15 transition-colors cursor-pointer"
              >
                {/* Avatar with status dot */}
                <div className="relative flex-shrink-0">
                  <div className={`w-11 h-11 rounded-full ${config.bg} border ${config.border} flex items-center justify-center text-base font-bold`}
                    style={{ color: config.color }}>
                    {friend.initial}
                  </div>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#1a2e10]"
                    style={{ backgroundColor: config.color }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{friend.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StatusIcon size={10} style={{ color: config.color }} />
                    <span className="text-[11px] text-white/45 truncate">{friend.statusEmoji} {friend.statusText}</span>
                  </div>
                </div>

                {/* Status badge + invite hint */}
                <div className="flex flex-col items-end gap-1">
                  <div className={`px-2 py-1 rounded-lg ${config.bg} border ${config.border}`}>
                    <span className="text-[8px] font-black tracking-wider" style={{ color: config.color }}>
                      {config.label}
                    </span>
                  </div>
                  {isAvailable && (
                    <span className="text-[7px] font-bold text-[#F2E8CF]/50">TAP TO INVITE</span>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Friend Profile/Jam Invite Sheet */}
      <AnimatePresence>
        {selectedFriend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setSelectedFriend(null)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-[#1a2e10]/95 backdrop-blur-2xl rounded-t-3xl p-6 border-t border-white/15"
            >
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5" />

              {/* Friend Profile */}
              <div className="text-center mb-5">
                <div
                  className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-2xl font-bold border-2 mb-3"
                  style={{
                    backgroundColor: `${statusConfig[selectedFriend.status].color}15`,
                    borderColor: `${statusConfig[selectedFriend.status].color}30`,
                    color: statusConfig[selectedFriend.status].color,
                  }}
                >
                  {selectedFriend.initial}
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">{selectedFriend.name}</h2>
                <p className="text-xs text-white/40 mt-0.5">{selectedFriend.statusEmoji} {selectedFriend.statusText}</p>
                <p className="text-[10px] text-white/25 mt-1">Added {selectedFriend.addedAt}</p>
              </div>

              {/* Visited Places */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={12} className="text-[#F2E8CF]" />
                  <span className="text-[10px] font-black text-[#F2E8CF] uppercase tracking-widest">PLACES VISITED</span>
                  {selectedFriend.profilePublic ? (
                    <Eye size={10} className="text-white/25 ml-auto" />
                  ) : (
                    <EyeOff size={10} className="text-white/25 ml-auto" />
                  )}
                </div>
                {selectedFriend.profilePublic ? (
                  selectedFriend.visitedPlaces && selectedFriend.visitedPlaces.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFriend.visitedPlaces.map(place => (
                        <span key={place} className="text-[10px] font-bold bg-white/10 text-white/50 px-2.5 py-1 rounded-full border border-white/10">
                          {place}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-white/25">No check-ins yet</p>
                  )
                ) : (
                  <div className="bg-white/5 border border-white/8 rounded-lg p-3 flex items-center gap-2">
                    <LockIcon size={14} className="text-white/20" />
                    <p className="text-xs text-white/25">This profile is private</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                {selectedFriend.status !== "busy" && (
                  <button
                    onClick={handleJamInvite}
                    className="w-full py-3.5 bg-[#F2E8CF] text-[#233216] rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 active:scale-[0.97] transition-transform"
                  >
                    <Users size={16} /> INVITE TO A JAM
                  </button>
                )}

                <button
                  onClick={() => {
                    navigate("/jams", { state: { createWithFriend: selectedFriend.name.split(" ")[0] } });
                    setSelectedFriend(null);
                  }}
                  className="w-full py-3 bg-white/8 border border-white/12 text-white/60 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:bg-white/12 transition-colors"
                >
                  CREATE NEW JAM WITH {selectedFriend.name.split(" ")[0].toUpperCase()}
                </button>

                <button
                  onClick={() => setSelectedFriend(null)}
                  className="w-full mt-2 py-2.5 text-white/30 text-sm font-bold"
                >
                  CLOSE
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInvite && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowInvite(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-[#1a2e10]/95 backdrop-blur-2xl rounded-t-3xl p-6 border-t border-white/15"
            >
              {/* Handle bar */}
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5" />

              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-[#F2E8CF]/15 rounded-2xl mx-auto flex items-center justify-center mb-3 border border-[#F2E8CF]/20">
                  <UserPlus size={24} className="text-[#F2E8CF]" />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">ADD A FRIEND</h2>
                <p className="text-xs text-white/40 mt-1">Share your invite link</p>
              </div>

              {/* Link preview */}
              <div className="bg-white/8 border border-white/12 rounded-xl px-4 py-3 mb-5 flex items-center gap-2">
                <span className="text-xs text-white/45 truncate flex-1 font-mono">{inviteLink}</span>
              </div>

              {/* Share options */}
              <div className="space-y-2.5">
                <button
                  onClick={handleCopyLink}
                  className="w-full py-3.5 bg-[#F2E8CF] text-[#1a2e10] rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 active:scale-[0.97] transition-transform shadow-lg shadow-[#F2E8CF]/15"
                >
                  <Copy size={16} /> COPY LINK
                </button>

                <button
                  onClick={handleSMS}
                  className="w-full py-3.5 bg-white/10 border border-white/15 text-white/75 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 active:bg-white/15 transition-colors"
                >
                  <MessageSquare size={16} /> SEND VIA SMS
                </button>

                <button
                  onClick={handleGmail}
                  className="w-full py-3.5 bg-white/10 border border-white/15 text-white/75 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 active:bg-white/15 transition-colors"
                >
                  <Mail size={16} /> SEND VIA GMAIL
                </button>

                {typeof navigator !== "undefined" && navigator.share && (
                  <button
                    onClick={handleShare}
                    className="w-full py-3.5 bg-white/6 border border-white/10 text-white/45 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 active:bg-white/10 transition-colors"
                  >
                    MORE OPTIONS...
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowInvite(false)}
                className="w-full mt-4 py-2.5 text-white/30 text-sm font-bold"
              >
                CANCEL
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
