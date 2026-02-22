# Overlapping Times Across User Profiles - Technical Analysis

## Current Architecture Overview

### Key Components

#### 1. **Data Structures** (`types.ts`)

```typescript
interface AvailabilityWindow {
  window_id: string;
  user_id: string;
  start_ts: string; // ISO timestamp
  end_ts: string; // ISO timestamp
  source: AvailabilitySource;
}

interface User {
  user_id: string;
  email: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}
```

#### 2. **Mock Users** (`mockUsers.js`)

Three test users available:

- **faith** (ID: "faith"): faith@calpoly.edu
- **maria** (ID: "maria"): maria@calpoly.edu
- **devin** (ID: "devin"): devin@calpoly.edu

#### 3. **Memory Store** (`memoryStore.ts`)

Maps data by user_id:

- `availabilityWindows`: `Map<string, AvailabilityWindow[]>`
- `googleCalendarEvents`: `Map<string, GoogleCalendarEvent[]>`
- `users`: `Map<string, User>`

#### 4. **Calendar Routes** (`calendar.ts`)

- **POST /api/calendar/sync**: Generates deterministic calendar events for a user
- **GET /api/calendar/events/:user_id**: Retrieves events for a user
- **POST /api/calendar/connect**: Initiates OAuth flow
- **POST /api/calendar/callback**: Completes OAuth

#### 5. **How Events → Availability Windows**

`deriveAvailabilityWindowsFromEvents()` function:

1. Takes user's Google Calendar events
2. Creates 7-day window from today (5 PM - 11 PM daily)
3. Identifies busy times from events
4. Returns free availability windows (gaps between busy times)

---

## Overlap Detection Algorithm

### Current Implementation (`ProfilePage.jsx`)

```javascript
function overlapWindows(windowsA, windowsB) {
  const overlaps = [];

  for (const a of windowsA) {
    const aStart = new Date(a.start_ts).getTime();
    const aEnd = new Date(a.end_ts).getTime();

    for (const b of windowsB) {
      const bStart = new Date(b.start_ts).getTime();
      const bEnd = new Date(b.end_ts).getTime();

      // Calculate intersection - both must have time overlap
      const start = Math.max(aStart, bStart);
      const end = Math.min(aEnd, bEnd);

      if (start < end) {
        overlaps.push({
          id: `${a.window_id}_${b.window_id}`,
          start_ts: new Date(start).toISOString(),
          end_ts: new Date(end).toISOString(),
        });
      }
    }
  }

  return overlaps
    .sort(
      (x, y) => new Date(x.start_ts).getTime() - new Date(y.start_ts).getTime(),
    )
    .slice(0, 10); // Top 10 overlaps
}
```

**How it works:**

1. Loops through all windows for User A
2. Loops through all windows for User B
3. Calculates intersection: `max(start_a, start_b)` to `min(end_a, end_b)`
4. If intersection is valid (start < end), adds to overlaps
5. Sorts by time, returns top 10

---

## Current UI Flow (`ProfilePage.jsx`)

### Session & User Selection

1. Login page allows switching between faith/maria/devin
2. Session stored in localStorage
3. Primary user = logged-in user
4. Comparison user = dropdown selector (other users)

### State Management

```javascript
const primaryState = useUserCalendarState(primaryUser);
const compareState = useUserCalendarState(compareUser);

const sharedWindows = useMemo(
  () =>
    overlapWindows(
      primaryState.data.availability,
      compareState.data.availability,
    ),
  [primaryState.data.availability, compareState.data.availability],
);
```

### Display Sections

1. **Logged-in User Card** - Shows user info + calendar status
2. **Compare User Card** - Dropdown to select which user to compare
3. **Shared Free Windows Section** - Shows overlapping time slots
4. **Logged-in User Availability** - Shows that user's full availability

---

## How to Show Overlapping Times

### Option 1: Current Implementation (Already Works!)

✅ **Profile page shows shared windows when comparing two users**

**Access it:**

1. Go to `/login`
2. Login as "faith"
3. You'll see:
   - Logged-in User (faith)
   - Compare User dropdown (maria/devin)
   - "Shared Free Windows" section showing overlaps

### Option 2: Add a Dedicated Overlaps Page

Create a new page to visualize overlaps better:

