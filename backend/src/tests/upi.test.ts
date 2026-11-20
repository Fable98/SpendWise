import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';
import { scrubRawPayload } from '../modules/integrations/upi/scrubber';
import { parseUpi } from '../modules/integrations/upi/parser';
import { computeFingerprint } from '../modules/integrations/upi/deduplication';
import samples from './fixtures/upi_samples.json';

describe('UPI Integration Engine', () => {
  let testUserId: string;
  let rawToken: string;

  beforeAll(async () => {
    // Create test user for integration testing
    const user = await prisma.user.upsert({
      where: { email: 'upi_test_user@example.com' },
      update: {},
      create: {
        name: 'UPI Test User',
        email: 'upi_test_user@example.com',
        passwordHash: 'dummy_hash',
      },
    });
    testUserId = user.id;

    // Generate test integration token directly
    const crypto = await import('crypto');
    const entropy = crypto.randomBytes(32).toString('hex');
    rawToken = `spw_live_${entropy}`;
    const tokenPrefix = rawToken.slice(0, 12);
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await prisma.integrationToken.create({
      data: {
        userId: testUserId,
        name: 'Test Listener',
        tokenPrefix,
        tokenHash,
      },
    });
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({ where: { userId: testUserId } });
    await prisma.integrationToken.deleteMany({ where: { userId: testUserId } });
    await prisma.categoryRule.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  describe('1. In-Flight PII Pre-Scrubber', () => {
    it('should strip OTPs, account numbers, and available balances', () => {
      const sensitiveText =
        'Your OTP is 948201. Sent Rs.450.00 from HDFC Bank A/c 4821 to Starbucks. Avl Bal Rs 14,250.00';
      const scrubbed = scrubRawPayload(sensitiveText);

      expect(scrubbed).not.toContain('948201');
      expect(scrubbed).toContain('[OTP_REDACTED]');

      expect(scrubbed).not.toContain('4821');
      expect(scrubbed).toContain('A/c [REDACTED]');

      expect(scrubbed).not.toContain('14,250.00');
      expect(scrubbed).toContain('[BAL_REDACTED]');

      expect(scrubbed).toContain('Starbucks');
      expect(scrubbed).toContain('Rs.450.00');
    });
  });

  describe('2. Parser Strategies & Fixtures Suite', () => {
    for (const sample of samples) {
      it(`parses sample: ${sample.description}`, () => {
        const scrubbed = scrubRawPayload(sample.text);
        const result = parseUpi(sample.pkg, scrubbed);

        if (sample.expected === null) {
          expect(result).toBeNull();
        } else {
          expect(result).not.toBeNull();
          expect(result?.amount).toBe(sample.expected.amount);
          expect(result?.type).toBe(sample.expected.type);
          if (sample.expected.merchant) {
            expect(result?.merchant).toBe(sample.expected.merchant);
          }
          if (sample.expected.utr) {
            expect(result?.utr).toBe(sample.expected.utr);
          }
          expect(result?.confidence).toBeGreaterThanOrEqual(0.7);
        }
      });
    }
  });

  describe('3. Deduplication & Fingerprinting', () => {
    it('produces identical fingerprints for the same 5-minute bucket', () => {
      const now = new Date('2026-11-20T10:15:10.000Z');
      const slightlyLater = new Date('2026-11-20T10:17:30.000Z');

      const fp1 = computeFingerprint({
        userId: 'u1',
        amount: 250,
        type: 'EXPENSE',
        merchant: 'Swiggy',
        date: now,
      });

      const fp2 = computeFingerprint({
        userId: 'u1',
        amount: 250,
        type: 'EXPENSE',
        merchant: 'swiggy',
        date: slightlyLater,
      });

      expect(fp1).toBe(fp2);
    });
  });

  describe('4. Webhook Ingestion API', () => {
    it('rejects requests with missing or invalid token', async () => {
      const res = await request(app)
        .post('/api/v1/integrations/upi/webhook')
        .send({ body: 'Paid ₹450 to Starbucks Coffee' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('ingests live GPay transaction and auto-categorizes under Food & Dining', async () => {
      const res = await request(app)
        .post('/api/v1/integrations/upi/webhook')
        .set('X-SpendWise-Token', rawToken)
        .send({
          source: 'GPAY_NOTIFICATION',
          packageName: 'com.google.android.apps.nbu.paisa.user',
          body: 'Paid ₹450.00 to Starbucks Coffee. UPI Ref: 999888777111',
          timestamp: Date.now(),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.action).toBe('CREATED');
      expect(res.body.data.amount).toBe('450.00');
      expect(res.body.data.merchant).toBe('Starbucks Coffee');
      expect(res.body.data.category.name).toBe('Food & Dining');
      expect(res.body.data.externalId).toBe('999888777111');
      expect(res.body.data.status).toBe('PROCESSED');
    });

    it('detects duplicate on exact UTR replay and does not duplicate transaction', async () => {
      const res = await request(app)
        .post('/api/v1/integrations/upi/webhook')
        .set('X-SpendWise-Token', rawToken)
        .send({
          source: 'GPAY_NOTIFICATION',
          packageName: 'com.google.android.apps.nbu.paisa.user',
          body: 'Paid ₹450.00 to Starbucks Coffee. UPI Ref: 999888777111',
          timestamp: Date.now(),
        });

      expect(res.status).toBe(200);
      expect(res.body.data.action).toBe('DUPLICATE');
    });

    it('merges & enriches proximity transaction when SMS arrives after notification', async () => {
      // 1. First alert lacks UTR (e.g. initial brief notification)
      const res1 = await request(app)
        .post('/api/v1/integrations/upi/webhook')
        .set('X-SpendWise-Token', rawToken)
        .send({
          source: 'GPAY_NOTIFICATION',
          body: 'You paid ₹320 to Uber',
          timestamp: Date.now(),
        });

      expect(res1.status).toBe(201);
      expect(res1.body.data.action).toBe('CREATED');
      const createdTxId = res1.body.data.transactionId;

      // 2. Bank SMS arrives 30 seconds later with UTR and account reference
      const res2 = await request(app)
        .post('/api/v1/integrations/upi/webhook')
        .set('X-SpendWise-Token', rawToken)
        .send({
          source: 'BANK_SMS',
          sender: 'HDFCBK',
          body: 'Sent Rs.320.00 from HDFC Bank A/c 1234 to Uber on 20-11-26 via UPI. Ref 112233445566. Avl Bal Rs 10000',
          timestamp: Date.now() + 30000,
        });

      expect(res2.status).toBe(200);
      expect(res2.body.data.action).toBe('MERGED');
      expect(res2.body.data.transactionId).toBe(createdTxId);

      // Verify the transaction was enriched in the database with the UTR
      const enriched = await prisma.transaction.findUnique({
        where: { id: createdTxId },
      });
      expect(enriched?.externalId).toBe('112233445566');
    });
  });
});
