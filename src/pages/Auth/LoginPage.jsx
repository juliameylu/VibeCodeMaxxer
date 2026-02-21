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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <Link to="/" className="block mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent text-center">
            📍 SLO Day Planner
          </h1>
        </Link>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Welcome Back
          </h2>
          <p className="text-slate-600 mb-8">Sign in to your account</p>

          <form onSubmit={handleLogin} className="space-y-4">
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
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:border-primary focus:outline-none"
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
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:border-primary focus:outline-none"
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
                  className="w-4 h-4 rounded"
                />
                <span className="text-slate-700">Remember me</span>
              </label>
              <a href="#" className="text-primary hover:underline">
                Forgot?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-secondary text-white font-semibold py-3 rounded-lg hover:shadow-lg transition mt-6"
            >
              Sign In
            </button>
          </form>

          {/* Sign Up */}
          <p className="text-center text-slate-600 text-sm mt-6">
            Don't have an account?{" "}
            <a href="#" className="text-primary font-semibold hover:underline">
              Sign up
            </a>
          </p>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-900 font-semibold mb-2">
              Demo Credentials:
            </p>
            <p className="text-xs text-blue-800">Email: faith@calpoly.edu</p>
            <p className="text-xs text-blue-800">Password: password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
