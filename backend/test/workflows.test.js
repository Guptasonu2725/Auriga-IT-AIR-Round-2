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
let transferTarget;
let limitTarget;
const equipmentId = 4;
const testYear = 2500 + (Date.now() % 300);
const dates = [
  [`${testYear}-01-01`, `${testYear}-01-03`],
  [`${testYear}-01-04`, `${testYear}-01-06`],
  [`${testYear}-01-07`, `${testYear}-01-09`],
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

test('rejects malformed borrower email', async () => {
  const malformed = await request('/borrowers', {
    method: 'POST',
    body: JSON.stringify({ name: 'Invalid Email', email: 'not-an-email', phone: '+91 90000 00001' }),
  });
  assert.equal(malformed.response.status, 400);
  assert.match(malformed.body.error, /valid email/i);
});

test('creates a borrower and reports date-range availability', async () => {
  const created = await request('/borrowers', {
    method: 'POST',
    body: JSON.stringify({ name: 'Acceptance Tester', email: uniqueEmail, phone: '+91 90000 00000' }),
  });
  assert.equal(created.response.status, 201);
  borrower = created.body;
  const availability = await request(`/equipment/${equipmentId}/availability?startDate=${testYear}-01-01&endDate=${testYear}-01-09`);
  assert.equal(availability.response.status, 200);
  assert.equal(availability.body.totalUnits, 3);
  assert.equal(availability.body.availableUnits, 3);
  const target = await request('/borrowers', {
    method: 'POST',
    body: JSON.stringify({ name: 'Transfer Target', email: `transfer-${Date.now()}@college.edu`, phone: '+91 91111 11111' }),
  });
  assert.equal(target.response.status, 201);
  transferTarget = target.body;
  const limited = await request('/borrowers', {
    method: 'POST',
    body: JSON.stringify({ name: 'Limit Target', email: `limit-${Date.now()}@college.edu`, phone: '+91 92222 22222' }),
  });
  assert.equal(limited.response.status, 201);
  limitTarget = limited.body;

});

test('future bookings do not reduce current availability counts', async () => {
  const currentDate = new Date().toISOString().slice(0, 10);
  const todayAvailability = await request(`/equipment/${equipmentId}/availability?startDate=${currentDate}&endDate=${currentDate}`);
  const beforeEquipment = await request('/equipment');
  const beforeDashboard = await request('/dashboard');
  const futureBooking = await request('/borrowings', {
    method: 'POST',
    body: JSON.stringify({ borrowerId: transferTarget.id, equipmentId, borrowDate: `${testYear + 2}-02-01`, dueDate: `${testYear + 2}-02-03` }),
  });
  assert.equal(futureBooking.response.status, 201);
  const afterFutureAvailability = await request(`/equipment/${equipmentId}/availability?startDate=${currentDate}&endDate=${currentDate}`);
  assert.equal(afterFutureAvailability.body.availableUnits, todayAvailability.body.availableUnits);
  const afterEquipment = await request('/equipment');
  const afterDashboard = await request('/dashboard');
  const beforeItem = beforeEquipment.body.find((item) => item.id === equipmentId);
  const afterItem = afterEquipment.body.find((item) => item.id === equipmentId);
  assert.equal(afterItem.available_units, beforeItem.available_units);
  assert.equal(afterDashboard.body.availableUnits, beforeDashboard.body.availableUnits);
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
    body: JSON.stringify({ borrowerId: borrower.id, equipmentId, borrowDate: `${testYear}-01-10`, dueDate: `${testYear}-01-11` }),
  });
  assert.equal(blocked.response.status, 400);
  assert.match(blocked.body.error, /limit/i);

});

test('blocks a transfer when the target already has three active loans', async () => {
  for (const [equipment, borrowDate, dueDate] of [[1, `${testYear}-01-12`, `${testYear}-01-13`], [2, `${testYear}-01-12`, `${testYear}-01-13`], [3, `${testYear}-01-12`, `${testYear}-01-13`]]) {
    const result = await request('/borrowings', {
      method: 'POST',
      body: JSON.stringify({ borrowerId: limitTarget.id, equipmentId: equipment, borrowDate, dueDate }),
    });
    assert.equal(result.response.status, 201);
  }
  const blockedTransfer = await request(`/borrowings/${borrowings[1].id}/transfer`, {
    method: 'POST',
    body: JSON.stringify({ newBorrowerId: limitTarget.id }),
  });
  assert.equal(blockedTransfer.response.status, 400);
  assert.match(blockedTransfer.body.error, /limit/i);
});

test('returns an item with a bounded refund and rejects duplicate return', async () => {
  const returned = await request(`/borrowings/${borrowings[0].id}/return`, {
    method: 'POST',
    body: JSON.stringify({ returnedDate: `${testYear + 1}-01-01` }),
  });
  assert.equal(returned.response.status, 200);
  assert.equal(returned.body.status, 'RETURNED');
  assert.equal(returned.body.refund_amount, 0);
  assert.ok(returned.body.outstanding_amount > 0);

  const duplicate = await request(`/borrowings/${borrowings[0].id}/return`, {
    method: 'POST',
    body: JSON.stringify({ returnedDate: `${testYear + 1}-01-01` }),
  });
  assert.equal(duplicate.response.status, 400);
  assert.match(duplicate.body.error, /already been returned/i);
});

test('transfers an active loan without changing its unit or due date', async () => {
  const original = borrowings[1];
  const beforeAvailability = await request(`/equipment/4/availability?startDate=${testYear}-01-04&endDate=${testYear}-01-06`);
  const result = await request(`/borrowings/${original.id}/transfer`, {
    method: 'POST',
    body: JSON.stringify({ newBorrowerId: transferTarget.id }),
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.borrower_id, transferTarget.id);
  assert.equal(result.body.equipment_unit_id, original.equipment_unit_id);
  assert.equal(result.body.due_date, original.due_date);
  assert.equal(result.body.status, 'ACTIVE');
  const afterAvailability = await request(`/equipment/4/availability?startDate=${testYear}-01-04&endDate=${testYear}-01-06`);
  assert.equal(afterAvailability.body.availableUnits, beforeAvailability.body.availableUnits);
});