```jsx
// src/pages/OverlapsPage/index.jsx
import { useEffect, useState } from "react";
import { getAvailability } from "../../lib/api/backend";
import { MOCK_USERS } from "../../lib/auth/mockUsers";

function overlapWindows(windowsA, windowsB) {
  // ... existing overlap logic
}

export default function OverlapsPage() {
  const [user1, setUser1] = useState("faith");
  const [user2, setUser2] = useState("maria");
  const [windows1, setWindows1] = useState([]);
  const [windows2, setWindows2] = useState([]);
  const [overlaps, setOverlaps] = useState([]);

  useEffect(async () => {
    const w1 = await getAvailability(user1, ...dateRange);
    const w2 = await getAvailability(user2, ...dateRange);
    setWindows1(w1.windows);
    setWindows2(w2.windows);
    setOverlaps(overlapWindows(w1.windows, w2.windows));
  }, [user1, user2]);

  return (
    <div>
      <h1>Find Meeting Times</h1>

      <div>
        <select value={user1} onChange={(e) => setUser1(e.target.value)}>
          {MOCK_USERS.map((u) => (
            <option key={u.id}>{u.name}</option>
          ))}
        </select>

        <select value={user2} onChange={(e) => setUser2(e.target.value)}>
          {MOCK_USERS.map((u) => (
            <option key={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      <div>
        <h2>Overlapping Times</h2>
        {overlaps.map((overlap) => (
          <div key={overlap.id}>
            <p>
              {formatTime(overlap.start_ts)} - {formatTime(overlap.end_ts)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Option 3: Add Visualization Timeline

Create a calendar-style view showing overlaps:

```jsx
// Shows a week view with:
// - User A's availability in one color
// - User B's availability in another color
// - Overlaps highlighted in a third color
// - Hours of the day on Y-axis
// - Days on X-axis
```

---

## API Integration Points

### Fetching Availability for Multiple Users

**Backend provides:**

- `GET /api/availability/:user_id?start=ISO&end=ISO` - User's free windows

**Frontend flow:**

1. Select two users
2. Call `getAvailability(user1_id, start, end)`
3. Call `getAvailability(user2_id, start, end)`
4. Use `overlapWindows()` to find intersections
5. Display results

---

## Key Code Paths

### 1. Getting Available Windows

```
User Login → useUserCalendarState() → getAvailability() → availabilityWindows.get(userId)
```

### 2. Showing Overlaps

```
ProfilePage → useUserCalendarState(user1, user2) → overlapWindows() → Display
```

### 3. Adding New User

```
POST /api/users → Create user record → Can now sync calendar → Generate windows
```

---

## Recommendations for Enhancement

### 1. **Show More Details**

- Add timezone info (all users are in America/Los_Angeles, but could differ)
- Show how long each overlap is
- Show which day each overlap is on

### 2. **Better UX**

- Pre-select opposite user automatically
- Show "No overlaps found" message with suggestions
- Add time zone conversion (if users in different zones)

### 3. **Filter Overlaps**

- Min duration filter (ignore < 30 min overlaps)
- Exclude overnight hours
- Business hours only toggle

### 4. **Group By Users**

- Show all overlaps for selected user pairs
- "Group meeting" mode: show 3-way overlaps

### 5. **Pagination/Search**

- Current code shows top 10 overlaps
- Could add "load more" or search by date

---

## Testing Checklist

✅ **Login as different users:**

- faith → compare with maria/devin
- maria → compare with faith/devin
- devin → compare with faith/maria

✅ **Check shape of overlaps:**

- Should be multiple windows across 7 days
- Each window is a free time slot both users have available

✅ **Verify times:**

- All overlaps should fall within 5 PM - 11 PM (derived window)
- No overlap should extend beyond an individual user's window

---

## File Locations

| File                                    | Purpose                          |
| --------------------------------------- | -------------------------------- |
| `src/pages/ProfilePage/index.jsx`       | ✅ Current overlap display       |
| `src/lib/hooks/useUserCalendarState.js` | Fetches user availability        |
| `server/src/routes/calendar.ts`         | Generates availability windows   |
| `src/lib/auth/mockUsers.js`             | Test users (faith, maria, devin) |
| `server/src/store/memoryStore.ts`       | Stores all data in memory        |
