# AV Room Desk

A practical equipment-rental management system for a college AV room. It tracks each physical unit, shows date-aware availability, records refundable deposits, enforces a three-item borrowing limit, and calculates late fees when equipment is returned.

## Features

- Dashboard with live inventory totals, overdue count, recent activity, and quick actions
- Equipment inventory for DSLR cameras, projectors, microphones, and tripods
- Individual unit tracking with codes such as `DSLR-001`
- Date-range availability that handles overlapping bookings across multiple units
- Borrower management, borrower creation, and new checkout workflow
- Active, returned, and overdue borrowing views
- Transactional returns with late days, late fee, refund, and outstanding balance
- Responsive desk-oriented UI with loading, empty, success, and error states
- Automated API acceptance tests for the core workflows

## Tech stack and architecture

- Frontend: React 18, Vite, Axios, Lucide icons, CSS
- Backend: Node.js, Express, better-sqlite3, CORS
- Database: SQLite with foreign keys, constraints, indexes, and seed data

The backend owns all business calculations and validation. The frontend is a thin API client. `backend/database/database.js` initializes the schema and seed data, while `backend/server.js` provides the REST API and transaction boundaries.

## Folder structure

```text
backend/
	database/schema.sql
	database/database.js
	package.json
	server.js
frontend/
	src/App.jsx
	src/api.js
	src/main.jsx
	src/styles.css
	package.json
	vite.config.js
README.md
REASONING.md
AI_LOGS.md
```

## Installation and setup

Requirements: Node.js 18+ and npm.

```bash
cd backend && npm install
cd ../frontend && npm install
```

The database is created and seeded automatically on the first backend start. To reset demo data, stop the backend and remove `backend/data/av-room.sqlite`, then start it again.

## Run the application

Terminal 1:

```bash
cd backend
npm start
```

Terminal 2:

```bash
cd frontend
npm run dev
```

With the backend running, execute the automated acceptance workflow:

```bash
cd backend
npm test
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`. The API defaults to `http://localhost:4000`; set `VITE_API_URL` when the API is hosted elsewhere.

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| GET | `/api/dashboard` | Dashboard metrics and recent activity |
| GET | `/api/equipment` | Equipment types with unit totals |
| GET | `/api/equipment/:id` | Equipment details and physical units |
| GET | `/api/equipment/:id/availability?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | Available units for a range |
| GET | `/api/borrowers` | Borrower list |
| POST | `/api/borrowers` | Create a borrower |
| GET | `/api/borrowings` | All borrowings; use `?status=active` to filter |
| GET | `/api/borrowings/active` | Active borrowings |
| POST | `/api/borrowings` | Create a borrowing and assign a unit |
| POST | `/api/borrowings/:id/return` | Return an item and calculate fees |

## Business rules

- A borrower can have at most 3 active borrowings.
- `due_date` cannot be before `borrow_date`; date ranges must be valid ISO dates.
- A unit cannot have overlapping active bookings. The first available unit code is assigned.
- Deposit and late-fee rates are copied onto the borrowing at checkout.
- `lateDays = max(0, returnDate - dueDate)` and `lateFee = lateDays × lateFeePerDay`.
- `refund = max(0, deposit - lateFee)`; any excess is recorded as `outstanding_amount`.
- A returned borrowing cannot be returned twice.

## Test/demo scenarios

The seeded data includes three DSLR units, two projectors, four microphones, three tripods, and three borrowers. Try these flows from the UI: check DSLR availability, create a checkout, verify the unit count changes, return it late, and inspect the refund. The API can also be smoke-tested with `curl`:

```bash
curl http://localhost:4000/api/equipment
curl 'http://localhost:4000/api/equipment/1/availability?startDate=2026-09-16&endDate=2026-09-18'
```

## Troubleshooting

- `ECONNREFUSED`: start the backend and confirm port 4000 is free.
- Frontend API errors: check that the backend is running and `VITE_API_URL` is correct.
- Native SQLite install issues: use a supported Node.js LTS version and rerun `npm install` inside `backend`.
- Stale demo records: remove `backend/data/av-room.sqlite` and restart the backend to reseed.