import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.join(directory, '..', 'data');
fs.mkdirSync(dataDirectory, { recursive: true });

const db = new Database(path.join(dataDirectory, 'av-room.sqlite'));
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
const schema = fs.readFileSync(path.join(directory, 'schema.sql'), 'utf8');
db.exec(schema);

export function seedDatabase() {
  const hasEquipment = db.prepare('SELECT COUNT(*) AS count FROM equipment').get().count > 0;
  if (hasEquipment) return;

  const insertEquipment = db.prepare(`INSERT INTO equipment (name, category, description, deposit_amount, late_fee_per_day) VALUES (?, ?, ?, ?, ?)`);
  const insertUnit = db.prepare('INSERT INTO equipment_units (equipment_id, unit_code) VALUES (?, ?)');
  const insertBorrower = db.prepare('INSERT INTO borrowers (name, email, phone) VALUES (?, ?, ?)');
  const seed = db.transaction(() => {
    const items = [
      ['DSLR Camera', 'Cameras', 'Interchangeable-lens camera for productions, events, and student projects.', 2000, 100, ['DSLR-001', 'DSLR-002', 'DSLR-003']],
      ['Projector', 'Display', 'HD classroom projector with HDMI and VGA connectivity.', 3000, 150, ['PROJ-001', 'PROJ-002']],
      ['Microphone', 'Audio', 'Wired handheld microphone for lectures, events, and recording.', 1000, 50, ['MIC-001', 'MIC-002', 'MIC-003', 'MIC-004']],
      ['Tripod', 'Support', 'Stable adjustable tripod for cameras and portable projectors.', 500, 25, ['TRIP-001', 'TRIP-002', 'TRIP-003']]
    ];
    for (const [name, category, description, deposit, lateFee, units] of items) {
      const result = insertEquipment.run(name, category, description, deposit, lateFee);
      for (const code of units) insertUnit.run(result.lastInsertRowid, code);
    }
    insertBorrower.run('Aarav Mehta', 'aarav.mehta@college.edu', '+91 98765 43210');
    insertBorrower.run('Maya Singh', 'maya.singh@college.edu', '+91 98765 12345');
    insertBorrower.run('Kabir Rao', 'kabir.rao@college.edu', '+91 99887 77665');
  });
  seed();
}

export default db;
