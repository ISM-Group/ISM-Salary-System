/**
 * Server-side pagination utility.
 * Provides helper functions to parse pagination query parameters
 * and build paginated SQL queries with metadata.
 */

// PUBLIC_INTERFACE
/**
 * Represents the pagination parameters extracted from request query strings.
 */
export interface PaginationParams {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** SQL OFFSET value */
  offset: number;
}

// PUBLIC_INTERFACE
/**
 * Represents the paginated response shape returned to clients.
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// PUBLIC_INTERFACE
/**
 * Parses pagination query parameters from an Express request query object.
 * Provides sensible defaults: page=1, limit=20, max limit=100.
 *
 * @param queryParams - The query string object from Express (req.query)
 * @returns Parsed pagination parameters with computed offset
 */
export function parsePagination(queryParams: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, parseInt(String(queryParams.page || '1'), 10) || 1);
  const rawLimit = parseInt(String(queryParams.limit || '20'), 10) || 20;
  const limit = Math.min(Math.max(1, rawLimit), 100); // clamp between 1 and 100
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

// PUBLIC_INTERFACE
/**
 * Builds pagination metadata for a response from total count and params.
 *
 * @param total - Total number of records matching the query
 * @param params - The pagination parameters used for the query
 * @returns Pagination metadata object
 */
export function buildPaginationMeta(total: number, params: PaginationParams) {
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.ceil(total / params.limit),
  };
}
