import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../lib/pageshell/AppShell";
import { apiFetch } from "../../lib/apiClient";
import { useAuth } from "../../lib/auth/AuthContext";

export default function ConnectCanvasPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");

  const oauthConnect = async () => {
    await apiFetch("/api/canvas/connect/oauth-start", { method: "POST", body: {} });
    const data = await apiFetch("/api/canvas/connect/oauth-complete", { method: "POST", body: { code: "demo" } });
    auth.updateConnections(data.connections);
    setStatus("Canvas OAuth connected.");
  };

  const manualConnect = async (event) => {
    event.preventDefault();
    const data = await apiFetch("/api/canvas/connect/token", { method: "POST", body: { token } });
    auth.updateConnections(data.connections);
    setStatus("Manual Canvas token saved.");
    setToken("");
  };

  return (
    <AppShell title="Connect Canvas" subtitle="OAuth preferred, API token fallback">
      <section className="glass-card p-4">
        <button onClick={oauthConnect} className="chip chip-active w-full py-3 text-sm">Connect with OAuth</button>
      </section>

      <form onSubmit={manualConnect} className="glass-card p-4">
        <p className="text-sm font-semibold text-ink">Manual API token</p>
        <input value={token} onChange={(event) => setToken(event.target.value)} required placeholder="Canvas token" className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm" />
        <button className="chip chip-idle mt-2 w-full py-3 text-sm">Save token</button>
      </form>

      <button onClick={() => navigate("/study")} className="chip chip-idle w-full py-3 text-sm">Back to Study</button>
      {status ? <p className="text-sm font-semibold text-ink">{status}</p> : null}
    </AppShell>
  );
}
