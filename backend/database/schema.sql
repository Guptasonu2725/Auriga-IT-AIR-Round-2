PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS borrowers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  deposit_amount REAL NOT NULL CHECK (deposit_amount >= 0),
  late_fee_per_day REAL NOT NULL CHECK (late_fee_per_day >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS equipment_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  unit_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BORROWED'))
);

CREATE TABLE IF NOT EXISTS borrowings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  borrower_id INTEGER NOT NULL REFERENCES borrowers(id),
  equipment_unit_id INTEGER NOT NULL REFERENCES equipment_units(id),
  borrow_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  returned_date TEXT,
  deposit_amount REAL NOT NULL CHECK (deposit_amount >= 0),
  late_fee REAL NOT NULL DEFAULT 0 CHECK (late_fee >= 0),
  refund_amount REAL,
  outstanding_amount REAL NOT NULL DEFAULT 0 CHECK (outstanding_amount >= 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RETURNED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (due_date >= borrow_date)
);

CREATE INDEX IF NOT EXISTS idx_borrowings_active_unit ON borrowings(equipment_unit_id, status);
CREATE INDEX IF NOT EXISTS idx_borrowings_dates ON borrowings(borrow_date, due_date);
