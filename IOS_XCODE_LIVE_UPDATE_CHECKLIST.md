# iOS Live Update Checklist (Capacitor + Xcode + Supabase + Twilio)

Use this before every iPhone demo so database and call updates reflect in-app immediately.

## 1) Start all local services and refresh ngrok links

```bash
npm run ios:iphone
```

This command does:
- starts ngrok + backend + frontend
- updates `.env.local` with current public URL for:
  - `VITE_API_BASE_URL`
  - `TWILIO_PUBLIC_BASE_URL`
  - `PUBLIC_BASE_URL`
- runs `npm run ios` (`build + cap sync ios`)

## 2) Open and run from Xcode

```bash
open ios/App/App.xcworkspace
```

In Xcode:
- Select your connected iPhone device
- Press Run
- Keep Xcode console visible

## 3) Verify runtime is on the fresh backend

In Safari/desktop:
- open `https://<current-ngrok>/health`
- expect `{ "ok": true, ... }`

In app/Xcode console:
- verify requests target the same `https://<current-ngrok>` URL

## 4) Verify live-update events work on iPhone

Test flow:
1. Trigger a reservation call in Jarvis
2. Confirm from restaurant side with keypad `1`
3. Keep app foregrounded OR background/foreground once
4. Confirm Jarvis adds a confirmation chat
5. Confirm Plans refreshes with confirmed reservation plan

The app now refreshes on:
- realtime DB updates (Supabase channel)
- foreground focus
- visibility changes
- `pageshow`
- Capacitor/Cordova `resume` event
- interval polling fallback

## 5) If app does not update

1. Ensure iPhone app was rebuilt and rerun after code changes
2. Confirm Twilio callbacks are `200` for:
   - `/api/twilio/voice/input`
   - `/api/twilio/voice/status`
3. Confirm ngrok URL in `.env.local` matches current tunnel
4. Confirm backend has Supabase env keys loaded
5. Retry with app background -> foreground to force refresh hooks

## 6) Demo-safe reset

If stale UI persists:
1. Stop Xcode run
2. Stop terminal services (`Ctrl+C` from `ios:iphone`)
3. Run `npm run ios:iphone` again
4. Re-run app from Xcode
