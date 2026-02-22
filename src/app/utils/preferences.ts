/**
 * Shared preference utilities for reading Jarvis training data
 * and computing recommendation scores based on user preferences.
 */

const TRAIN_KEY = "polyjarvis_training";

export interface TrainingPrompt {
  id: string;
  category: string;
  label: string;
  emoji: string;
}

export const trainingPrompts: TrainingPrompt[] = [
  { id: "t1", category: "Vibe", label: "Beach vibes", emoji: "🏖️" },
  { id: "t2", category: "Vibe", label: "Mountain adventures", emoji: "⛰️" },
  { id: "t3", category: "Vibe", label: "Coffee shop culture", emoji: "☕" },
  { id: "t4", category: "Vibe", label: "Nightlife & bars", emoji: "🍸" },
  { id: "t17", category: "Vibe", label: "Scenic viewpoints", emoji: "🌄" },
  { id: "t18", category: "Vibe", label: "Chill & relaxed", emoji: "😌" },
  { id: "t19", category: "Vibe", label: "Adventurous & active", emoji: "🧗" },
  { id: "t5", category: "Food", label: "Mexican food", emoji: "🌮" },
  { id: "t6", category: "Food", label: "Sushi & Asian", emoji: "🍣" },
  { id: "t7", category: "Food", label: "Pizza & Italian", emoji: "🍕" },
  { id: "t8", category: "Food", label: "Healthy / Vegan", emoji: "🥗" },
  { id: "t20", category: "Food", label: "BBQ & tri-tip", emoji: "🥩" },
  { id: "t21", category: "Food", label: "Brunch spots", emoji: "🥞" },
  { id: "t22", category: "Food", label: "Ice cream & desserts", emoji: "🍦" },
  { id: "t23", category: "Food", label: "Seafood & chowder", emoji: "🦐" },
  { id: "t9", category: "Activity", label: "Sunrise hikes", emoji: "🌅" },
  { id: "t10", category: "Activity", label: "Art & museums", emoji: "🎨" },
  { id: "t11", category: "Activity", label: "Live music", emoji: "🎵" },
  { id: "t12", category: "Activity", label: "Study spots", emoji: "📚" },
  { id: "t24", category: "Activity", label: "Water sports", emoji: "🏄" },
  { id: "t25", category: "Activity", label: "Wine tasting", emoji: "🍷" },
  { id: "t26", category: "Activity", label: "Farmers markets", emoji: "🥕" },
  { id: "t27", category: "Activity", label: "Photography spots", emoji: "📸" },
  { id: "t28", category: "Activity", label: "Yoga & wellness", emoji: "🧘" },
  { id: "t29", category: "Activity", label: "Escape rooms & games", emoji: "🔑" },
  { id: "t30", category: "Activity", label: "Dog-friendly spots", emoji: "🐕" },
  { id: "t31", category: "Activity", label: "Day trips & road trips", emoji: "🚙" },
  { id: "t13", category: "Budget", label: "Budget-friendly ($)", emoji: "💰" },
  { id: "t14", category: "Budget", label: "Splurge-worthy ($$$)", emoji: "💎" },
  { id: "t15", category: "Transport", label: "Walking distance", emoji: "🚶" },
  { id: "t16", category: "Transport", label: "Worth the drive", emoji: "🚗" },
];

