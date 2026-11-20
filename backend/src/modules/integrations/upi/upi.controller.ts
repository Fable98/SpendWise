import { Request, Response } from 'express';
import { z } from 'zod';
import { successResponse, errorResponse } from '../../../utils/response';
import {
  generateIntegrationToken,
  listIntegrationTokens,
  revokeIntegrationToken,
  listCategoryRules,
  createCategoryRule,
  deleteCategoryRule,
  ingestUpiPayload,
} from './upi.service';

const webhookSchema = z.object({
  source: z.enum(['GPAY_NOTIFICATION', 'BANK_SMS', 'MANUAL']).optional(),
  packageName: z.string().optional(),
  sender: z.string().optional(),
  title: z.string().optional(),
  body: z.string().min(1, 'Notification or SMS body text is required'),
  timestamp: z.number().optional(),
});

const createTokenSchema = z.object({
  name: z.string().min(1, 'Token name is required').max(50),
});

const createRuleSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  keyword: z.string().min(2, 'Keyword must be at least 2 characters'),
  priority: z.number().int().min(0).max(100).optional(),
});

export async function handleUpiWebhook(req: Request, res: Response): Promise<void> {
  const parsed = webhookSchema.safeParse(req.body);
  if (!parsed.success) {
    errorResponse(res, parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');
    return;
  }

  const userId = req.user!.id;
  const result = await ingestUpiPayload(userId, parsed.data);

  if (result.action === 'REJECTED') {
    successResponse(res, result, 'Message received but not processed as financial alert', 200);
    return;
  }

  if (result.action === 'DUPLICATE') {
    successResponse(res, result, 'Duplicate transaction recognized and skipped', 200);
    return;
  }

  if (result.action === 'MERGED') {
    successResponse(res, result, 'Existing transaction merged and enriched with details', 200);
    return;
  }

  successResponse(res, result, 'Live transaction ingested successfully', 201);
}

export async function getTokens(req: Request, res: Response): Promise<void> {
  const tokens = await listIntegrationTokens(req.user!.id);
  successResponse(res, tokens, 'Tokens retrieved');
}

export async function createToken(req: Request, res: Response): Promise<void> {
  const parsed = createTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    errorResponse(res, parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');
    return;
  }

  const token = await generateIntegrationToken(req.user!.id, parsed.data.name);
  successResponse(res, token, 'Integration token created successfully', 201);
}

export async function deleteToken(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const revoked = await revokeIntegrationToken(id, req.user!.id);
  if (!revoked) {
    errorResponse(res, 'Token not found', 404, 'NOT_FOUND');
    return;
  }
  successResponse(res, { id }, 'Token revoked successfully');
}

export async function getRules(req: Request, res: Response): Promise<void> {
  const rules = await listCategoryRules(req.user!.id);
  successResponse(res, rules, 'Category rules retrieved');
}

export async function createRule(req: Request, res: Response): Promise<void> {
  const parsed = createRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    errorResponse(res, parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');
    return;
  }

  try {
    const rule = await createCategoryRule(req.user!.id, parsed.data);
    successResponse(res, rule, 'Category rule created successfully', 201);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      errorResponse(res, 'Rule for this keyword already exists', 409, 'DUPLICATE_RULE');
      return;
    }
    throw err;
  }
}

export async function deleteRule(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const deleted = await deleteCategoryRule(id, req.user!.id);
  if (!deleted) {
    errorResponse(res, 'Rule not found', 404, 'NOT_FOUND');
    return;
  }
  successResponse(res, { id }, 'Category rule deleted successfully');
}
