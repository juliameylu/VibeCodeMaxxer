import { TreePine, Mountain, Waves, Sun } from "lucide-react";

export function PageHeader() {
  return (
    <div className="w-full py-1.5 px-6 flex items-center justify-center gap-2" style={{ paddingTop: 'max(6px, env(safe-area-inset-top))' }}>
      <div className="flex items-center gap-1 text-[#F2E8CF]/25">
        <TreePine size={8} />
        <Mountain size={8} />
        <Sun size={8} />
        <Waves size={8} />
      </div>
      <p className="text-[9px] font-bold tracking-[0.35em] uppercase">
        <span className="text-white/35">POLY</span>
        <span className="text-[#F2E8CF]/60">JARVIS</span>
      </p>
      <div className="flex items-center gap-1 text-[#F2E8CF]/25">
        <Waves size={8} />
        <Sun size={8} />
        <Mountain size={8} />
        <TreePine size={8} />
      </div>
    </div>
  );
}