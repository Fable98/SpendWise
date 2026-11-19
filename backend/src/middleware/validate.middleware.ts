import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as { body?: unknown; query?: unknown; params?: unknown };

      // In Express 5, req.query and req.params are read-only getters.
      // We only reassign req.body (writable). Validated query/params
      // values are attached to req for downstream use via req.validatedQuery
      // but we also sanitise body which is what we care about most.
      if (parsed.body !== undefined) {
        req.body = parsed.body;
      }

      // Attach validated query and params as custom properties
      if (parsed.query !== undefined) {
        (req as Request & { validatedQuery: unknown }).validatedQuery = parsed.query;
      }
      if (parsed.params !== undefined) {
        (req as Request & { validatedParams: unknown }).validatedParams = parsed.params;
      }

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
        return;
      }
      next(err);
    }
  };
}