/** Map training prompt IDs to place categories/features they boost */
const promptToCategoryBoost: Record<string, { categories: string[]; features: string[]; tags: string[] }> = {
  t1: { categories: ["Beaches", "Water Sports"], features: ["beach", "ocean"], tags: ["beach", "surf", "coastal"] },
  t2: { categories: ["Hikes", "Viewpoints", "Parks & Gardens"], features: ["outdoor seating", "viewpoint"], tags: ["hike", "mountain", "peak", "trail"] },
  t3: { categories: ["Coffee Shops"], features: [], tags: ["coffee", "cafe", "latte"] },
  t4: { categories: ["Breweries", "Live Music"], features: ["late night"], tags: ["bar", "nightlife", "brewery", "pub"] },
  t5: { categories: ["Food & Treats"], features: [], tags: ["mexican", "taco", "burrito"] },
  t6: { categories: ["Food & Treats"], features: [], tags: ["sushi", "asian", "ramen", "japanese"] },
  t7: { categories: ["Food & Treats"], features: [], tags: ["pizza", "italian", "pasta"] },
  t8: { categories: ["Food & Treats"], features: ["healthy"], tags: ["healthy", "vegan", "salad", "smoothie"] },
  t9: { categories: ["Hikes", "Viewpoints"], features: ["viewpoint"], tags: ["sunrise", "hike", "trail", "peak"] },
  t10: { categories: ["Art", "Museums"], features: [], tags: ["art", "museum", "gallery"] },
  t11: { categories: ["Live Music"], features: [], tags: ["music", "concert", "live"] },
  t12: { categories: ["Study Spots", "Coffee Shops"], features: [], tags: ["study", "library", "wifi", "quiet"] },
  t13: { categories: [], features: [], tags: [] }, // Budget — handled via price field
  t14: { categories: [], features: [], tags: [] }, // Splurge — handled via price field
  t15: { categories: [], features: ["walkable"], tags: [] }, // Walking — handled via transport features
  t16: { categories: ["Day Trips"], features: ["needs car"], tags: ["road trip", "drive"] },
  t17: { categories: ["Viewpoints", "Hikes"], features: ["viewpoint"], tags: ["scenic", "view", "panoramic", "overlook"] },
  t18: { categories: ["Coffee Shops", "Parks & Gardens"], features: [], tags: ["chill", "relax", "calm", "peaceful"] },
  t19: { categories: ["Hikes", "Water Sports"], features: [], tags: ["adventure", "active", "sport", "climb"] },
  t20: { categories: ["Food & Treats"], features: [], tags: ["bbq", "tri-tip", "grill", "steak"] },
  t21: { categories: ["Food & Treats", "Coffee Shops"], features: [], tags: ["brunch", "breakfast", "morning"] },
  t22: { categories: ["Food & Treats"], features: [], tags: ["ice cream", "dessert", "sweet", "bakery"] },
  t23: { categories: ["Food & Treats"], features: [], tags: ["seafood", "chowder", "fish", "clam"] },
  t24: { categories: ["Water Sports", "Beaches"], features: [], tags: ["surf", "kayak", "paddleboard", "swim"] },
  t25: { categories: ["Wineries"], features: [], tags: ["wine", "vineyard", "tasting"] },
  t26: { categories: ["Farmers Markets"], features: [], tags: ["farmers market", "organic", "produce", "local"] },
  t27: { categories: ["Viewpoints", "Beaches", "Art"], features: ["viewpoint"], tags: ["photo", "instagram", "scenic"] },
  t28: { categories: ["Wellness", "Hot Springs & Spas"], features: [], tags: ["yoga", "wellness", "spa", "meditation"] },
  t29: { categories: ["Escape Rooms", "Games & Arcades", "Bowling"], features: [], tags: ["escape room", "arcade", "game", "bowling"] },
  t30: { categories: ["Parks & Gardens", "Beaches", "Hikes"], features: [], tags: ["dog", "pet", "dog-friendly"] },
  t31: { categories: ["Day Trips"], features: ["needs car"], tags: ["road trip", "day trip", "drive", "excursion"] },
};

export interface UserPreferences {
  likes: string[];
  dislikes: string[];
  likedPrompts: TrainingPrompt[];
  dislikedPrompts: TrainingPrompt[];
  prefersBudget: boolean;
  prefersSplurge: boolean;
  prefersWalking: boolean;
  prefersDriving: boolean;
  hasTrainingData: boolean;
  trainingProgress: number; // 0-1
}

export function getUserPreferences(): UserPreferences {
  let likes: string[] = [];
  let dislikes: string[] = [];
  try {
    likes = JSON.parse(localStorage.getItem(TRAIN_KEY + "_likes") || "[]");
    dislikes = JSON.parse(localStorage.getItem(TRAIN_KEY + "_dislikes") || "[]");
  } catch { /* */ }

  const likedPrompts = trainingPrompts.filter(p => likes.includes(p.id));
  const dislikedPrompts = trainingPrompts.filter(p => dislikes.includes(p.id));

  return {
    likes,
    dislikes,
    likedPrompts,
    dislikedPrompts,
    prefersBudget: likes.includes("t13"),
    prefersSplurge: likes.includes("t14"),
    prefersWalking: likes.includes("t15"),
    prefersDriving: likes.includes("t16"),
    hasTrainingData: likes.length + dislikes.length > 0,
    trainingProgress: (likes.length + dislikes.length) / trainingPrompts.length,
  };
}

/**
 * Score a place (0-10) based on user preferences.
 * Higher = more aligned with user's likes.
 */
