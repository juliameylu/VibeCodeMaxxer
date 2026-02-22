import { useEffect, useMemo, useState } from "react";
import { Bot, Circle, Compass, Home, Send, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/apiClient";

const CHIPS = ["Best hikes?", "Cheap eats", "Plan a beach trip", "What can you do?"];

const NAV_ITEMS = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/jam/DEMO42", label: "Jams", icon: Circle },
  { to: "/ai", label: "Jarvis", icon: Bot, active: true },
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
  const [calling, setCalling] = useState(false);
  const [callJob, setCallJob] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [callForm, setCallForm] = useState({
    restaurant_name: "Demo Restaurant",
    reservation_time: "Tonight at 7:00 PM",
    party_size: 2,
    special_request: ""
  });

  function renderDecision(decision) {
    if (decision === "declined-timeout") return "Declined (timed out)";
    if (decision === "declined") return "Declined";
    if (decision === "confirmed") return "Confirmed";
    if (decision === "no-response") return "No valid response";
    return "Pending";
  }

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

  useEffect(() => {
    let active = true;
    apiFetch("/api/groups")
      .then((data) => {
        if (!active) return;
        const nextGroups = data.groups || [];
        setGroups(nextGroups);
        if (nextGroups[0]?.id) {
          setSelectedGroupId((prev) => prev || nextGroups[0].id);
        }
      })
      .catch(() => {
        if (!active) return;
        setGroups([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const confirmAction = async (actionId) => {
    try {
      const data = await apiFetch(`/api/agent/actions/${actionId}/confirm`, { method: "POST", body: {} });
      setStatus(`Confirmed ${data.action_type}`);
      setActions((prev) => prev.filter((item) => item.action_id !== actionId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not confirm action.");
    }
  };

  useEffect(() => {
    if (!callJob?.job_id) return undefined;
    const statusTerminal = new Set(["failed", "reservation-confirmed", "reservation-declined", "reservation-timeout", "awaiting-followup"]);
    const completedWithDecision = callJob.status === "completed" && callJob.reservation_decision !== "pending";
    if (statusTerminal.has(callJob.status) || completedWithDecision) return undefined;

    const timer = setInterval(async () => {
      try {
        const data = await apiFetch(`/api/agent/call/${callJob.job_id}`);
        setCallJob(data.call_job || null);
      } catch {
        // Ignore transient polling errors in the UI.
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [callJob?.job_id, callJob?.status]);

  const startReservationCall = async () => {
    if (calling) return;
    if (!selectedGroupId) {
      setError("Select a group to notify after reservation confirmation.");
      return;
    }
    setCalling(true);
    setError("");
    try {
      const data = await apiFetch("/api/agent/call/start", {
        method: "POST",
        body: {
          restaurant_name: callForm.restaurant_name,
          reservation_time: callForm.reservation_time,
          party_size: Number(callForm.party_size || 2),
          special_request: callForm.special_request,
          group_id: selectedGroupId
        }
      });
      setCallJob(data.call_job || null);
      setStatus("Reservation call started.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to start reservation call.");
    } finally {
      setCalling(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#001f03] text-[#c7ff9a]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(121,255,80,0.25),transparent_36%),radial-gradient(circle_at_30%_8%,rgba(70,135,43,0.18),transparent_22%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1100px] flex-col px-3 pb-[220px] pt-4 sm:px-4 sm:pb-44 sm:pt-6">
        <header className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#7ef85333] bg-[#79ff5014] shadow-[0_0_28px_rgba(124,255,69,0.24)] sm:h-16 sm:w-16">
            <span className="text-xl font-black text-[#91f75f] sm:text-2xl">J</span>
          </div>
          <div>
            <h1 className="text-[clamp(1.5rem,6vw,2.6rem)] font-extrabold leading-none text-[#f2ffe5]">Jarvis <span className="text-[#94ff67]">✧</span></h1>
            <p className="mt-1 text-[clamp(0.78rem,2.4vw,1.1rem)] text-[#9bd47f]">● SLO Expert · Always online</p>
          </div>
        </header>

        <main className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1 sm:mt-6 sm:space-y-4">
          <article className="max-w-4xl rounded-[22px] border border-[#95ff6d29] bg-[#9dff8930] px-4 py-4 text-[clamp(0.95rem,3.3vw,2rem)] font-semibold leading-tight text-[#ecffe2] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:rounded-[26px] sm:px-6 sm:py-5">
            {greetingText}
          </article>

          {assistantText ? (
            <article className="max-w-4xl rounded-[22px] border border-[#95ff6d40] bg-[#d4ffc61a] px-4 py-4 text-[clamp(0.82rem,2.4vw,1.25rem)] font-medium text-[#e4ffd0] sm:rounded-[26px] sm:px-6 sm:py-5">
              {assistantText}
            </article>
          ) : null}

          {cards.map((card) => (
            <article key={card.id} className="max-w-4xl rounded-[20px] border border-[#a6ff7b36] bg-[#092b0d] px-4 py-3 sm:rounded-[24px] sm:px-5 sm:py-4">
              <h2 className="text-[clamp(0.96rem,2.6vw,1.5rem)] font-bold text-[#efffe8]">{card.title}</h2>
              <p className="mt-1 text-[clamp(0.75rem,2.2vw,1rem)] text-[#b9dea6]">{card.subtitle}</p>
              <Link to={card.deep_link} className="mt-3 inline-block rounded-full border border-[#93f56866] px-3 py-1.5 text-xs font-semibold text-[#9cff6f] sm:px-4 sm:py-2 sm:text-sm">
                Open card
              </Link>
            </article>
          ))}

          {actions.map((action) => (
            <article key={action.action_id} className="max-w-4xl rounded-[20px] border border-[#a6ff7b36] bg-[#0e320f] px-4 py-3 sm:rounded-[24px] sm:px-5 sm:py-4">
              <p className="text-sm font-semibold text-[#ebffdd] sm:text-lg">Proposed action: {action.type}</p>
              <p className="mt-1 text-xs text-[#acd39a] sm:text-sm">Requires confirmation before write.</p>
              <button
                onClick={() => confirmAction(action.action_id)}
                className="mt-3 rounded-full bg-[#8ff451] px-3 py-1.5 text-xs font-bold text-[#12310f] sm:px-4 sm:py-2 sm:text-sm"
              >
                Confirm action
              </button>
            </article>
          ))}

          <article className="max-w-4xl rounded-[20px] border border-[#a6ff7b36] bg-[#0e320f] px-4 py-3 sm:rounded-[24px] sm:px-5 sm:py-4">
            <p className="text-sm font-semibold text-[#ebffdd] sm:text-lg">Call Restaurant (Demo)</p>
            <p className="mt-1 text-xs text-[#acd39a] sm:text-sm">
              Calls are restricted to your configured demo target number, with a 2-minute cap and one retry.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <select
                value={selectedGroupId}
                onChange={(event) => setSelectedGroupId(event.target.value)}
                className="h-11 rounded-xl border border-[#87f95e40] bg-[#a8ff861f] px-3 text-sm text-[#e7ffd8] focus:outline-none"
              >
                <option value="">Select group to notify</option>
                <option value="creator-only">Notify Me Only</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.members?.length || 0} members)
                  </option>
                ))}
              </select>
              <input
                value={callForm.restaurant_name}
                onChange={(event) => setCallForm((prev) => ({ ...prev, restaurant_name: event.target.value }))}
                placeholder="Restaurant name"
                className="h-11 rounded-xl border border-[#87f95e40] bg-[#a8ff861f] px-3 text-sm text-[#e7ffd8] placeholder:text-[#9dbc8f] focus:outline-none"
              />
              <input
                value={callForm.reservation_time}
                onChange={(event) => setCallForm((prev) => ({ ...prev, reservation_time: event.target.value }))}
                placeholder="Reservation time"
                className="h-11 rounded-xl border border-[#87f95e40] bg-[#a8ff861f] px-3 text-sm text-[#e7ffd8] placeholder:text-[#9dbc8f] focus:outline-none"
              />
              <input
                value={callForm.party_size}
                onChange={(event) => setCallForm((prev) => ({ ...prev, party_size: event.target.value }))}
                placeholder="Party size"
                className="h-11 rounded-xl border border-[#87f95e40] bg-[#a8ff861f] px-3 text-sm text-[#e7ffd8] placeholder:text-[#9dbc8f] focus:outline-none"
              />
              <input
                value={callForm.special_request}
                onChange={(event) => setCallForm((prev) => ({ ...prev, special_request: event.target.value }))}
                placeholder="Special request (optional)"
                className="h-11 rounded-xl border border-[#87f95e40] bg-[#a8ff861f] px-3 text-sm text-[#e7ffd8] placeholder:text-[#9dbc8f] focus:outline-none"
              />
            </div>
            <button
              onClick={startReservationCall}
              disabled={calling}
              className="mt-3 rounded-full bg-[#8ff451] px-4 py-2 text-xs font-bold text-[#12310f] disabled:opacity-60 sm:text-sm"
            >
              {calling ? "Starting call..." : "Start reservation call"}
            </button>
            {callJob ? (
              <div className="mt-3 rounded-xl border border-[#95ff6d40] bg-[#d4ffc61a] p-3 text-xs text-[#e4ffd0] sm:text-sm">
                <p className="font-semibold text-[#efffe8]">Call status: {callJob.status}</p>
                <p className="mt-1">Restaurant: {callJob.restaurant_name}</p>
                <p>Time: {callJob.reservation_time} · Party size: {callJob.party_size}</p>
                <p>Attempts: {Array.isArray(callJob.attempts) ? callJob.attempts.length : 0}</p>
                <p>Decision: {renderDecision(callJob.reservation_decision)}</p>
                {callJob.decision_digit ? <p>Pressed key: {callJob.decision_digit}</p> : null}
                {callJob.sms_notifications ? (
                  <>
                    <p>
                      SMS notifications: {callJob.sms_notifications.sent}/{callJob.sms_notifications.recipients} sent
                      {callJob.sms_notifications.failed ? `, ${callJob.sms_notifications.failed} failed` : ""}
                    </p>
                    {Array.isArray(callJob.sms_notifications.errors) && callJob.sms_notifications.errors.length ? (
                      <p className="mt-1 text-[#ffd6a0]">{callJob.sms_notifications.errors[0]}</p>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </article>

          {status ? <p className="text-sm font-semibold text-[#b3f98a]">{status}</p> : null}
          {error ? <p className="text-sm font-semibold text-[#ff9f9f]">{error}</p> : null}
        </main>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-[126px] z-20 mx-auto flex max-w-[1100px] gap-2 overflow-x-auto px-3 pb-2 sm:bottom-[152px] sm:px-4">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => setMessage(chip)}
            className="pointer-events-auto shrink-0 rounded-full border border-[#85f65f4d] bg-[#79ff5021] px-4 py-2 text-[clamp(0.72rem,1.8vw,1rem)] font-semibold text-[#9bff6d] sm:px-5 sm:py-2.5"
          >
            {chip}
          </button>
        ))}
      </div>

      <form onSubmit={send} className="fixed inset-x-0 bottom-[72px] z-20 bg-[#86fd6a14] px-3 py-2 backdrop-blur-sm sm:bottom-[78px] sm:px-4 sm:py-3">
        <div className="mx-auto flex w-full max-w-[1100px] items-center gap-2 sm:gap-3">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask Jarvis anything..."
            className="h-12 w-full rounded-full border border-[#87f95e40] bg-[#a8ff861f] px-4 text-[clamp(0.82rem,2.1vw,1.05rem)] font-semibold text-[#e7ffd8] placeholder:text-[#9dbc8f] focus:outline-none sm:h-16 sm:px-6 sm:text-[clamp(1rem,2.3vw,1.45rem)]"
          />
          <button
            type="submit"
            disabled={sending}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#90f755] text-[#193a13] disabled:opacity-60 sm:h-16 sm:w-16"
            aria-label="Send"
          >
            <Send size={18} className="sm:h-6 sm:w-6" />
          </button>
        </div>
      </form>

      <nav className="fixed inset-x-0 bottom-0 border-t border-black/5 bg-[#f2f3f3] px-2 py-2 sm:px-4 sm:py-3">
        <ul className="mx-auto grid w-full max-w-[1100px] grid-cols-5 gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, active }) => (
            <li key={to}>
              <Link to={to} className="flex flex-col items-center gap-1 rounded-2xl py-1 text-[10px] font-semibold sm:text-xs">
                <Icon size={18} className={active ? "text-[#5e8f3e]" : "text-[#b8bec1]"} />
                <span className={active ? "text-[#4f7c34]" : "text-[#bcc4c7]"}>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
