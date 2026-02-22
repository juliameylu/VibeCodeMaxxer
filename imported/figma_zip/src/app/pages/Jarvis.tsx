import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Send, ExternalLink, Sparkles } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { JarvisLogo } from "../components/JarvisLogo";
import { PageHeader } from "../components/PageHeader";

const promptPills = [
  "Best tacos near campus?",
  "Plan a beach trip",
  "Where to study tonight?",
  "Free things to do",
  "Sunset hike spots",
  "Coffee with WiFi",
  "Weekend road trip ideas",
  "Live music this week",
  "Best tri-tip in SLO?",
  "Cheap date ideas",
  "Dog-friendly spots",
  "Farmers market tips",
];

// Horse icon
function HorseIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M26 6C26 6 24 4 22 4C20 4 19 5 18 6C17 7 16 8 15 8C14 8 12 7 11 7C10 7 8 8 7 10C6 12 6 14 7 16C8 18 8 20 8 22C8 24 8 26 8 28H11C11 28 11 25 11 23C11 21 12 20 13 19C14 18 15 18 16 18C17 18 18 18 19 19C20 20 21 21 21 23C21 25 21 28 21 28H24C24 28 24 24 24 22C24 20 25 18 26 16C27 14 28 12 28 10C28 8 27 7 26 6Z" fill="currentColor" />
      <circle cx="23" cy="8" r="1.5" fill="white" opacity="0.7" />
    </svg>
  );
}

type NavAction = { type: "navigate"; path: string; label: string } | null;

const sloKnowledge: { keywords: string[]; response: string; action?: NavAction }[] = [
  { keywords: ["take me to explore", "go to explore", "show explore", "open explore"], response: "Taking you to Explore!", action: { type: "navigate", path: "/explore", label: "Open Explore" } },
  { keywords: ["take me to events", "my events", "show events"], response: "Opening your events!", action: { type: "navigate", path: "/myevents", label: "My Events" } },
  { keywords: ["take me home", "go home", "dashboard"], response: "Going home!", action: { type: "navigate", path: "/dashboard", label: "Go Home" } },
  { keywords: ["plan a trip", "plan a day", "help me plan"], response: "I can help! Here's my suggestion:\n\n1. Browse Explore for activities\n2. Confirm ones you like → they'll show in My Events\n3. Share with your Groups!\n\nWhat kind of day are you planning?", action: { type: "navigate", path: "/explore", label: "Start Exploring" } },
  { keywords: ["plan beach", "beach trip"], response: "Great Pismo Beach day:\n\n🕐 10 AM — Pick up crew\n🚗 10:15 — Drive to Pismo (20 min)\n🏖️ 10:45 — Beach time!\n🍽️ 12:30 — Splash Cafe chowder\n🌊 2 PM — Walk the pier\n🌅 5 PM — Sunset & head back", action: { type: "navigate", path: "/explore?category=Beach", label: "Browse Beaches" } },
  { keywords: ["beach", "ocean", "surf"], response: "Beaches near SLO:\n\n🏖️ Avila Beach — 15 min, chill\n🌊 Pismo — 20 min, pier & chowder\n🪨 Morro Bay — 25 min, kayaking\n🐚 Shell Beach — 18 min, tide pools\n\nAll free, parking $0-10.", action: { type: "navigate", path: "/explore?category=Beach", label: "Browse Beaches" } },
  { keywords: ["hike", "hiking", "trail"], response: "SLO hikes:\n\n⛰️ Bishop Peak — Best views, 3.5mi\n🏔️ Cerro San Luis — The 'M', 3mi\n🌿 Poly Canyon — On campus, 2mi\n🌲 Irish Hills — 4mi loop\n\nAll free!", action: { type: "navigate", path: "/explore?category=Hikes", label: "Browse Hikes" } },
  { keywords: ["coffee", "cafe", "latte"], response: "Coffee spots:\n\n☕ Scout Coffee — Lavender latte ($6)\n📚 Kreuzberg — Late hours, studying\n🌿 Nautical Bean — Chill patio ($5)\n\nScout & Kreuzberg = student favorites." },
  { keywords: ["food", "eat", "restaurant", "hungry"], response: "SLO food:\n\n🥩 Firestone Grill — Tri-tip ($12)\n🍕 Woodstock's — Late night\n🌮 Taqueria Santa Cruz — Tacos ($2-3)\n🍣 Goshi — Sushi downtown\n\nBudget? Thursday Farmer's Market!", action: { type: "navigate", path: "/explore", label: "Browse Food" } },
  { keywords: ["study", "library"], response: "Study spots:\n\n📚 Kennedy Library — Floors 3-5 quiet\n☕ Scout Coffee — Good WiFi\n📖 Kreuzberg — Open late\n🏛️ Mustang Lounge — Underrated\n\nPro tip: 4th floor library = best seats." },
  { keywords: ["bus", "transit", "parking"], response: "SLO Transit is FREE with Cal Poly ID!\n\n🚌 Route 4 — Campus↔Downtown\n🚌 Route 6 — Campus loop\n\nFree parking: Marsh St Garage (90 min)." },
  { keywords: ["bar", "nightlife", "party"], response: "SLO nightlife:\n\n🍺 The Library — College classic\n🍷 Luna Red — Cocktails\n🎵 SLO Brew Rock — Live music\n\nAll on Higuera St. 21+ bring ID!" },
  { keywords: ["help", "what can you do"], response: "I'm Jarvis! I can:\n\n🥾 Recommend hikes, food, coffee\n🗺️ Navigate you anywhere in the app\n📋 Help plan trips\n🚌 Transportation info\n\nTry: \"best hikes\" or \"plan a beach trip\"" },
  { keywords: ["hello", "hi", "hey", "yo"], response: "Hey! 👋 What are you looking to do today? Ask about food, hikes, beaches — or say \"take me to explore\"!" },
  { keywords: ["bored", "nothing to do"], response: "Never bored in SLO!\n\n🌅 Sunset at Bishop Peak\n☕ Scout Coffee\n🏖️ Beach day trip\n🎵 SLO Brew show\n\nWhat sounds good?" },
  { keywords: ["cheap", "budget", "free"], response: "Free: All hikes, Farmer's Market, beaches, Poly Canyon\nUnder $10: Tacos at Santa Cruz, Scout coffee\n\nStudent discounts at most downtown shops!" },
  { keywords: ["thanks", "thank you"], response: "Anytime! 🤙" },
];

