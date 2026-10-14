const request = require('supertest');
const app = require('../../src/app');

describe('todo API', () => {
  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('POST rejects empty title', async () => {
    const res = await request(app).post('/api/todos').send({ title: '  ' });
    expect(res.status).toBe(400);
  });

  test('POST creates a todo', async () => {
    const res = await request(app).post('/api/todos').send({ title: 'write tests' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'write tests', done: false });
  });
});
