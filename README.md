# AV Room Management System

## 1. Project Overview

The AV Room Management System is a full-stack equipment lending application for a college media and audio-visual room. It replaces a paper register with a searchable inventory, date-aware availability checks, borrowing records, returns, deposits, late-fee calculations, borrower limits, and active-loan transfers.

The application provides two separate experiences:

- **Operator workspace:** inventory oversight, dashboard metrics, borrower creation, borrowing management, returns, transfers, and profile settings.
- **Student portal:** equipment browsing, availability checks, borrowing requests, deposit information, and personal borrowing history.

The current sign-in and role selector are local demo controls. They provide separate user experiences but are not a production authentication system.

## 2. Implemented Features

### Inventory and availability

- Equipment types with multiple physical units
- Unit codes such as `DSLR-001` and `PROJ-002`
- Equipment category, description, deposit, and late-fee policy
- Current unit status: `AVAILABLE` or `BORROWED`
- Date-range availability across all physical units
- Overlap prevention for active bookings
- Interactive dashboard availability summary

### Borrowing and returns

- Borrower creation and selection
- Automatic assignment of the first available unit
- Borrowing and due-date validation
- Maximum of three active borrowings per borrower
- Return date capture
- Late-day and late-fee calculation
- Refund calculation bounded at zero
- Outstanding balance when late fees exceed the deposit
- Duplicate-return prevention

### Active-loan transfer

An operator can transfer an active loan to another borrower. The original due date, borrow date, equipment unit, deposit, status, and availability remain unchanged. The new borrower must exist, must be different from the current borrower, and must remain within the active-borrowing limit.

### User experience

- Operator dashboard with clickable metric cards
- Interactive room-pulse availability bars
- Quick actions for borrowing and availability checks
- Operator/student role selection
- Student-only borrowing portal
- Operator-only returns and transfers
- Profile page with local notification preferences
- Sign-in and sign-out demo flow
- Browser hash navigation and responsive layouts
- Loading, retry, empty, validation, success, and error states

## 3. Technology Stack

- **Frontend:** React 18, Vite, Axios, Lucide React, CSS
- **Backend:** Node.js, Express.js, CORS
- **Database:** SQLite through `better-sqlite3`
- **Testing:** Node.js built-in test runner and HTTP acceptance tests
- **Runtime:** Node.js 18 or newer; Node.js 24 is supported by the configured SQLite dependency

## 4. Architecture

The frontend is a React single-page application. It calls the backend through Axios using the `/api` path. During development, Vite proxies `/api` requests to `http://localhost:4000`.

The Express backend owns validation, availability logic, borrowing limits, transfer rules, return calculations, and database transactions. The frontend displays backend results and does not act as the source of truth for financial or booking calculations.

SQLite is initialized when the backend starts. The schema enables foreign keys and uses constraints and indexes for relationship integrity and common availability queries.

## 5. Project Structure

```text
.
├── README.md
├── REASONING.md
├── AI_LOGS.md
├── .gitignore
├── backend
│   ├── database
│   │   ├── database.js
│   │   └── schema.sql
│   ├── test
│   │   └── workflows.test.js
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
└── frontend
    ├── src
    │   ├── api.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── styles.css
    ├── package.json
    ├── package-lock.json
    ├── vite.config.js
    └── index.html
```

Generated dependencies, SQLite data, and build output are intentionally excluded from the source structure above.

## 6. Installation

Requirements:

- Node.js 18 or newer
- npm

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

The first backend start creates and seeds `backend/data/av-room.sqlite` automatically.

## 7. Running the Application

Start the backend in one terminal:

```bash
cd backend
npm start
```

Start the frontend in a second terminal:

```bash
cd frontend
npm run dev -- --host 0.0.0.0
```

Open `http://localhost:5173` or the forwarded Codespaces URL shown by Vite. The backend runs on `http://localhost:4000`.

The frontend uses the Vite proxy by default. For a separately hosted API, set `VITE_API_URL` before starting the frontend:

```bash
VITE_API_URL=https://api.example.com/api npm run dev
```

## 8. Database and Seed Data

The seed data contains:

