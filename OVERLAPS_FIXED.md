# Overlaps Debugging & Implementation Summary

## What We Fixed

### 1. **Dev Script Issue** ✅

- **Problem**: The `npm run dev` script was trying to run the old `/backend/server.js` which had express as a dependency not found
- **Solution**: Updated `package.json` to run the TypeScript backend from `/server/` instead
- **File Modified**: [package.json](package.json)

```json
"dev": "sh -c 'cd server && npm run dev & BACK_PID=$!; cd ..; trap \"kill $BACK_PID\" EXIT; vite'"
```

### 2. **Timeline Visualization** ✅

- **Created**: [OverlapTimeline.jsx](src/components/OverlapTimeline.jsx)
- **Features**:
  - Groups overlaps by day
  - Shows time range and duration in minutes
  - Color-coded blocks (green gradient) for visual distinction
  - Responsive design with hover effects
  - Clear "no overlaps" message

### 3. **ProfilePage Updates** ✅

- **Modified**: [ProfilePage/index.jsx](src/pages/ProfilePage/index.jsx)
- **Added**: Import for OverlapTimeline component
- **Changed**: Shared Free Windows section now uses visual timeline instead of plain text list

## How the Overlap System Works

### Data Flow

```
1. User logs in (Login Page)
   → Session stored in localStorage

2. Navigate to Profile Page
   → useUserCalendarState hook runs for both users

3. useUserCalendarState orchestrates:
   - createOrGetUser() → Creates/retrieves user from backend
   - connectCalendar() → Initiates OAuth (mocked)
   - callbackCalendar() → Completes OAuth
   - syncCalendar() → Generates 7 days of mock events
   - getAvailability() → Extracts free time slots

4. overlapWindows() function:
   - Compares two users' availability windows
   - Finds time intersections (max start, min end)
   - Only includes times where BOTH users are free
   - Returns top 10 overlaps sorted by time

5. OverlapTimeline renders the results:
   - Groups by day
   - Shows formatted times and duration
```

### Mock Data Generation

Each user gets deterministic calendar events based on their `user_id`:

- 7 days of events (starting today)
- Events have random names, times, and durations
- Availability windows: 5 PM - 11 PM daily, minus busy times
- Each user typically has 10-20 availability windows across 7 days

## API Endpoints

### Users

- `POST /api/users` - Create or get user by email
- `GET /api/users/:user_id` - Fetch user details

### Calendar

- `POST /api/calendar/connect` - Start OAuth flow
- `POST /api/calendar/callback` - Complete OAuth
- `POST /api/calendar/sync` - Generate events & availability windows
- `GET /api/calendar/status/:user_id` - Check connection status
- `GET /api/calendar/events/:user_id` - Get calendar events

### Availability

- `GET /api/availability/:user_id` - Get free time slots

## Testing the Overlaps Feature

### Via Browser

1. Start dev server: `npm run dev`
2. Go to http://localhost:5173/login
3. Login as "faith" (or "maria"/"devin")
   - Password: `faith123` (username + 123)
4. You'll be redirected to `/profile`
5. Calendar will auto-connect and sync
6. Select a "Compare User" dropdown
7. View "Shared Free Windows" section
   - Shows visual blocks of when both users are free

### Via API (Terminal)

```bash
# Create user
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"faith@calpoly.edu","timezone":"America/Los_Angeles"}'

# Get user_id from response, then connect calendar
# (connect → callback → sync flow)

# Get availability
curl http://localhost:3001/api/availability/{user_id}
```

## Why Overlaps Might Not Show

### Scenario 1: Users with No Overlap

- If both users' calendars have completely different busy times, no overlap found
- Display shows: "No overlapping times found in the next 7 days"

### Scenario 2: Calendar Not Connected

- If user hasn't gone through `connectCalendar()` → `callbackCalendar()` → `syncCalendar()`
- `useUserCalendarState` hook handles this automatically on first load
- Check: ProfilePage shows "Windows: 0" if skipped

### Scenario 3: Backend Not Running

- Frontend calls `http://localhost:3001` by default
- If backend is not running, requests will fail
- Check browser console (F12) for network errors

## Visual Display Enhancements

The new `OverlapTimeline` component now shows:

### Before

- Plain text list of times
- No visual hierarchy
- Glitchy layout due to rows

### After

- Organized by day
- Green gradient blocks
- Duration info in minutes
- Hover effects
- Clear visual separation
- Helpful tip at bottom

## Next Steps to Improve

1. **Add Group Mode** - Show 3+ user overlaps
2. **Add Filters** - By duration, time of day, day of week
3. **Add Locations** - Show nearby restaurants/cafes for overlap times
4. **Export iCal** - Download overlaps as calendar event
5. **Real Calendar APIs** - Integrate actual Google/Apple calendars
6. **User Search** - Find other students to compare with

## Files Changed Today

| File                                                                     | Change                                     |
| ------------------------------------------------------------------------ | ------------------------------------------ |
| [package.json](package.json)                                             | Fixed dev script to use TypeScript backend |
| [src/components/OverlapTimeline.jsx](src/components/OverlapTimeline.jsx) | NEW - Timeline visualization component     |
| [src/pages/ProfilePage/index.jsx](src/pages/ProfilePage/index.jsx)       | Integrated OverlapTimeline component       |
