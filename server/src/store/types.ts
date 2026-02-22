export type CalendarProvider = "google" | "apple" | "microsoft";

export type CalendarStatus = "connected" | "disconnected" | "token_expired";

export type AvailabilitySource = "calendar_sync" | "manual";

export interface User {
  user_id: string;
  email: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Preferences {
  user_id: string;
  price_max: "$" | "$$" | "$$$" | "$$$$";
  distance_max_m: number;
  diet_tags: string[];
  event_tags: string[];
  favorite_categories: string[];
  updated_at: string;
}

export interface CalendarAccount {
  calendar_account_id: string;
  user_id: string;
  provider: CalendarProvider;
  provider_user_ref: string;
  status: CalendarStatus;
  scopes: string[];
  last_sync_at: string | null;
  created_at: string;
}

export interface AvailabilityWindow {
  window_id: string;
  user_id: string;
  start_ts: string;
  end_ts: string;
  source: AvailabilitySource;
}

export interface OauthState {
  user_id: string;
  provider: CalendarProvider;
  created_at: string;
}

export interface GoogleCalendarEvent {
  kind: "calendar#event";
  etag: string;
  id: string;
  status: "confirmed" | "tentative" | "cancelled";
  htmlLink: string;
  created: string;
  updated: string;
  summary: string;
  description: string;
  location: string;
  creator: {
    email: string;
    self: boolean;
  };
  organizer: {
    email: string;
    self: boolean;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  iCalUID: string;
  sequence: number;
  reminders: {
    useDefault: boolean;
  };
  eventType: "default";
}
