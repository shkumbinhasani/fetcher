---
title: Common Patterns
description: Common usage patterns and best practices for @shkumbinhsn/fetcher
---

# Common Patterns

This guide covers common usage patterns and best practices when using `@shkumbinhsn/fetcher` in real-world applications.

## API Client Class

Create a reusable API client with common configuration:

```typescript
import { fetcher, defineError, type FetcherRequestInit } from '@shkumbinhsn/fetcher';
import { z } from 'zod';

// Common error definitions
const UnauthorizedError = defineError(401, z.object({
  message: z.string(),
  code: z.string()
}));

const ForbiddenError = defineError(403, z.object({
  message: z.string(),
  requiredPermissions: z.array(z.string())
}));

const ValidationError = defineError(400, z.object({
  message: z.string(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string()
  }))
}));

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string, options: { apiKey?: string; version?: string } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...(options.apiKey && { 'Authorization': `Bearer ${options.apiKey}` }),
      ...(options.version && { 'Accept': `application/vnd.api+json;version=${options.version}` })
    };
  }

  private async request<T>(
    endpoint: string,
    init?: FetcherRequestInit<T>
  ) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    return fetcher(url, {
      headers: {
        ...this.defaultHeaders,
        ...init?.headers
      },
      errors: [UnauthorizedError, ForbiddenError, ValidationError],
      ...init
    });
  }

  // GET request
  async get<T>(endpoint: string, init?: Omit<FetcherRequestInit<T>, 'method'>) {
    return this.request(endpoint, { method: 'GET', ...init });
  }

  // POST request
  async post<T>(endpoint: string, data?: any, init?: Omit<FetcherRequestInit<T>, 'method' | 'body'>) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...init
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any, init?: Omit<FetcherRequestInit<T>, 'method' | 'body'>) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...init
    });
  }

  // PATCH request
  async patch<T>(endpoint: string, data?: any, init?: Omit<FetcherRequestInit<T>, 'method' | 'body'>) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      ...init
    });
  }

  // DELETE request
  async delete<T>(endpoint: string, init?: Omit<FetcherRequestInit<T>, 'method'>) {
    return this.request(endpoint, { method: 'DELETE', ...init });
  }

  // Update authentication
  setAuth(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Remove authentication
  clearAuth() {
    delete this.defaultHeaders['Authorization'];
  }
}

// Usage
const client = new ApiClient('https://api.example.com', { 
  apiKey: 'your-api-key',
  version: '2024-01-01'
});

const user = await client.get('/users/123', { schema: UserSchema });
const newUser = await client.post('/users', userData, { schema: UserSchema });
```

## Pagination Handling

Handle paginated API responses:

```typescript
const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      pages: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean()
    })
  });

class PaginatedFetcher<T> {
  constructor(
    private itemSchema: z.ZodType<T>,
    private endpoint: string,
    private client: ApiClient
  ) {}

  async getPage(page: number = 1, limit: number = 20) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    return this.client.get(`${this.endpoint}?${params}`, {
      schema: PaginatedResponseSchema(this.itemSchema)
    });
  }

  async *getAllItems(limit: number = 20): AsyncGenerator<T, void, unknown> {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getPage(page, limit);
      
      for (const item of response.data) {
        yield item;
      }

      hasMore = response.pagination.hasNext;
      page++;
    }
  }

  async getAllPages(limit: number = 20) {
    const items: T[] = [];
    
    for await (const item of this.getAllItems(limit)) {
      items.push(item);
    }
    
    return items;
  }
}

// Usage
const userFetcher = new PaginatedFetcher(UserSchema, '/users', client);

// Get single page
const firstPage = await userFetcher.getPage(1, 10);

// Get all items using async generator
for await (const user of userFetcher.getAllItems(50)) {
  console.log(user.name);
}

// Get all items as array
const allUsers = await userFetcher.getAllPages(100);
```

