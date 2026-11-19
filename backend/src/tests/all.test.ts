/**
 * Consolidated integration test suite.
 * All tests run in a single file so they share the same in-memory session store.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import supertest from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';

const request = supertest(app);

// ─── AUTH ────────────────────────────────────────────────────────────────────

describe('Auth - Registration', () => {
  const testUser = {
    name: 'Auth Test',
    email: 'auth@spendwise.test',
    password: 'Password123',
  };

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@spendwise.test' } } });
  });

  it('registers a new user', async () => {
    const res = await request.post('/api/v1/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testUser.email);
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('rejects duplicate email', async () => {
    await request.post('/api/v1/auth/register').send(testUser);
    const res = await request.post('/api/v1/auth/register').send(testUser);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_EXISTS');
  });

  it('rejects weak password', async () => {
    const res = await request.post('/api/v1/auth/register').send({
      name: 'Weak',
      email: 'weak@spendwise.test',
      password: 'weak',
    });
    expect(res.status).toBe(400);
  });

  it('rejects invalid email', async () => {
    const res = await request.post('/api/v1/auth/register').send({
      name: 'Bad Email',
      email: 'not-an-email',
      password: 'Password123',
    });
    expect(res.status).toBe(400);
  });
});

describe('Auth - Login & Protected Routes', () => {
  const testUser = {
    name: 'Login Test',
    email: 'login@spendwise.test',
    password: 'Password123',
  };
  let cookie: string[];

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    const reg = await request.post('/api/v1/auth/register').send(testUser);
    cookie = reg.headers['set-cookie'] as string[];
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
  });

  it('logs in with valid credentials', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects invalid password', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword1' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects nonexistent user', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@spendwise.test', password: 'Password123' });
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated request to /me', async () => {
    const res = await request.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns current user when authenticated', async () => {
    const res = await request.get('/api/v1/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(testUser.email);
  });
});

// ─── TRANSACTIONS ────────────────────────────────────────────────────────────

describe('Transactions - CRUD & Security', () => {
  const userA = { name: 'TxUserA', email: 'txusera@spendwise.test', password: 'Password123' };
  const userB = { name: 'TxUserB', email: 'txuserb@spendwise.test', password: 'Password123' };
  let cookieA: string[];
  let cookieB: string[];
  let expenseCategoryId: string;
  let incomeCategoryId: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [userA.email, userB.email] } } });

    const regA = await request.post('/api/v1/auth/register').send(userA);
    cookieA = regA.headers['set-cookie'] as string[];

    const regB = await request.post('/api/v1/auth/register').send(userB);
    cookieB = regB.headers['set-cookie'] as string[];

    const cats = await request.get('/api/v1/categories').set('Cookie', cookieA);
    expenseCategoryId = cats.body.data.find((c: { type: string }) => c.type === 'EXPENSE').id;
    incomeCategoryId = cats.body.data.find((c: { type: string }) => c.type === 'INCOME').id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [userA.email, userB.email] } } });
  });

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
    await request.delete(`/api/v1/transactions/${id}`).set('Cookie', cookieA);
    const getRes = await request.get(`/api/v1/transactions/${id}`).set('Cookie', cookieA);
    expect(getRes.status).toBe(404);
  });

  it('paginates transactions', async () => {
    const res = await request
      .get('/api/v1/transactions?page=1&limit=5')
      .set('Cookie', cookieA);
    expect(res.status).toBe(200);
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

  // IDOR security
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
    const res = await supertest(app).get('/api/v1/transactions');
    expect(res.status).toBe(401);
  });
});

// ─── BUDGETS ─────────────────────────────────────────────────────────────────

describe('Budgets', () => {
  const testUser = {
    name: 'BudgetUser',
    email: 'budgetuser@spendwise.test',
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

  it('creates a budget', async () => {
    const res = await request.post('/api/v1/budgets').set('Cookie', cookie).send({
      categoryId: expenseCategoryId,
      amount: '500.00',
      month: 1,
      year: 2025,
    });
    expect(res.status).toBe(201);
    // Prisma Decimal serialises as '500' — accept both '500' and '500.00'
    expect(parseFloat(res.body.data.amount)).toBe(500);
  });

  it('prevents duplicate monthly budget', async () => {
    const payload = { categoryId: expenseCategoryId, amount: '300.00', month: 2, year: 2025 };
    await request.post('/api/v1/budgets').set('Cookie', cookie).send(payload);
    const res = await request.post('/api/v1/budgets').set('Cookie', cookie).send(payload);
    expect(res.status).toBe(409);
  });

  it('calculates spending against budget', async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

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

    const res = await request
      .get(`/api/v1/budgets?month=${month}&year=${year}`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    const budget = res.body.data.find(
      (b: { categoryId: string }) => b.categoryId === expenseCategoryId,
    );
    expect(budget).toBeDefined();
    expect(parseFloat(budget.spent)).toBeGreaterThanOrEqual(200);
    expect(parseFloat(budget.remaining)).toBeLessThanOrEqual(800);
  });
});

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

describe('Analytics', () => {
  const testUser = {
    name: 'AnalyticsUser',
    email: 'analyticsuser@spendwise.test',
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

  it('returns correct dashboard summary', async () => {
    const now = new Date();
    const res = await request
      .get(`/api/v1/analytics/dashboard?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
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