function findResponse(input: string): { text: string; action?: NavAction } {
  const lower = input.toLowerCase().trim();

  if (lower.match(/take me|go to|open|navigate/)) {
    if (lower.match(/explore|food|restaurant|hike|beach/)) return { text: "Taking you to Explore!", action: { type: "navigate", path: "/explore", label: "Open Explore" } };
    if (lower.match(/event/)) return { text: "Opening your events!", action: { type: "navigate", path: "/myevents", label: "My Events" } };
    if (lower.match(/home|dashboard/)) return { text: "Going home!", action: { type: "navigate", path: "/dashboard", label: "Go Home" } };
    if (lower.match(/group/)) return { text: "Opening Groups!", action: { type: "navigate", path: "/groups", label: "Groups" } };
    if (lower.match(/deadline|lock|assignment/)) return { text: "Opening Lock-In Mode!", action: { type: "navigate", path: "/deadlines", label: "Lock In" } };
  }

  const sorted = [...sloKnowledge].sort((a, b) => Math.max(...b.keywords.map(k => k.length)) - Math.max(...a.keywords.map(k => k.length)));
  for (const entry of sorted) {
    for (const keyword of entry.keywords) {
      if (lower.includes(keyword)) return { text: entry.response, action: entry.action || undefined };
    }
  }

  if (lower.includes("best") || lower.includes("recommend")) return { text: "What are you looking for? Food, coffee, hikes, study spots, beaches?" };
  if (lower.match(/\?$/)) return { text: "Try asking about hikes, food, beaches, or say \"help\" to see everything I can do." };
  return { text: "Not sure about that! Try: hiking, food, beaches, or say \"help\" for all options." };
}

