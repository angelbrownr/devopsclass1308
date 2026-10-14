// End-to-end test: runs against a REAL running container (BASE_URL), not the in-process app.
const { test } = require('node:test');
const assert = require('node:assert');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const json = (method, url, body) =>
  fetch(BASE_URL + url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

test('full todo lifecycle through the running container', async () => {
  // health + UI served
  assert.strictEqual((await fetch(`${BASE_URL}/health`)).status, 200);
  const page = await fetch(BASE_URL + '/');
  assert.match(await page.text(), /Todo App/);

  // create
  const created = await json('POST', '/api/todos', { title: 'e2e todo' });
  assert.strictEqual(created.status, 201);
  const todo = await created.json();

  // appears in list
  const list = await (await json('GET', '/api/todos')).json();
  assert.ok(list.some((t) => t.id === todo.id && t.title === 'e2e todo'));

  // toggle
  const toggled = await (await json('PUT', `/api/todos/${todo.id}/toggle`)).json();
  assert.strictEqual(toggled.done, true);

  // delete
  assert.strictEqual((await json('DELETE', `/api/todos/${todo.id}`)).status, 204);
  const after = await (await json('GET', '/api/todos')).json();
  assert.ok(!after.some((t) => t.id === todo.id));
});
