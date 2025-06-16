---
title: Quick Start
description: Get up and running with @shkumbinhsn/fetcher in minutes
---

# Quick Start

This guide will get you up and running with `@shkumbinhsn/fetcher` in just a few minutes.

## Basic Usage

The simplest way to use the library is as a drop-in replacement for `fetch`:

```typescript
import { fetcher } from '@shkumbinhsn/fetcher';

// Works exactly like fetch
const data = await fetcher('/api/users');
console.log(data);
```

## With Schema Validation

For type-safe responses, add a schema:

```typescript
import { fetcher } from '@shkumbinhsn/fetcher';
import { z } from 'zod';

// Define your data structure
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email()
});

// Get fully typed response
const user = await fetcher('/api/users/123', {
  schema: UserSchema
});

// TypeScript knows the exact shape of user
console.log(user.name);  // ✓ Type-safe
console.log(user.age);   // ✗ TypeScript error
```

## HTTP Methods

Use any HTTP method just like with `fetch`:

```typescript
// GET (default)
const user = await fetcher('/api/users/123', {
  schema: UserSchema
});

// POST
const newUser = await fetcher('/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com'
  }),
  schema: UserSchema
});

// PUT
const updatedUser = await fetcher('/api/users/123', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Jane Doe'
  }),
  schema: UserSchema
});

// DELETE
await fetcher('/api/users/123', {
  method: 'DELETE'
});
```

## Error Handling

Handle errors with custom error classes:

```typescript
import { fetcher, defineError } from '@shkumbinhsn/fetcher';
import { z } from 'zod';

// Define error schemas
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

// Use in requests
try {
  const user = await fetcher('/api/users/999', {
    schema: UserSchema,
    errors: [NotFoundError, ValidationError]
  });
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log(`${error.data.resource} not found`);
  } else if (error instanceof ValidationError) {
    error.data.errors.forEach(err => 
      console.log(`${err.field}: ${err.message}`)
    );
  }
}
```

## Authentication

Add authentication headers like any fetch request:

```typescript
const user = await fetcher('/api/users/me', {
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  },
  schema: UserSchema
});
```

## What's Next?

Now that you have the basics down, explore more advanced features:

- [Schema Validation Guide](/guides/schema-validation/)
- [Error Handling Guide](/guides/error-handling/)
- [TypeScript Integration](/guides/typescript/)
- [React Query Integration](/guides/react-query/)