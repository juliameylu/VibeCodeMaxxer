# 🚀 SLO Day Planner - Setup & Running Instructions

## Prerequisites

- Node.js 16+ ([Download](https://nodejs.org/))
- npm or yarn package manager

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Demo Mode (No API Keys Needed)

1. Copy `.env.example` to `.env`
2. Ensure `VITE_DEMO_MODE=true`
3. Run the app normally (`npm run dev`)

In demo mode, `/places` and `/events` use fixtures in `src/mocks/fixtures/`.
For production, keep real Yelp/Cal Poly integrations server-side (proxy or edge function) and call those from `src/lib/api/places.js` and `src/lib/api/events.js`.

### Live API Mode (Local Dev)

The app now includes local API endpoints in `vite.config.js`:
- `GET /api/places` (Yelp proxy)
- `GET /api/events` (Cal Poly NOW scrape proxy)

To use live data:
1. Set `VITE_DEMO_MODE=false` in `.env`
2. Add `YELP_API_KEY` to `.env` (server-side only)
3. Restart `npm run dev`

Notes:
- Never put Yelp keys in client code or `VITE_` vars.
- `/api/events` scrapes from `CALPOLY_EVENTS_SOURCE` (default uses `r.jina.ai` mirror of Cal Poly NOW).

### 3. Build for Production

```bash
npm run build
npm run preview
```

## Backend (User + Preferences + Calendar Mock)

The backend lives in `server/` and exposes:
- `POST /api/users`
- `GET /api/users/:user_id`
- `GET/PUT /api/preferences/:user_id`
- `POST /api/calendar/connect`
- `POST /api/calendar/callback`
- `POST /api/calendar/sync`
- `GET /api/calendar/status/:user_id`
- `GET /api/calendar/events/:user_id` (mock Google Calendar event shape)
- `GET /api/availability/:user_id`
- `GET /api/mock-reservations/availability`
- `POST /api/mock-reservations/book`
- `GET /api/mock-reservations/:user_id`

Run it locally:

```bash
cd server
npm install
npm run dev
```

Default backend URL: `http://localhost:3001`
Set `VITE_BACKEND_BASE_URL=http://localhost:3001` in frontend `.env` if needed.

### Places Page Notes + Yelp Link Behavior

- Reservation panel supports user notes for:
  - allergies
  - high chair / kids context
  - other seating preferences
- These are sent in mock booking payload fields:
  - `special_requests: string[]`
  - `notes: string`
- You do not need `VITE_DEMO_MODE=false` just to open restaurant-level Yelp links.
  - In demo mode, fixture data includes direct restaurant Yelp URLs.
  - In live mode (`VITE_DEMO_MODE=false`), links come from real API response data.

## Project Structure

```
src/
├── pages/
│   ├── Landing/        # Home page with priorities & places
│   ├── Auth/          # Login page
│   └── Planner/       # Task planner
├── styles/
│   └── globals.css    # Tailwind CSS config
└── App.jsx            # Main router
```

## Current Features (Dummy Data)

✅ Landing page with greeting  
✅ Top 3 priorities with progress  
✅ Smart Mode toggle (Work/Fun)  
✅ Open places grid (Coffee, Food, Hikes, Study)  
✅ After-class planning suggestion  
✅ Task planner page  
✅ Login page (demo auth)

## Next Steps - Connecting APIs

All data is currently hardcoded. When ready to add real data:

1. Create Supabase project
2. Set up .env with API keys
3. Update `src/lib/api/` files with real API calls
4. Install TanStack Query: `npm install @tanstack/react-query`

---

## 🤝 Team Division (5 Person Dev Team)

### Recommended Branch Strategy

Each team member works on their own feature branch:

- `feature/auth-supabase` (Person 1)
- `feature/weather-api` (Person 2)
- `feature/places-api` (Person 3)
- `feature/canvas-integration` (Person 4)
- `feature/ui-polish` (Person 5)

---

## Person 1: Authentication & User Profile

**Branch:** `feature/auth-supabase`

### Files to Create/Modify

```
src/lib/supabase/auth.ts        # Login, signup, logout
src/lib/supabase/client.ts      # Supabase client init
src/lib/hooks/useProfile.ts     # Get user profile
src/pages/Auth/SignupPage.jsx   # New signup page
```

### Deliverables

- [ ] Supabase Auth integration (Email/Password)
- [ ] User profile schema (name, email, major, year)
- [ ] Protected routes using useAuth hook
- [ ] Logout functionality
- [ ] Persist user session

### Instructions

1. Set up Supabase project: https://supabase.com
2. Enable Email Auth in Auth Settings
3. Create `users` table with: id, email, name, major, year
4. Create custom `useAuth()` hook that returns user, loading, error
5. Wrap App in AuthProvider
6. Update LoginPage & GreetingHeader to use real user data

---

## Person 2: Weather API Integration

**Branch:** `feature/weather-api`

### Files to Create/Modify

```
src/lib/api/weather.ts           # Weather fetch logic
src/lib/supabase/functions/
  weather-proxy/index.ts         # Edge function proxy
src/lib/hooks/useWeather.ts      # React hook wrapper
src/pages/Landing/sections/
  GreetingHeader.jsx             # Use real weather data
```

### Deliverables

- [ ] Fetch real-time weather for SLO coordinates
- [ ] Display current temp, conditions, forecast
- [ ] Update every 10 minutes via TanStack Query
- [ ] Handle loading & error states
- [ ] Weather-based emoji (☀️, 🌧️, etc)

### Instructions

1. Use OpenWeather API (free tier: https://openweathermap.org)
2. SLO coordinates: 35.2828°N, 120.6625°W
3. Create Supabase Edge Function to proxy API (hide keys)
4. Use TanStack Query with staleTime: 10 minutes
5. Update GreetingHeader component to display weather

---

## Person 3: Google Places API

**Branch:** `feature/places-api`

### Files to Create/Modify

```
src/lib/api/places.ts            # Places fetch logic
src/lib/supabase/functions/
  places-proxy/index.ts          # Edge function proxy
src/lib/hooks/useOpenNow.ts      # React hook wrapper
src/pages/Landing/sections/
  OpenNowGrid.jsx                # Use real places data
```

### Deliverables

- [ ] Fetch coffee shops, restaurants, parks, libraries (open now)
- [ ] Show distance, rating, hours, address
- [ ] Filter by category (Food, Coffee, Study, Hikes)
- [ ] Click to open Google Maps
- [ ] Handle "No results" gracefully

### Instructions

1. Set up Google Places API: https://cloud.google.com/maps-platform
2. Create Supabase Edge Function to proxy requests (hide API key)
3. Search nearby places: radius 2km, types: cafe, restaurant, park, library
4. Filter for "open_now = true"
5. Cache results for 20 minutes
6. Add click handler to open Maps link

---

## Person 4: Canvas LMS & Smart Mode

**Branch:** `feature/canvas-integration`

### Files to Create/Modify

```
src/lib/api/canvas.ts            # Canvas API fetch logic
src/lib/supabase/functions/
  canvas-proxy/index.ts          # Edge function proxy
src/lib/hooks/usePriorities.ts   # Parse assignments
src/lib/hooks/useSmartMode.ts    # Calculate work pressure
src/pages/Landing/sections/
  TopPriorities.jsx              # Use real assignments
  SmartModeBanner.jsx            # Smart suggestions
```

### Deliverables

- [ ] Fetch assignments from Canvas API
- [ ] Extract due dates & attachment info
- [ ] Calculate estimated time to complete (defaults: 2h for STEM, 1h for others)
- [ ] Implement Smart Mode algorithm:
  - If total work > 6h: suggest work-first mode
  - If closest deadline < 4h: suggest work-first mode
  - Otherwise: suggest fun-first mode
- [ ] Show personalized after-class plan

### Instructions

1. Get Canvas API token from account settings
2. Fetch upcoming assignments from courses
3. Parse due dates, course, title
4. Calculate % complete if syllabus has progress
5. Implement SmartMode calculation (see above)
6. Suggest study locations & reward activities

---

## Person 5: UI Polish & Animations

**Branch:** `feature/ui-polish`

### Files to Modify

```
src/styles/globals.css           # Add animations
src/pages/*/                     # All components
src/pages/Landing/sections/      # Enhance all sections
```

### Deliverables

- [ ] Page transitions (fade in)
- [ ] Micro-interactions (button hover, card hover)
- [ ] Loading skeletons for API data
- [ ] Toast notifications (react-hot-toast)
- [ ] Mobile responsive design (test on iPhone)
- [ ] Dark mode toggle (optional)
- [ ] Accessibility improvements (ARIA labels, keyboard nav)
- [ ] Smooth scroll behavior

### Instructions

1. Install libraries:
   ```bash
   npm install react-hot-toast sonner framer-motion
   ```
2. Add animations to:
   - Page load (fade in)
   - Card interactions (scale on hover)
   - Button clicks (ripple effect)
   - Loading states (skeleton screens)
3. Test on mobile viewports
4. Audit with WAVE accessibility checker
5. Add loading states to all API calls

---

## Integration Checklist Before Merging

```
- [ ] All branches merged to main
- [ ] No broken imports or TypeScript errors
- [ ] APIs working end-to-end
- [ ] All dummy data replaced with real data
- [ ] Tested on mobile (iPhone + Android)
- [ ] Performance checked (Lighthouse)
- [ ] Production build succeeds
```

## Useful Commands

```bash
# Install a package
npm install package-name

# Update all packages
npm update

# Check for security vulnerabilities
npm audit

# Format code
npm install -D prettier
npx prettier --write .

# Type checking (optional, add TypeScript)
npm install -D typescript
npx tsc --noEmit
```

## Debugging Tips

- Open browser DevTools (F12) for errors
- Check Network tab for API failures
- Use Console for logs
- Clear localStorage: `localStorage.clear()`
- Clear all data: Application → Clear Site Data
