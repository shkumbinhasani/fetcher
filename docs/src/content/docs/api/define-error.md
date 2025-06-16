---
title: defineError()
description: Complete API reference for the defineError function
---

# defineError()

Creates custom error classes for type-safe API error handling. These error classes can be used with the `fetcher()` function to handle specific HTTP error responses.

## Signature

```typescript
function defineError<TSchema extends StandardSchemaV1>(
  statusCode: number,
  schema: TSchema,
  name?: string
): ApiErrorStatic<TSchema>
```

## Parameters

### `statusCode: number`

The HTTP status code this error class should handle.

**Examples:**
- `400` - Bad Request
- `401` - Unauthorized  
- `403` - Forbidden
- `404` - Not Found
- `422` - Unprocessable Entity
- `500` - Internal Server Error

### `schema: TSchema`

A Standard Schema compatible validation schema that describes the structure of the error response body.

**Supported schema libraries:**
- Zod
- Valibot
- ArkType
- Effect Schema

### `name?: string`

Optional custom name for the error class. If not provided, a generic name will be used.

## Return Value

Returns an error class constructor that can be:
1. Used in the `errors` array of `fetcher()` calls
2. Used with `instanceof` checks in error handling
3. Instantiated directly for testing

The returned class extends `ApiError` and includes:

```typescript
class CustomError extends ApiError {
  static statusCode: number;           // The HTTP status code
  static schema: TSchema;              // The validation schema
  
  statusCode: number;                  // Instance property: HTTP status code  
  data: InferSchema<TSchema>;         // Validated error response data
  response: Response;                  // Original fetch Response object
  message: string;                     // Error message (from response.statusText)
  name: string;                        // Error class name
}
```

## Examples

### Basic Error Definition

```typescript
import { defineError } from '@shkumbinhsn/fetcher';
import { z } from 'zod';

// Simple error with message
const NotFoundError = defineError(
  404,
  z.object({
    message: z.string(),
    resource: z.string()
  }),
  'NotFoundError'
);

// Validation error with field details
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
```

### Using with fetcher()

```typescript
try {
  const user = await fetcher('/api/users/999', {
    schema: UserSchema,
    errors: [NotFoundError, ValidationError]
  });
} catch (error) {
  if (error instanceof NotFoundError) {
    // error.data is typed as { message: string; resource: string }
    console.log(`${error.data.resource} not found: ${error.data.message}`);
    console.log(`Status: ${error.statusCode}`); // 404
  } else if (error instanceof ValidationError) {
    // error.data is typed according to the schema
    console.log('Validation failed:');
    error.data.errors.forEach(err => {
      console.log(`  ${err.field}: ${err.message} (${err.code})`);
    });
  }
}
```

### Common Error Patterns

```typescript
// Authentication errors
const UnauthorizedError = defineError(
  401,
  z.object({
    message: z.string(),
    code: z.enum(['INVALID_TOKEN', 'TOKEN_EXPIRED', 'NO_TOKEN'])
  }),
  'UnauthorizedError'
);

// Permission errors
const ForbiddenError = defineError(
  403,
  z.object({
    message: z.string(),
    requiredPermissions: z.array(z.string()),
    userPermissions: z.array(z.string())
  }),
  'ForbiddenError'
);

// Rate limiting errors
const RateLimitError = defineError(
  429,
  z.object({
    message: z.string(),
    retryAfter: z.number(),
    limit: z.number(),
    remaining: z.number(),
    resetTime: z.string()
  }),
  'RateLimitError'
);

// Server errors
const ServerError = defineError(
  500,
  z.object({
    message: z.string(),
    errorId: z.string(),
    timestamp: z.string(),
    details: z.record(z.any()).optional()
  }),
  'ServerError'
);
```

### Complex Error Schemas

```typescript
// GraphQL-style errors
const GraphQLError = defineError(
  400,
  z.object({
    errors: z.array(z.object({
      message: z.string(),
      locations: z.array(z.object({
        line: z.number(),
        column: z.number()
      })).optional(),
      path: z.array(z.union([z.string(), z.number()])).optional(),
      extensions: z.object({
        code: z.string(),
        exception: z.record(z.any()).optional()
      }).optional()
    })),
    data: z.null().optional()
  }),
  'GraphQLError'
);

// Conflict errors with detailed information
const ConflictError = defineError(
  409,
  z.object({
    message: z.string(),
    conflictType: z.enum(['DUPLICATE_KEY', 'VERSION_MISMATCH', 'RESOURCE_LOCKED']),
    conflictingFields: z.array(z.string()),
    suggestions: z.array(z.string()).optional(),
    currentValue: z.any().optional(),
    attemptedValue: z.any().optional()
  }),
  'ConflictError'
);
```

