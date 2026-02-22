const SETTINGS_KEY = "polyjarvis_settings";

export interface AppSettings {
  showTutorial: boolean;
}

const defaults: AppSettings = {
  showTutorial: true,
};

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {}
  return defaults;
}

export function updateSettings(partial: Partial<AppSettings>) {
  const current = getSettings();
  const updated = { ...current, ...partial };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  return updated;
}