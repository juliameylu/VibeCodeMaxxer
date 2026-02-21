import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("faith@calpoly.edu");
  const [password, setPassword] = useState("password123");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Dummy auth - just navigate
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <Link to="/" className="block mb-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary text-white rounded-xl mb-4">
              📍
            </div>
            <h1 className="text-3xl font-bold text-slate-900">SLO Day</h1>
            <p className="text-slate-600 text-sm mt-1">Student Day Planner</p>
          </div>
        </Link>

        {/* Card */}
        <div className="card-shadow p-8 mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Welcome Back
          </h2>
          <p className="text-slate-600 mb-8">Sign in to your Cal Poly account</p>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-3.5 text-slate-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition"
                  placeholder="you@calpoly.edu"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-3.5 text-slate-400"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-slate-700">Remember me</span>
              </label>
              <a href="#" className="text-primary hover:text-primary/80 transition font-medium">
                Forgot?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary/90 transition mt-8 hover:shadow-lg"
            >
              Sign In
            </button>
          </form>

          {/* Sign Up */}
          <p className="text-center text-slate-600 text-sm mt-6">
            Don't have an account?{" "}
            <a
              href="#"
              className="text-primary font-semibold hover:text-primary/80 transition"
            >
              Create one
            </a>
          </p>
        </div>

        {/* Demo Credentials Card */}
        <div className="card-shadow p-4 bg-slate-50">
          <p className="text-xs text-slate-700 font-bold uppercase tracking-wide mb-3">
            Demo Account
          </p>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-slate-600">Email</p>
              <p className="text-sm font-medium text-slate-900 font-mono">
                faith@calpoly.edu
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Password</p>
              <p className="text-sm font-medium text-slate-900 font-mono">
                password123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
