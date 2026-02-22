const POLYTREE_KEY = "polyjarvis_polytree";

export interface TreeSpecies {
  id: string;
  name: string;
  emoji: string;
  leafColor: string;
  trunkColor: string;
  region: string;
  fact: string;
}

export const treeSpecies: TreeSpecies[] = [
  { id: "coast-redwood", name: "Coast Redwood", emoji: "\u{1F332}", leafColor: "#2D5016", trunkColor: "#8B4513", region: "Northern CA", fact: "World's tallest tree \u2014 up to 379 feet" },
  { id: "giant-sequoia", name: "Giant Sequoia", emoji: "\u{1F332}", leafColor: "#1B5E20", trunkColor: "#A0522D", region: "Sierra Nevada", fact: "World's largest tree by volume \u2014 2.7M lbs" },
  { id: "valley-oak", name: "Valley Oak", emoji: "\u{1F333}", leafColor: "#558B2F", trunkColor: "#6B4226", region: "Central CA", fact: "California's largest oak, grows 20ft in 5 years" },
  { id: "coast-live-oak", name: "Coast Live Oak", emoji: "\u{1F333}", leafColor: "#33691E", trunkColor: "#5D4037", region: "SLO County", fact: "Evergreen native to San Luis Obispo" },
  { id: "joshua-tree", name: "Joshua Tree", emoji: "\u{1F335}", leafColor: "#8BC34A", trunkColor: "#795548", region: "Mojave Desert", fact: "Iconic Mojave symbol, lives 500+ years" },
  { id: "california-buckeye", name: "California Buckeye", emoji: "\u{1F338}", leafColor: "#81C784", trunkColor: "#8D6E63", region: "Central CA", fact: "Dramatic white flower spikes in spring" },
  { id: "western-redbud", name: "Western Redbud", emoji: "\u{1F33A}", leafColor: "#E91E63", trunkColor: "#6D4C41", region: "Foothills", fact: "Pink-purple blooms before leaves appear" },
  { id: "monterey-cypress", name: "Monterey Cypress", emoji: "\u{1F332}", leafColor: "#004D40", trunkColor: "#5D4037", region: "Central Coast", fact: "Windswept coastal icon of Monterey" },
  { id: "pacific-madrone", name: "Pacific Madrone", emoji: "\u{1F342}", leafColor: "#388E3C", trunkColor: "#D84315", region: "Northern CA", fact: "Striking red peeling bark" },
  { id: "torrey-pine", name: "Torrey Pine", emoji: "\u{1F332}", leafColor: "#2E7D32", trunkColor: "#6D4C41", region: "San Diego", fact: "California's rarest native pine" },
  { id: "california-sycamore", name: "California Sycamore", emoji: "\u{1F343}", leafColor: "#66BB6A", trunkColor: "#9E9E9E", region: "Central CA", fact: "Striking waterway silhouettes, 40-80ft" },
  { id: "california-fan-palm", name: "California Fan Palm", emoji: "\u{1F334}", leafColor: "#4CAF50", trunkColor: "#795548", region: "Southern CA", fact: "California's only native palm tree" },
];

export interface PolyTreeData {
  treeId: string;
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  lastSessionDate: string | null;
  growthPoints: number;
}

const defaultData: PolyTreeData = {
  treeId: "coast-live-oak",
  totalSessions: 0,
  totalMinutes: 0,
  currentStreak: 0,
  lastSessionDate: null,
  growthPoints: 0,
};

export function getPolyTree(): PolyTreeData {
  try {
    const raw = localStorage.getItem(POLYTREE_KEY);
    if (raw) return { ...defaultData, ...JSON.parse(raw) };
  } catch {}
  return defaultData;
}

export function savePolyTree(data: PolyTreeData): void {
  localStorage.setItem(POLYTREE_KEY, JSON.stringify(data));
}

export function getTreeSpecies(id: string): TreeSpecies {
  return treeSpecies.find(t => t.id === id) || treeSpecies[3]; // default to Coast Live Oak
}

/** Returns growth level 0-6 based on growth points */
export function getGrowthLevel(points: number): number {
  if (points <= 0) return 0;
  if (points <= 2) return 1;
  if (points <= 5) return 2;
  if (points <= 10) return 3;
  if (points <= 18) return 4;
  if (points <= 30) return 5;
  return 6;
}

export const growthLabels = [
  "Seed",
  "Sprout",
  "Sapling",
  "Young Tree",
  "Growing Tree",
  "Mature Tree",
  "Grand Tree",
];

/** Record a completed focus session. Returns updated data. */
export function recordSession(durationSeconds: number): PolyTreeData {
  const data = getPolyTree();
  const minutesCompleted = Math.floor(durationSeconds / 60);
  const pointsEarned = Math.max(1, Math.floor(minutesCompleted / 15));

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Streak logic
  if (data.lastSessionDate === today) {
    // Same day, streak stays
  } else if (data.lastSessionDate === yesterday) {
    data.currentStreak += 1;
  } else if (data.lastSessionDate === null) {
    data.currentStreak = 1;
  } else {
    // Streak broken, restart
    data.currentStreak = 1;
  }

  data.totalSessions += 1;
  data.totalMinutes += minutesCompleted;
  data.growthPoints += pointsEarned;
  data.lastSessionDate = today;

  savePolyTree(data);
  return data;
}
