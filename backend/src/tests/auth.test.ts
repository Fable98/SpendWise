import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import supertest from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';

const request = supertest(app);

const testUser = {
  name: 'Test User',
  email: 'test@spendwise.test',
  password: 'Password123',
};

afterEach(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@spendwise.test' } } });
});

describe('Auth - Registration', () => {
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
      ...testUser,
      email: 'weak@spendwise.test',
      password: 'weak',
    });
    expect(res.status).toBe(400);
  });

  it('rejects invalid email', async () => {
    const res = await request.post('/api/v1/auth/register').send({
      ...testUser,
      email: 'not-an-email',
    });
    expect(res.status).toBe(400);
  });
});

describe('Auth - Login', () => {
  beforeAll(async () => {
    await request.post('/api/v1/auth/register').send(testUser);
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
});

describe('Auth - Protected Routes', () => {
  it('rejects unauthenticated request to /me', async () => {
    const res = await request.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns current user when authenticated', async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await request.post('/api/v1/auth/register').send(testUser);
    const loginRes = await request.post('/api/v1/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    const cookie = loginRes.headers['set-cookie'];
    const meRes = await request.get('/api/v1/auth/me').set('Cookie', cookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(testUser.email);
  });
});
