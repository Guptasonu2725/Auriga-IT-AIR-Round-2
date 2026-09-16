import express from 'express';
import cors from 'cors';
import db, { seedDatabase } from './database/database.js';

seedDatabase();
const app = express();
const PORT = process.env.PORT || 4000;
const MAX_ACTIVE_BORROWINGS = 3;
app.use(cors());
app.use(express.json());

const today = () => new Date().toISOString().slice(0, 10);
const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const error = (message, status = 400) => Object.assign(new Error(message), { status });
const equipmentSelect = `SELECT e.*, COUNT(u.id) AS total_units, SUM(CASE WHEN u.status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available_units FROM equipment e LEFT JOIN equipment_units u ON u.equipment_id = e.id`;

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/settings', (_req, res) => res.json({ maxActiveBorrowings: MAX_ACTIVE_BORROWINGS }));

app.get('/api/equipment', (_req, res) => {
  const rows = db.prepare(`${equipmentSelect} GROUP BY e.id ORDER BY e.name`).all();
  res.json(rows);
});
app.get('/api/equipment/:id', (req, res, next) => {
  try {
    const item = db.prepare(`${equipmentSelect} WHERE e.id = ? GROUP BY e.id`).get(Number(req.params.id));
    if (!item) throw error('Equipment not found', 404);
    item.units = db.prepare('SELECT * FROM equipment_units WHERE equipment_id = ? ORDER BY unit_code').all(item.id);
    res.json(item);
  } catch (err) { next(err); }
});
app.get('/api/equipment/:id/availability', (req, res, next) => {
  try {
    const equipmentId = Number(req.params.id);
    const startDate = req.query.startDate || today();
    const endDate = req.query.endDate || startDate;
    if (!Number.isInteger(equipmentId)) throw error('Invalid equipment ID');
    if (!validDate(startDate) || !validDate(endDate) || startDate > endDate) throw error('Start date and end date must be valid, and end date cannot be before start date');
    const equipment = db.prepare('SELECT * FROM equipment WHERE id = ?').get(equipmentId);
    if (!equipment) throw error('Equipment not found', 404);
    const units = db.prepare(`SELECT u.* FROM equipment_units u WHERE u.equipment_id = ? AND NOT EXISTS (SELECT 1 FROM borrowings b WHERE b.equipment_unit_id = u.id AND b.status = 'ACTIVE' AND b.borrow_date <= ? AND b.due_date >= ?) ORDER BY u.unit_code`).all(equipmentId, endDate, startDate);
    const total = db.prepare('SELECT COUNT(*) AS count FROM equipment_units WHERE equipment_id = ?').get(equipmentId).count;
    res.json({ equipment, startDate, endDate, totalUnits: total, availableUnits: units.length, units });
  } catch (err) { next(err); }
});

