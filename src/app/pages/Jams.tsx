import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";
import { BottomNav } from "../components/BottomNav";
import { PageHeader } from "../components/PageHeader";
import { copyToClipboard } from "../utils/clipboard";
import { Plus, Users, ArrowLeft, Share2, Send, Copy, ChevronRight, Trash2, Hash } from "lucide-react";

interface JamMember {
  id: string;
  name: string;
  rsvp: "going" | "maybe" | "pending";
}

interface Jam {
  id: string;
  name: string;
  emoji: string;
  code: string;
  members: JamMember[];
  isOwner: boolean;
  lastMessage?: string;
  createdAt: string;
}

const initialJams: Jam[] = [
  {
    id: "j1",
    name: "Beach Crew",
    emoji: "🏖️",
    code: "PISMO-7",
    isOwner: true,
    lastMessage: "Who's driving Saturday?",
    createdAt: "2 days ago",
    members: [
      { id: "m1", name: "You", rsvp: "going" },
      { id: "m2", name: "Alex M.", rsvp: "going" },
      { id: "m3", name: "Emma R.", rsvp: "maybe" },
      { id: "m4", name: "Jake T.", rsvp: "pending" },
    ],
  },
  {
    id: "j2",
    name: "Study Squad",
    emoji: "📚",
    code: "GRND-88",
    isOwner: false,
    lastMessage: "Library 4th floor at 7?",
    createdAt: "5 days ago",
    members: [
      { id: "m5", name: "Sarah K.", rsvp: "going" },
      { id: "m6", name: "You", rsvp: "going" },
    ],
  },
];

const emojiOptions = ["🏖️", "🏔️", "☕", "📚", "🎸", "🍕", "🎨", "🏄", "🌅", "⛺", "🎮", "🎉"];

const JAMS_KEY = "polyjarvis_jams";

