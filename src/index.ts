// Main exports
export { fetcher } from './api/fetcher';

// Error exports
export { ApiError } from './errors/base';
export { defineError } from './errors/factory';

// Type exports
export type { FetcherRequestInit, InferResponse } from './api/types';
export type { ApiErrorStatic } from './errors/base';

// Validation exports
export { SchemaValidationError, validateSchema } from './api/validation';