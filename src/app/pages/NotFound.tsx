import { Link } from "react-router";

export function NotFound() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 text-white bg-transparent">
      <div className="z-10 text-center space-y-4">
        <h1 className="text-8xl font-bold text-[#8BC34A]">404</h1>
        <p className="text-xl text-white/40">Are you lost, explorer?</p>
        <Link 
          to="/dashboard" 
          className="inline-block mt-4 px-6 py-3 bg-[#8BC34A] text-[#233216] rounded-xl font-bold hover:bg-[#9CCC65] transition-colors"
        >
          Return to Base
        </Link>
      </div>
    </div>
  );
}