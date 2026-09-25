# DoSJE Smart Monitoring & Inspection — SIH Enhanced v3

A runnable hackathon prototype for Problem Statement 26095: Smart Real-Time Monitoring & Inspection Mobile App.

## What is included

- Command Center dashboard
- Context-aware CCTV activity intelligence and explainable anomaly escalation
- Automatic inspector assignment for AI-triggered events
- Citizen/public issue reporting with photo annotation/circle and GPS
- OpenStreetMap + Leaflet map
- Institute markers, 300m geofencing, inspector GPS and OSRM route calculation
- WebRTC live video + audio call rooms using Socket.IO signaling
- AI Verification Call Center: browser voice agent asks institute-specific questions, records answers in backend, evaluates risk and can create an inspection automatically
- Optional Twilio phone dialing adapter (only when credentials are supplied)
- Mobile field inspection form with GPS/time, photo evidence, signature, QR/barcode detection/manual fallback and conditional exception workflow
- Job dispatch and scheduling records
- CCTV HLS feed registry and browser preview support
- Existing analytics, inspections, random assignments, random VC and demo screenshots retained
- Optional integration placeholders for Verkada and Google Earth Engine

## Requirements

- Node.js 18+ recommended
- VS Code
- Internet connection for OpenStreetMap tiles, OSRM routing, Leaflet and Socket.IO browser client

## Run

```bash
cd server
npm install
npm run seed
npm start
```

Open http://localhost:4000

Demo admin:
- Email: admin@dosje.gov.in
- Password: Admin@123

Other demo accounts are printed by `npm run seed`.

## Live WebRTC call demo

1. Login in browser window A.
2. Open `Live Call`.
3. Keep room `dosje-demo-001`.
4. Allow camera and microphone.
5. Open the same localhost URL in a second browser/window/device on a network-reachable host.
6. Join the same room.

The server provides Socket.IO signaling; the media itself is peer-to-peer WebRTC.

## AI verification call demo

1. Open `AI Verification`.
2. Select an institute.
3. Click `Start AI call`.
4. The browser speaks each question.
5. Click `Answer by voice` or type the answer.
6. Click `Next question`.
7. Click `Finish & evaluate`.
8. If the rule engine finds a high-risk exception, it creates an `ai_call_triggered` inspection and assigns an inspector.

For a real phone call, copy `.env.example` to `.env`, add Twilio credentials and a public HTTPS `PUBLIC_BASE_URL`, then select phone mode. Without those credentials, browser voice mode is fully usable locally.

## OSM map

The map uses OpenStreetMap tiles through Leaflet. The backend provides:
- `/api/map/institutes`
- `/api/map/geofence-check`
- `/api/map/route`

Routing uses the public OSRM demo service. For production, replace it with an approved routing service or self-hosted OSRM.

## CCTV

Register HLS URLs such as `.m3u8` in the CCTV page. Browser playback depends on browser codec support. RTSP cameras are not directly playable by browsers; in production, convert RTSP to HLS/WebRTC using a media gateway such as MediaMTX or the camera vendor's gateway.

The project includes the architecture for future Verkada/other VMS integration. Add provider-specific API credentials only in environment variables; never commit secrets.

## Google Earth Engine

The application does not require Earth Engine to run. GIS overlays can be generated externally and exported as GeoJSON into `public/data/`, or connected through a backend service account in a production deployment. The included `monitoring-zones.geojson` demonstrates the overlay layer.

## Safety / governance demo language

The AI is an inspection-lead generator, not a guilt detector. A high-risk event creates a human-review task. The inspector's evidence and final review remain the decision layer.

## One-click Windows start

Double-click `start.bat`. It installs dependencies if needed, seeds the demo data and starts the server. Then open http://localhost:4000.

## Automatic AI call pipeline

When the CCTV intelligence engine detects an unexpected activity, it now creates both:
1. an AI-triggered inspection, and
2. an `autoTriggered` AI verification call in the backend.

The operator can execute that queued call in the AI Verification page. If Twilio is configured, the same call record can be dialed to the institute phone number.

## CCTV demo

This version includes five offline CCTV demo videos. Open **CCTV** after login and use **Analyze all cameras** to demonstrate the backend escalation workflow. See `DEMO_CCTV.md` for the exact sequence.