## Request Retries with Exponential Backoff

Implement automatic retries for failed requests:

```typescript
interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryOn?: number[];
}

function withRetry<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: RetryOptions = {}
) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    retryOn = [500, 502, 503, 504, 408, 429]
  } = options;

  return async (...args: T): Promise<R> => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;

        // Don't retry on last attempt
        if (attempt === maxRetries) break;

        // Check if error is retryable
        const shouldRetry = error instanceof Error && 
          'statusCode' in error &&
          typeof error.statusCode === 'number' &&
          retryOn.includes(error.statusCode);

        if (!shouldRetry) break;

        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        
        console.log(`Retrying request in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  };
}

// Usage
const retryingFetcher = withRetry(
  (url: string, init?: FetcherRequestInit<any>) => fetcher(url, init),
  { maxRetries: 3, baseDelay: 1000 }
);

const user = await retryingFetcher('/api/users/123', { schema: UserSchema });
```

## Request/Response Interceptors

Add request and response interceptors:

```typescript
interface Interceptors {
  request?: (url: string, init?: FetcherRequestInit<any>) => 
    Promise<{ url: string; init?: FetcherRequestInit<any> }>;
  response?: <T>(response: T, url: string, init?: FetcherRequestInit<any>) => 
    Promise<T>;
  error?: (error: unknown, url: string, init?: FetcherRequestInit<any>) => 
    Promise<never>;
}

class InterceptedClient {
  private interceptors: Interceptors = {};

  constructor(private baseClient: ApiClient) {}

  addInterceptor(type: keyof Interceptors, interceptor: any) {
    this.interceptors[type] = interceptor;
  }

  async request<T>(url: string, init?: FetcherRequestInit<T>): Promise<T> {
    let requestUrl = url;
    let requestInit = init;

    // Request interceptor
    if (this.interceptors.request) {
      const intercepted = await this.interceptors.request(url, init);
      requestUrl = intercepted.url;
      requestInit = intercepted.init;
    }

    try {
      const response = await this.baseClient.get<T>(requestUrl, requestInit);

      // Response interceptor
      if (this.interceptors.response) {
        return await this.interceptors.response(response, requestUrl, requestInit);
      }

      return response;
    } catch (error) {
      // Error interceptor
      if (this.interceptors.error) {
        return await this.interceptors.error(error, requestUrl, requestInit);
      }
      throw error;
    }
  }
}

// Usage
const client = new ApiClient('https://api.example.com');
const interceptedClient = new InterceptedClient(client);

// Add request logging
interceptedClient.addInterceptor('request', async (url, init) => {
  console.log(`Making request to: ${url}`);
  return { url, init };
});

// Add response timing
interceptedClient.addInterceptor('response', async (response, url) => {
  console.log(`Response received from: ${url}`);
  return response;
});

// Add error logging
interceptedClient.addInterceptor('error', async (error, url) => {
  console.error(`Request failed for: ${url}`, error);
  throw error;
});
```

## Caching Layer

Add a simple caching layer:

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CachedClient {
  private cache = new Map<string, CacheEntry<any>>();

  constructor(private client: ApiClient) {}

  private getCacheKey(url: string, init?: FetcherRequestInit<any>) {
    return `${init?.method || 'GET'}:${url}:${JSON.stringify(init?.headers || {})}`;
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  async get<T>(
    url: string, 
    init?: FetcherRequestInit<T> & { cacheTtl?: number }
  ): Promise<T> {
    const { cacheTtl = 5 * 60 * 1000, ...fetchInit } = init || {}; // 5 minutes default
    const cacheKey = this.getCacheKey(url, fetchInit);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isExpired(cached)) {
      console.log('Cache hit for:', url);
      return cached.data;
    }

    // Fetch fresh data
    console.log('Cache miss for:', url);
    const data = await this.client.get(url, fetchInit);

    // Store in cache
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: cacheTtl
    });

    return data;
  }

  clearCache(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Usage
const client = new ApiClient('https://api.example.com');
const cachedClient = new CachedClient(client);

// This will make a network request
const user1 = await cachedClient.get('/users/123', { 
  schema: UserSchema,
  cacheTtl: 10 * 60 * 1000 // 10 minutes
});

// This will use cached data
const user2 = await cachedClient.get('/users/123', { schema: UserSchema });

// Clear specific cache entries
cachedClient.clearCache('/users/');
```

