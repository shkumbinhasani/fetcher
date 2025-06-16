---
title: TypeScript Integration
description: Advanced TypeScript patterns and type safety with @shkumbinhsn/fetcher
---

# TypeScript Integration

`@shkumbinhsn/fetcher` is built with TypeScript-first design. This guide covers advanced TypeScript patterns and how to get the most out of the library's type system.

## Type Inference

The library automatically infers response types from your schemas:

```typescript
import { fetcher } from '@shkumbinhsn/fetcher';
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email()
});

// user is automatically typed as:
// { id: string; name: string; email: string }
const user = await fetcher('/api/users/123', {
  schema: UserSchema
});

// TypeScript provides full IntelliSense
user.name;    // ✓ string
user.email;   // ✓ string  
user.age;     // ✗ Property 'age' does not exist
```

## Custom Request Types

Extend the request initialization type for your specific use cases:

```typescript
import type { FetcherRequestInit } from '@shkumbinhsn/fetcher';

// Create a custom interface that extends FetcherRequestInit
interface ApiRequestInit<T> extends FetcherRequestInit<T> {
  // Add custom properties
  retries?: number;
  timeout?: number;
  cache?: boolean;
}

// Create a wrapper function with your custom type
async function apiCall<TSchema>(
  url: string, 
  init?: ApiRequestInit<TSchema>
) {
  const { retries, timeout, cache, ...fetchInit } = init || {};
  
  // Handle custom logic here
  if (timeout) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    fetchInit.signal = controller.signal;
  }
  
  return fetcher(url, fetchInit);
}

// Usage with full type safety
const user = await apiCall('/api/users/123', {
  schema: UserSchema,
  retries: 3,
  timeout: 5000
});
```

## Type-Safe API Client

Create a fully typed API client:

```typescript
import { fetcher, defineError, type FetcherRequestInit } from '@shkumbinhsn/fetcher';
import { z } from 'zod';

// Define your schemas
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email()
});

const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string().email()
});

// Define errors
const NotFoundError = defineError(404, z.object({
  message: z.string(),
  resource: z.string()
}));

const ValidationError = defineError(400, z.object({
  errors: z.array(z.object({
    field: z.string(),
    message: z.string()
  }))
}));

// Create API client class
class ApiClient {
  private baseUrl: string;
  private commonHeaders: Record<string, string>;

  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl;
    this.commonHeaders = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  private async request<T>(
    endpoint: string,
    init?: FetcherRequestInit<T>
  ) {
    return fetcher(`${this.baseUrl}${endpoint}`, {
      headers: {
        ...this.commonHeaders,
        ...init?.headers
      },
      errors: [NotFoundError, ValidationError],
      ...init
    });
  }

  // Typed API methods
  async getUser(id: string) {
    return this.request(`/users/${id}`, {
      schema: UserSchema
    });
  }

  async getUsers() {
    return this.request('/users', {
      schema: z.array(UserSchema)
    });
  }

  async createUser(data: z.infer<typeof CreateUserSchema>) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
      schema: UserSchema
    });
  }

  async updateUser(id: string, data: Partial<z.infer<typeof UserSchema>>) {
    return this.request(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      schema: UserSchema
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE'
    });
  }
}

// Usage
const client = new ApiClient('https://api.example.com', 'your-token');

const user = await client.getUser('123');     // Type: User
const users = await client.getUsers();        // Type: User[]
const newUser = await client.createUser({     // Type-safe input
  name: 'John',
  email: 'john@example.com'
});
```

## Generic Response Types

Handle generic API response patterns:

```typescript
// Common API response wrapper
const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string().optional(),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      pages: z.number()
    }).optional()
  });

// Usage
const usersResponse = await fetcher('/api/users', {
  schema: ApiResponseSchema(z.array(UserSchema))
});

if (usersResponse.success) {
  usersResponse.data.forEach(user => {
    console.log(user.name); // Fully typed
  });
  
  if (usersResponse.pagination) {
    console.log(`Page ${usersResponse.pagination.page} of ${usersResponse.pagination.pages}`);
  }
}
```

## Conditional Types

Use conditional types for different response formats:

```typescript
type ApiResponse<T> = T extends undefined 
  ? any 
  : T extends z.ZodType 
    ? z.infer<T> 
    : never;

function createApiCall<TSchema extends z.ZodType | undefined = undefined>(
  defaultSchema?: TSchema
) {
  return async function<TOverrideSchema extends z.ZodType | undefined = TSchema>(
    url: string,
    init?: FetcherRequestInit<TOverrideSchema>
  ): Promise<ApiResponse<TOverrideSchema extends undefined ? TSchema : TOverrideSchema>> {
    return fetcher(url, {
      schema: init?.schema ?? defaultSchema,
      ...init
    }) as any;
  };
}

// Create typed API functions
const getUser = createApiCall(UserSchema);
const getAny = createApiCall();

const user = await getUser('/api/users/123');     // Type: User
const anything = await getAny('/api/anything');   // Type: any
```

## Utility Types

Create utility types for common patterns:

```typescript
import type { InferResponse } from '@shkumbinhsn/fetcher';

// Extract the response type from a schema
type UserType = InferResponse<typeof UserSchema>;

// Create a type for API endpoints
type ApiEndpoint<TSchema extends z.ZodType> = {
  schema: TSchema;
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
};

// Define your API endpoints with types
const endpoints = {
  getUser: {
    schema: UserSchema,
    path: '/users/:id',
    method: 'GET'
  } as const,
  createUser: {
    schema: UserSchema,
    path: '/users',
    method: 'POST'
  } as const
} as const;

// Type-safe endpoint caller
async function callEndpoint<K extends keyof typeof endpoints>(
  key: K,
  pathParams: Record<string, string> = {},
  init?: Omit<FetcherRequestInit<typeof endpoints[K]['schema']>, 'schema'>
) {
  const endpoint = endpoints[key];
  let path = endpoint.path;
  
  // Replace path parameters
  Object.entries(pathParams).forEach(([param, value]) => {
    path = path.replace(`:${param}`, value);
  });
  
  return fetcher(path, {
    method: endpoint.method || 'GET',
    schema: endpoint.schema,
    ...init
  });
}

// Usage
const user = await callEndpoint('getUser', { id: '123' });
```

## Discriminated Unions

Handle different response shapes based on status:

```typescript
const SuccessResponse = z.object({
  status: z.literal('success'),
  data: UserSchema
});

const ErrorResponse = z.object({
  status: z.literal('error'),
  error: z.object({
    code: z.string(),
    message: z.string()
  })
});

const ResponseSchema = z.union([SuccessResponse, ErrorResponse]);

const response = await fetcher('/api/users/123', {
  schema: ResponseSchema
});

// TypeScript narrows the type based on discriminant
if (response.status === 'success') {
  console.log(response.data.name); // TypeScript knows data exists
} else {
  console.log(response.error.message); // TypeScript knows error exists
}
```

## Higher-Order Functions

Create higher-order functions for common patterns:

```typescript
function withRetry<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  maxRetries: number = 3
) {
  return async (...args: T): Promise<R> => {
    let lastError: unknown;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        if (i === maxRetries) break;
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
    
    throw lastError;
  };
}

// Usage
const getUserWithRetry = withRetry(async (id: string) => {
  return fetcher(`/api/users/${id}`, {
    schema: UserSchema,
    errors: [NotFoundError]
  });
});

const user = await getUserWithRetry('123'); // Type: User
```

## Advanced Error Typing

Create strongly typed error handling:

```typescript
type ApiError = 
  | InstanceType<typeof NotFoundError>
  | InstanceType<typeof ValidationError>
  | InstanceType<typeof UnauthorizedError>;

function isApiError(error: unknown): error is ApiError {
  return error instanceof NotFoundError ||
         error instanceof ValidationError ||
         error instanceof UnauthorizedError;
}

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

// Usage
const result = await safeApiCall(() => 
  fetcher('/api/users/123', {
    schema: UserSchema,
    errors: [NotFoundError, ValidationError]
  })
);

if ('data' in result) {
  console.log(result.data.name); // Type: string
} else {
  // Type-safe error handling
  if (result.error instanceof NotFoundError) {
    console.log('User not found');
  }
}
```

## Next Steps

- [React Query Integration](/guides/react-query/) - Use with React Query for data fetching
- [API Reference](/api/types/) - Complete type definitions
- [Examples](/examples/advanced-usage/) - Advanced usage patterns