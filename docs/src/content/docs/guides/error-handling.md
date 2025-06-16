---
title: Error Handling
description: Learn how to handle API errors with typed error classes
---

# Error Handling

`@shkumbinhsn/fetcher` provides structured error handling through custom error classes. This allows you to handle different types of API errors in a type-safe way.

## Defining Error Classes

Use `defineError()` to create custom error classes that match your API's error responses:

```typescript
import { defineError } from '@shkumbinhsn/fetcher';
import { z } from 'zod';

// Define a 404 Not Found error
const NotFoundError = defineError(
  404,                              // HTTP status code
  z.object({                        // Error response schema
    message: z.string(),
    resource: z.string(),
    code: z.string()
  }),
  'NotFoundError'                   // Error class name (optional)
);

// Define a 400 Validation error
const ValidationError = defineError(
  400,
  z.object({
    message: z.string(),
    errors: z.array(z.object({
      field: z.string(),
      message: z.string(),
      code: z.string()
    }))
  }),
  'ValidationError'
);

// Define a 401 Unauthorized error
const UnauthorizedError = defineError(
  401,
  z.object({
    message: z.string(),
    code: z.string()
  }),
  'UnauthorizedError'
);
```

## Using Error Classes

Pass error classes to the `fetcher` function:

```typescript
import { fetcher } from '@shkumbinhsn/fetcher';

try {
  const user = await fetcher('/api/users/999', {
    schema: UserSchema,
    errors: [NotFoundError, ValidationError, UnauthorizedError]
  });
} catch (error) {
  // Handle specific error types
  if (error instanceof NotFoundError) {
    console.log(`Resource not found: ${error.data.resource}`);
    console.log(`Error code: ${error.data.code}`);
  } else if (error instanceof ValidationError) {
    console.log('Validation failed:');
    error.data.errors.forEach(err => {
      console.log(`  ${err.field}: ${err.message}`);
    });
  } else if (error instanceof UnauthorizedError) {
    console.log('Authentication required');
    // Redirect to login
    window.location.href = '/login';
  } else {
    console.log('Unexpected error:', error);
  }
}
```

## Error Class Properties

Custom error classes extend the base `ApiError` class and provide:

```typescript
class CustomError extends ApiError {
  statusCode: number;    // HTTP status code (e.g., 404)
  data: T;              // Validated error response data
  response: Response;   // Original fetch Response object
  message: string;      // Error message
  name: string;         // Error class name
}
```

### Accessing Error Details

```typescript
try {
  await fetcher('/api/users/999', {
    errors: [NotFoundError]
  });
} catch (error) {
  if (error instanceof NotFoundError) {
    // All properties are type-safe
    console.log('Status:', error.statusCode);        // 404
    console.log('Message:', error.message);          // "Not Found" (from response)
    console.log('Resource:', error.data.resource);   // Type-safe access
    console.log('Headers:', error.response.headers); // Access original response
  }
}
```

## Common Error Patterns

### REST API Errors

```typescript
// Standard REST API error responses
const BadRequestError = defineError(400, z.object({
  message: z.string(),
  details: z.record(z.any()).optional()
}));

const ForbiddenError = defineError(403, z.object({
  message: z.string(),
  requiredPermissions: z.array(z.string()).optional()
}));

const ConflictError = defineError(409, z.object({
  message: z.string(),
  conflictingResource: z.string()
}));

const RateLimitError = defineError(429, z.object({
  message: z.string(),
  retryAfter: z.number(),
  limit: z.number(),
  remaining: z.number()
}));

const ServerError = defineError(500, z.object({
  message: z.string(),
  errorId: z.string(),
  timestamp: z.string()
}));
```

### GraphQL-style Errors

```typescript
const GraphQLError = defineError(400, z.object({
  errors: z.array(z.object({
    message: z.string(),
    locations: z.array(z.object({
      line: z.number(),
      column: z.number()
    })).optional(),
    path: z.array(z.union([z.string(), z.number()])).optional(),
    extensions: z.record(z.any()).optional()
  }))
}));
```

