import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, ExternalLink, Sparkles } from "lucide-react";
import { JarvisLogo } from "./JarvisLogo";

const sloResponses: { keywords: string[]; response: string; path?: string; label?: string }[] = [
  { keywords: ["take me to explore", "go to explore", "open explore"], response: "Taking you to Explore!", path: "/explore", label: "Open Explore" },
  { keywords: ["take me home", "go home", "dashboard"], response: "Going home!", path: "/dashboard", label: "Go Home" },
  { keywords: ["beach", "ocean", "surf"], response: "Beaches near SLO:\n\n🏖️ Avila Beach — 15 min\n🌊 Pismo — 20 min\n🪨 Morro Bay — 25 min\n🐚 Shell Beach — 18 min", path: "/explore?category=Beach", label: "Browse Beaches" },
  { keywords: ["hike", "hiking", "trail"], response: "SLO hikes:\n\n⛰️ Bishop Peak — Best views, 3.5mi\n🏔️ Cerro San Luis — 3mi\n🌿 Poly Canyon — On campus\n🌲 Irish Hills — 4mi loop", path: "/explore?category=Hikes", label: "Browse Hikes" },
  { keywords: ["coffee", "cafe"], response: "Coffee spots:\n\n☕ Scout Coffee — Lavender latte\n📚 Kreuzberg — Late hours\n🌿 Nautical Bean — Chill patio" },
  { keywords: ["food", "eat", "hungry"], response: "SLO food:\n\n🥩 Firestone — Tri-tip\n🍕 Woodstock's — Late night\n🌮 Taqueria Santa Cruz — $2-3 tacos", path: "/explore", label: "Browse Food" },
  { keywords: ["study", "library"], response: "Study spots:\n\n📚 Kennedy Library — Floors 3-5\n☕ Scout Coffee — Good WiFi\n📖 Kreuzberg — Open late" },
  { keywords: ["help", "what can you do"], response: "I can recommend hikes, food, coffee, help plan trips, and navigate the app. Try: \"best hikes\" or \"plan a beach trip\"" },
  { keywords: ["hello", "hi", "hey"], response: "Hey! 👋 What are you looking to do?" },
  { keywords: ["bored", "nothing"], response: "Never bored in SLO!\n\n🌅 Sunset at Bishop Peak\n☕ Scout Coffee\n🏖️ Beach day trip\n🎵 SLO Brew show" },
];

function findQuickResponse(input: string) {
  const lower = input.toLowerCase().trim();
  for (const entry of sloResponses) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) return entry;
    }
  }
  return { response: "Try asking about hikes, food, beaches, or say \"help\"!", keywords: [] };
}

// Pages where we don't show the floating button
const HIDDEN_PATHS = ["/", "/landing", "/signin", "/jarvis", "/tutorial"];

export function FloatingJarvis() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string; path?: string; label?: string }[]>([
    { role: "bot", text: "Hey! Need help? Ask me anything about SLO 🤙" },
  ]);
  const [input, setInput] = useState("");

  if (HIDDEN_PATHS.includes(pathname)) return null;

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    const resp = findQuickResponse(userMsg);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "bot", text: resp.response, path: (resp as any).path, label: (resp as any).label }]);
    }, 400);
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-[#8BC34A] rounded-full flex items-center justify-center shadow-lg shadow-[#8BC34A]/30 active:scale-90 transition-transform"
        >
          <JarvisLogo size={28} className="text-[#233216]" />
        </motion.button>
      )}

      {/* Chat sheet */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-20 right-3 left-3 z-50 bg-black/50 backdrop-blur-2xl rounded-2xl border border-[#8BC34A]/15 shadow-2xl shadow-black/50 max-h-[60vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="bg-[#8BC34A]/15 p-1.5 rounded-full">
                  <JarvisLogo size={18} className="text-[#8BC34A]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white flex items-center gap-1">
                    JARVIS <Sparkles size={10} className="text-[#8BC34A]" />
                  </p>
                  <p className="text-[9px] text-white/30">Quick help</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { navigate("/jarvis"); setOpen(false); }}
                  className="text-[10px] text-[#8BC34A] font-bold bg-[#8BC34A]/10 px-2.5 py-1 rounded-full"
                >
                  Full Chat
                </button>
                <button onClick={() => setOpen(false)} className="p-1 text-white/40 hover:text-white">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px] max-h-[35vh]">
              {messages.map((msg, i) => (
                <div key={i}>
                  <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-line ${
                        msg.role === "user"
                          ? "bg-[#4A6628] text-white rounded-br-sm"
                          : "bg-white/8 text-white/80 border border-white/5 rounded-bl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                  {msg.path && msg.role === "bot" && (
                    <button
                      onClick={() => { navigate(msg.path!); setOpen(false); }}
                      className="flex items-center gap-1 text-[10px] font-bold text-[#8BC34A] bg-[#8BC34A]/10 px-2.5 py-1 rounded-full mt-1 ml-1"
                    >
                      <ExternalLink size={9} /> {msg.label}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-2 border-t border-white/10 flex gap-2">
              <input
                type="text"
                placeholder="Ask anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                className="flex-1 bg-white/8 rounded-full px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none border border-white/10"
              />
              <button onClick={send} className="bg-[#8BC34A] text-[#1a2e10] p-2 rounded-full active:scale-90 transition-transform">
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}