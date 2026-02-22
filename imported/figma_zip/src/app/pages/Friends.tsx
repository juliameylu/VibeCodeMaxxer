import { useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { UserPlus, Copy, MessageSquare, Mail, X, Search, Leaf, BookOpen, Coffee, Lock } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "../components/BottomNav";
import { PageHeader } from "../components/PageHeader";

interface Friend {
  id: string;
  name: string;
  initial: string;
  status: "exploring" | "studying" | "chilling" | "busy";
  statusEmoji: string;
  statusText: string;
  addedAt: string;
}

const statusConfig = {
  exploring: { color: "#8BC34A", bg: "bg-[#8BC34A]/15", border: "border-[#8BC34A]/25", label: "EXPLORING", icon: Leaf },
  studying: { color: "#F2E8CF", bg: "bg-[#F2E8CF]/15", border: "border-[#F2E8CF]/25", label: "STUDYING", icon: BookOpen },
  chilling: { color: "#64B5F6", bg: "bg-[#64B5F6]/15", border: "border-[#64B5F6]/25", label: "CHILLING", icon: Coffee },
  busy: { color: "#EF5350", bg: "bg-[#EF5350]/15", border: "border-[#EF5350]/25", label: "BUSY", icon: Lock },
};

const initialFriends: Friend[] = [
  { id: "f1", name: "Alex Martinez", initial: "A", status: "exploring", statusEmoji: "🌿", statusText: "Hiking Bishop Peak!", addedAt: "2 weeks ago" },
  { id: "f2", name: "Emma Rivera", initial: "E", status: "studying", statusEmoji: "📚", statusText: "Library grind", addedAt: "1 month ago" },
  { id: "f3", name: "Jake Thompson", initial: "J", status: "chilling", statusEmoji: "☕", statusText: "Scout Coffee", addedAt: "3 days ago" },
  { id: "f4", name: "Sarah Kim", initial: "S", status: "exploring", statusEmoji: "🏖️", statusText: "Beach day!", addedAt: "1 week ago" },
  { id: "f5", name: "Marcus Chen", initial: "M", status: "busy", statusEmoji: "🔒", statusText: "Do not disturb", addedAt: "2 weeks ago" },
  { id: "f6", name: "Lily Nguyen", initial: "L", status: "studying", statusEmoji: "📝", statusText: "IME 223 hw", addedAt: "5 days ago" },
];

export function Friends() {
  const [friends] = useState<Friend[]>(initialFriends);
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "exploring" | "studying" | "chilling" | "busy">("all");

  const inviteLink = "https://polyjarvis.app/invite/abc123";

  const filteredFriends = friends.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || f.status === filter;
    return matchesSearch && matchesFilter;
  });

  const exploringCount = friends.filter(f => f.status === "exploring").length;
  const studyingCount = friends.filter(f => f.status === "studying").length;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
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

  return (
    <div className="min-h-[100dvh] bg-transparent text-white pb-24">
      <PageHeader />

      {/* Header */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-wider">FRIENDS</h1>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">
              {friends.length} FRIENDS · {exploringCount} EXPLORING · {studyingCount} STUDYING
            </p>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="p-2.5 bg-[#8BC34A] rounded-xl text-[#1a2e10] active:scale-90 transition-transform shadow-lg shadow-[#8BC34A]/20"
          >
            <UserPlus size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={15} />
          <input
            type="text"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/8 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#8BC34A]/40"
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
                  ? f === "all" ? "bg-white/15 text-white" : `${statusConfig[f].bg} text-white border ${statusConfig[f].border}`
                  : "bg-white/5 text-white/30 border border-white/5"
              }`}
            >
              {f === "all" ? "ALL" : statusConfig[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* Friends List */}
      <div className="px-5 space-y-2">
        {filteredFriends.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">👥</p>
            <p className="text-sm text-white/30 font-bold">No friends found</p>
            <p className="text-xs text-white/15 mt-1">Try a different filter or invite some friends!</p>
          </div>
        ) : (
          filteredFriends.map(friend => {
            const config = statusConfig[friend.status];
            const StatusIcon = config.icon;
            return (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/6 backdrop-blur-sm border border-white/8 rounded-xl p-3.5 flex items-center gap-3"
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
                    <span className="text-[11px] text-white/40 truncate">{friend.statusEmoji} {friend.statusText}</span>
                  </div>
                </div>

                {/* Status badge */}
                <div className={`px-2 py-1 rounded-lg ${config.bg} border ${config.border}`}>
                  <span className="text-[8px] font-black tracking-wider" style={{ color: config.color }}>
                    {config.label}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

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
              className="w-full max-w-md bg-[#1a2e10]/95 backdrop-blur-2xl rounded-t-3xl p-6 border-t border-[#8BC34A]/15"
            >
              {/* Handle bar */}
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5" />

              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-[#8BC34A]/15 rounded-2xl mx-auto flex items-center justify-center mb-3 border border-[#8BC34A]/20">
                  <UserPlus size={24} className="text-[#8BC34A]" />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">ADD A FRIEND</h2>
                <p className="text-xs text-white/35 mt-1">Share your invite link</p>
              </div>

              {/* Link preview */}
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-5 flex items-center gap-2">
                <span className="text-xs text-white/40 truncate flex-1 font-mono">{inviteLink}</span>
              </div>

              {/* Share options */}
              <div className="space-y-2.5">
                <button
                  onClick={handleCopyLink}
                  className="w-full py-3.5 bg-[#8BC34A] text-[#1a2e10] rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 active:scale-[0.97] transition-transform shadow-lg shadow-[#8BC34A]/20"
                >
                  <Copy size={16} /> COPY LINK
                </button>

                <button
                  onClick={handleSMS}
                  className="w-full py-3.5 bg-white/8 border border-white/10 text-white/70 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 active:bg-white/12 transition-colors"
                >
                  <MessageSquare size={16} /> SEND VIA SMS
                </button>

                <button
                  onClick={handleGmail}
                  className="w-full py-3.5 bg-white/8 border border-white/10 text-white/70 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 active:bg-white/12 transition-colors"
                >
                  <Mail size={16} /> SEND VIA GMAIL
                </button>

                {typeof navigator !== "undefined" && navigator.share && (
                  <button
                    onClick={handleShare}
                    className="w-full py-3.5 bg-white/5 border border-white/8 text-white/40 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 active:bg-white/8 transition-colors"
                  >
                    MORE OPTIONS...
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowInvite(false)}
                className="w-full mt-4 py-2.5 text-white/25 text-sm font-bold"
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