### Form Validation Errors

```typescript
const FormValidationError = defineError(422, z.object({
  message: z.string(),
  errors: z.record(z.array(z.string())) // field -> array of error messages
}));

// Usage
try {
  await fetcher('/api/users', {
    method: 'POST',
    body: JSON.stringify(formData),
    errors: [FormValidationError]
  });
} catch (error) {
  if (error instanceof FormValidationError) {
    Object.entries(error.data.errors).forEach(([field, messages]) => {
      messages.forEach(message => {
        console.log(`${field}: ${message}`);
      });
    });
  }
}
```

## Multiple Status Codes

Handle the same error schema for multiple status codes:

```typescript
// Create separate error classes for different status codes
const BadRequestValidation = defineError(400, ValidationSchema);
const UnprocessableValidation = defineError(422, ValidationSchema);

// Use both in requests
const errors = [BadRequestValidation, UnprocessableValidation];

try {
  await fetcher('/api/users', { errors });
} catch (error) {
  if (error instanceof BadRequestValidation || error instanceof UnprocessableValidation) {
    // Handle validation errors from either status code
    console.log('Validation failed:', error.data.errors);
  }
}
```

## Error Middleware

Create reusable error handling logic:

```typescript
function handleApiError(error: unknown): never {
  if (error instanceof NotFoundError) {
    throw new Error(`Resource not found: ${error.data.resource}`);
  }
  
  if (error instanceof ValidationError) {
    const messages = error.data.errors.map(e => `${e.field}: ${e.message}`);
    throw new Error(`Validation failed: ${messages.join(', ')}`);
  }
  
  if (error instanceof UnauthorizedError) {
    // Clear auth state
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Authentication required');
  }
  
  if (error instanceof RateLimitError) {
    throw new Error(`Rate limit exceeded. Retry after ${error.data.retryAfter} seconds`);
  }
  
  // Re-throw unknown errors
  throw error;
}

// Use in your API calls
try {
  const user = await fetcher('/api/users/123', {
    schema: UserSchema,
    errors: [NotFoundError, ValidationError, UnauthorizedError, RateLimitError]
  });
} catch (error) {
  handleApiError(error);
}
```

## Default Error Handling

When no custom errors are provided, the library falls back to generic error messages:

```typescript
try {
  await fetcher('/api/users/999'); // No custom errors
} catch (error) {
  // Will throw a generic Error with message like:
  // "Request failed: 404 Not Found"
  console.log(error.message);
}
```

## Error Logging

Add comprehensive error logging:

```typescript
function logApiError(error: unknown, context: string) {
  if (error instanceof ApiError) {
    console.error(`API Error in ${context}:`, {
      statusCode: error.statusCode,
      message: error.message,
      data: error.data,
      url: error.response.url,
      timestamp: new Date().toISOString()
    });
  } else {
    console.error(`Unexpected error in ${context}:`, error);
  }
}

try {
  await fetcher('/api/users/123', { errors: [NotFoundError] });
} catch (error) {
  logApiError(error, 'getUserById');
  throw error;
}
```

## Testing Error Handling

Test your error handling logic:

```typescript
// Mock API response for testing
const mockNotFoundResponse = {
  message: 'User not found',
  resource: 'user',
  code: 'USER_NOT_FOUND'
};

// Test error handling
it('should handle NotFoundError correctly', async () => {
  // Mock fetch to return 404
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: false,
    status: 404,
    statusText: 'Not Found',
    json: () => Promise.resolve(mockNotFoundResponse)
  } as Response);

  try {
    await fetcher('/api/users/999', { errors: [NotFoundError] });
    fail('Should have thrown NotFoundError');
  } catch (error) {
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.data.resource).toBe('user');
  }
});
```

## Next Steps

- [TypeScript Integration](/guides/typescript/) - Advanced TypeScript patterns
- [React Query Integration](/guides/react-query/) - Use with React Query
- [API Reference](/api/define-error/) - Complete defineError documentation