### Using with Different Schema Libraries

#### With Valibot

```typescript
import * as v from 'valibot';

const ValidationError = defineError(
  400,
  v.object({
    message: v.string(),
    errors: v.array(v.object({
      field: v.string(),
      message: v.string()
    }))
  }),
  'ValidationError'
);
```

#### With ArkType

```typescript
import { type } from 'arktype';

const NotFoundError = defineError(
  404,
  type({
    message: 'string',
    resource: 'string',
    'code?': 'string'
  }),
  'NotFoundError'
);
```

## Error Class Properties and Methods

### Static Properties

```typescript
const MyError = defineError(404, schema, 'MyError');

console.log(MyError.statusCode); // 404
console.log(MyError.schema);     // The validation schema
```

### Instance Properties

```typescript
try {
  await fetcher('/api/endpoint', { errors: [MyError] });
} catch (error) {
  if (error instanceof MyError) {
    console.log(error.statusCode);  // HTTP status code
    console.log(error.data);        // Validated error response data
    console.log(error.response);    // Original Response object
    console.log(error.message);     // Error message from response
    console.log(error.name);        // Error class name
  }
}
```

### Direct Instantiation

For testing or custom error creation:

```typescript
const errorResponse = new Response(
  JSON.stringify({ message: 'Not found', resource: 'user' }),
  { status: 404, statusText: 'Not Found' }
);

const error = new NotFoundError(
  'Not Found',
  { message: 'Not found', resource: 'user' },
  errorResponse
);

console.log(error instanceof NotFoundError); // true
console.log(error.data.resource);            // 'user'
```

## Multiple Status Codes

To handle the same error format for multiple status codes, create separate error classes:

```typescript
const BadRequestValidation = defineError(400, ValidationSchema, 'BadRequestValidation');
const UnprocessableValidation = defineError(422, ValidationSchema, 'UnprocessableValidation');

// Use both in fetcher
try {
  await fetcher('/api/endpoint', {
    errors: [BadRequestValidation, UnprocessableValidation]
  });
} catch (error) {
  if (error instanceof BadRequestValidation || error instanceof UnprocessableValidation) {
    // Handle validation errors from either status code
    handleValidationError(error.data);
  }
}

// Or create a type union for easier checking
type ValidationError = 
  | InstanceType<typeof BadRequestValidation>
  | InstanceType<typeof UnprocessableValidation>;

function isValidationError(error: unknown): error is ValidationError {
  return error instanceof BadRequestValidation || error instanceof UnprocessableValidation;
}
```

## Error Inheritance

Error classes extend the base `ApiError` class:

```typescript
import { ApiError } from '@shkumbinhsn/fetcher';

// All custom errors are instances of ApiError
try {
  await fetcher('/api/endpoint', { errors: [NotFoundError, ValidationError] });
} catch (error) {
  if (error instanceof ApiError) {
    // This catches any custom API error
    console.log('API error occurred:', error.statusCode);
  }
  
  // More specific handling
  if (error instanceof NotFoundError) {
    console.log('Specific not found handling');
  }
}
```

## Best Practices

1. **Use descriptive names**: Choose clear, specific names for your error classes
2. **Match your API**: Create error schemas that match your actual API responses
3. **Handle common errors**: Define errors for common HTTP status codes (400, 401, 403, 404, 500)
4. **Group related errors**: Create error classes for each distinct error format your API returns
5. **Include helpful data**: Design error schemas to include data useful for error handling and user messages

## Testing

Test your error classes and handling:

```typescript
// Mock fetch to return an error response
global.fetch = jest.fn().mockResolvedValue({
  ok: false,
  status: 404,
  statusText: 'Not Found',
  json: () => Promise.resolve({
    message: 'User not found',
    resource: 'user'
  })
});

// Test error handling
it('should handle NotFoundError correctly', async () => {
  try {
    await fetcher('/api/users/999', { errors: [NotFoundError] });
    fail('Should have thrown');
  } catch (error) {
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.statusCode).toBe(404);
    expect(error.data.resource).toBe('user');
  }
});
```

## Related

- [`fetcher()`](/api/fetcher/) - Main fetcher function that uses error classes
- [`ApiError`](/api/types/#apierror) - Base error class
- [Error Handling Guide](/guides/error-handling/) - Comprehensive error handling guide