export function Jams() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Load jams from localStorage, falling back to initial data
  const [jams, setJams] = useState<Jam[]>(() => {
    try {
      const saved = localStorage.getItem(JAMS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* noop */ }
    return initialJams;
  });

  const [view, setView] = useState<"list" | "create" | "join" | "detail">("list");
  const [selectedJam, setSelectedJam] = useState<Jam | null>(null);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("🏖️");
  const [joinCode, setJoinCode] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{ sender: string; text: string; time: string }[]>([]);

  // Persist jams whenever they change
  const persistJams = (updated: Jam[]) => {
    setJams(updated);
    localStorage.setItem(JAMS_KEY, JSON.stringify(updated));
  };

  const generateCode = () => {
    const words = ["PEAK", "WAVE", "BREW", "SURF", "HIKE", "CHILL", "CREW"];
    return `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(Math.random() * 99) + 1}`;
  };

  const createJam = () => {
    if (!newName.trim()) return;
    const jam: Jam = {
      id: Date.now().toString(),
      name: newName,
      emoji: newEmoji,
      code: generateCode(),
      isOwner: true,
      createdAt: "Just now",
      members: [{ id: "you", name: "You", rsvp: "going" }],
    };
    persistJams([jam, ...jams]);
    setNewName("");
    setNewEmoji("🏖️");
    setView("list");
    toast.success(`"${jam.name}" created! Code: ${jam.code}`);
  };

  const joinJam = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    const exists = jams.find(j => j.code === code);
    if (exists) {
      toast.info("You're already in this Jam!");
      setView("list");
      return;
    }
    const jam: Jam = {
      id: Date.now().toString(),
      name: `Jam ${code}`,
      emoji: "🎉",
      code,
      isOwner: false,
      createdAt: "Just now",
      members: [
        { id: "owner", name: "Host", rsvp: "going" },
        { id: "you", name: "You", rsvp: "going" },
      ],
    };
    persistJams([jam, ...jams]);
    setJoinCode("");
    setView("list");
    toast.success(`Joined ${code}!`);
  };

  const copyCode = (code: string) => {
    copyToClipboard(code);
    toast.success("Code copied!");
  };

  const shareJam = (jam: Jam) => {
    const msg = `Join my PolyJarvis crew "${jam.name}"!\nCode: ${jam.code}`;
    if (navigator.share) {
      navigator.share({ title: jam.name, text: msg }).catch(() => {});
    } else {
      window.open(`sms:?body=${encodeURIComponent(msg)}`, "_blank");
    }
  };

  const deleteJam = (id: string) => {
    persistJams(jams.filter(j => j.id !== id));
    setSelectedJam(null);
    setView("list");
    toast.success("Jam deleted");
  };

  const openDetail = (jam: Jam) => {
    setSelectedJam(jam);
    setMessages([
      { sender: jam.members[0]?.name || "Host", text: jam.lastMessage || "Hey everyone!", time: "2h ago" },
    ]);
    setView("detail");
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    setMessages([...messages, { sender: "You", text: chatInput, time: "now" }]);
    setChatInput("");
  };

  useEffect(() => {
    // Re-load from localStorage in case Dashboard created a jam
    try {
      const saved = localStorage.getItem(JAMS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setJams(parsed);
        }
      }
    } catch { /* noop */ }

    const queryParams = new URLSearchParams(location.search);
    const code = queryParams.get("code");
    if (code) {
      const exists = jams.find(j => j.code === code);
      if (exists) {
        openDetail(exists);
      } else {
        setJoinCode(code);
        setView("join");
      }
    }
    // Handle create-with-friend from Friends page or Dashboard
    const state = location.state as { createWithFriend?: string } | null;
    if (state?.createWithFriend) {
      setNewName(`Jam with ${state.createWithFriend}`);
      setNewEmoji("🎉");
      setView("create");
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rsvpColor: Record<string, string> = {
    going: "bg-[#8BC34A]/20 text-[#8BC34A] border-[#8BC34A]/30",
    maybe: "bg-amber-400/20 text-amber-400 border-amber-400/30",
    pending: "bg-white/10 text-white/30 border-white/15",
  };

  return (
    <div className="min-h-full bg-transparent text-white pb-24">
      <PageHeader />

      {/* LIST VIEW */}
      {view === "list" && (
        <div className="px-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wider">JAMS</h1>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">{jams.length} CREWS</p>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <button onClick={() => setView("create")} className="flex-1 py-3 bg-[#F2E8CF] text-[#233216] rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#F2E8CF]/15 active:scale-[0.97] transition-transform">
              <Plus size={16} /> CREATE JAM
            </button>
            <button onClick={() => setView("join")} className="flex-1 py-3 bg-white/10 border border-white/15 text-white/60 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:bg-white/15 transition-colors">
              <Hash size={16} /> JOIN CODE
            </button>
          </div>

          <div className="space-y-1.5">
            {jams.map(jam => (
              <div
                key={jam.id}
                onClick={() => openDetail(jam)}
                className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl p-3.5 flex items-center gap-3 active:bg-white/15 transition-colors cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-xl flex-shrink-0">
                  {jam.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-sm leading-tight">{jam.name}</h3>
                  <p className="text-[10px] text-white/30 leading-tight mt-0.5">
                    {jam.members.length} members · {jam.createdAt}
                  </p>
                  {jam.lastMessage && (
                    <p className="text-[11px] text-white/40 mt-1 truncate leading-tight">{jam.lastMessage}</p>
                  )}
                </div>
                <ChevronRight size={14} className="text-white/15 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE VIEW */}
      {view === "create" && (
        <div className="px-5">
          <button onClick={() => { setView("list"); setNewName(""); }} className="flex items-center gap-1.5 text-white/40 mb-4 text-sm font-bold">
            <ArrowLeft size={18} /> BACK
          </button>

          <h2 className="text-2xl font-black uppercase tracking-wider mb-5">NEW JAM</h2>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">PICK AN EMOJI</label>
              <div className="flex flex-wrap gap-2">
                {emojiOptions.map(e => (
                  <button key={e} onClick={() => setNewEmoji(e)}
                    className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center ${newEmoji === e ? "bg-[#F2E8CF] scale-110" : "bg-white/10 border border-white/15"}`}
                  >{e}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">JAM NAME</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Beach Crew"
                className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#F2E8CF]/40"
              />
            </div>

            <button onClick={createJam} disabled={!newName.trim()}
              className="w-full py-3.5 bg-[#F2E8CF] text-[#233216] rounded-xl font-bold text-sm shadow-md disabled:opacity-40 active:scale-[0.97] transition-transform"
            >
              CREATE JAM
            </button>
          </div>
        </div>
      )}

      {/* JOIN VIEW */}
      {view === "join" && (
        <div className="px-5">
          <button onClick={() => { setView("list"); setJoinCode(""); }} className="flex items-center gap-1.5 text-white/40 mb-4 text-sm font-bold">
            <ArrowLeft size={18} /> BACK
          </button>

          <h2 className="text-2xl font-black uppercase tracking-wider mb-5">JOIN A JAM</h2>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">ENTER CODE</label>
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. PISMO-7"
                className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-white/25 focus:outline-none focus:border-[#F2E8CF]/40 uppercase"
              />
            </div>

            <button onClick={joinJam} disabled={!joinCode.trim()}
              className="w-full py-3.5 bg-[#F2E8CF] text-[#233216] rounded-xl font-bold text-sm shadow-md disabled:opacity-40 active:scale-[0.97] transition-transform"
            >
              JOIN
            </button>
          </div>
        </div>
      )}

      {/* DETAIL VIEW */}
      {view === "detail" && selectedJam && (
        <div className="px-5 flex flex-col" style={{ minHeight: "calc(100dvh - 8rem)" }}>
          <button onClick={() => setView("list")} className="flex items-center gap-1.5 text-white/40 mb-3 text-sm font-bold">
            <ArrowLeft size={18} /> BACK
          </button>

          {/* Jam header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-2xl flex-shrink-0">
              {selectedJam.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-white uppercase tracking-wider truncate">{selectedJam.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono text-[#F2E8CF] bg-[#F2E8CF]/10 px-2 py-0.5 rounded">{selectedJam.code}</span>
                <button onClick={() => copyCode(selectedJam.code)} className="text-white/25 hover:text-white/50">
                  <Copy size={12} />
                </button>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => shareJam(selectedJam)} className="p-2 bg-white/10 rounded-lg text-white/40 hover:text-white/60">
                <Share2 size={16} />
              </button>
              {selectedJam.isOwner && (
                <button onClick={() => deleteJam(selectedJam.id)} className="p-2 bg-red-500/10 rounded-lg text-red-400/50 hover:text-red-400/80">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Members */}
          <div className="mb-4">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">MEMBERS</p>
            <div className="flex gap-1.5 flex-wrap">
              {selectedJam.members.map(m => (
                <div key={m.id} className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${rsvpColor[m.rsvp]}`}>
                  {m.name} · {m.rsvp.toUpperCase()}
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 mb-3 overflow-y-auto max-h-[40vh]">
            <div className="space-y-2">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === "You" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-xl ${msg.sender === "You" ? "bg-[#F2E8CF]/20 text-white rounded-br-sm" : "bg-white/10 text-white/70 rounded-bl-sm"}`}>
                    <p className="text-[10px] font-bold text-white/30 mb-0.5">{msg.sender}</p>
                    <p className="text-xs leading-tight">{msg.text}</p>
                    <p className="text-[8px] text-white/20 mt-0.5 text-right">{msg.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="Message your crew..."
              className="flex-1 bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#F2E8CF]/40"
            />
            <button onClick={sendMessage} className="p-2.5 bg-[#F2E8CF] text-[#233216] rounded-xl active:scale-90 transition-transform">
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}