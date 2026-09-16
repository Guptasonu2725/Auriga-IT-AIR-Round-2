# Product and Engineering Reasoning

## 1. Problem Interpretation

The paper register creates four connected problems: staff cannot identify the physical unit that is out, future bookings can overlap, returns are not enforced, and deposits and late fees are difficult to calculate consistently. The system therefore treats the physical equipment unit as the availability resource and treats the equipment type as the owner of reusable lending policy values.

The product has two audiences. Operators need a control workspace for inventory and loan administration. Students need a simpler self-service portal for discovery, availability, and borrowing. The role selector separates these workflows in the frontend while keeping the backend API shared.

## 2. Functional Requirements

The implementation covers:

- Equipment types and multiple physical units
- Unit-level current status and date-range availability
- Borrower records
- Borrowing creation and automatic unit assignment
- Due dates and date validation
- Deposits copied onto each borrowing
- Per-day late fees
- Returns, refund calculation, and outstanding balances
- A maximum of three active borrowings per borrower
- Active-loan transfer from one borrower to another
- Operator dashboard and operational borrowing views
- Student browsing, availability, borrowing, and personal history
- Clear loading, error, empty, and success states

The transfer requirement is treated as a mutation of responsibility, not a new booking. The loan remains the same loan and therefore retains its unit, dates, deposit, and status.

## 3. Non-Functional Requirements

The system should be easy to run in GitHub Codespaces, should use a durable local database, should keep business calculations on the server, and should provide a responsive interface for desk and student use. The implementation favors a small number of dependable dependencies and a straightforward Express/React boundary over a larger framework.

## 4. Assumptions

- The maximum number of active loans is 3, as required by the challenge.
- Dates represent calendar days rather than timestamps. Due dates are inclusive.
- An active booking uses a closed date interval for overlap detection.
- A future non-overlapping booking may reuse a physical unit after an earlier booking ends.
- The first available unit in unit-code order is assigned automatically.
- A transfer target must already exist as a borrower.
- A transfer cannot move a loan to the current borrower and cannot exceed the target's active-loan limit.
- Deposits are recorded financial values; no payment gateway is assumed.
- The sign-in screen and role selector are a local demonstration because the original brief explicitly removed authentication from the required scope.
- The current student portal uses the selected borrower record as the student's identity. Production deployment would replace this with authenticated user-to-borrower mapping.

## 5. Architecture

The React client renders operator and student workflows. Axios sends requests to the same-origin `/api` path; Vite proxies that path to the Express backend during development. The server validates IDs, dates, limits, availability, transfer rules, and return calculations before modifying SQLite.

`backend/server.js` contains the REST routes and transaction boundaries. `backend/database/database.js` opens SQLite, enables foreign keys and WAL mode, applies the schema, and seeds initial records. `backend/database/schema.sql` defines the relational tables and constraints. The frontend keeps presentation state, form state, and navigation state but does not decide the authoritative deposit, late-fee, or availability result.

## 6. Database Design

### `borrowers`

Stores borrower name, email, phone, and creation time. Email is unique case-insensitively.

### `equipment`

Stores equipment name, category, description, deposit amount, and late-fee rate.

### `equipment_units`

Stores each physical unit, its parent equipment type, unit code, and current status. Unit codes are unique.

### `borrowings`

Stores borrower, physical unit, borrow date, due date, returned date, copied deposit, calculated late fee, refund, outstanding amount, status, and creation time. Historical monetary values remain stable even if an equipment policy changes later.

Foreign keys prevent orphan records. Indexes support active-unit and date-range queries. A database transaction is used for borrowing, return, and transfer mutations.

## 7. Availability Logic

For a requested interval `[startDate, endDate]`, a unit is available when no active borrowing overlaps it. Two intervals overlap when:

```text
existing.borrow_date <= requested.endDate
AND existing.due_date >= requested.startDate
```

The availability endpoint returns the equipment type, requested dates, total unit count, available unit count, and available unit codes. The same overlap query is executed again during checkout so a stale frontend cannot create a conflicting booking.

## 8. Borrowing Logic

Checkout validates the borrower, equipment, dates, active-loan count, and unit availability. It inserts the borrowing with the equipment deposit copied into the record. If the booking covers the current day, the assigned unit is marked `BORROWED`; future bookings do not incorrectly change current status.

The borrowing limit is checked before assignment. A failed request returns a useful client error and does not create a partial record.

## 9. Return and Financial Logic

Return accepts an actual return date and requires the borrowing to be active. The server calculates:

```text
lateDays = max(0, returnDate - dueDate)
lateFee = lateDays * lateFeePerDay
refund = max(0, depositAmount - lateFee)
outstandingAmount = max(0, lateFee - depositAmount)
```

The borrowing is marked `RETURNED` and the physical unit is released in the same transaction. A second return is rejected. Early and on-time returns have zero late fee.

## 10. Transfer Logic

The transfer endpoint accepts an active borrowing ID and a new borrower ID. It validates that:

- The borrowing exists.
- The borrowing is active.
- The target borrower exists.
- The target differs from the current borrower.
- The target has fewer than three active borrowings.

The transaction updates only `borrowings.borrower_id`. It does not update `equipment_unit_id`, `borrow_date`, `due_date`, `deposit_amount`, `status`, or `equipment_units.status`. This preserves the exact loan and ensures availability is unaffected. The automated test compares availability before and after transfer.

## 11. User Experience Design

The operator interface prioritizes scanning and repeated desk actions. The dashboard provides clickable KPI cards, a room-pulse availability section, quick actions, recent activity, and a refresh control. The operator can administer returns and transfers from the borrowing table.

The student interface intentionally excludes operator-only controls. It presents equipment cards, date-aware availability, a request form, deposit and fee information, and the selected student's borrowing history. Both experiences are responsive and include retry, validation, empty, and success states.

## 12. Validation and Error Handling

The API handles invalid IDs, missing fields, malformed dates, backwards date ranges, missing borrowers, missing equipment, unavailable units, overlapping bookings, borrowing-limit violations, invalid transfers, duplicate returns, and database uniqueness errors. HTTP status codes distinguish successful creation, not-found records, invalid requests, and server errors.

## 13. Test Evidence

The backend acceptance suite is run with `npm test` while the API is available. It currently verifies five workflows:

1. API health and seeded equipment
2. Borrower creation and date-range availability
3. Three-loan limit and fourth-loan rejection
4. Late return, refund floor, outstanding balance, and duplicate-return rejection
5. Active-loan transfer with preserved unit, due date, status, and availability

The frontend is validated with `npm run build` and editor diagnostics on the touched source files.

## 14. Trade-offs and Future Improvements

The MVP does not implement secure authentication, payment processing, outbound reminders, equipment maintenance, or an audit trail. These are deliberate boundaries rather than hidden assumptions. The next highest-value improvements are:

- Real authentication with operator/student permissions
- Mapping authenticated students to one borrower record
- Transfer and return audit history
- Email or in-app overdue reminders
- Approval and cancellation workflows for student requests
- Equipment damage and maintenance records
- Reports and CSV export
- Configurable policy settings and multi-room support
- PostgreSQL or another managed database for multi-user production deployment
