"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuery = exports.validate = void 0;
const zod_1 = require("zod");
/**
 * Express middleware factory that validates the request body against a Zod schema.
 * Returns 400 with structured error details if validation fails.
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
// PUBLIC_INTERFACE
const validate = (schema) => (req, res, next) => {
    try {
        // Parse and replace req.body with the validated & typed data
        req.body = schema.parse(req.body);
        next();
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
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
exports.validate = validate;
/**
 * Express middleware factory that validates request query parameters against a Zod schema.
 * Returns 400 with structured error details if validation fails.
 *
 * @param schema - Zod schema to validate query params against
 * @returns Express middleware function
 */
// PUBLIC_INTERFACE
const validateQuery = (schema) => (req, res, next) => {
    try {
        req.query = schema.parse(req.query);
        next();
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
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
exports.validateQuery = validateQuery;
