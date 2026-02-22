import { useMemo, useState } from "react";
import { Bot, Circle, Compass, Home, Send, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/apiClient";

const CHIPS = ["Best hikes?", "Cheap eats", "Plan a beach trip", "What can you do?"];

const NAV_ITEMS = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/ai", label: "Jarvis", icon: Bot, active: true },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/jam/DEMO42", label: "Jams", icon: Circle },
  { to: "/profile", label: "Profile", icon: UserRound }
];

export default function AIPage() {
  const [message, setMessage] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [cards, setCards] = useState([]);
  const [actions, setActions] = useState([]);
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const greetingText = useMemo(() => {
    return "Hey! I'm Jarvis your SLO lifestyle assistant. What are you looking to do today?";
  }, []);

  const send = async (event) => {
    event.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    setStatus("");
    setError("");

    try {
      const data = await apiFetch("/api/agent/chat", {
        method: "POST",
        body: {
          message,
          context: { activeScreen: "ai", weather: "clear", timeOfDay: "evening" },
          chips: CHIPS
        }
      });
      setAssistantText(data.assistant_text || "");
      setCards(data.cards || []);
      setActions(data.proposed_actions || []);
      setMessage("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to fetch response.");
    } finally {
      setSending(false);
    }
  };

  const confirmAction = async (actionId) => {
    try {
      const data = await apiFetch(`/api/agent/actions/${actionId}/confirm`, { method: "POST", body: {} });
      setStatus(`Confirmed ${data.action_type}`);
      setActions((prev) => prev.filter((item) => item.action_id !== actionId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not confirm action.");
    }
  };

  return (
    <div className="min-h-screen bg-[#eef5ee] px-0 sm:px-4 sm:py-2">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[540px] flex-col overflow-hidden rounded-none bg-[#001f03] text-[#d9f0d2] sm:min-h-[96vh] sm:rounded-[36px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_4%,rgba(130,255,77,0.22),transparent_36%),linear-gradient(180deg,#022606_0%,#001d03_55%,#001a03_100%)]" />

        <div className="relative flex-1 px-3 pb-[186px] pt-6 sm:px-4">
          <p className="text-center text-[11px] font-extrabold tracking-[0.35em] text-[#768d76]">POLYJARVIS</p>

          <header className="mt-5 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#7ef8533d] bg-[#98ff6e14] shadow-[0_0_26px_rgba(137,255,95,0.20)]">
              <span className="text-2xl font-black text-[#98ea68]">J</span>
            </div>
            <div>
              <h1 className="text-[26px] font-extrabold leading-none text-[#f2ffe6]">Jarvis <span className="text-[#95ff67]">✧</span></h1>
              <p className="mt-0.5 text-[13px] text-[#8eb087]">● SLO Expert · Always online</p>
            </div>
          </header>

          <main className="mt-6 space-y-3">
            <article className="rounded-[22px] border border-[#95ff6d2b] bg-[#8bff7f26] px-5 py-4 text-[12px] font-semibold leading-relaxed text-[#edfbe8]">
              {greetingText}
            </article>

            {assistantText ? (
              <article className="rounded-[22px] border border-[#95ff6d3d] bg-[#d4ffc61a] px-5 py-4 text-[11px] font-medium text-[#e5ffda]">
                {assistantText}
              </article>
            ) : null}

            {cards.map((card) => (
              <article key={card.id} className="rounded-[20px] border border-[#a6ff7b36] bg-[#0e320f] px-4 py-3">
                <h2 className="text-[15px] font-bold text-[#efffe8]">{card.title}</h2>
                <p className="mt-1 text-xs text-[#b9dea6]">{card.subtitle}</p>
                <Link to={card.deep_link} className="mt-2 inline-block rounded-full border border-[#93f56866] px-3 py-1.5 text-xs font-semibold text-[#9cff6f]">
                  Open card
                </Link>
              </article>
            ))}

            {actions.map((action) => (
              <article key={action.action_id} className="rounded-[20px] border border-[#a6ff7b36] bg-[#0e320f] px-4 py-3">
                <p className="text-sm font-semibold text-[#ebffdd]">Proposed action: {action.type}</p>
                <button
                  onClick={() => confirmAction(action.action_id)}
                  className="mt-2 rounded-full bg-[#8ff451] px-3 py-1.5 text-xs font-bold text-[#12310f]"
                >
                  Confirm action
                </button>
              </article>
            ))}

            {status ? <p className="text-xs font-semibold text-[#b3f98a]">{status}</p> : null}
            {error ? <p className="text-xs font-semibold text-[#ff9f9f]">{error}</p> : null}
          </main>
        </div>

        <div className="relative border-t border-[#82f16429] bg-[#9eff7f14] px-2.5 py-2">
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => setMessage(chip)}
                className="shrink-0 rounded-full border border-[#85f65f4d] bg-[#79ff501f] px-4 py-2 text-[11px] font-semibold text-[#90e563]"
              >
                {chip}
              </button>
            ))}
          </div>

          <form onSubmit={send} className="flex items-center gap-2">
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask Jarvis anything..."
              className="h-14 w-full rounded-full border border-[#87f95e45] bg-[#a8ff861a] px-5 text-[11px] font-semibold text-[#e7ffd8] placeholder:text-[#99b697] focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending}
              className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#92f65a] text-[#173114] disabled:opacity-60"
              aria-label="Send"
            >
              <Send size={20} />
            </button>
          </form>
        </div>

        <nav className="border-t border-[#83f16622] bg-[#051f08] px-1 py-2">
          <ul className="grid grid-cols-5 gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon, active }) => (
              <li key={to}>
                <Link to={to} className="flex flex-col items-center gap-1 rounded-2xl py-1 text-[10px] font-bold uppercase tracking-wide">
                  <Icon size={20} className={active ? "text-[#89ea5e]" : "text-[#637b65]"} />
                  <span className={active ? "text-[#89ea5e]" : "text-[#637b65]"}>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
