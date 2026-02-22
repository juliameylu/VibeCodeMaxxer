import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { motion, AnimatePresence, useDragControls } from "motion/react";
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

const statusConfig = {
  exploring: { color: "#8BC34A", bg: "bg-[#8BC34A]/20", border: "border-[#8BC34A]/30", label: "Exploring", icon: Leaf },
  studying: { color: "#F2E8CF", bg: "bg-[#F2E8CF]/20", border: "border-[#F2E8CF]/30", label: "Studying", icon: BookOpen },
  chilling: { color: "#64B5F6", bg: "bg-[#64B5F6]/20", border: "border-[#64B5F6]/30", label: "Chilling", icon: Coffee },
  busy: { color: "#EF5350", bg: "bg-[#EF5350]/20", border: "border-[#EF5350]/30", label: "Busy", icon: XCircle },
};

const initialFriends: Friend[] = [
  { id: "f1", name: "Alex Martinez", initial: "A", status: "exploring", statusEmoji: "🌿", statusText: "Hiking Bishop Peak!", addedAt: "2 weeks ago", visitedPlaces: ["Bishop Peak", "Pismo Beach", "Scout Coffee"], profilePublic: true },
  { id: "f2", name: "Emma Rivera", initial: "E", status: "studying", statusEmoji: "📚", statusText: "Library grind", addedAt: "1 month ago", visitedPlaces: ["Kennedy Library", "Kreuzberg"], profilePublic: true },
  { id: "f3", name: "Jake Thompson", initial: "J", status: "chilling", statusEmoji: "☕", statusText: "Scout Coffee", addedAt: "3 days ago", visitedPlaces: ["Scout Coffee", "Avila Beach"], profilePublic: true },
  { id: "f4", name: "Sarah Kim", initial: "S", status: "exploring", statusEmoji: "🏖️", statusText: "Beach day!", addedAt: "1 week ago", visitedPlaces: ["Shell Beach", "Morro Bay"], profilePublic: false },
  { id: "f5", name: "Marcus Chen", initial: "M", status: "busy", statusEmoji: "🔒", statusText: "Do not disturb", addedAt: "2 weeks ago", visitedPlaces: [], profilePublic: false },
  { id: "f6", name: "Lily Nguyen", initial: "L", status: "studying", statusEmoji: "📝", statusText: "IME 223 hw", addedAt: "5 days ago", visitedPlaces: ["Poly Canyon", "Bishop Peak"], profilePublic: true },
];

const suggestedPeople = [
  { id: "s1", name: "Riley Park", initial: "R", mutualFriends: 3 },
  { id: "s2", name: "Jordan Hayes", initial: "J", mutualFriends: 2 },
  { id: "s3", name: "Casey Wright", initial: "C", mutualFriends: 1 },
  { id: "s4", name: "Taylor Reed", initial: "T", mutualFriends: 4 },
];

