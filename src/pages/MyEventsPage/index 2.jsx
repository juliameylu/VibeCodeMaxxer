import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MobileShell from "../../components/MobileShell";
import SectionHeader from "../../components/ui/SectionHeader";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import { fetchMyEvents, sendEventInvites } from "../../lib/api/workflow";

export default function MyEventsPage() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [sendingId, setSendingId] = useState("");

  useEffect(() => {
    let active = true;
    fetchMyEvents()
      .then((data) => {
        if (active) setState({ loading: false, items: data.items || [], error: "" });
      })
      .catch((error) => {
        if (active) setState({ loading: false, items: [], error: error.message || "Failed to load events" });
      });
    return () => {
      active = false;
    };
  }, []);

  async function quickInvite(eventId) {
    setSendingId(eventId);
    try {
      await sendEventInvites({
        event_id: eventId,
        message_text: "Want to join this event?",
        recipients: [{ recipient_type: "group_member", recipient_ref: "demo_friend", channel: "email" }]
      });
    } finally {
      setSendingId("");
    }
  }

  return (
    <MobileShell showFab={false}>
      <SectionHeader
        title="MyEvents"
        subtitle="Confirmed and maybe events"
        action={<Link className="chip chip-idle text-xs" to="/groups">Groups</Link>}
      />
      <PageShell>
        {state.error ? <Card>{state.error}</Card> : null}
        {state.loading ? <Card>Loading your events...</Card> : null}
        {!state.loading && state.items.length === 0 ? <Card>No saved events yet.</Card> : null}
        {state.items.map((item) => (
          <Card key={item.my_event_id}>
            <h3 className="font-bold">{item.event_id}</h3>
            <p className="text-xs text-soft">
              {item.decision === "confirmed" ? "Confirmed" : "Maybe"} · starts {new Date(item.event_start_ts).toLocaleString()}
            </p>
            {item.decision === "maybe" ? (
              <p className="mt-1 text-xs text-soft">Maybe expires: {new Date(item.expires_at).toLocaleString()}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="chip chip-active text-xs" onClick={() => navigate(`/event/${encodeURIComponent(item.event_id)}`)}>
                Open
              </button>
              <button className="chip chip-idle text-xs" onClick={() => quickInvite(item.event_id)} disabled={sendingId === item.event_id}>
                {sendingId === item.event_id ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </Card>
        ))}
      </PageShell>
    </MobileShell>
  );
}
