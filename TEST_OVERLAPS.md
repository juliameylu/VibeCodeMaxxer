# Testing the Overlapping Availabilities Feature

## Quick Start

### Step 1: Start the Dev Server

```bash
cd /Users/ceyabadyal/polyprompt/VibeCodeMaxxer
npm run dev
```

Wait for output showing:

- `Backend listening on http://localhost:3001`
- `VITE v5.4.21 ready in ...`
- `Local: http://localhost:5173/`

### Step 2: Open the App

Navigate to: **http://localhost:5173/login**

### Step 3: Login as a Mock User

Use one of these credentials:

- **Username**: `faith` | **Password**: `faith123`
- **Username**: `maria` | **Password**: `maria123`
- **Username**: `devin` | **Password**: `devin123`

The page shows these demo credentials for easy testing.

### Step 4: Automatic Calendar Setup

After login, you'll be redirected to `/profile`. The app automatically:

1. ✅ Creates user in backend (if not exists)
2. ✅ Connects calendar (mock OAuth)
3. ✅ Syncs 7 days of calendar events
4. ✅ Generates availability windows

**Loading states** to expect:

- "Loading user state..." → Creating/fetching user
- "Connecting calendar..." → OAuth flow
- "Syncing calendar..." → Generating events and windows

### Step 5: View Overlapping Times

Once loaded, you'll see:

#### Left Panel: "Logged-in User"

- User ID, email, timezone
- Calendar status (should be "connected")
- Last sync time
- Number of availability windows
- Number of mock events

#### Right Panel: "Compare User"

- Dropdown to select another user (maria/devin/faith)
- Same info as logged-in user for comparison

#### Main Section: "Shared Free Windows"

**Visual blocks showing:**

- Date header (e.g., "Fri, Feb 21")
- Number of overlaps for that day
- Green gradient boxes with:
  - Time range (e.g., "6:30 PM - 7:00 PM")
  - Duration (e.g., "30 min")
  - "Both available" label

**Example layout:**

```
Fri, Feb 21          [2 overlaps]
┌─────────────────────────────────┐
│ 6:30 PM - 7:00 PM        30 min │  ← Green block
│ Both available                   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 8:15 PM - 9:30 PM        75 min │  ← Green block
│ Both available                   │
└─────────────────────────────────┘
```

---

## Troubleshooting

### Issue: "No overlapping times found"

**Likely Cause**: Both users' calendars sync independently. Overlap depends on mock event generation.

**Solution**: This is normal behavior! Try:

1. Click "Refresh" button to re-sync
2. Change comparison user (maria → devin)
3. Note: Overlap is calculated from free time gaps (not busy times), so availability depends on mock event times

### Issue: "Windows: 0" in user cards

**Likely Cause**: Calendar didn't sync properly.

**Solution**:

1. Click "Link Google Calendar" button
2. Wait for "Connecting calendar..." → "Syncing calendar..." messages
3. Check browser console (F12) for errors

### Issue: Cannot reach backend (network errors)

**Likely Cause**: Backend server didn't start.

**Solution**:

1. Check if 3001 is in use: `lsof -i :3001`
2. Kill if needed: `lsof -ti:3001 | xargs kill -9`
3. Restart: `npm run dev` from root directory
4. Backend should log: `Backend listening on http://localhost:3001`

### Issue: App looks glitchy/not loading

**Likely Cause**: Frontend rebuild needed.

**Solution**:

1. Hard refresh: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (PC)
2. Check console: **F12** → **Console** tab
3. Look for red errors, especially CORS or 404 errors

---

## Manual API Testing (Advanced)

If you want to test endpoints directly:

### Create a User

```bash
curl -s -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"faith@calpoly.edu","timezone":"America/Los_Angeles"}' | jq .</smash
```

Response:

```json
{
  "user_id": "u_105",
  "email": "faith@calpoly.edu",
  "timezone": "America/Los_Angeles",
  "created_at": "2026-02-22T01:45:00.000Z",
  "updated_at": "2026-02-22T01:45:00.000Z"
}
```

### Connect Calendar

```bash
curl -s -X POST http://localhost:3001/api/calendar/connect \
  -H "Content-Type: application/json" \
  -d '{"user_id":"u_105","provider":"google"}' | jq .
```

Get the `state` from response, use for callback:

### Complete OAuth

```bash
curl -s -X POST http://localhost:3001/api/calendar/callback \
  -H "Content-Type: application/json" \
  -d '{"user_id":"u_105","state":"state_000001","code":"mock_oauth_code"}' | jq .
```

### Sync Calendar

```bash
curl -s -X POST http://localhost:3001/api/calendar/sync \
  -H "Content-Type: application/json" \
  -d '{"user_id":"u_105"}' | jq .synced_events
```

### Get Availability Windows

```bash
curl -s http://localhost:3001/api/availability/u_105 | jq '.windows | length'
```

---

## What to Expect

- **Mock event generation**: Creates 7-14 random events per user per day
- **Availability calculation**: Extracts 5 PM - 11 PM free slots by removing event time
- **Overlap**: Only shows times BOTH users are free simultaneously
- **Deterministic**: Same user always gets same event pattern (seeded by user_id)

---

## Next Testing Steps

1. ✅ Single user can see their availability
2. ✅ Two users show overlapping times as green blocks
3. ✅ Switch comparison user → see different overlaps
4. ✅ Click refresh → recalculates with fresh data
5. 🔄 Try 3-way overlaps (coming soon!)
6. 🔄 Filter by duration/time (coming soon!)
