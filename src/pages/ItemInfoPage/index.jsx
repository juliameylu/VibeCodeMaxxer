import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../../lib/pageshell/AppShell";
import { apiFetch } from "../../lib/apiClient";

export default function ItemInfoPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    apiFetch(`/api/items/${itemId}`).then((data) => setItem(data.item));
  }, [itemId]);

  const applyState = async (state) => {
    await apiFetch(`/api/items/${itemId}/state`, { method: "POST", body: { state } });
    setStatus(`Saved as ${state}.`);
  };

  const invite = async () => {
    const data = await apiFetch("/api/invites/generate", {
      method: "POST",
      body: { entity_type: "event", entity_id: itemId }
    });
    setStatus(`Invite link generated: ${data.link}`);
  };

  if (!item) {
    return <AppShell title="Item" subtitle="Loading details..." />;
  }

  return (
    <AppShell title={item.title} subtitle="Event/Item info">
      <section className="row-pill">
        <p className="text-sm text-soft">{item.description}</p>
        <p className="mt-2 text-xs text-soft">Category: {item.category} • {item.distanceMiles} mi • {item.rating}★</p>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <button onClick={() => applyState("confirmed")} className="chip chip-active py-3 text-sm">Confirm</button>
        <button onClick={() => applyState("maybe")} className="chip chip-idle py-3 text-sm">Maybe</button>
        <button onClick={() => applyState("saved")} className="chip chip-idle py-3 text-sm">Save / Like</button>
        <button onClick={invite} className="chip chip-idle py-3 text-sm">Invite</button>
      </section>

      <button onClick={() => navigate(-1)} className="chip chip-idle w-full py-3 text-sm">Back</button>
      {status ? <p className="text-sm font-semibold text-ink">{status}</p> : null}
    </AppShell>
  );
}