- DSLR Camera: 3 units, deposit INR 2,000, late fee INR 100/day
- Projector: 2 units, deposit INR 3,000, late fee INR 150/day
- Microphone: 4 units, deposit INR 1,000, late fee INR 50/day
- Tripod: 3 units, deposit INR 500, late fee INR 25/day
- Three sample borrowers

To reset local demo data, stop the backend and remove the SQLite file:

```bash
rm backend/data/av-room.sqlite
```

The database will be recreated and seeded on the next backend start.

## 9. API Reference

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | Returns API health status |
| GET | `/api/settings` | Returns configured borrowing limit |
| GET | `/api/dashboard` | Returns metrics and recent activity |
| GET | `/api/equipment` | Lists equipment types and unit totals |
| GET | `/api/equipment/:id` | Returns an equipment type and its physical units |
| GET | `/api/equipment/:id/availability?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | Returns available unit count and unit codes |
| GET | `/api/borrowers` | Lists borrowers |
| POST | `/api/borrowers` | Creates a borrower |
| GET | `/api/borrowings` | Lists all borrowings; `?status=active` filters active records |
| GET | `/api/borrowings/active` | Lists active borrowings |
| POST | `/api/borrowings` | Creates a borrowing and assigns a unit |
| POST | `/api/borrowings/:id/transfer` | Transfers an active loan to another borrower |
| POST | `/api/borrowings/:id/return` | Returns an item and calculates fees and refund |

## 10. Business Rules

1. A borrower may have no more than three active borrowings.
2. Borrow and due dates must be valid ISO calendar dates.
3. The due date cannot be before the borrow date.
4. A unit is unavailable when an active borrowing overlaps the requested date interval.
5. The overlap condition is `existing.borrow_date <= requested.endDate` and `existing.due_date >= requested.startDate`.
6. Deposit and late-fee values are copied to the borrowing at checkout.
7. `lateDays = max(0, returnDate - dueDate)`.
8. `lateFee = lateDays * lateFeePerDay`.
9. `refund = max(0, depositAmount - lateFee)`.
10. Any fee above the deposit is stored as `outstandingAmount`.
11. A returned loan cannot be returned or transferred again.
12. A transfer changes only the borrower of an active loan. Unit, dates, deposit, status, and availability are preserved.

## 11. Test and Demo Scenarios

Run the acceptance suite while the backend is running:

```bash
cd backend
npm test
```

The suite verifies:

- Health endpoint and seeded equipment
- Borrower creation
- Date-range availability
- Three active loans and fourth-loan rejection
- Late return, refund floor, and outstanding balance
- Duplicate return rejection
- Active-loan transfer with preserved unit, due date, status, and availability

Manual UI scenarios:

1. Sign in as Operator and inspect the interactive dashboard.
2. Open Equipment and Availability.
3. Create a borrowing and confirm the assigned unit.
4. Open Borrowings & returns and transfer an active loan.
5. Return a loan using an early, on-time, and late date.
6. Sign out and enter the Student portal.
7. Browse equipment, check availability, request an item, and inspect My borrowings.

## 12. Troubleshooting

- **Dashboard cannot load:** confirm the backend is running on port 4000 and restart Vite after changing proxy settings.
- **`ECONNREFUSED`:** start the backend with `cd backend && npm start`.
- **Port already in use:** stop the process using port 4000 or start the backend with another `PORT` and update the Vite proxy.
- **SQLite native-module installation issue:** use a supported Node.js version and rerun `npm install` inside `backend`.
- **Unexpected demo records:** remove `backend/data/av-room.sqlite` and restart the backend.
- **Frontend dependencies missing:** run `npm install` inside `frontend`.

## 13. Current Limitations

- Sign-in and role separation are local demo behavior, not secure authentication.
- Deposits and refunds are recorded in SQLite; no payment provider is integrated.
- There are no outbound email or SMS reminders yet. Overdue loans are surfaced in the dashboard and borrowing screens.
- Equipment policy management and maintenance workflows are not exposed as CRUD screens.
- The application is designed as a single-room MVP and does not include multi-campus tenancy.
