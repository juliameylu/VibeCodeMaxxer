import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AppShell from "../../lib/pageshell/AppShell";
import { apiFetch } from "../../lib/apiClient";

export default function JamPage() {
  const { code } = useParams();
  const [jam, setJam] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    apiFetch(`/api/jams/${code}`, { withAuth: false }).then((data) => setJam(data.jam));
  }, [code]);

  const accept = async () => {
    await apiFetch(`/api/jams/${code}/accept`, { method: "POST", body: {} });
    setStatus("Jam access granted. Shared plans now available.");
  };

  const decline = async () => {
    await apiFetch(`/api/jams/${code}/decline`, { method: "POST", body: {} });
    setStatus("Declined jam invite.");
  };

  return (
    <AppShell title="Jam" subtitle="Accept or decline shared plan access">
      <section className="row-pill">
        <p className="font-semibold text-ink">{jam?.name || "Loading jam..."}</p>
        <p className="text-xs text-soft">Code: {code?.toUpperCase()}</p>
      </section>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={accept} className="chip chip-active py-3 text-sm">Accept</button>
        <button onClick={decline} className="chip chip-idle py-3 text-sm">Decline</button>
      </div>
      {status ? <p className="text-sm font-semibold text-ink">{status}</p> : null}
    </AppShell>
  );
}
