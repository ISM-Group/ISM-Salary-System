import { NextFunction, Request, Response } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Express middleware factory that validates the request body against a Zod schema.
 * Returns 400 with structured error details if validation fails.
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
// PUBLIC_INTERFACE
export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Parse and replace req.body with the validated & typed data
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        }));
        res.status(400).json({
          error: 'Validation failed',
          details: fieldErrors,
        });
        return;
      }
      next(error);
    }
  };

/**
 * Express middleware factory that validates request query parameters against a Zod schema.
 * Returns 400 with structured error details if validation fails.
 *
 * @param schema - Zod schema to validate query params against
 * @returns Express middleware function
 */
// PUBLIC_INTERFACE
export const validateQuery =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        }));
        res.status(400).json({
          error: 'Query validation failed',
          details: fieldErrors,
        });
        return;
      }
      next(error);
    }
  };
