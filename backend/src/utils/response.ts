import { Response } from 'express';

export function successResponse<T>(
  res: Response,
  data: T,
  message = 'Operation successful',
  statusCode = 200,
  meta?: Record<string, unknown>
) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    ...(meta && { meta }),
  });
}

export function errorResponse(
  res: Response,
  message: string,
  statusCode = 400,
  code = 'BAD_REQUEST',
  details?: unknown
) {
  const body: Record<string, unknown> = { success: false, message, code };
  if (process.env.NODE_ENV !== 'production' && details) {
    body.details = details;
  }
  return res.status(statusCode).json(body);
}
