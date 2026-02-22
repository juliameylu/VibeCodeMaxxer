import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AppShell from "../../lib/pageshell/AppShell";
import { apiFetch } from "../../lib/apiClient";

export default function JoinInvitePage() {
  const { token } = useParams();
  const [invite, setInvite] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    apiFetch(`/api/join/${token}`, { withAuth: false }).then((data) => setInvite(data.invite));
  }, [token]);

  const respond = async (rsvp) => {
    const data = await apiFetch(`/api/join/${token}/respond`, {
      method: "POST",
      body: { rsvp, comment: "Joining from invite", availability_blocks: [] }
    });
    setStatus(`Response saved: ${data.response.rsvp}`);
  };

  return (
    <AppShell title="Invite Join" subtitle="Set availability and RSVP">
      <section className="row-pill">
        <p className="text-sm text-soft">Entity: {invite?.entity_type || "..."}</p>
        <p className="text-xs text-soft">Token: {token}</p>
      </section>

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => respond("yes")} className="chip chip-active text-xs">Yes</button>
        <button onClick={() => respond("no")} className="chip chip-idle text-xs">No</button>
        <button onClick={() => respond("maybe")} className="chip chip-idle text-xs">Maybe</button>
      </div>
      {status ? <p className="text-sm font-semibold text-ink">{status}</p> : null}
    </AppShell>
  );
}