export function getPreferenceScore(
  place: { category: string; price: string; rating: number; features?: string[]; tags?: string[]; distance?: string },
  prefs: UserPreferences
): number {
  if (!prefs.hasTrainingData) {
    // No training data — return rating-based score
    return Math.min(10, Math.round((place.rating / 5) * 8 + 1));
  }

  let score = 5; // Base score

  // Boost for liked categories
  for (const id of prefs.likes) {
    const boost = promptToCategoryBoost[id];
    if (!boost) continue;

    // Category match (+2)
    if (boost.categories.includes(place.category)) score += 2;

    // Feature match (+1)
    if (place.features && boost.features.some(f => place.features!.includes(f))) score += 1;

    // Tag match (+0.5)
    if (place.tags && boost.tags.some(t => place.tags!.some(pt => pt.toLowerCase().includes(t)))) score += 0.5;
  }

  // Penalty for disliked categories
  for (const id of prefs.dislikes) {
    const boost = promptToCategoryBoost[id];
    if (!boost) continue;
    if (boost.categories.includes(place.category)) score -= 2;
    if (place.features && boost.features.some(f => place.features!.includes(f))) score -= 1;
  }

  // Budget preference
  if (prefs.prefersBudget && (place.price === "Free" || place.price === "$")) score += 1.5;
  if (prefs.prefersBudget && (place.price === "$$$")) score -= 1;
  if (prefs.prefersSplurge && (place.price === "$$$" || place.price === "$$")) score += 1;

  // Walking preference
  if (prefs.prefersWalking && place.features?.includes("walkable")) score += 1;
  if (prefs.prefersWalking && place.features?.includes("needs car")) score -= 1;
  if (prefs.prefersDriving && place.features?.includes("needs car")) score += 0.5;

  // Rating bonus
  score += (place.rating - 4) * 0.5;

  return Math.max(1, Math.min(10, Math.round(score)));
}

/**
 * Get a personalized Jarvis greeting based on preferences.
 */
export function getPersonalizedGreeting(prefs: UserPreferences): string | null {
  if (!prefs.hasTrainingData || prefs.likedPrompts.length === 0) return null;

  const liked = prefs.likedPrompts;
  const vibes = liked.filter(p => p.category === "Vibe");
  const foods = liked.filter(p => p.category === "Food");
  const activities = liked.filter(p => p.category === "Activity");

  const parts: string[] = [];

  if (vibes.length > 0) {
    const v = vibes[Math.floor(Math.random() * vibes.length)];
    parts.push(`${v.label.toLowerCase()} ${v.emoji}`);
  }
  if (foods.length > 0 && parts.length < 2) {
    const f = foods[Math.floor(Math.random() * foods.length)];
    parts.push(`${f.label.toLowerCase()} ${f.emoji}`);
  }
  if (activities.length > 0 && parts.length < 2) {
    const a = activities[Math.floor(Math.random() * activities.length)];
    parts.push(`${a.label.toLowerCase()} ${a.emoji}`);
  }

  if (parts.length === 0) return null;
  return `I remember you're into ${parts.join(" & ")}. Picks are sorted for you.`;
}

/**
 * Get Jarvis recommendation text based on preferences.
 */
export function getPersonalizedRecommendation(prefs: UserPreferences): string | null {
  if (!prefs.hasTrainingData || prefs.likedPrompts.length === 0) return null;

  const suggestions: string[] = [];

  if (prefs.likes.includes("t1")) suggestions.push("🏖️ Pismo or Avila — beach conditions are usually solid");
  if (prefs.likes.includes("t2")) suggestions.push("⛰️ Bishop Peak — best views in SLO, go before 4 PM");
  if (prefs.likes.includes("t3")) suggestions.push("☕ Scout Coffee — lavender latte, you'll thank me");
  if (prefs.likes.includes("t5")) suggestions.push("🌮 Taqueria Santa Cruz — $2 tacos, best value in town");
  if (prefs.likes.includes("t9")) suggestions.push("🌅 Cerro San Luis — sunrise hike, set your alarm");
  if (prefs.likes.includes("t11")) suggestions.push("🎵 SLO Brew Rock — check who's playing tonight");
  if (prefs.likes.includes("t12")) suggestions.push("📚 Kennedy Library 4th floor — the quiet spot");

  if (suggestions.length === 0) return null;
  const picks = suggestions.slice(0, 3);
  return `Based on what I know about you:\n\n${picks.join("\n")}\n\nNext best move: Pick the top one and go.`;
}