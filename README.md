<img src="./docs/src/assets/img.png" alt="Dog fetching a ball" width="200" />
# @shkumbinhsn/fetcher
[![npm version](https://img.shields.io/npm/v/@shkumbinhsn/fetcher.svg)](https://www.npmjs.com/package/@shkumbinhsn/fetcher)
[![npm downloads](https://img.shields.io/npm/dm/@shkumbinhsn/fetcher.svg)](https://www.npmjs.com/package/@shkumbinhsn/fetcher)

Type-safe fetch wrapper with Standard Schema validation and error handling.

## Features

- 🔒 Type-safe API calls with full TypeScript support
- ✅ Response validation using any Standard Schema compatible library (Zod, Valibot, etc.)
- 🎯 Structured error handling with typed error responses
- 🚀 Extended `RequestInit` interface - works exactly like `fetch` with extra features
- 📦 Tiny bundle size with minimal dependencies

## Installation

```bash
npm install @shkumbinhsn/fetcher
```

## Quick Start

```typescript
import { fetcher } from '@shkumbinhsn/fetcher';
import { z } from 'zod';

// Define your schema
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email()
});

// Basic usage (works exactly like fetch)
const data = await fetcher('/api/users');

// With schema validation
const user = await fetcher('/api/users/123', {
  schema: UserSchema
});

// user is fully typed as { id: string, name: string, email: string }
console.log(user.name);
```

## HTTP Methods

```typescript
// GET request
const user = await fetcher('/api/users/123', {
  schema: UserSchema
});

// POST request
const newUser = await fetcher('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
  schema: UserSchema
});

// With authentication
const user = await fetcher('/api/users/123', {
  headers: { 'Authorization': 'Bearer your-token' },
  schema: UserSchema
});
```

## Error Handling

```typescript
import { defineError, fetcher } from '@shkumbinhsn/fetcher';
import { z } from 'zod';

// Define custom errors
const NotFoundError = defineError(
  404,
  z.object({
    message: z.string(),
    resource: z.string()
  }),
  'NotFoundError'
);

const ValidationError = defineError(
  400,
  z.object({
    errors: z.array(z.object({
      field: z.string(),
      message: z.string()
    }))
  }),
  'ValidationError'
);

// Use in API calls
try {
  const user = await fetcher('/api/users/123', {
    schema: UserSchema,
    errors: [NotFoundError, ValidationError]
  });
} catch (error) {
  if (error instanceof NotFoundError) {
    // error.data is fully typed
    console.log(`Not found: ${error.data.resource}`);
  } else if (error instanceof ValidationError) {
    // error.data.errors is fully typed
    error.data.errors.forEach(err => 
      console.log(`${err.field}: ${err.message}`)
    );
  }
}
```

## With React Query

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetcher } from '@shkumbinhsn/fetcher';

// Query
const { data, error } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetcher(`/api/users/${userId}`, {
    schema: UserSchema,
    errors: [NotFoundError]
  })
});

// Mutation
const mutation = useMutation({
  mutationFn: (userData: CreateUserInput) => 
    fetcher('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
      schema: UserSchema,
      errors: [ValidationError]
    })
});
```

## TypeScript Support

The library exports a `FetcherRequestInit` type that extends the standard `RequestInit`:

```typescript
import type { FetcherRequestInit } from '@shkumbinhsn/fetcher';

interface MyRequestInit extends FetcherRequestInit<UserSchema> {
  // Your custom properties
}

function myFetch(url: string, init: MyRequestInit) {
  return fetcher(url, init);
}
```

## API Reference

### `fetcher<T>(url, init?)`

```typescript
function fetcher<TResponse extends StandardSchemaV1 | undefined = undefined>(
  input: RequestInfo | URL,
  init?: FetcherRequestInit<TResponse>
): Promise<InferResponse<TResponse>>
```

The main fetch wrapper function that extends the standard `fetch` API with:
- `schema?: TResponse` - Optional response validation schema
- `errors?: ApiErrorStatic<any>[]` - Optional custom error types

### `defineError(statusCode, schema, name?)`

```typescript
function defineError<TSchema extends StandardSchemaV1>(
  statusCode: number,
  schema: TSchema,
  name?: string
): ApiErrorStatic<TSchema>
```

Create typed error classes for API responses.

### `FetcherRequestInit<T>`

Extended `RequestInit` interface that includes `schema` and `errors` properties.

## Supported Schema Libraries

Any library that implements the Standard Schema specification:

- [Zod](https://zod.dev)
- [Valibot](https://valibot.dev) 
- [ArkType](https://arktype.io)
- [Effect Schema](https://effect.website/docs/schema/introduction)
- And more!

## License

MIT