export function Friends() {
  const navigate = useNavigate();
  const addFriendDragControls = useDragControls();
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [showInvite, setShowInvite] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "exploring" | "studying" | "chilling" | "busy">("all");
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showJamInvite, setShowJamInvite] = useState(false);

  const handleAddSuggested = (person: typeof suggestedPeople[0]) => {
    const newFriend: Friend = {
      id: person.id,
      name: person.name,
      initial: person.initial,
      status: "exploring",
      statusEmoji: "🌿",
      statusText: "Just joined!",
      addedAt: "Just now",
      visitedPlaces: [],
      profilePublic: true,
    };
    setFriends(prev => [newFriend, ...prev]);
    toast.success(`${person.name} added as a friend!`);
  };

  const handleRemoveFriend = (id: string) => {
    const friend = friends.find(f => f.id === id);
    setFriends(prev => prev.filter(f => f.id !== id));
    setSelectedFriend(null);
    toast.success(`${friend?.name || "Friend"} removed`);
  };

  const inviteLink = "https://polyjarvis.app/invite/abc123";

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
            <h1 className="text-2xl font-extrabold text-white capitalize tracking-wider">Friends</h1>
            <p className="text-[10px] text-white/35 font-bold capitalize tracking-wider">
              {friends.length} Friends · {exploringCount} Exploring · {studyingCount} Studying
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddFriend(true)}
              className="p-2.5 bg-[#F2E8CF] rounded-xl text-[#1a2e10] active:scale-90 transition-transform shadow-lg shadow-[#F2E8CF]/15">
              <UserPlus size={18} />
            </button>
          </div>
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
              className={`px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-wider whitespace-nowrap transition-all ${
                filter === f
                  ? f === "all" ? "bg-white/20 text-white" : `${statusConfig[f].bg} text-white border ${statusConfig[f].border}`
                  : "bg-white/8 text-white/35 border border-white/8"
              }`}
            >
              {f === "all" ? "All" : statusConfig[f].label}
            </button>
          ))}
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
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
                    <span className="text-[11px] text-white/45 truncate">
                      {friend.statusText.split(" ").map((word, i) => (
                        <span key={i} className={i % 2 === 0 ? "font-bold" : "font-light italic"}>
                          {word}{" "}
                        </span>
                      ))}
                    </span>
                  </div>
                </div>

                {/* Status badge + invite hint */}
                <div className="flex flex-col items-end gap-1">
                  <div className={`px-2 py-1 rounded-lg ${config.bg} border ${config.border}`}>
                    <span className="text-[8px] font-semibold tracking-wider" style={{ color: config.color }}>
                      {config.label}
                    </span>
                  </div>
                  {isAvailable && (
                    <span className="text-[7px] font-bold text-[#F2E8CF]/50">Tap to Invite</span>
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
                <h2 className="text-xl font-bold text-white capitalize tracking-wider">{selectedFriend.name}</h2>
                <div className="flex items-center gap-1.5 mt-0.5 justify-center">
                  {(() => {
                    const cfg = statusConfig[selectedFriend.status];
                    const Icon = cfg.icon;
                    return <Icon size={12} style={{ color: cfg.color }} />;
                  })()}
                  <span className="text-xs text-white/40">{selectedFriend.statusText}</span>
                </div>
                <p className="text-[10px] text-white/25 mt-1">Added {selectedFriend.addedAt}</p>
              </div>

              {/* Visited Places */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={12} className="text-[#F2E8CF]" />
                  <span className="text-[10px] font-semibold text-[#F2E8CF] capitalize tracking-wider">Places Visited</span>
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
                    <Users size={16} /> Invite to a Jam
                  </button>
                )}

                <button
                  onClick={() => {
                    navigate("/jams", { state: { createWithFriend: selectedFriend.name.split(" ")[0] } });
                    setSelectedFriend(null);
                  }}
                  className="w-full py-3 bg-white/8 border border-white/12 text-white/60 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:bg-white/12 transition-colors"
                >
                  Create New Jam with {selectedFriend.name.split(" ")[0]}
                </button>

                <button
                  onClick={() => {
                    navigate("/plans", { state: { startCreate: true, withFriend: selectedFriend.name.split(" ")[0] } });
                    setSelectedFriend(null);
                  }}
                  className="w-full py-3 bg-[#c4a46c]/10 border border-[#c4a46c]/20 text-[#c4a46c]/80 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:bg-[#c4a46c]/15 transition-colors"
                >
                  <MapPin size={16} /> Create Plan with {selectedFriend.name.split(" ")[0]}
                </button>

                <button
                  onClick={() => handleRemoveFriend(selectedFriend.id)}
                  className="w-full py-2.5 bg-red-500/8 border border-red-500/15 rounded-xl text-red-400/60 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  Remove Friend
                </button>

                <button
                  onClick={() => setSelectedFriend(null)}
                  className="w-full mt-1 py-2.5 text-white/30 text-sm font-bold"
                >
                  Close
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
                <h2 className="text-xl font-bold text-white capitalize tracking-wider">Add a Friend</h2>
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
                  <Copy size={16} /> Copy Link
                </button>

                <button
                  onClick={handleSMS}
                  className="w-full py-3.5 bg-white/10 border border-white/15 text-white/75 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 active:bg-white/15 transition-colors"
                >
                  <MessageSquare size={16} /> Send via SMS
                </button>

                <button
                  onClick={handleGmail}
                  className="w-full py-3.5 bg-white/10 border border-white/15 text-white/75 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 active:bg-white/15 transition-colors"
                >
                  <Mail size={16} /> Send via Gmail
                </button>

                {typeof navigator !== "undefined" && navigator.share && (
                  <button
                    onClick={handleShare}
                    className="w-full py-3.5 bg-white/6 border border-white/10 text-white/45 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 active:bg-white/10 transition-colors"
                  >
                    More Options...
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowInvite(false)}
                className="w-full mt-4 py-2.5 text-white/30 text-sm font-bold"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Friend Modal */}
      <AnimatePresence>
        {showAddFriend && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowAddFriend(false)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-[#1a2e10]/95 backdrop-blur-2xl rounded-t-3xl p-5 border-t border-white/15 max-h-[70vh] overflow-y-auto"
              drag="y"
              dragControls={addFriendDragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 260 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 110 || info.velocity.y > 700) {
                  setShowAddFriend(false);
                }
              }}
              style={{ touchAction: "pan-y" }}
            >
              <button
                type="button"
                aria-label="Swipe down to close"
                onPointerDown={(event) => addFriendDragControls.start(event)}
                className="block w-10 h-1 bg-white/15 rounded-full mx-auto mb-4"
                style={{ touchAction: "none" }}
              />
              <h3 className="text-lg font-bold text-white mb-1">Add Friends</h3>
              <p className="text-xs text-white/35 mb-4">Search by name or check suggestions below.</p>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={14} />
                <input type="text" placeholder="Search by name..." value={addSearch} onChange={e => setAddSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white/10 border border-white/15 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#F2E8CF]/30" autoFocus />
              </div>

              {/* Suggested people */}
              <p className="text-[9px] font-semibold text-white/25 capitalize tracking-wider mb-2">Suggested for You</p>
              <div className="space-y-2 mb-4">
                {suggestedPeople
                  .filter(p => !friends.some(f => f.id === p.id))
                  .filter(p => !addSearch || p.name.toLowerCase().includes(addSearch.toLowerCase()))
                  .map(person => (
                  <div key={person.id} className="flex items-center gap-3 bg-white/8 border border-white/12 rounded-xl p-3">
                    <div className="w-10 h-10 rounded-full bg-[#F2E8CF]/15 border border-[#F2E8CF]/20 flex items-center justify-center text-sm font-bold text-[#F2E8CF]">
                      {person.initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white/70">{person.name}</p>
                      <p className="text-[10px] text-white/30">{person.mutualFriends} mutual friends</p>
                    </div>
                    <button onClick={() => { handleAddSuggested(person); }}
                      className="px-3 py-1.5 bg-[#F2E8CF] text-[#233216] rounded-lg text-[10px] font-bold active:scale-95 transition-transform">
                      Add
                    </button>
                  </div>
                ))}
              </div>

              {/* Invite via link */}
              <button onClick={() => { setShowAddFriend(false); setShowInvite(true); }}
                className="w-full py-3 bg-white/8 border border-white/12 text-white/50 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:bg-white/12 transition-colors mb-2">
                <Mail size={14} /> Invite via Link
              </button>

              <button onClick={() => setShowAddFriend(false)} className="w-full py-2 text-white/30 font-bold text-sm">Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
