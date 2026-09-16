import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.API_URL || 'http://localhost:4000/api';
const request = async (path, options) => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  const body = await response.json();
  return { response, body };
};

const uniqueEmail = `acceptance-${Date.now()}@college.edu`;
let borrower;
const equipmentId = 4;
const dates = [
  ['2200-01-01', '2200-01-03'],
  ['2200-01-04', '2200-01-06'],
  ['2200-01-07', '2200-01-09'],
];
const borrowings = [];

test('API health and seeded equipment are available', async () => {
  const health = await request('/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.body.status, 'ok');
  const equipment = await request('/equipment');
  assert.equal(equipment.response.status, 200);
  assert.equal(equipment.body.some((item) => item.id === equipmentId), true);
});

test('creates a borrower and reports date-range availability', async () => {
  const created = await request('/borrowers', {
    method: 'POST',
    body: JSON.stringify({ name: 'Acceptance Tester', email: uniqueEmail, phone: '+91 90000 00000' }),
  });
  assert.equal(created.response.status, 201);
  borrower = created.body;
  const availability = await request(`/equipment/${equipmentId}/availability?startDate=2200-01-01&endDate=2200-01-09`);
  assert.equal(availability.response.status, 200);
  assert.equal(availability.body.totalUnits, 3);
  assert.equal(availability.body.availableUnits, 3);
});

test('allows three active borrowings and blocks the fourth', async () => {
  for (const [borrowDate, dueDate] of dates) {
    const result = await request('/borrowings', {
      method: 'POST',
      body: JSON.stringify({ borrowerId: borrower.id, equipmentId, borrowDate, dueDate }),
    });
    assert.equal(result.response.status, 201);
    borrowings.push(result.body);
  }
  const blocked = await request('/borrowings', {
    method: 'POST',
    body: JSON.stringify({ borrowerId: borrower.id, equipmentId, borrowDate: '2200-01-10', dueDate: '2200-01-11' }),
  });
  assert.equal(blocked.response.status, 400);
  assert.match(blocked.body.error, /limit/i);
});

test('returns an item with a bounded refund and rejects duplicate return', async () => {
  const returned = await request(`/borrowings/${borrowings[0].id}/return`, {
    method: 'POST',
    body: JSON.stringify({ returnedDate: '2300-01-01' }),
  });
  assert.equal(returned.response.status, 200);
  assert.equal(returned.body.status, 'RETURNED');
  assert.equal(returned.body.refund_amount, 0);
  assert.ok(returned.body.outstanding_amount > 0);

  const duplicate = await request(`/borrowings/${borrowings[0].id}/return`, {
    method: 'POST',
    body: JSON.stringify({ returnedDate: '2300-01-01' }),
  });
  assert.equal(duplicate.response.status, 400);
  assert.match(duplicate.body.error, /already been returned/i);
});
