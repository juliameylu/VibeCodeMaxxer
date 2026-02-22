import { motion } from "motion/react";
import { getGrowthLevel, getTreeSpecies, growthLabels, type PolyTreeData } from "../utils/polytree";
import { Clock, MapPin } from "lucide-react";

interface Props {
  data: PolyTreeData;
  compact?: boolean;
}

function getRecentSessions(): { date: string; planned: number; elapsed: number; reason: string }[] {
  try {
    const raw = localStorage.getItem("polyjarvis_focus_log");
    if (raw) return JSON.parse(raw).slice(0, 5);
  } catch {}
  return [];
}

function getPinnedCount(): number {
  try {
    const raw = localStorage.getItem("pinnedEvents");
    if (raw) return JSON.parse(raw).length;
  } catch {}
  return 0;
}

/* ─── SVG-based painted tree ─────────────────────────────────────────────── */

function TreeSVG({ level, leafColor, trunkColor, compact }: { level: number; leafColor: string; trunkColor: string; compact: boolean }) {
  const size = compact ? 100 : 180;

  if (level === 0) {
    // Seed
    return (
      <svg width={size} height={size} viewBox="0 0 180 180">
        {/* Ground */}
        <ellipse cx="90" cy="155" rx="50" ry="8" fill="#3E2723" opacity="0.4" />
        {/* Seed body */}
        <motion.ellipse
          cx="90" cy="145" rx="10" ry="8"
          fill={trunkColor}
          animate={{ cy: [145, 143, 145] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Tiny sprout */}
        <motion.path
          d="M90 138 Q88 130 86 126 Q90 128 90 138 Q90 128 94 126 Q92 130 90 138Z"
          fill={leafColor}
          opacity="0.8"
          animate={{ scaleY: [1, 1.15, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{ transformOrigin: "90px 138px" }}
        />
      </svg>
    );
  }

  if (level === 1) {
    // Sprout
    return (
      <svg width={size} height={size} viewBox="0 0 180 180">
        <ellipse cx="90" cy="158" rx="50" ry="8" fill="#3E2723" opacity="0.4" />
        {/* Stem */}
        <rect x="88" y="118" width="4" height="38" rx="2" fill={trunkColor} />
        {/* Leaves */}
        <motion.g
          animate={{ rotate: [0, -2, 2, -1, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "90px 120px" }}
        >
          <ellipse cx="78" cy="112" rx="12" ry="16" fill={leafColor} opacity="0.85" transform="rotate(-25, 78, 112)" />
          <ellipse cx="102" cy="112" rx="12" ry="16" fill={leafColor} opacity="0.85" transform="rotate(25, 102, 112)" />
          <ellipse cx="78" cy="114" rx="8" ry="11" fill={leafColor} opacity="0.5" transform="rotate(-20, 78, 114)" filter="brightness(1.2)" />
        </motion.g>
      </svg>
    );
  }

  if (level === 2) {
    // Sapling
    return (
      <svg width={size} height={size} viewBox="0 0 180 180">
        <ellipse cx="90" cy="160" rx="55" ry="8" fill="#3E2723" opacity="0.4" />
        {/* Grass */}
        {[60, 72, 105, 118].map((x, i) => (
          <motion.line key={i} x1={x} y1={160} x2={x + (i % 2 ? -2 : 2)} y2={152 + Math.random() * 4}
            stroke={leafColor} strokeWidth="1.5" opacity="0.5" strokeLinecap="round"
            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.1 }}
            style={{ transformOrigin: `${x}px 160px` }}
          />
        ))}
        {/* Trunk */}
        <path d="M87 158 L86 115 Q86 110 90 108 Q94 110 94 115 L93 158Z" fill={trunkColor} />
        {/* Canopy */}
        <motion.g
          animate={{ rotate: [0, -1.5, 1.5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "90px 108px" }}
        >
          <ellipse cx="90" cy="92" rx="28" ry="26" fill={leafColor} opacity="0.85" />
          <ellipse cx="78" cy="88" rx="16" ry="14" fill={leafColor} opacity="0.6" />
          <motion.ellipse cx="100" cy="86" rx="14" ry="12" fill={leafColor} opacity="0.5"
            animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 3, repeat: Infinity }}
          />
        </motion.g>
      </svg>
    );
  }

  if (level === 3) {
    // Young tree
    return (
      <svg width={size} height={size} viewBox="0 0 180 180">
        <ellipse cx="90" cy="162" rx="55" ry="8" fill="#3E2723" opacity="0.4" />
        {[55, 68, 80, 100, 112, 125].map((x, i) => (
          <motion.line key={i} x1={x} y1={162} x2={x + (i % 2 ? -2 : 2)} y2={154 + Math.random() * 4}
            stroke={leafColor} strokeWidth="1.5" opacity="0.4" strokeLinecap="round"
            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.08 }}
            style={{ transformOrigin: `${x}px 162px` }}
          />
        ))}
        {/* Trunk */}
        <path d="M85 160 L84 108 Q84 100 90 96 Q96 100 96 108 L95 160Z" fill={trunkColor} />
        {/* Branches */}
        <line x1="87" y1="120" x2="70" y2="110" stroke={trunkColor} strokeWidth="4" strokeLinecap="round" opacity="0.8" />
        <line x1="93" y1="115" x2="112" y2="108" stroke={trunkColor} strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />
        {/* Canopy */}
        <motion.g
          animate={{ rotate: [0, -1, 1, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "90px 90px" }}
        >
          <ellipse cx="90" cy="78" rx="38" ry="34" fill={leafColor} opacity="0.85" />
          <ellipse cx="72" cy="74" rx="22" ry="20" fill={leafColor} opacity="0.6" />
          <ellipse cx="108" cy="72" rx="20" ry="18" fill={leafColor} opacity="0.55" />
          <motion.ellipse cx="90" cy="66" rx="18" ry="16" fill={leafColor} opacity="0.45"
            animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 4, repeat: Infinity }}
            style={{ filter: "brightness(1.15)" }}
          />
        </motion.g>
      </svg>
    );
  }

  if (level === 4) {
    // Growing tree
    return (
      <svg width={size} height={size} viewBox="0 0 180 180">
        <ellipse cx="90" cy="164" rx="60" ry="8" fill="#3E2723" opacity="0.4" />
        {[45, 58, 70, 82, 98, 110, 122, 135].map((x, i) => (
          <motion.line key={i} x1={x} y1={164} x2={x + (i % 2 ? -2 : 2)} y2={156 + Math.random() * 4}
            stroke={leafColor} strokeWidth="1.5" opacity="0.35" strokeLinecap="round"
            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.06 }}
            style={{ transformOrigin: `${x}px 164px` }}
          />
        ))}
        {/* Trunk */}
        <path d="M83 162 L82 100 Q82 90 90 86 Q98 90 98 100 L97 162Z" fill={trunkColor} />
        {/* Branches */}
        <line x1="85" y1="115" x2="62" y2="100" stroke={trunkColor} strokeWidth="5" strokeLinecap="round" opacity="0.8" />
        <line x1="95" y1="108" x2="120" y2="96" stroke={trunkColor} strokeWidth="4.5" strokeLinecap="round" opacity="0.8" />
        <line x1="88" y1="125" x2="72" y2="118" stroke={trunkColor} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        {/* Canopy */}
        <motion.g
          animate={{ rotate: [0, -0.8, 0.8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "90px 75px" }}
        >
          <ellipse cx="90" cy="65" rx="48" ry="40" fill={leafColor} opacity="0.85" />
          <ellipse cx="66" cy="60" rx="26" ry="24" fill={leafColor} opacity="0.65" />
          <ellipse cx="114" cy="58" rx="24" ry="22" fill={leafColor} opacity="0.6" />
          <motion.ellipse cx="90" cy="52" rx="22" ry="18" fill={leafColor} opacity="0.5"
            animate={{ y: [0, -1.5, 0] }} transition={{ duration: 3.5, repeat: Infinity }}
            style={{ filter: "brightness(1.2)" }}
          />
          <ellipse cx="76" cy="50" rx="16" ry="14" fill={leafColor} opacity="0.4" />
        </motion.g>
      </svg>
    );
  }

  // Level 5-6: Mature / Grand tree
  const isGrand = level >= 6;
  return (
    <svg width={size} height={size} viewBox="0 0 180 180">
      <ellipse cx="90" cy="166" rx="65" ry="8" fill="#3E2723" opacity="0.4" />
      {[35, 48, 60, 72, 84, 96, 108, 120, 132, 145].map((x, i) => (
        <motion.line key={i} x1={x} y1={166} x2={x + (i % 2 ? -2 : 2)} y2={158 + Math.random() * 4}
          stroke={leafColor} strokeWidth="1.5" opacity="0.3" strokeLinecap="round"
          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.05 }}
          style={{ transformOrigin: `${x}px 166px` }}
        />
      ))}
      {/* Thick trunk */}
      <path d="M80 164 L78 95 Q78 82 90 76 Q102 82 102 95 L100 164Z" fill={trunkColor} />
      {/* Major branches */}
      <line x1="82" y1="110" x2="52" y2="90" stroke={trunkColor} strokeWidth="6" strokeLinecap="round" opacity="0.85" />
      <line x1="98" y1="105" x2="130" y2="86" stroke={trunkColor} strokeWidth="5.5" strokeLinecap="round" opacity="0.85" />
      <line x1="86" y1="125" x2="64" y2="115" stroke={trunkColor} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      <line x1="94" y1="120" x2="116" y2="110" stroke={trunkColor} strokeWidth="3.5" strokeLinecap="round" opacity="0.7" />
      {/* Grand canopy */}
      <motion.g
        animate={{ rotate: [0, -0.6, 0.6, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "90px 65px" }}
      >
        <ellipse cx="90" cy="55" rx="58" ry="48" fill={leafColor} opacity="0.85" />
        <ellipse cx="58" cy="50" rx="32" ry="28" fill={leafColor} opacity="0.65" />
        <ellipse cx="122" cy="48" rx="30" ry="26" fill={leafColor} opacity="0.6" />
        <motion.ellipse cx="90" cy="40" rx="26" ry="22" fill={leafColor} opacity="0.5"
          animate={{ y: [0, -2, 0] }} transition={{ duration: 4, repeat: Infinity }}
          style={{ filter: "brightness(1.2)" }}
        />
        <ellipse cx="70" cy="42" rx="20" ry="18" fill={leafColor} opacity="0.45" />
        <ellipse cx="110" cy="40" rx="18" ry="16" fill={leafColor} opacity="0.4" />
        {isGrand && (
          <>
            <ellipse cx="50" cy="55" rx="18" ry="16" fill={leafColor} opacity="0.5" />
            <ellipse cx="130" cy="52" rx="16" ry="14" fill={leafColor} opacity="0.45" />
            {/* Sparkle/glow effects for Grand Tree */}
            <motion.circle cx="70" cy="36" r="2" fill="#F2E8CF"
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0 }}
            />
            <motion.circle cx="112" cy="32" r="1.5" fill="#F2E8CF"
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
            />
            <motion.circle cx="90" cy="28" r="1.5" fill="#F2E8CF"
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1.3 }}
            />
            <motion.circle cx="56" cy="44" r="1" fill="#F2E8CF"
              animate={{ opacity: [0, 0.8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
            />
          </>
        )}
      </motion.g>
    </svg>
  );
}

