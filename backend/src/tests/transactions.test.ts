import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';

const request = supertest(app);

const userA = { name: 'User A', email: 'txusera@spendwise.test', password: 'Password123' };
const userB = { name: 'User B', email: 'txuserb@spendwise.test', password: 'Password123' };

let cookieA: string[];
let cookieB: string[];
let expenseCategoryId: string;
let incomeCategoryId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: [userA.email, userB.email] } },
  });

  const regA = await request.post('/api/v1/auth/register').send(userA);
  cookieA = regA.headers['set-cookie'] as string[];

  const regB = await request.post('/api/v1/auth/register').send(userB);
  cookieB = regB.headers['set-cookie'] as string[];

  const cats = await request.get('/api/v1/categories').set('Cookie', cookieA);
  expenseCategoryId = cats.body.data.find((c: { type: string }) => c.type === 'EXPENSE').id;
  incomeCategoryId = cats.body.data.find((c: { type: string }) => c.type === 'INCOME').id;
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: [userA.email, userB.email] } },
  });
});

describe('Transactions - CRUD', () => {
  it('creates an expense transaction', async () => {
    const res = await request
      .post('/api/v1/transactions')
      .set('Cookie', cookieA)
      .send({
        amount: '50.00',
        type: 'EXPENSE',
        categoryId: expenseCategoryId,
        description: 'Lunch',
        transactionDate: new Date().toISOString(),
      });
    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe('50.00');
    expect(res.body.data.type).toBe('EXPENSE');
  });

  it('creates an income transaction', async () => {
    const res = await request
      .post('/api/v1/transactions')
      .set('Cookie', cookieA)
      .send({
        amount: '1000.00',
        type: 'INCOME',
        categoryId: incomeCategoryId,
        description: 'Salary',
        transactionDate: new Date().toISOString(),
      });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('INCOME');
  });

  it('updates a transaction', async () => {
    const createRes = await request
      .post('/api/v1/transactions')
      .set('Cookie', cookieA)
      .send({
        amount: '100.00',
        type: 'EXPENSE',
        categoryId: expenseCategoryId,
        transactionDate: new Date().toISOString(),
      });
    const id = createRes.body.data.id;

    const updateRes = await request
      .patch(`/api/v1/transactions/${id}`)
      .set('Cookie', cookieA)
      .send({ amount: '150.00' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.amount).toBe('150.00');
  });

  it('deletes a transaction', async () => {
    const createRes = await request
      .post('/api/v1/transactions')
      .set('Cookie', cookieA)
      .send({
        amount: '25.00',
        type: 'EXPENSE',
        categoryId: expenseCategoryId,
        transactionDate: new Date().toISOString(),
      });
    const id = createRes.body.data.id;

    const deleteRes = await request.delete(`/api/v1/transactions/${id}`).set('Cookie', cookieA);
    expect(deleteRes.status).toBe(200);

    const getRes = await request.get(`/api/v1/transactions/${id}`).set('Cookie', cookieA);
    expect(getRes.status).toBe(404);
  });

  it('paginates transactions', async () => {
    const res = await request
      .get('/api/v1/transactions?page=1&limit=5')
      .set('Cookie', cookieA);
    expect(res.status).toBe(200);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.limit).toBe(5);
  });

  it('filters by type', async () => {
    const res = await request
      .get('/api/v1/transactions?type=EXPENSE')
      .set('Cookie', cookieA);
    expect(res.status).toBe(200);
    expect(res.body.data.every((t: { type: string }) => t.type === 'EXPENSE')).toBe(true);
  });
});

describe('Transactions - Security (IDOR)', () => {
  it('prevents user B from reading user A transactions', async () => {
    const createRes = await request
      .post('/api/v1/transactions')
      .set('Cookie', cookieA)
      .send({
        amount: '99.00',
        type: 'EXPENSE',
        categoryId: expenseCategoryId,
        transactionDate: new Date().toISOString(),
      });
    const id = createRes.body.data.id;

    const res = await request.get(`/api/v1/transactions/${id}`).set('Cookie', cookieB);
    expect(res.status).toBe(404);
  });

  it('prevents user B from deleting user A transactions', async () => {
    const createRes = await request
      .post('/api/v1/transactions')
      .set('Cookie', cookieA)
      .send({
        amount: '77.00',
        type: 'EXPENSE',
        categoryId: expenseCategoryId,
        transactionDate: new Date().toISOString(),
      });
    const id = createRes.body.data.id;

    const res = await request.delete(`/api/v1/transactions/${id}`).set('Cookie', cookieB);
    expect(res.status).toBe(404);
  });

  it('rejects unauthenticated access', async () => {
    const res = await request.get('/api/v1/transactions');
    expect(res.status).toBe(401);
  });
});
