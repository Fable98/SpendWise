import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';

const request = supertest(app);
const testUser = {
  name: 'Budget Test',
  email: 'budgettest@spendwise.test',
  password: 'Password123',
};
let cookie: string[];
let expenseCategoryId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: testUser.email } });
  const reg = await request.post('/api/v1/auth/register').send(testUser);
  cookie = reg.headers['set-cookie'] as string[];

  const cats = await request.get('/api/v1/categories').set('Cookie', cookie);
  expenseCategoryId = cats.body.data.find((c: { type: string }) => c.type === 'EXPENSE').id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: testUser.email } });
});

describe('Budgets', () => {
  it('creates a budget', async () => {
    const res = await request.post('/api/v1/budgets').set('Cookie', cookie).send({
      categoryId: expenseCategoryId,
      amount: '500.00',
      month: 1,
      year: 2025,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe('500.00');
  });

  it('prevents duplicate monthly budget', async () => {
    const payload = {
      categoryId: expenseCategoryId,
      amount: '300.00',
      month: 2,
      year: 2025,
    };
    await request.post('/api/v1/budgets').set('Cookie', cookie).send(payload);
    const res = await request.post('/api/v1/budgets').set('Cookie', cookie).send(payload);
    expect(res.status).toBe(409);
  });

  it('calculates spending against budget', async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Clean up existing budget for this month
    const user = await prisma.user.findUnique({ where: { email: testUser.email } });
    if (user) {
      await prisma.budget.deleteMany({
        where: { userId: user.id, month, year, categoryId: expenseCategoryId },
      });
    }

    await request.post('/api/v1/budgets').set('Cookie', cookie).send({
      categoryId: expenseCategoryId,
      amount: '1000.00',
      month,
      year,
    });

    await request.post('/api/v1/transactions').set('Cookie', cookie).send({
      amount: '200.00',
      type: 'EXPENSE',
      categoryId: expenseCategoryId,
      transactionDate: new Date().toISOString(),
    });

    const budgetsRes = await request
      .get(`/api/v1/budgets?month=${month}&year=${year}`)
      .set('Cookie', cookie);
    expect(budgetsRes.status).toBe(200);
    const budget = budgetsRes.body.data.find(
      (b: { categoryId: string }) => b.categoryId === expenseCategoryId,
    );
    expect(budget).toBeDefined();
    expect(parseFloat(budget.spent)).toBeGreaterThanOrEqual(200);
    expect(parseFloat(budget.remaining)).toBeLessThanOrEqual(800);
  });
});
