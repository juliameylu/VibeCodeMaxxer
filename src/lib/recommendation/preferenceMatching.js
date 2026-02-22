const PHRASE_ALIASES = {
  "study friendly": ["quiet", "wifi", "work friendly", "outlet", "laptop", "coffee shop"],
  "study-friendly": ["quiet", "wifi", "work friendly", "outlet", "laptop", "coffee shop"],
  vegan: ["vegan", "plant based", "vegetarian", "dairy free"],
  vegetarian: ["vegetarian", "plant based", "vegan"],
  "outdoor seating": ["outdoor seating", "patio", "outside seating", "heated patio"],
  "late night": ["late night", "open late", "after hours", "night"],
  "gluten free": ["gluten free", "gf", "celiac friendly"],
  "kid friendly": ["kid friendly", "family friendly", "high chair", "stroller"],
  "date night": ["date night", "romantic", "cocktails", "wine"],
};

const TOKEN_ALIASES = {
  vegan: ["plant", "vegetarian"],
  patio: ["outdoor", "outside"],
  quiet: ["study", "work", "laptop"],
  wifi: ["internet", "remote"],
  late: ["night", "afterhours"],
  ramen: ["noodles", "japanese"],
  sushi: ["japanese"],
  taco: ["mexican"],
  tacos: ["mexican"],
  pizza: ["italian"],
  coffee: ["espresso", "latte", "cafe"],
};

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function collectStringsFromUnknown(value, out, depth = 0) {
  if (depth > 3 || value == null) return;

  if (typeof value === "string" || typeof value === "number") {
    out.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectStringsFromUnknown(item, out, depth + 1));
    return;
  }

  if (typeof value === "object") {
    Object.entries(value).forEach(([key, val]) => {
      out.push(String(key));
      if (val === true) {
        out.push(String(key));
      } else {
        collectStringsFromUnknown(val, out, depth + 1);
      }
    });
  }
}

function placeSignalText(place) {
  const strings = [
    place?.name,
    place?.category,
    place?.address,
    place?.description,
    place?.price,
  ];

  const directFields = [
    "cuisine_tags",
    "menu_tags",
    "attribute_tags",
    "review_snippets",
    "tags",
    "transactions",
    "features",
    "amenities",
    "cuisines",
  ];

  directFields.forEach((field) => {
    collectStringsFromUnknown(place?.[field], strings);
  });

  collectStringsFromUnknown(place?.categories, strings);
  collectStringsFromUnknown(place?.attributes, strings);

  return normalizeText(strings.filter(Boolean).join(" "));
}

function expandPreferenceTerms(preference) {
  const normalized = normalizeText(preference);
  if (!normalized) return [];

  const terms = new Set([normalized]);
  const phraseAliases = PHRASE_ALIASES[normalized] || [];
  phraseAliases.forEach((alias) => terms.add(normalizeText(alias)));

  tokenize(normalized).forEach((token) => {
    terms.add(token);
    (TOKEN_ALIASES[token] || []).forEach((alias) => terms.add(normalizeText(alias)));
  });

  return [...terms].filter(Boolean);
}

function matchesTerm(signalText, term) {
  if (!term) return false;
  if (term.includes(" ")) return signalText.includes(term);
  return signalText.split(" ").includes(term) || signalText.includes(` ${term} `);
}

export function scorePlacePreferenceMatch(place, preferences = []) {
  const prefList = (preferences || []).map((value) => normalizeText(value)).filter(Boolean);
  if (!prefList.length) return 0;

  const signalText = placeSignalText(place);
  if (!signalText) return 0;

  let hits = 0;
  prefList.forEach((preference) => {
    const terms = expandPreferenceTerms(preference);
    if (terms.some((term) => matchesTerm(signalText, term))) {
      hits += 1;
    }
  });

  return hits / prefList.length;
}

export function matchPlaceToPreferences(place, preferences = []) {
  if (!(preferences || []).length) return true;
  return scorePlacePreferenceMatch(place, preferences) > 0;
}

