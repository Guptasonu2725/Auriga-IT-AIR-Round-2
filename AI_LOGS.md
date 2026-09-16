# AI Development Log

This document records the implementation work completed during the project conversation. It is intentionally written as a factual engineering log rather than a verbatim transcript. Future changes should be appended chronologically under a new dated entry.

## Entry 1 - Initial repository inspection

- Inspected the repository and found only a placeholder `README.md`.
- Confirmed Node.js, npm, and SQLite were available in the Codespaces environment.
- Chose a simple React/Vite frontend, Express backend, and SQLite database using `better-sqlite3`.
- Established a layered implementation order: database, backend APIs, frontend workflows, documentation, and executable validation.

## Entry 2 - Database and seed data

- Created the backend project structure.
- Added relational tables for:
	- `borrowers`
	- `equipment`
	- `equipment_units`
	- `borrowings`
- Enabled SQLite foreign keys and indexes.
- Added constraints for valid unit status, borrowing status, non-negative money values, and valid due dates.
- Added seed data for DSLR cameras, projectors, microphones, tripods, physical unit codes, and sample borrowers.

## Entry 3 - Backend API and business rules

- Implemented Express REST endpoints for health, settings, dashboard data, equipment, availability, borrowers, borrowings, returns, and transfers.
- Centralized backend validation for IDs, dates, date ranges, availability, and active-borrowing limits.
- Implemented a configurable `MAX_ACTIVE_BORROWINGS` value of 3.
- Implemented date-range overlap prevention using closed intervals.
- Implemented automatic assignment of the first available physical unit.
- Implemented transactional borrowing and return operations.
- Implemented late-day, late-fee, refund, and outstanding-balance calculations.
- Ensured refunds cannot become negative.
- Rejected duplicate returns and invalid return dates.

## Entry 4 - Initial frontend application

- Created the React/Vite frontend.
- Added operator dashboard, equipment inventory, availability, borrowing, borrowing/return management, and profile views.
- Added Axios API integration.
- Added reusable UI patterns for panels, status pills, notices, loading states, error states, empty states, forms, and dialogs.
- Added responsive CSS and a readable typography/color system using Space Grotesk and DM Sans.

## Entry 5 - Dashboard loading fix and visual refinement

- Diagnosed an endless dashboard loading state caused by direct browser requests to `http://localhost:4000/api` in Codespaces.
- Changed the frontend API base path to same-origin `/api`.
- Added a Vite development proxy from `/api` to the backend.
- Added an eight-second API timeout.
- Added an explicit dashboard connection-error state with a retry action.
- Improved visual hierarchy with teal, coral, sage, and neutral colors, larger headings, clearer body text, softer panels, and stronger contrast.
- Verified the frontend-origin API proxy returned `{"status":"ok"}`.

## Entry 6 - Profile and navigation features

- Added a profile page for the operator.
- Added profile details, desk activity totals, and local notification preference toggles.
- Added sign-in and sign-out demo screens.
- Added local session persistence through `localStorage`.
- Added browser hash navigation and history handling.
- Replaced the visible header back button with cleaner page navigation.
- Later simplified the header to display only the current page name instead of `AV ROOM / Page`.

## Entry 7 - Student and operator separation

- Added role selection during local sign-in.
- Created a separate student portal rather than exposing operator controls to students.
- Student portal features:
	- Browse equipment
	- Check availability
	- Request equipment
	- Choose borrow and return dates
	- View deposit and late-fee information
	- View personal borrowing history
	- Sign out
- Operator workspace retains dashboard, inventory, borrower, borrowing, return, transfer, and profile features.

## Entry 8 - Dynamic form and return improvements

- Fixed asynchronous form initialization so equipment and borrower selectors populate after API data loads.
- Added live return-date preview values for:
	- Late days
	- Late fee
	- Refund
	- Outstanding amount
- Kept financial calculations authoritative on the backend.
- Added repeatable acceptance-test date generation so persistent SQLite demo records do not make tests flaky.

## Entry 9 - Active-loan transfer twist

- Implemented `POST /api/borrowings/:id/transfer`.
- Added operator transfer action and confirmation modal.
- Validated that the source loan is active.
- Validated that the target borrower exists and is different from the current borrower.
- Enforced the target borrower's three-active-loan limit.
- Updated only `borrower_id` during transfer.
- Preserved the original equipment unit, borrow date, due date, deposit, status, and availability.
- Added automated coverage proving the transfer invariants.

## Entry 10 - Interactive dashboard improvements

- Removed the visible back button from the header while retaining browser history behavior internally.
- Made dashboard KPI cards clickable:
	- Total units opens Equipment
	- Available units opens Availability
	- Borrowed units opens Borrowings
	- Overdue returns opens Borrowings
- Added a dashboard refresh action.
- Added a live Room Pulse section with equipment availability bars.
- Added hover states and direct navigation to make the dashboard more interactive.

## Entry 11 - Documentation and source archive

- Rewrote `README.md` in a formal structure covering overview, features, architecture, setup, API, business rules, testing, troubleshooting, and limitations.
- Rewrote `REASONING.md` with interpretation, assumptions, schema decisions, availability logic, borrowing logic, return logic, transfer invariants, UX decisions, validation, test evidence, trade-offs, and future improvements.
- Created `AV-Room-Management-source.zip` containing source files and documentation while excluding dependencies, local SQLite data, and generated build output.

## Validation history

The final backend acceptance suite contains five passing workflows:

1. API health and seeded equipment
2. Borrower creation and availability
3. Three-loan limit and fourth-loan rejection
4. Late return, refund floor, outstanding balance, and duplicate-return rejection
5. Active-loan transfer with preserved unit, due date, status, and availability

The frontend production build has also passed after the final feature and documentation updates. Source diagnostics were clean for the touched frontend and backend files.

## Published commits

- `5cc6ac4` - Build AV room equipment rental system
- `932fd57` - Add active loan transfer workflow
- `5253fd5` - Improve dashboard interactions and navigation
- `267f8b9` - Simplify current page breadcrumb
- `a6cc1d4` - Document final AV room system

## Entry 12 - Final regression fixes

- Replaced equipment list, equipment detail, and dashboard reliance on the cached `equipment_units.status` value with live active-borrowing date-range calculations.
- Added borrower email-format validation to the backend.
- Changed borrower creation to use an `onBorrowerCreated` callback and immutable parent state updates instead of mutating a prop array.
- Replaced the hardcoded dashboard date with a dynamically formatted current date.
- Added search and overdue-only filtering to the operator Borrowings page.
- Added acceptance coverage for malformed email, future bookings not changing current availability, and transfer rejection at the borrower limit.
- Final regression suite result: 8 tests passed.

## Entry 13 - Backend query hygiene and edge cases

- Replaced server-clock date interpolation in live equipment status SQL with bound query parameters.
- Added an explicit invalid equipment-ID validation response for `/api/equipment/:id`.
- Wrapped live availability aggregation with `COALESCE` so equipment with zero physical units reports `0` instead of `null`.
- Added acceptance coverage for malformed equipment IDs.
- Re-ran the eight-test backend suite and frontend production build successfully.

## Future log entries

Append future work using this format:

```markdown
## Entry N - YYYY-MM-DD - Short title

- Change made
- Files or features affected
- Validation performed
- Commit or deployment reference
```