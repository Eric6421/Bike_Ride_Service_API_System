# Bike Ride Service API

This project implements the take-home assignment from LocoBike: a simple backend API that supports starting a ride, ending a ride, retrieving ride details, and calculating ride cost.

## Tech Stack

- Node.js + Express for REST API endpoints.
- SQLite (`sqlite3`) for persistent storage.
- Promise-based async flow (wrapping callback APIs) for readable asynchronous logic.

## Project Structure

- `src/server.js`: Web server program
- `src/app.js`: route definitions and API-level error handling.
- `src/database.js`: SQLite setup, schema initialization, and Promise wrappers.
- `src/pricing.js`: fare calculation rules.
- `src/validation.js`: request and parameter validation.
- `data/`: SQLite file is created here at runtime.

## Setup

1. Install dependencies:
   - `npm install`
2. Start server:
   - `npm start`
3. API base URL:
   - `http://localhost:3000`
4. Browser test page:
   - `http://localhost:3000/index.html`

## Browser Testing UI

we can use a simple frontend tester to test which is provided at `public/index.html`.

- It includes buttons for:
  - `POST /ride/start`
  - `POST /ride/end`
  - `GET /ride/{id}`
  - `GET /ride/{id}/cost`
- It includes a scroll list of available ride IDs for Get Ride and Get Cost, loaded from `GET /ride`.
- Start with **Start Ride**, then use returned `rideId` (auto-filled) for subsequent actions.
- This frontend is served by Express as static files so it works on the same origin as the API.

## Pricing Rules Implemented

- Unlock fee: `$5`
- First `15` minutes: free
- After `15` minutes: `$1` per `5` minutes (rounded up by block)
- Daily cap: `$25`

## Validation and Error Handling

- Request body validation for required fields and types.
- `404` for missing rides.
- `409` for logical conflicts (already ended ride, cost requested before end).
- Generic `500` handler for unexpected errors.

