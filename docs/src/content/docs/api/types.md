---
title: Types
description: Complete TypeScript type definitions for @shkumbinhsn/fetcher
---

# Types

Complete TypeScript type definitions and interfaces provided by `@shkumbinhsn/fetcher`.

## Core Types

### `FetcherRequestInit<T>`

Extended version of the standard `RequestInit` interface with additional properties for schema validation and error handling.

```typescript
interface FetcherRequestInit<TResponse extends StandardSchemaV1 | undefined = undefined> 
  extends RequestInit {
  schema?: TResponse;
  errors?: ApiErrorStatic<any>[];
}
```

**Properties:**
- Includes all standard `RequestInit` properties (`method`, `headers`, `body`, etc.)
- `schema?: TResponse` - Optional response validation schema
- `errors?: ApiErrorStatic<any>[]` - Optional array of custom error classes

**Example:**
```typescript
import type { FetcherRequestInit } from '@shkumbinhsn/fetcher';

const config: FetcherRequestInit<typeof UserSchema> = {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(userData),
  schema: UserSchema,
  errors: [NotFoundError, ValidationError]
};
```

### `InferResponse<T>`

Utility type that infers the response type from a schema or returns `any` if no schema is provided.

```typescript
type InferResponse<T> = T extends StandardSchemaV1 
  ? StandardSchemaV1.InferOutput<T>
  : any;
```

**Usage:**
```typescript
import type { InferResponse } from '@shkumbinhsn/fetcher';
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string()
});

// Type is { id: string; name: string; email: string }
type User = InferResponse<typeof UserSchema>;

// Type is any
type AnyResponse = InferResponse<undefined>;
```

## Error Types

### `ApiError`

Base class for all API errors. All custom error classes created with `defineError()` extend this class.

```typescript
class ApiError extends Error {
  statusCode: number;
  data: unknown;
  response: Response;
  
  constructor(message: string, data: unknown, response: Response);
}
```

**Properties:**
- `statusCode: number` - HTTP status code from the response
- `data: unknown` - Validated error response data (typed in subclasses)
- `response: Response` - Original fetch Response object
- `message: string` - Error message (inherited from Error)
- `name: string` - Error class name (inherited from Error)

**Example:**
```typescript
import { ApiError } from '@shkumbinhsn/fetcher';

try {
  await fetcher('/api/endpoint', { errors: [CustomError] });
} catch (error) {
  if (error instanceof ApiError) {
    console.log(error.statusCode);  // HTTP status
    console.log(error.response);    // Original Response
    console.log(error.data);        // Error response data
  }
}
```

### `ApiErrorStatic<T>`

Type representing the constructor/static interface of custom error classes.

```typescript
interface ApiErrorStatic<TSchema extends StandardSchemaV1> {
  new (message: string, data: StandardSchemaV1.InferOutput<TSchema>, response: Response): 
    ApiError & { data: StandardSchemaV1.InferOutput<TSchema> };
  
  statusCode: number;
  schema: TSchema;
}
```

This type is used internally and typically doesn't need to be used directly in application code.

### `SchemaValidationError`

Error thrown when response validation fails.

```typescript
class SchemaValidationError extends Error {
  issues: unknown[];
  
  constructor(message: string, issues: unknown[]);
}
```

**Properties:**
- `issues: unknown[]` - Validation issues from the schema library
- `message: string` - Error message describing the validation failure

## Utility Types

### Custom Request Init Extensions

You can extend `FetcherRequestInit` for your specific use cases:

```typescript
import type { FetcherRequestInit } from '@shkumbinhsn/fetcher';

// Add custom properties
interface CustomRequestInit<T> extends FetcherRequestInit<T> {
  retries?: number;
  timeout?: number;
  cache?: boolean;
}

// Use in functions
async function customFetch<T>(
  url: string, 
  init?: CustomRequestInit<T>
) {
  const { retries, timeout, cache, ...fetchInit } = init || {};
  // Handle custom logic
  return fetcher(url, fetchInit);
}
```

### API Client Types

Create strongly typed API clients:

```typescript
import type { FetcherRequestInit, InferResponse } from '@shkumbinhsn/fetcher';

// Define endpoint configuration
interface ApiEndpoint<TSchema, TInput = never> {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  schema: TSchema;
  input?: TInput;
}

// Extract response type from endpoint
type EndpointResponse<T> = T extends ApiEndpoint<infer TSchema, any> 
  ? InferResponse<TSchema> 
  : never;

// Extract input type from endpoint
type EndpointInput<T> = T extends ApiEndpoint<any, infer TInput> 
  ? TInput 
  : never;

// Example endpoint definitions
const endpoints = {
  getUser: {
    path: '/users/:id',
    method: 'GET',
    schema: UserSchema
  } as const,
  
  createUser: {
    path: '/users',
    method: 'POST', 
    schema: UserSchema,
    input: CreateUserSchema
  } as const
} as const;

// Typed API call function
async function callEndpoint<K extends keyof typeof endpoints>(
  key: K,
  ...args: EndpointInput<typeof endpoints[K]> extends never 
    ? [pathParams?: Record<string, string>]
    : [input: EndpointInput<typeof endpoints[K]>, pathParams?: Record<string, string>]
): Promise<EndpointResponse<typeof endpoints[K]>> {
  // Implementation here
}
```