## Request Queuing and Rate Limiting

Implement request queuing to avoid rate limits:

```typescript
class RateLimitedClient {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestCount = 0;
  private windowStart = Date.now();

  constructor(
    private client: ApiClient,
    private maxRequestsPerWindow: number = 100,
    private windowMs: number = 60 * 1000 // 1 minute
  ) {}

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      // Reset window if needed
      const now = Date.now();
      if (now - this.windowStart >= this.windowMs) {
        this.requestCount = 0;
        this.windowStart = now;
      }

      // Check rate limit
      if (this.requestCount >= this.maxRequestsPerWindow) {
        const waitTime = this.windowMs - (now - this.windowStart);
        console.log(`Rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // Process next request
      const request = this.queue.shift()!;
      this.requestCount++;
      
      try {
        await request();
      } catch (error) {
        console.error('Queued request failed:', error);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.processing = false;
  }

  async request<T>(url: string, init?: FetcherRequestInit<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await this.client.get(url, init);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }
}

// Usage
const client = new ApiClient('https://api.example.com');
const rateLimitedClient = new RateLimitedClient(client, 60, 60 * 1000); // 60 requests per minute

// These will be queued and executed within rate limits
const users = await Promise.all([
  rateLimitedClient.request('/users/1', { schema: UserSchema }),
  rateLimitedClient.request('/users/2', { schema: UserSchema }),
  rateLimitedClient.request('/users/3', { schema: UserSchema })
]);
```

## Environment Configuration

Handle different environments:

```typescript
interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retries: number;
  debug: boolean;
}

const configs: Record<string, ApiConfig> = {
  development: {
    baseUrl: 'http://localhost:3000/api',
    timeout: 10000,
    retries: 1,
    debug: true
  },
  staging: {
    baseUrl: 'https://staging-api.example.com',
    apiKey: process.env.STAGING_API_KEY,
    timeout: 8000,
    retries: 2,
    debug: true
  },
  production: {
    baseUrl: 'https://api.example.com',
    apiKey: process.env.PRODUCTION_API_KEY!,
    timeout: 5000,
    retries: 3,
    debug: false
  }
};

function createClient(environment: keyof typeof configs = 'production') {
  const config = configs[environment];
  
  if (!config) {
    throw new Error(`Unknown environment: ${environment}`);
  }

  const client = new ApiClient(config.baseUrl, { apiKey: config.apiKey });

  // Apply environment-specific configurations
  if (config.debug) {
    console.log(`API client created for ${environment}:`, config.baseUrl);
  }

  return {
    client,
    config,
    // Environment-aware request method
    async request<T>(url: string, init?: FetcherRequestInit<T>) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      try {
        return await withRetry(
          () => client.get(url, { signal: controller.signal, ...init }),
          { maxRetries: config.retries }
        )();
      } finally {
        clearTimeout(timeoutId);
      }
    }
  };
}

// Usage
const { client, request } = createClient(process.env.NODE_ENV as any);
const user = await request('/users/123', { schema: UserSchema });
```

These patterns provide a solid foundation for building robust API clients with `@shkumbinhsn/fetcher`. They can be combined and customized based on your specific requirements.

## Next Steps

- [Advanced Usage Examples](/examples/advanced-usage/) - More complex patterns and techniques
- [API Reference](/api/fetcher/) - Complete API documentation
- [TypeScript Integration](/guides/typescript/) - Advanced TypeScript patterns