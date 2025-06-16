---
title: Basic Usage
description: Learn the fundamentals of using @shkumbinhsn/fetcher
---

# Basic Usage

This guide covers the fundamental concepts and usage patterns of `@shkumbinhsn/fetcher`.

## Import the Library

```typescript
import { fetcher } from '@shkumbinhsn/fetcher';
```

## Making Requests

### GET Requests

```typescript
// Simple GET request
const data = await fetcher('/api/users');

// GET with query parameters (use URLSearchParams or add to URL)
const params = new URLSearchParams({ page: '1', limit: '10' });
const users = await fetcher(`/api/users?${params}`);

// GET with headers
const user = await fetcher('/api/users/123', {
  headers: {
    'Authorization': 'Bearer token',
    'Accept': 'application/json'
  }
});
```

### POST Requests

```typescript
// POST with JSON body
const newUser = await fetcher('/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com'
  })
});

// POST with FormData
const formData = new FormData();
formData.append('name', 'John Doe');
formData.append('avatar', fileInput.files[0]);

const user = await fetcher('/api/users', {
  method: 'POST',
  body: formData
});

// POST with URLSearchParams
const params = new URLSearchParams();
params.append('name', 'John Doe');
params.append('email', 'john@example.com');

const user = await fetcher('/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: params
});
```

### PUT/PATCH Requests

```typescript
// PUT - full replacement
const updatedUser = await fetcher('/api/users/123', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id: '123',
    name: 'Jane Doe',
    email: 'jane@example.com'
  })
});

// PATCH - partial update
const patchedUser = await fetcher('/api/users/123', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Jane Smith'
  })
});
```

### DELETE Requests

```typescript
// DELETE request
await fetcher('/api/users/123', {
  method: 'DELETE'
});

// DELETE with confirmation in body
await fetcher('/api/users/123', {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    confirm: true
  })
});
```

## Request Configuration

### Timeout

```typescript
// 10 second timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

try {
  const data = await fetcher('/api/slow-endpoint', {
    signal: controller.signal
  });
} finally {
  clearTimeout(timeoutId);
}
```

### Base URL

Create a configured instance for a specific API:

```typescript
// Create a wrapper function
function apiCall(endpoint: string, init?: RequestInit) {
  return fetcher(`https://api.example.com${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      ...init?.headers
    },
    ...init
  });
}

// Use it
const users = await apiCall('/users');
const user = await apiCall('/users/123');
```

### Request Interceptors

```typescript
// Create a wrapper with common logic
async function authenticatedFetch(url: string, init?: RequestInit) {
  const token = await getAuthToken();
  
  return fetcher(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      ...init?.headers
    },
    ...init
  });
}
```

## Response Handling

### Empty Responses

The library handles empty responses (204 No Content) automatically:

```typescript
// Returns null for empty responses
const result = await fetcher('/api/users/123', {
  method: 'DELETE'
}); // result is null
```

### Response Headers

Access response data through error handling or by not using schema validation:

```typescript
// Without schema, you get the raw response
const response = await fetch('/api/users'); // Use fetch directly for headers
const data = await response.json();
const contentType = response.headers.get('content-type');

// Or catch and inspect errors for response details
try {
  await fetcher('/api/users/999');
} catch (error) {
  if (error instanceof ApiError) {
    console.log(error.response.headers.get('x-rate-limit'));
  }
}
```

## Next Steps

- [Schema Validation](/guides/schema-validation/) - Add type safety with schemas
- [Error Handling](/guides/error-handling/) - Handle API errors gracefully
- [TypeScript Integration](/guides/typescript/) - Advanced TypeScript usage