### Error Union Types

Create union types for error handling:

```typescript
// Union of all possible API errors
type ApiError = 
  | InstanceType<typeof NotFoundError>
  | InstanceType<typeof ValidationError>
  | InstanceType<typeof UnauthorizedError>;

// Type guard for API errors
function isApiError(error: unknown): error is ApiError {
  return error instanceof NotFoundError ||
         error instanceof ValidationError ||
         error instanceof UnauthorizedError;
}

// Safe API call wrapper
async function safeApiCall<T>(
  apiCall: () => Promise<T>
): Promise<{ data: T } | { error: ApiError }> {
  try {
    const data = await apiCall();
    return { data };
  } catch (error) {
    if (isApiError(error)) {
      return { error };
    }
    throw error; // Re-throw non-API errors
  }
}
```

## Schema Integration Types

### Schema Library Types

The library works with any Standard Schema compatible library:

```typescript
import type { StandardSchemaV1 } from '@standard-schema/spec';

// Zod
import { z } from 'zod';
const zodSchema: StandardSchemaV1 = z.object({ name: z.string() });

// Valibot  
import * as v from 'valibot';
const valibotSchema: StandardSchemaV1 = v.object({ name: v.string() });

// ArkType
import { type } from 'arktype';
const arkTypeSchema: StandardSchemaV1 = type({ name: 'string' });
```

### Schema Response Mapping

Map different schemas to their response types:

```typescript
// Schema registry
const schemas = {
  user: UserSchema,
  users: z.array(UserSchema),
  createUser: CreateUserSchema,
  updateUser: UpdateUserSchema
} as const;

// Extract response types
type SchemaResponses = {
  [K in keyof typeof schemas]: InferResponse<typeof schemas[K]>
};

// Results in:
// {
//   user: User;
//   users: User[];
//   createUser: CreateUserInput;
//   updateUser: UpdateUserInput;
// }
```

## Advanced Type Patterns

### Conditional Request Types

Create types that change based on the HTTP method:

```typescript
type MethodBasedInit<
  TMethod extends string,
  TSchema
> = TMethod extends 'GET' | 'DELETE'
  ? Omit<FetcherRequestInit<TSchema>, 'body'>  // No body for GET/DELETE
  : FetcherRequestInit<TSchema>;               // Body allowed for others

function typedFetch<
  TSchema,
  TMethod extends 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET'
>(
  url: string,
  method: TMethod,
  init?: MethodBasedInit<TMethod, TSchema>
) {
  return fetcher(url, { method, ...init });
}
```

### Generic API Response Wrapper

Handle API responses that wrap data:

```typescript
// Common API response pattern
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

// Schema for wrapped responses
const createWrappedSchema = <T extends StandardSchemaV1>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string().optional(),
    errors: z.array(z.string()).optional()
  });

// Type helper
type WrappedResponse<T> = T extends StandardSchemaV1
  ? ApiResponse<InferResponse<T>>
  : never;

// Usage
const wrappedUserSchema = createWrappedSchema(UserSchema);
type WrappedUser = WrappedResponse<typeof UserSchema>; // ApiResponse<User>
```

## Type-Safe Configuration

### Environment-Based Types

Create types that change based on environment:

```typescript
interface BaseConfig {
  baseUrl: string;
  timeout: number;
}

interface DevelopmentConfig extends BaseConfig {
  debug: true;
  mockDelay: number;
}

interface ProductionConfig extends BaseConfig {
  debug: false;
  apiKey: string;
}

type Config = DevelopmentConfig | ProductionConfig;

function createFetcher(config: Config) {
  return async function<T>(url: string, init?: FetcherRequestInit<T>) {
    // Type-safe configuration usage
    if (config.debug) {
      console.log('Making request to:', config.baseUrl + url);
      // config.mockDelay is available here (TypeScript knows it's DevelopmentConfig)
    } else {
      // config.apiKey is available here (TypeScript knows it's ProductionConfig)
    }
    
    return fetcher(config.baseUrl + url, init);
  };
}
```

## Related

- [fetcher()](/api/fetcher/) - Main function using these types
- [defineError()](/api/define-error/) - Function for creating error types
- [TypeScript Integration](/guides/typescript/) - Advanced TypeScript usage patterns