export function Jarvis() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string; action?: NavAction }[]>([
    { role: "assistant", text: "Hey! I'm Jarvis 🐎 your SLO lifestyle assistant. What are you looking to do today?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  const handleNavigate = useCallback((path: string) => {
    setTimeout(() => navigate(path), 150);
  }, [navigate]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: "user", text: input }]);
    setInput("");
    setIsTyping(true);

    const response = findResponse(input);
    const delay = Math.min(500 + response.text.length * 2, 1200);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: "assistant", text: response.text, action: response.action }]);
    }, delay);
  };

  const suggestions = ["Best hikes?", "Cheap eats", "Plan a beach trip", "What can you do?"];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-transparent pb-16">
      {/* Header */}
      <div className="bg-gradient-to-b from-white/5 to-transparent px-5 pt-2 pb-4 flex-shrink-0">
        <PageHeader />
        <div className="flex items-center gap-3 mt-2">
          <div className="bg-[#8BC34A]/15 p-2 rounded-full border border-[#8BC34A]/20">
            <JarvisLogo size={28} className="text-[#8BC34A]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Jarvis
              <Sparkles size={14} className="text-[#8BC34A]" />
            </h1>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#8BC34A] animate-pulse" />
              <span className="text-[10px] text-white/40">SLO Expert · Always online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx}>
            <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed whitespace-pre-line ${
                msg.role === "user"
                  ? "bg-[#4A6628] text-white rounded-br-sm"
                  : "bg-white/8 text-white/90 border border-white/5 rounded-bl-sm"
              }`}>
                {msg.text}
              </div>
            </div>
            {msg.action && msg.role === "assistant" && (
              <div className="flex justify-start mt-1.5 ml-1">
                <button
                  onClick={() => handleNavigate(msg.action!.path)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-[#8BC34A] bg-[#8BC34A]/10 px-3 py-1.5 rounded-full border border-[#8BC34A]/20 active:bg-[#8BC34A]/20 transition-colors"
                >
                  <ExternalLink size={11} /> {msg.action.label}
                </button>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/8 border border-white/5 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#8BC34A]/50 animate-bounce [animation-delay:0ms]" />
                <div className="w-2 h-2 rounded-full bg-[#8BC34A]/50 animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 rounded-full bg-[#8BC34A]/50 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating prompt pills marquee — from Landing page */}
      {messages.length <= 2 && (
        <div className="flex-shrink-0 overflow-hidden py-2">
          <div className="flex mb-1.5">
            <div className="flex gap-1.5 shrink-0" style={{ animation: "jarvis-scroll-left 35s linear infinite" }}>
              {[...promptPills, ...promptPills].map((pill, i) => (
                <button key={`a-${i}`} onClick={() => { setInput(pill); }}
                  className="bg-white/8 backdrop-blur-sm text-white/60 text-[11px] font-medium px-3.5 py-1.5 rounded-full border border-white/10 whitespace-nowrap active:bg-[#8BC34A]/15 active:text-[#8BC34A] active:border-[#8BC34A]/20 transition-colors"
                >{pill}</button>
              ))}
            </div>
          </div>
          <div className="flex">
            <div className="flex gap-1.5 shrink-0" style={{ animation: "jarvis-scroll-right 40s linear infinite" }}>
              {[...promptPills].reverse().concat([...promptPills].reverse()).map((pill, i) => (
                <button key={`b-${i}`} onClick={() => { setInput(pill); }}
                  className="bg-white/5 backdrop-blur-sm text-white/40 text-[11px] font-medium px-3.5 py-1.5 rounded-full border border-white/8 whitespace-nowrap active:bg-[#8BC34A]/15 active:text-[#8BC34A] active:border-[#8BC34A]/20 transition-colors"
                >{pill}</button>
              ))}
            </div>
          </div>
          <style>{`
            @keyframes jarvis-scroll-left { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            @keyframes jarvis-scroll-right { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
          `}</style>
        </div>
      )}

      {/* Quick suggestions */}
      {messages.length <= 2 && (
        <div className="px-4 py-1 flex gap-2 overflow-x-auto flex-shrink-0">
          {suggestions.map(s => (
            <button key={s} onClick={() => setInput(s)}
              className="text-[11px] px-3 py-1.5 bg-[#8BC34A]/10 text-[#8BC34A] rounded-full whitespace-nowrap border border-[#8BC34A]/15 active:bg-[#8BC34A]/20 font-bold"
            >{s}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 bg-black/40 backdrop-blur-xl border-t border-white/10 flex gap-2 flex-shrink-0">
        <input
          type="text"
          placeholder="Ask Jarvis anything..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          className="flex-1 bg-white/8 rounded-full px-4 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#8BC34A]/30 border border-white/10"
        />
        <button onClick={handleSend} className="bg-[#8BC34A] text-[#1a2e10] p-2.5 rounded-full shadow-lg shadow-[#8BC34A]/20 active:scale-90 transition-transform">
          <Send size={18} />
        </button>
      </div>

      <BottomNav />
    </div>
  );
}