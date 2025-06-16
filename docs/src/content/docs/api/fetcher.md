---
title: fetcher()
description: Complete API reference for the fetcher function
---

# fetcher()

The main function for making type-safe HTTP requests with schema validation and error handling.

## Signature

```typescript
function fetcher<TResponse extends StandardSchemaV1 | undefined = undefined>(
  input: RequestInfo | URL,
  init?: FetcherRequestInit<TResponse>
): Promise<InferResponse<TResponse>>
```

## Parameters

### `input: RequestInfo | URL`

The URL or Request object to fetch from. This parameter works exactly like the first parameter of the standard `fetch()` function.

**Examples:**
```typescript
// String URL
await fetcher('/api/users');

// URL object
await fetcher(new URL('/api/users', 'https://api.example.com'));

// Request object
const request = new Request('/api/users', { method: 'POST' });
await fetcher(request);
```

### `init?: FetcherRequestInit<TResponse>`

Optional configuration object that extends the standard `RequestInit` with additional properties.

#### Standard RequestInit Properties

All standard `fetch()` options are supported:

- `method?: string` - HTTP method (GET, POST, PUT, DELETE, etc.)
- `headers?: HeadersInit` - Request headers
- `body?: BodyInit` - Request body
- `mode?: RequestMode` - CORS mode
- `credentials?: RequestCredentials` - Credentials handling
- `cache?: RequestCache` - Cache control
- `redirect?: RequestRedirect` - Redirect handling
- `referrer?: string` - Referrer URL
- `referrerPolicy?: ReferrerPolicy` - Referrer policy
- `integrity?: string` - Subresource integrity
- `keepalive?: boolean` - Keep connection alive
- `signal?: AbortSignal` - Abort signal for cancellation
- `window?: null` - Window object (must be null)

#### Extended Properties

- `schema?: TResponse` - Response validation schema
- `errors?: ApiErrorStatic<any>[]` - Custom error classes for error handling

## Return Value

Returns a `Promise` that resolves to the validated response data. The return type is automatically inferred from the schema:

- If no schema is provided: `Promise<any>`
- If schema is provided: `Promise<InferResponse<TSchema>>`

## Examples

### Basic Usage

```typescript
// Simple GET request
const data = await fetcher('/api/users');

// POST request with body
const user = await fetcher('/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com'
  })
});
```

### With Schema Validation

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email()
});

// Type-safe response
const user = await fetcher('/api/users/123', {
  schema: UserSchema
});

// user is typed as { id: string; name: string; email: string }
console.log(user.name); // TypeScript knows this is a string
```

### With Error Handling

```typescript
import { defineError } from '@shkumbinhsn/fetcher';

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

try {
  const user = await fetcher('/api/users/999', {
    schema: UserSchema,
    errors: [NotFoundError, ValidationError]
  });
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log(`Not found: ${error.data.resource}`);
  } else if (error instanceof ValidationError) {
    error.data.errors.forEach(err => 
      console.log(`${err.field}: ${err.message}`)
    );
  }
}
```

### Authentication

```typescript
const user = await fetcher('/api/users/me', {
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  },
  schema: UserSchema
});
```

### Request Timeout

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const data = await fetcher('/api/slow-endpoint', {
    signal: controller.signal,
    schema: DataSchema
  });
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request timed out');
  }
} finally {
  clearTimeout(timeoutId);
}
```

### File Upload

```typescript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('name', 'Document Name');

const uploadResult = await fetcher('/api/upload', {
  method: 'POST',
  body: formData,
  schema: z.object({
    id: z.string(),
    url: z.string(),
    size: z.number()
  })
});
```

### Query Parameters

```typescript
const params = new URLSearchParams({
  page: '1',
  limit: '10',
  search: 'john'
});

const users = await fetcher(`/api/users?${params}`, {
  schema: z.object({
    users: z.array(UserSchema),
    pagination: z.object({
      page: z.number(),
      total: z.number()
    })
  })
});
```

## Error Handling

The function throws different types of errors based on the situation:

### API Errors (with custom error classes)

When custom error classes are provided and match the response status:

```typescript
try {
  await fetcher('/api/users/999', {
    errors: [NotFoundError]
  });
} catch (error) {
  if (error instanceof NotFoundError) {
    // error.data contains validated error response data
    // error.statusCode contains the HTTP status code
    // error.response contains the original Response object
  }
}
```

### Validation Errors

When response validation fails:

```typescript
try {
  await fetcher('/api/users/123', {
    schema: UserSchema
  });
} catch (error) {
  // Generic Error with message "Response validation failed: ..."
  console.log(error.message);
}
```

### Network Errors

When the request fails at the network level:

```typescript
try {
  await fetcher('/api/users');
} catch (error) {
  // Generic Error with message "Request failed: ..."
  console.log(error.message);
}
```

### Generic HTTP Errors

When no custom error classes are provided for the status code:

```typescript
try {
  await fetcher('/api/users/999'); // Returns 404
} catch (error) {
  // Generic Error with message "Request failed: 404 Not Found"
  console.log(error.message);
}
```

## Special Response Handling

### Empty Responses (204 No Content)

```typescript
// Returns null for 204 responses or empty content
const result = await fetcher('/api/users/123', {
  method: 'DELETE'
}); // result is null
```

### Non-JSON Responses

The function expects JSON responses. For other content types, use the standard `fetch()` function:

```typescript
// For text responses
const response = await fetch('/api/text-endpoint');
const text = await response.text();

// For blob responses  
const response = await fetch('/api/file-download');
const blob = await response.blob();
```

## TypeScript Integration

The function provides full TypeScript support with automatic type inference:

```typescript
// Response type is inferred from schema
const user = await fetcher('/api/users/123', {
  schema: UserSchema
}); // Type: { id: string; name: string; email: string }

// Without schema, type is any
const data = await fetcher('/api/users/123'); // Type: any

// Custom request init types
interface CustomInit<T> extends FetcherRequestInit<T> {
  retries?: number;
}

async function customFetch<T>(url: string, init?: CustomInit<T>) {
  // Custom logic here
  return fetcher(url, init);
}
```

## Related

- [`defineError()`](/api/define-error/) - Create custom error classes
- [`FetcherRequestInit`](/api/types/#fetcherrequestinit) - Request configuration type
- [`InferResponse`](/api/types/#inferresponse) - Response type inference