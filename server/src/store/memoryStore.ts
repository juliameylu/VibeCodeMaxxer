import type {
  AvailabilityWindow,
  CalendarAccount,
  GoogleCalendarEvent,
  OauthState,
  Preferences,
  User,
} from "./types.js";

class MemoryStore {
  users = new Map<string, User>();

  usersByEmail = new Map<string, string>();

  preferences = new Map<string, Preferences>();

  calendarAccounts = new Map<string, CalendarAccount>();

  availabilityWindows = new Map<string, AvailabilityWindow[]>();

  googleCalendarEvents = new Map<string, GoogleCalendarEvent[]>();

  oauthStates = new Map<string, OauthState>();
}

export const memoryStore = new MemoryStore();
