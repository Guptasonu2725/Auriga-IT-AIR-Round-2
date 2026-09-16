# Product and Engineering Reasoning

## Interpretation

The paper register problem is fundamentally an inventory and scheduling problem, not only a CRUD form. A physical unit is the source of truth for availability; equipment types provide the shared policy values (deposit and late fee). A small operator-facing desk app is sufficient because authentication was explicitly excluded.

## Requirements derived

The app needs inventory, unit-level status, borrowers, date-aware bookings, returns, deposits, late fees, limits, dashboard metrics, and useful validation errors. It also needs to remain usable when no records exist, when no unit is available, and when a return is overdue or duplicated.

## Non-functional requirements

The system should be runnable in Codespaces with two simple processes, use a local durable database, expose predictable REST responses, keep calculations server-side, and work on narrow screens. SQLite is appropriate for a single AV-room desk MVP; foreign keys, constraints, indexes, and transactions protect the important state changes.

## Assumptions

- `MAX_ACTIVE_BORROWINGS` is 3, matching the requested sensible limit.
- Dates are calendar dates, not timestamps; the due date is inclusive.
- A future reservation may use a unit after its current booking ends.
- The first unit code in alphabetical order is assigned automatically.
- Deposits are recorded rather than processed through a payment gateway.
- The operator is trusted; authentication and role management are future concerns.
- The sample seed data is intentionally modest and classroom-oriented.

## Architecture and schema

React renders the operator workflows and calls Axios services. Express validates requests, owns calculations, and uses better-sqlite3 transactions for borrow and return operations. The relational model has `borrowers`, `equipment`, `equipment_units`, and `borrowings`. Borrowings retain the deposit amount and calculated return values so historical records do not change when equipment policy changes.

Foreign keys prevent orphaned relationships. `equipment_units.status` is a fast current-state indicator, while active borrowing date ranges are the authoritative overlap check. Indexes support active-unit and date-range queries.

## Availability logic

For a requested `[startDate, endDate]`, a unit is available when no active borrowing satisfies `borrow_date <= endDate AND due_date >= startDate`. This is the standard closed-interval overlap test. The API returns both the available count and the available unit codes. The same test runs during checkout so the UI cannot create an overlap by racing or being stale.

## Borrowing, return, and money logic

Checkout validates IDs, dates, borrower limit, and an available unit. It inserts the borrowing and marks a currently active unit as borrowed in one transaction. A future booking is allowed to reuse a unit after an earlier booking ends without incorrectly changing its current status.

Return validates that the record is active and that the date is not before checkout. It computes `lateDays = max(0, returnDate - dueDate)`, then multiplies by the equipment rate copied into the query. The refundable amount is `max(0, deposit - lateFee)`, and an amount above the deposit becomes `outstanding_amount`. Return and unit release happen transactionally, preventing a partially updated register.

An operator can transfer an active borrowing to another existing borrower. The transfer transaction updates only `borrower_id`; it deliberately does not touch `equipment_unit_id`, `borrow_date`, `due_date`, deposit, or unit status. The recipient is checked against the same three-active-item limit, and returned loans cannot be transferred.

## Edge cases handled

Invalid IDs, missing required fields, malformed dates, backwards date ranges, unavailable units, overlapping bookings, the three-item limit, duplicate returns, early/on-time returns, late returns, and late fees larger than deposits all return clear errors or bounded financial values. Database constraint failures are converted into useful API responses where relevant.

## Trade-offs and future improvements

The MVP deliberately has no authentication, payment integration, file uploads, audit log, or background notifications. For a larger deployment, add staff accounts and permissions, an explicit booking state, automated overdue reminders, configurable policy settings, pagination, reporting/export, and a database such as PostgreSQL. A production payment workflow would also need payment-provider reconciliation rather than only recording a refund amount.