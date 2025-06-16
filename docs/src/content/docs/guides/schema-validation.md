---
title: Schema Validation
description: Learn how to use schema validation for type-safe API responses
---

# Schema Validation

Schema validation is one of the core features of `@shkumbinhsn/fetcher`. It automatically validates API responses and provides full type safety using Standard Schema compatible libraries.

## Supported Libraries

Any library that implements the [Standard Schema](https://github.com/standard-schema/standard-schema) specification:

- **Zod** - Most popular, great TypeScript integration
- **Valibot** - Lightweight alternative to Zod
- **ArkType** - High-performance runtime validation
- **Effect Schema** - Part of the Effect ecosystem

## Basic Schema Usage

### With Zod

```typescript
import { fetcher } from '@shkumbinhsn/fetcher';
import { z } from 'zod';

// Define your schema
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string().url().optional(),
  createdAt: z.string().datetime()
});

// Use it in requests
const user = await fetcher('/api/users/123', {
  schema: UserSchema
});

// user is fully typed as:
// {
//   id: string;
//   name: string; 
//   email: string;
//   avatar?: string;
//   createdAt: string;
// }
```

### With Valibot

```typescript
import { fetcher } from '@shkumbinhsn/fetcher';
import * as v from 'valibot';

const UserSchema = v.object({
  id: v.string(),
  name: v.string(),
  email: v.pipe(v.string(), v.email()),
  avatar: v.optional(v.pipe(v.string(), v.url())),
  createdAt: v.pipe(v.string(), v.isoDateTime())
});

const user = await fetcher('/api/users/123', {
  schema: UserSchema
});
```

## Array Responses

Validate arrays of data:

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email()
});

// Array of users
const UsersSchema = z.array(UserSchema);

const users = await fetcher('/api/users', {
  schema: UsersSchema
});

// users is typed as User[]
users.forEach(user => {
  console.log(user.name); // Type-safe
});
```

## Nested Objects

Handle complex nested data structures:

```typescript
const PostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  author: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email()
  }),
  tags: z.array(z.string()),
  metadata: z.object({
    views: z.number(),
    likes: z.number(),
    publishedAt: z.string().datetime()
  })
});

const post = await fetcher('/api/posts/123', {
  schema: PostSchema
});

console.log(post.author.name);     // Type-safe
console.log(post.metadata.views);  // Type-safe
console.log(post.tags[0]);         // Type-safe
```

## Optional Fields

Handle optional and nullable fields:

```typescript
const UserProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  bio: z.string().optional(),        // May be undefined
  avatar: z.string().nullable(),     // May be null
  settings: z.object({
    theme: z.enum(['light', 'dark']).default('light'),
    notifications: z.boolean().default(true)
  }).optional()
});

const profile = await fetcher('/api/users/123/profile', {
  schema: UserProfileSchema
});

// Handle optional fields safely
if (profile.bio) {
  console.log(`Bio: ${profile.bio}`);
}

if (profile.avatar !== null) {
  console.log(`Avatar: ${profile.avatar}`);
}
```

## Transformations

Apply transformations during validation:

```typescript
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().toLowerCase(), // Transform to lowercase
  createdAt: z.string().datetime().transform(date => new Date(date)), // Transform to Date object
  age: z.number().int().min(0).max(150)
});

const user = await fetcher('/api/users/123', {
  schema: UserSchema
});

// user.email is guaranteed to be lowercase
// user.createdAt is a Date object, not a string
console.log(user.createdAt.getFullYear());
```

## Union Types

Handle responses that can have different shapes:

```typescript
const SuccessSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    name: z.string()
  })
});

const ErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string()
  })
});

const ResponseSchema = z.union([SuccessSchema, ErrorSchema]);

const response = await fetcher('/api/users', {
  schema: ResponseSchema
});

if (response.success) {
  console.log(response.data.name); // TypeScript knows this is available
} else {
  console.log(response.error.message); // TypeScript knows this is available
}
```

## Custom Validation

Create reusable custom validators:

```typescript
// Custom UUID validator
const uuid = () => z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  'Invalid UUID format'
);

// Custom date validator
const isoDate = () => z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  'Invalid ISO date string'
);

const UserSchema = z.object({
  id: uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  createdAt: isoDate()
});
```

## Validation Error Handling

Handle validation failures:

```typescript
try {
  const user = await fetcher('/api/users/123', {
    schema: UserSchema
  });
} catch (error) {
  if (error.message.includes('Response validation failed')) {
    console.error('The API response doesn\'t match the expected schema');
    console.error('This might indicate an API change or bug');
  }
  throw error;
}
```

## Without Schema

You can still use the library without schemas for untyped responses:

```typescript
// Returns any - no validation or type safety
const data = await fetcher('/api/legacy-endpoint');

// You can still use all other features like error handling
const data2 = await fetcher('/api/legacy-endpoint', {
  errors: [NotFoundError]
});
```

## Performance Considerations

- Schemas are validated at runtime, so complex schemas may impact performance
- Consider using simpler schemas for frequently called endpoints
- Cache compiled schemas when possible (most libraries do this automatically)

## Next Steps

- [Error Handling](/guides/error-handling/) - Handle API errors with typed error schemas
- [TypeScript Integration](/guides/typescript/) - Advanced TypeScript patterns
- [API Reference](/api/fetcher/) - Complete API documentation