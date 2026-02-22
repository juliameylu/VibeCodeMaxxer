import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MobileShell from "../../components/MobileShell";
import { authenticateMockUser, MOCK_USERS } from "../../lib/auth/mockUsers";
import { setSession } from "../../lib/auth/session";

export default function LoginPage() {
  const [username, setUsername] = useState("faith");
  const [password, setPassword] = useState("faith123");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const user = authenticateMockUser(username, password);
    if (!user) {
      setError("Invalid username/password. Use one of the demo accounts below.");
      return;
    }

    setSession(user);
    navigate("/profile");
  }

  return (
    <MobileShell showFab={false}>
      <section className="glass-card p-5">
        <p className="text-sm font-semibold text-ink/60">Auth</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Sign in</h1>
        <p className="mt-1 text-sm text-soft">Mock login for multi-user calendar testing.</p>
      </section>

      <section className="glass-card mt-4 p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-soft">Username</label>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm text-ink outline-none focus:border-amberSoft"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-soft">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm text-ink outline-none focus:border-amberSoft"
            />
          </div>

          {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}

          <button type="submit" className="chip chip-active w-full">
            Login
          </button>
        </form>
      </section>

      <section className="glass-card mt-4 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-soft">Demo Users</p>
        <div className="mt-2 space-y-2 text-xs text-soft">
          {MOCK_USERS.map((user) => (
            <div key={user.user_id} className="row-pill">
              <p className="font-semibold text-ink">{user.name}</p>
              <p>username: {user.username}</p>
              <p>password: {user.password}</p>
              <p>user_id: {user.user_id}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-4 text-center text-xs">
        <Link to="/" className="font-semibold text-amberSoft">
          Back Home
        </Link>
      </div>
    </MobileShell>
  );
}
