---
title: React Query Integration
description: Learn how to use @shkumbinhsn/fetcher with React Query for powerful data fetching
---

# React Query Integration

`@shkumbinhsn/fetcher` works seamlessly with [React Query](https://tanstack.com/query) (now TanStack Query) to provide powerful data fetching capabilities with type safety and schema validation.

## Installation

Install React Query alongside the fetcher:

```bash
npm install @tanstack/react-query @shkumbinhsn/fetcher
```

## Basic Setup

Set up React Query in your app:

```typescript
// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

## Query Functions

Use `fetcher` in your query functions:

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetcher, defineError } from '@shkumbinhsn/fetcher';
import { z } from 'zod';

// Define schemas
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string().url().optional()
});

const NotFoundError = defineError(404, z.object({
  message: z.string(),
  resource: z.string()
}));

// Query function
async function getUser(id: string) {
  return fetcher(`/api/users/${id}`, {
    schema: UserSchema,
    errors: [NotFoundError]
  });
}

// Component
function UserProfile({ userId }: { userId: string }) {
  const { data: user, error, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUser(userId)
  });

  if (isLoading) return <div>Loading...</div>;
  
  if (error) {
    if (error instanceof NotFoundError) {
      return <div>User not found</div>;
    }
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      {user.avatar && <img src={user.avatar} alt="Avatar" />}
    </div>
  );
}
```

## Query with Parameters

Handle query parameters and filters:

```typescript
const UsersSchema = z.object({
  users: z.array(UserSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number()
  })
});

async function getUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);

  return fetcher(`/api/users?${searchParams}`, {
    schema: UsersSchema
  });
}

function UsersList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, error, isLoading } = useQuery({
    queryKey: ['users', { page, search }],
    queryFn: () => getUsers({ page, search, limit: 10 })
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search users..."
      />
      
      {data.users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
      
      <div>
        Page {page} of {Math.ceil(data.pagination.total / data.pagination.limit)}
        <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
          Previous
        </button>
        <button onClick={() => setPage(p => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
```

## Mutations

Use `fetcher` with React Query mutations:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string().email()
});

const ValidationError = defineError(400, z.object({
  errors: z.array(z.object({
    field: z.string(),
    message: z.string()
  }))
}));

async function createUser(data: z.infer<typeof CreateUserSchema>) {
  return fetcher('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data),
    schema: UserSchema,
    errors: [ValidationError]
  });
}

function CreateUserForm() {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: (newUser) => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      // Optimistically update the cache
      queryClient.setQueryData(['user', newUser.id], newUser);
    },
    onError: (error) => {
      if (error instanceof ValidationError) {
        console.log('Validation errors:', error.data.errors);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    mutation.mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create User'}
      </button>
      
      {mutation.error && (
        <div>
          {mutation.error instanceof ValidationError ? (
            <ul>
              {mutation.error.data.errors.map((err, i) => (
                <li key={i}>{err.field}: {err.message}</li>
              ))}
            </ul>
          ) : (
            <p>Error: {mutation.error.message}</p>
          )}
        </div>
      )}
    </form>
  );
}
```

## Custom Hooks

Create reusable custom hooks:

```typescript
// hooks/useUser.ts
export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => getUser(id),
    enabled: !!id // Only run if id is provided
  });
}

// hooks/useUsers.ts
export function useUsers(params: {
  page?: number;
  search?: string;
} = {}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => getUsers(params)
  });
}

// hooks/useCreateUser.ts
export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createUser,
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.setQueryData(['user', newUser.id], newUser);
    }
  });
}

// Usage in components
function UserProfile({ userId }: { userId: string }) {
  const { data: user, error, isLoading } = useUser(userId);
  // ... component logic
}
```

## Error Boundaries

Handle errors with React Error Boundaries:

```typescript
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  if (error instanceof NotFoundError) {
    return (
      <div>
        <h2>Resource Not Found</h2>
        <p>{error.data.message}</p>
        <button onClick={resetErrorBoundary}>Try Again</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={resetErrorBoundary}>Try Again</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <UsersList />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

## Optimistic Updates

Implement optimistic updates with rollback on error:

```typescript
function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      return fetcher(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        schema: UserSchema,
        errors: [NotFoundError, ValidationError]
      });
    },
    
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user', id] });
      
      // Snapshot previous value
      const previousUser = queryClient.getQueryData(['user', id]);
      
      // Optimistically update
      queryClient.setQueryData(['user', id], (old: User | undefined) => 
        old ? { ...old, ...data } : undefined
      );
      
      return { previousUser };
    },
    
    onError: (err, { id }, context) => {
      // Rollback on error
      if (context?.previousUser) {
        queryClient.setQueryData(['user', id], context.previousUser);
      }
    },
    
    onSettled: (data, error, { id }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['user', id] });
    }
  });
}
```

## Infinite Queries

Implement pagination with infinite queries:

```typescript
const PaginatedUsersSchema = z.object({
  users: z.array(UserSchema),
  pagination: z.object({
    page: z.number(),
    hasMore: z.boolean(),
    total: z.number()
  })
});

async function getUsersPage(page: number) {
  return fetcher(`/api/users?page=${page}&limit=20`, {
    schema: PaginatedUsersSchema
  });
}

function InfiniteUsersList() {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['users', 'infinite'],
    queryFn: ({ pageParam = 1 }) => getUsersPage(pageParam),
    getNextPageParam: (lastPage) => 
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data.pages.map((page, i) => (
        <div key={i}>
          {page.users.map(user => (
            <div key={user.id}>{user.name}</div>
          ))}
        </div>
      ))}
      
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading more...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

## Authentication Integration

Handle authentication with React Query:

```typescript
// Auth context
const AuthContext = createContext<{
  token: string | null;
  setToken: (token: string | null) => void;
}>(null!);

// Authenticated fetcher
function createAuthenticatedFetcher(token: string | null) {
  return async function<T>(url: string, init?: FetcherRequestInit<T>) {
    return fetcher(url, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...init?.headers
      },
      ...init
    });
  };
}

// Custom hook that uses authenticated fetcher
function useAuthenticatedQuery<T>(
  queryKey: any[],
  queryFn: (fetcher: typeof fetcher) => Promise<T>,
  options?: any
) {
  const { token } = useContext(AuthContext);
  const authenticatedFetcher = createAuthenticatedFetcher(token);
  
  return useQuery({
    queryKey: [...queryKey, token], // Include token in query key
    queryFn: () => queryFn(authenticatedFetcher),
    enabled: !!token, // Only run if authenticated
    ...options
  });
}

// Usage
function useAuthenticatedUser() {
  return useAuthenticatedQuery(
    ['user', 'me'],
    (fetcher) => fetcher('/api/users/me', { schema: UserSchema })
  );
}
```

## Best Practices

1. **Use specific error types**: Define custom error classes for better error handling
2. **Leverage query keys**: Use structured query keys for better cache management
3. **Handle loading states**: Always handle loading and error states in your components
4. **Optimize cache updates**: Use `setQueryData` for optimistic updates
5. **Type safety**: Let TypeScript infer types from your schemas
6. **Error boundaries**: Use error boundaries for graceful error handling

## Next Steps

- [Examples](/examples/common-patterns/) - Common usage patterns
- [API Reference](/api/fetcher/) - Complete API documentation
- [Advanced Usage](/examples/advanced-usage/) - Advanced patterns and techniques