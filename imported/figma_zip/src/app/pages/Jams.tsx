import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Hash, Copy, Share2, ArrowLeft, Trash2, X, ChevronRight, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "../components/BottomNav";
import { PageHeader } from "../components/PageHeader";

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

export function Jams() {
  const navigate = useNavigate();
  const [jams, setJams] = useState<Jam[]>(initialJams);
  const [view, setView] = useState<"list" | "create" | "join" | "detail">("list");
  const [selectedJam, setSelectedJam] = useState<Jam | null>(null);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("🏖️");
  const [joinCode, setJoinCode] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{ sender: string; text: string; time: string }[]>([]);

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
    setJams([jam, ...jams]);
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
    setJams([jam, ...jams]);
    setJoinCode("");
    setView("list");
    toast.success(`Joined ${code}!`);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
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
    setJams(jams.filter(j => j.id !== id));
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

  return (
    <div className="min-h-[100dvh] bg-transparent text-white pb-24">
      <PageHeader />

      {/* Header */}
      <div className="px-5 pb-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          {view !== "list" && (
            <button onClick={() => { setView("list"); setSelectedJam(null); }} className="p-1 -ml-1 text-white/30">
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-black text-white uppercase tracking-wider">
              {view === "list" ? "JAMS" : view === "create" ? "NEW JAM" : view === "join" ? "JOIN JAM" : selectedJam?.name?.toUpperCase()}
            </h1>
            {view === "list" && <p className="text-[10px] text-white/25 font-bold uppercase tracking-wider">YOUR CREWS & CONVERSATIONS</p>}
          </div>
          {view === "list" && (
            <div className="flex gap-2">
              <button onClick={() => setView("join")}
                className="p-2 bg-white/8 rounded-full text-white/40 active:scale-90 transition-transform">
                <Hash size={16} />
              </button>
              <button onClick={() => setView("create")}
                className="p-2 bg-[#8BC34A] rounded-full text-[#233216] active:scale-90 transition-transform">
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-4">
        {/* LIST */}
        {view === "list" && (
          <div className="space-y-2">
            {jams.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">👥</p>
                <h3 className="text-lg font-bold text-white/60 mb-1">NO JAMS YET</h3>
                <p className="text-sm text-white/25 mb-5">Create a crew or join with a code</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setView("create")}
                    className="px-4 py-2.5 bg-[#8BC34A] text-[#233216] rounded-xl text-sm font-bold active:scale-95 transition-transform">
                    CREATE JAM
                  </button>
                  <button onClick={() => setView("join")}
                    className="px-4 py-2.5 bg-white/8 text-white/50 rounded-xl text-sm font-bold active:scale-95 transition-transform">
                    JOIN WITH CODE
                  </button>
                </div>
              </div>
            ) : (
              jams.map(jam => (
                <div key={jam.id} onClick={() => openDetail(jam)}
                  className="bg-white/5 rounded-xl border border-white/8 p-3.5 flex items-center gap-3 active:bg-white/8 transition-colors cursor-pointer">
                  <div className="w-11 h-11 bg-white/8 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                    {jam.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm truncate">{jam.name}</h3>
                      <span className="text-[9px] font-mono text-white/20 bg-white/5 px-1.5 rounded">{jam.code}</span>
                    </div>
                    {jam.lastMessage && (
                      <p className="text-[11px] text-white/30 truncate mt-0.5">{jam.lastMessage}</p>
                    )}
                    <p className="text-[9px] text-white/15 mt-0.5">{jam.members.length} members · {jam.createdAt}</p>
                  </div>
                  <ChevronRight size={14} className="text-white/15" />
                </div>
              ))
            )}
          </div>
        )}

        {/* CREATE */}
        {view === "create" && (
          <div className="space-y-4 max-w-sm">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">JAM NAME</label>
              <input type="text" placeholder='e.g. "Beach Crew"' value={newName} onChange={e => setNewName(e.target.value)}
                className="w-full border border-white/10 bg-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-[#8BC34A]/40 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">PICK AN EMOJI</label>
              <div className="flex flex-wrap gap-2">
                {emojiOptions.map(e => (
                  <button key={e} onClick={() => setNewEmoji(e)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${
                      newEmoji === e ? "bg-[#8BC34A]/20 ring-2 ring-[#8BC34A]" : "bg-white/5"
                    }`}>{e}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setView("list")} className="flex-1 py-3 text-white/30 font-bold text-sm">CANCEL</button>
              <button onClick={createJam} className="flex-1 py-3 bg-[#8BC34A] text-[#233216] rounded-xl font-bold text-sm shadow-md">CREATE</button>
            </div>
          </div>
        )}

        {/* JOIN */}
        {view === "join" && (
          <div className="space-y-4 max-w-sm">
            <p className="text-sm text-white/40">Enter the code your friend shared with you.</p>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
              <input type="text" placeholder="e.g. PISMO-7" value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-4 py-3 border border-white/10 bg-white/5 rounded-xl text-sm font-mono uppercase tracking-wider text-white placeholder:text-white/20 focus:border-[#8BC34A]/40 outline-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setView("list")} className="flex-1 py-3 text-white/30 font-bold text-sm">CANCEL</button>
              <button onClick={joinJam} className="flex-1 py-3 bg-[#8BC34A] text-[#233216] rounded-xl font-bold text-sm shadow-md">JOIN</button>
            </div>
          </div>
        )}

        {/* DETAIL */}
        {view === "detail" && selectedJam && (
          <div className="space-y-5">
            {/* Info */}
            <div className="flex items-center gap-3 bg-white/5 rounded-xl border border-white/8 p-3">
              <div className="w-12 h-12 bg-white/8 rounded-full flex items-center justify-center text-2xl">{selectedJam.emoji}</div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-white">{selectedJam.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-mono text-white/25 bg-white/5 px-2 py-0.5 rounded">{selectedJam.code}</span>
                  <button onClick={() => copyCode(selectedJam.code)} className="text-[10px] text-[#8BC34A] font-bold flex items-center gap-0.5">
                    <Copy size={9} /> COPY
                  </button>
                </div>
              </div>
              <button onClick={() => shareJam(selectedJam)} className="p-2 text-white/20 hover:text-[#8BC34A]">
                <Share2 size={16} />
              </button>
            </div>

            {/* Members */}
            <div>
              <h3 className="text-[10px] font-black text-white/25 uppercase tracking-widest mb-2">MEMBERS ({selectedJam.members.length})</h3>
              <div className="space-y-1.5">
                {selectedJam.members.map(m => (
                  <div key={m.id} className="flex items-center gap-2.5 bg-white/5 rounded-lg border border-white/5 p-2.5">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/40">{m.name[0]}</div>
                    <span className="text-sm font-bold text-white/70 flex-1">{m.name}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      m.rsvp === "going" ? "bg-[#8BC34A]/20 text-[#8BC34A]"
                      : m.rsvp === "maybe" ? "bg-[#F2E8CF]/20 text-[#F2E8CF]"
                      : "bg-white/8 text-white/25"
                    }`}>{m.rsvp.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div>
              <h3 className="text-[10px] font-black text-white/25 uppercase tracking-widest mb-2">CHAT</h3>
              <div className="bg-white/3 rounded-xl border border-white/5 p-3 min-h-[120px] max-h-48 overflow-y-auto space-y-2 mb-2">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === "You" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-3 py-1.5 rounded-xl text-xs ${
                      msg.sender === "You"
                        ? "bg-[#8BC34A] text-[#233216] rounded-br-sm"
                        : "bg-white/8 text-white/70 border border-white/5 rounded-bl-sm"
                    }`}>
                      {msg.sender !== "You" && <p className="text-[9px] font-bold text-white/30 mb-0.5">{msg.sender}</p>}
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Message..." value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#8BC34A]/30" />
                <button onClick={sendMessage} className="p-2 bg-[#8BC34A] rounded-xl text-[#233216] active:scale-90 transition-transform">
                  <Send size={16} />
                </button>
              </div>
            </div>

            {/* Actions */}
            {selectedJam.isOwner && (
              <button onClick={() => deleteJam(selectedJam.id)}
                className="w-full py-2.5 text-red-400/60 text-sm font-bold flex items-center justify-center gap-1">
                <Trash2 size={14} /> DELETE JAM
              </button>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}