export function PolyTreeVis({ data, compact = false }: Props) {
  const species = getTreeSpecies(data.treeId);
  const level = getGrowthLevel(data.growthPoints);
  const nextLevel = level < 6 ? level + 1 : 6;
  const thresholds = [0, 1, 3, 6, 11, 19, 31];
  const currentThreshold = thresholds[level];
  const nextThreshold = thresholds[nextLevel] ?? data.growthPoints;
  const progressInLevel = nextThreshold > currentThreshold
    ? ((data.growthPoints - currentThreshold) / (nextThreshold - currentThreshold)) * 100
    : 100;

  const recentSessions = compact ? [] : getRecentSessions();
  const pinnedCount = getPinnedCount();

  return (
    <div className="flex flex-col items-center">
      {/* SVG-based tree */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 15, stiffness: 200 }}
      >
        <TreeSVG level={level} leafColor={species.leafColor} trunkColor={species.trunkColor} compact={compact} />
      </motion.div>

      {/* Label */}
      {!compact && (
        <div className="text-center mt-1">
          <p className="text-xs font-bold text-white/70 capitalize tracking-wider">
            {growthLabels[level]}
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">{species.name}</p>
          {/* Growth progress bar */}
          {level < 6 && (
            <div className="mt-2 w-32 mx-auto">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: species.leafColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressInLevel}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <p className="text-[8px] text-white/20 mt-0.5">
                {data.growthPoints}/{nextThreshold} to {growthLabels[nextLevel]}
              </p>
            </div>
          )}

          {/* Session history & places visited */}
          {(recentSessions.length > 0 || pinnedCount > 0) && (
            <div className="mt-4 w-full max-w-xs mx-auto">
              {pinnedCount > 0 && (
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <MapPin size={9} className="text-[#F2E8CF]/50" />
                  <span className="text-[9px] text-white/30 font-bold">{pinnedCount} places pinned</span>
                </div>
              )}

              {recentSessions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[8px] font-semibold text-white/20 capitalize tracking-wider flex items-center justify-center gap-1">
                    <Clock size={8} /> Recent Sessions
                  </p>
                  {recentSessions.slice(0, 3).map((s, i) => {
                    const mins = Math.floor(s.elapsed / 60);
                    const date = new Date(s.date);
                    const dayLabel = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.reason === "completed" ? "bg-[#8BC34A]" : "bg-amber-400"}`} />
                        <span className="text-[9px] text-white/40 flex-1">{dayLabel}</span>
                        <span className="text-[9px] font-bold text-white/50">{mins}m</span>
                        <span className={`text-[8px] font-bold px-1 rounded ${s.reason === "completed" ? "text-[#8BC34A]/70 bg-[#8BC34A]/10" : "text-amber-400/70 bg-amber-400/10"}`}>
                          {s.reason === "completed" ? "DONE" : "STOPPED"}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}