app.get('/api/borrowers', (_req, res) => res.json(db.prepare('SELECT * FROM borrowers ORDER BY name').all()));
app.post('/api/borrowers', (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    if (!name?.trim() || !email?.trim() || !phone?.trim()) throw error('Name, email, and phone are required');
    const result = db.prepare('INSERT INTO borrowers (name, email, phone) VALUES (?, ?, ?)').run(name.trim(), email.trim(), phone.trim());
    res.status(201).json(db.prepare('SELECT * FROM borrowers WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) { next(err.code === 'SQLITE_CONSTRAINT_UNIQUE' ? error('A borrower with this email already exists') : err); }
});

const borrowingQuery = `SELECT b.*, br.name AS borrower_name, br.email AS borrower_email, e.name AS equipment_name, e.category, u.unit_code, e.late_fee_per_day FROM borrowings b JOIN borrowers br ON br.id = b.borrower_id JOIN equipment_units u ON u.id = b.equipment_unit_id JOIN equipment e ON e.id = u.equipment_id`;
app.get('/api/borrowings', (req, res) => {
  const where = req.query.status === 'active' ? " WHERE b.status = 'ACTIVE'" : '';
  res.json(db.prepare(`${borrowingQuery}${where} ORDER BY b.status = 'ACTIVE' DESC, b.due_date ASC, b.id DESC`).all());
});
app.get('/api/borrowings/active', (_req, res) => res.json(db.prepare(`${borrowingQuery} WHERE b.status = 'ACTIVE' ORDER BY b.due_date`).all()));

app.post('/api/borrowings', (req, res, next) => {
  try {
    const { borrowerId, equipmentId, borrowDate = today(), dueDate } = req.body;
    if (!Number.isInteger(Number(borrowerId)) || !Number.isInteger(Number(equipmentId))) throw error('Valid borrower and equipment are required');
    if (!validDate(borrowDate) || !validDate(dueDate) || dueDate < borrowDate) throw error('Borrow date and due date must be valid, and due date cannot be before borrow date');
    const borrower = db.prepare('SELECT * FROM borrowers WHERE id = ?').get(borrowerId);
    if (!borrower) throw error('Borrower not found', 404);
    const equipment = db.prepare('SELECT * FROM equipment WHERE id = ?').get(equipmentId);
    if (!equipment) throw error('Equipment not found', 404);
    const activeCount = db.prepare("SELECT COUNT(*) AS count FROM borrowings WHERE borrower_id = ? AND status = 'ACTIVE'").get(borrowerId).count;
    if (activeCount >= MAX_ACTIVE_BORROWINGS) throw error(`Borrowing limit reached. A borrower can have at most ${MAX_ACTIVE_BORROWINGS} active items`);
    const unit = db.prepare(`SELECT u.* FROM equipment_units u WHERE u.equipment_id = ? AND NOT EXISTS (SELECT 1 FROM borrowings b WHERE b.equipment_unit_id = u.id AND b.status = 'ACTIVE' AND b.borrow_date <= ? AND b.due_date >= ?) ORDER BY u.unit_code LIMIT 1`).get(equipmentId, dueDate, borrowDate);
    if (!unit) throw error('No unit is available for the selected date range');
    const borrow = db.transaction(() => {
      const result = db.prepare('INSERT INTO borrowings (borrower_id, equipment_unit_id, borrow_date, due_date, deposit_amount) VALUES (?, ?, ?, ?, ?)').run(borrowerId, unit.id, borrowDate, dueDate, equipment.deposit_amount);
      if (borrowDate <= today() && dueDate >= today()) db.prepare("UPDATE equipment_units SET status = 'BORROWED' WHERE id = ?").run(unit.id);
      return db.prepare(`${borrowingQuery} WHERE b.id = ?`).get(result.lastInsertRowid);
    })();
    res.status(201).json(borrow);
  } catch (err) { next(err); }
});

app.post('/api/borrowings/:id/transfer', (req, res, next) => {
  try {
    const borrowingId = Number(req.params.id);
    const newBorrowerId = Number(req.body.newBorrowerId);
    if (!Number.isInteger(borrowingId) || !Number.isInteger(newBorrowerId)) throw error('Valid borrowing and borrower IDs are required');
    const borrowing = db.prepare(`${borrowingQuery} WHERE b.id = ?`).get(borrowingId);
    if (!borrowing) throw error('Borrowing not found', 404);
    if (borrowing.status !== 'ACTIVE') throw error('Only active borrowings can be transferred');
    if (borrowing.borrower_id === newBorrowerId) throw error('The new borrower must be different from the current borrower');
    const newBorrower = db.prepare('SELECT * FROM borrowers WHERE id = ?').get(newBorrowerId);
    if (!newBorrower) throw error('New borrower not found', 404);
    const activeCount = db.prepare("SELECT COUNT(*) AS count FROM borrowings WHERE borrower_id = ? AND status = 'ACTIVE'").get(newBorrowerId).count;
    if (activeCount >= MAX_ACTIVE_BORROWINGS) throw error(`Transfer would exceed the ${MAX_ACTIVE_BORROWINGS}-item borrowing limit`);
    const transferred = db.transaction(() => {
      db.prepare("UPDATE borrowings SET borrower_id = ? WHERE id = ? AND status = 'ACTIVE'").run(newBorrowerId, borrowingId);
      return db.prepare(`${borrowingQuery} WHERE b.id = ?`).get(borrowingId);
    })();
    res.json(transferred);
  } catch (err) { next(err); }
});

app.post('/api/borrowings/:id/return', (req, res, next) => {
  try {
    const borrowing = db.prepare(`${borrowingQuery} WHERE b.id = ?`).get(Number(req.params.id));
    if (!borrowing) throw error('Borrowing not found', 404);
    if (borrowing.status !== 'ACTIVE') throw error('This borrowing has already been returned');
    const returnedDate = req.body.returnedDate || today();
    if (!validDate(returnedDate)) throw error('Return date must be a valid date');
    if (returnedDate < borrowing.borrow_date) throw error('Return date cannot be before borrow date');
    const lateDays = Math.max(0, Math.floor((Date.parse(`${returnedDate}T00:00:00Z`) - Date.parse(`${borrowing.due_date}T00:00:00Z`)) / 86400000));
    const lateFee = lateDays * borrowing.late_fee_per_day;
    const refundAmount = Math.max(0, borrowing.deposit_amount - lateFee);
    const outstandingAmount = Math.max(0, lateFee - borrowing.deposit_amount);
    const returned = db.transaction(() => {
      db.prepare("UPDATE borrowings SET returned_date = ?, late_fee = ?, refund_amount = ?, outstanding_amount = ?, status = 'RETURNED' WHERE id = ? AND status = 'ACTIVE'").run(returnedDate, lateFee, refundAmount, outstandingAmount, borrowing.id);
      db.prepare("UPDATE equipment_units SET status = 'AVAILABLE' WHERE id = ?").run(borrowing.equipment_unit_id);
      return db.prepare(`${borrowingQuery} WHERE b.id = ?`).get(borrowing.id);
    })();
    res.json({ ...returned, lateDays });
  } catch (err) { next(err); }
});

app.get('/api/dashboard', (_req, res) => {
  const totals = db.prepare(`SELECT COUNT(u.id) AS totalUnits, SUM(CASE WHEN u.status = 'AVAILABLE' THEN 1 ELSE 0 END) AS availableUnits, SUM(CASE WHEN u.status = 'BORROWED' THEN 1 ELSE 0 END) AS borrowedUnits FROM equipment_units u`).get();
  const overdue = db.prepare("SELECT COUNT(*) AS count FROM borrowings WHERE status = 'ACTIVE' AND due_date < ?").get(today()).count;
  const recent = db.prepare(`${borrowingQuery} ORDER BY b.id DESC LIMIT 6`).all();
  res.json({ ...totals, overdueBorrowings: overdue, recentActivity: recent });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Unexpected server error' });
});

app.listen(PORT, () => console.log(`AV Room API running on http://localhost:${PORT}`));
