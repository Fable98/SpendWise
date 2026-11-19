import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';

const request = supertest(app);
const testUser = {
  name: 'Analytics Test',
  email: 'analyticstest@spendwise.test',
  password: 'Password123',
};
let cookie: string[];
let expenseCategoryId: string;
let incomeCategoryId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: testUser.email } });
  const reg = await request.post('/api/v1/auth/register').send(testUser);
  cookie = reg.headers['set-cookie'] as string[];

  const cats = await request.get('/api/v1/categories').set('Cookie', cookie);
  expenseCategoryId = cats.body.data.find((c: { type: string }) => c.type === 'EXPENSE').id;
  incomeCategoryId = cats.body.data.find((c: { type: string }) => c.type === 'INCOME').id;

  const now = new Date().toISOString();
  await request.post('/api/v1/transactions').set('Cookie', cookie).send({
    amount: '5000.00',
    type: 'INCOME',
    categoryId: incomeCategoryId,
    transactionDate: now,
  });
  await request.post('/api/v1/transactions').set('Cookie', cookie).send({
    amount: '1500.00',
    type: 'EXPENSE',
    categoryId: expenseCategoryId,
    transactionDate: now,
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: testUser.email } });
});

describe('Analytics', () => {
  it('returns correct dashboard summary', async () => {
    const now = new Date();
    const res = await request
      .get(
        `/api/v1/analytics/dashboard?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
      )
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(parseFloat(res.body.data.totalIncome)).toBeGreaterThanOrEqual(5000);
    expect(parseFloat(res.body.data.totalExpenses)).toBeGreaterThanOrEqual(1500);
    expect(parseFloat(res.body.data.balance)).toBeGreaterThan(0);
  });

  it('calculates balance as income minus expenses', async () => {
    const res = await request.get('/api/v1/analytics/dashboard').set('Cookie', cookie);
    expect(res.status).toBe(200);
    const { totalIncome, totalExpenses, balance } = res.body.data;
    const expected = (parseFloat(totalIncome) - parseFloat(totalExpenses)).toFixed(2);
    expect(parseFloat(balance).toFixed(2)).toBe(expected);
  });

  it('returns monthly trend', async () => {
    const res = await request
      .get('/api/v1/analytics/monthly-trend?months=3')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
  });

  it('returns category breakdown', async () => {
    const res = await request
      .get('/api/v1/analytics/category-breakdown?type=EXPENSE')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('total');
    }
  });
});
