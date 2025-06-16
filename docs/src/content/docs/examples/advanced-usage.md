---
title: Advanced Usage
description: Advanced patterns and techniques for @shkumbinhsn/fetcher
---

# Advanced Usage

This guide covers advanced patterns and techniques for power users of `@shkumbinhsn/fetcher`.

## GraphQL Integration

Use the fetcher with GraphQL APIs:

```typescript
import { fetcher, defineError } from '@shkumbinhsn/fetcher';
import { z } from 'zod';

// GraphQL error schema
const GraphQLError = defineError(400, z.object({
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
}));

// GraphQL response wrapper
const GraphQLResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: dataSchema.nullable(),
    errors: z.array(z.object({
      message: z.string(),
      locations: z.array(z.object({
        line: z.number(),
        column: z.number()
      })).optional(),
      path: z.array(z.union([z.string(), z.number()])).optional()
    })).optional()
  });

class GraphQLClient {
  constructor(
    private endpoint: string,
    private headers: Record<string, string> = {}
  ) {}

  async query<T>(
    query: string,
    variables: Record<string, any> = {},
    schema: z.ZodType<T>
  ): Promise<T> {
    const response = await fetcher(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers
      },
      body: JSON.stringify({ query, variables }),
      schema: GraphQLResponseSchema(schema),
      errors: [GraphQLError]
    });

    if (response.errors && response.errors.length > 0) {
      throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
    }

    if (response.data === null) {
      throw new Error('GraphQL query returned null data');
    }

    return response.data;
  }

  async mutation<T>(
    mutation: string,
    variables: Record<string, any> = {},
    schema: z.ZodType<T>
  ): Promise<T> {
    return this.query(mutation, variables, schema);
  }
}

// Usage
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string()
});

const client = new GraphQLClient('https://api.example.com/graphql', {
  'Authorization': 'Bearer token'
});

const user = await client.query(
  `query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }`,
  { id: '123' },
  z.object({ user: UserSchema })
);
```

## WebSocket Integration

Combine HTTP fetching with WebSocket subscriptions:

```typescript
interface SubscriptionOptions {
  onMessage: (data: any) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

class RealTimeClient {
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, SubscriptionOptions>();

  constructor(
    private httpClient: ApiClient,
    private wsUrl: string
  ) {}

  // HTTP methods from the base client
  async get<T>(endpoint: string, init?: FetcherRequestInit<T>) {
    return this.httpClient.get(endpoint, init);
  }

  async post<T>(endpoint: string, data?: any, init?: Omit<FetcherRequestInit<T>, 'method' | 'body'>) {
    return this.httpClient.post(endpoint, data, init);
  }

  // WebSocket subscription
  subscribe(channel: string, options: SubscriptionOptions) {
    if (!this.ws) {
      this.connect();
    }

    this.subscriptions.set(channel, options);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', channel }));
    }
  }

  unsubscribe(channel: string) {
    this.subscriptions.delete(channel);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', channel }));
    }
  }

  private connect() {
    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      // Subscribe to all pending channels
      for (const channel of this.subscriptions.keys()) {
        this.ws!.send(JSON.stringify({ type: 'subscribe', channel }));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const subscription = this.subscriptions.get(message.channel);
        
        if (subscription) {
          subscription.onMessage(message.data);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      for (const subscription of this.subscriptions.values()) {
        subscription.onError?.(new Error('WebSocket error'));
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      for (const subscription of this.subscriptions.values()) {
        subscription.onClose?.();
      }
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => this.connect(), 5000);
    };
  }

  disconnect() {
    this.subscriptions.clear();
    this.ws?.close();
    this.ws = null;
  }
}

// Usage
const httpClient = new ApiClient('https://api.example.com');
const realTimeClient = new RealTimeClient(httpClient, 'wss://api.example.com/ws');

// Use HTTP methods
const user = await realTimeClient.get('/users/123', { schema: UserSchema });

// Subscribe to real-time updates
realTimeClient.subscribe('user:123', {
  onMessage: (updatedUser) => {
    console.log('User updated:', updatedUser);
  },
  onError: (error) => {
    console.error('Subscription error:', error);
  }
});
```

## Multi-Tenant API Client

Handle multi-tenant applications:

```typescript
interface TenantConfig {
  id: string;
  apiUrl: string;
  apiKey: string;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

class MultiTenantClient {
  private clients = new Map<string, ApiClient>();
  private rateLimiters = new Map<string, RateLimitedClient>();

  constructor(private tenants: TenantConfig[]) {
    this.initializeClients();
  }

  private initializeClients() {
    for (const tenant of this.tenants) {
      const client = new ApiClient(tenant.apiUrl, { apiKey: tenant.apiKey });
      this.clients.set(tenant.id, client);

      if (tenant.rateLimit) {
        const rateLimiter = new RateLimitedClient(
          client,
          tenant.rateLimit.requests,
          tenant.rateLimit.windowMs
        );
        this.rateLimiters.set(tenant.id, rateLimiter);
      }
    }
  }

  getClient(tenantId: string): ApiClient {
    const client = this.clients.get(tenantId);
    if (!client) {
      throw new Error(`No client configured for tenant: ${tenantId}`);
    }
    return client;
  }

  getRateLimitedClient(tenantId: string): RateLimitedClient {
    const client = this.rateLimiters.get(tenantId);
    if (!client) {
      throw new Error(`No rate-limited client configured for tenant: ${tenantId}`);
    }
    return client;
  }

  async request<T>(
    tenantId: string,
    endpoint: string,
    init?: FetcherRequestInit<T>
  ): Promise<T> {
    const rateLimiter = this.rateLimiters.get(tenantId);
    
    if (rateLimiter) {
      return rateLimiter.request(endpoint, init);
    } else {
      const client = this.getClient(tenantId);
      return client.get(endpoint, init);
    }
  }

  // Batch requests across multiple tenants
  async batchRequest<T>(
    requests: Array<{
      tenantId: string;
      endpoint: string;
      init?: FetcherRequestInit<T>;
    }>
  ): Promise<Array<{ tenantId: string; result: T | Error }>> {
    const promises = requests.map(async ({ tenantId, endpoint, init }) => {
      try {
        const result = await this.request(tenantId, endpoint, init);
        return { tenantId, result };
      } catch (error) {
        return { tenantId, result: error as Error };
      }
    });

    return Promise.all(promises);
  }
}

// Configuration
const tenants: TenantConfig[] = [
  {
    id: 'tenant-1',
    apiUrl: 'https://tenant1.api.example.com',
    apiKey: 'key1',
    rateLimit: { requests: 100, windowMs: 60000 }
  },
  {
    id: 'tenant-2', 
    apiUrl: 'https://tenant2.api.example.com',
    apiKey: 'key2',
    rateLimit: { requests: 50, windowMs: 60000 }
  }
];

const multiClient = new MultiTenantClient(tenants);

// Single tenant request
const user = await multiClient.request('tenant-1', '/users/123', {
  schema: UserSchema
});

// Batch requests across tenants
const results = await multiClient.batchRequest([
  { tenantId: 'tenant-1', endpoint: '/stats', init: { schema: StatsSchema } },
  { tenantId: 'tenant-2', endpoint: '/stats', init: { schema: StatsSchema } }
]);
```

## Request Mocking and Testing

Advanced mocking for testing:

```typescript
interface MockResponse<T = any> {
  status: number;
  data?: T;
  headers?: Record<string, string>;
  delay?: number;
}

class MockClient {
  private mocks = new Map<string, MockResponse>();
  private callLog: Array<{ url: string; init?: FetcherRequestInit<any>; timestamp: number }> = [];

  constructor(private realClient?: ApiClient) {}

  mock(pattern: string | RegExp, response: MockResponse) {
    const key = pattern instanceof RegExp ? pattern.source : pattern;
    this.mocks.set(key, response);
  }

  clearMock(pattern: string | RegExp) {
    const key = pattern instanceof RegExp ? pattern.source : pattern;
    this.mocks.delete(key);
  }

  clearAllMocks() {
    this.mocks.clear();
    this.callLog = [];
  }

  getCallLog() {
    return [...this.callLog];
  }

  private findMock(url: string): MockResponse | null {
    for (const [pattern, response] of this.mocks) {
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        // Regex pattern
        const regex = new RegExp(pattern.slice(1, -1));
        if (regex.test(url)) return response;
      } else {
        // String pattern
        if (url.includes(pattern)) return response;
      }
    }
    return null;
  }

  async request<T>(url: string, init?: FetcherRequestInit<T>): Promise<T> {
    // Log the call
    this.callLog.push({ url, init, timestamp: Date.now() });

    const mock = this.findMock(url);
    
    if (mock) {
      // Simulate network delay
      if (mock.delay) {
        await new Promise(resolve => setTimeout(resolve, mock.delay));
      }

      if (mock.status >= 400) {
        throw new Error(`Mock error: ${mock.status}`);
      }

      return mock.data as T;
    }

    if (this.realClient) {
      return this.realClient.get(url, init);
    }

    throw new Error(`No mock found for ${url} and no real client provided`);
  }
}

// Test utilities
class TestScenario {
  constructor(private mockClient: MockClient) {}

  // Simulate network errors
  simulateNetworkError(pattern: string | RegExp) {
    this.mockClient.mock(pattern, { status: 500 });
  }

  // Simulate slow responses
  simulateSlowResponse(pattern: string | RegExp, delay: number) {
    this.mockClient.mock(pattern, { 
      status: 200, 
      data: { message: 'slow response' },
      delay 
    });
  }

  // Simulate rate limiting
  simulateRateLimit(pattern: string | RegExp) {
    this.mockClient.mock(pattern, { status: 429 });
  }

  // Create realistic user data
  createMockUser(overrides: Partial<z.infer<typeof UserSchema>> = {}) {
    return {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
      ...overrides
    };
  }
}

// Usage in tests
describe('API Client', () => {
  let mockClient: MockClient;
  let scenario: TestScenario;

  beforeEach(() => {
    mockClient = new MockClient();
    scenario = new TestScenario(mockClient);
  });

  it('should handle successful user fetch', async () => {
    const mockUser = scenario.createMockUser({ name: 'Test User' });
    mockClient.mock('/users/123', { 
      status: 200, 
      data: mockUser 
    });

    const user = await mockClient.request('/users/123', { schema: UserSchema });
    
    expect(user.name).toBe('Test User');
    expect(mockClient.getCallLog()).toHaveLength(1);
  });

  it('should handle network errors', async () => {
    scenario.simulateNetworkError('/users/123');

    await expect(
      mockClient.request('/users/123', { schema: UserSchema })
    ).rejects.toThrow('Mock error: 500');
  });

  it('should handle slow responses', async () => {
    scenario.simulateSlowResponse('/users', 1000);

    const start = Date.now();
    await mockClient.request('/users');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThan(900);
  });
});
```

## Performance Monitoring

Add performance monitoring and metrics:

```typescript
interface RequestMetrics {
  url: string;
  method: string;
  duration: number;
  status: number;
  size: number;
  timestamp: number;
  success: boolean;
}

class PerformanceMonitor {
  private metrics: RequestMetrics[] = [];
  private maxMetrics = 1000;

  recordRequest(metrics: RequestMetrics) {
    this.metrics.push(metrics);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getAverageResponseTime(pattern?: string): number {
    const filteredMetrics = pattern
      ? this.metrics.filter(m => m.url.includes(pattern))
      : this.metrics;

    if (filteredMetrics.length === 0) return 0;

    const total = filteredMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / filteredMetrics.length;
  }

  getSuccessRate(pattern?: string): number {
    const filteredMetrics = pattern
      ? this.metrics.filter(m => m.url.includes(pattern))
      : this.metrics;

    if (filteredMetrics.length === 0) return 0;

    const successful = filteredMetrics.filter(m => m.success).length;
    return (successful / filteredMetrics.length) * 100;
  }

  getMetricsSummary() {
    return {
      totalRequests: this.metrics.length,
      averageResponseTime: this.getAverageResponseTime(),
      successRate: this.getSuccessRate(),
      slowestRequest: Math.max(...this.metrics.map(m => m.duration)),
      fastestRequest: Math.min(...this.metrics.map(m => m.duration))
    };
  }

  exportMetrics(): RequestMetrics[] {
    return [...this.metrics];
  }
}

class MonitoredClient {
  private monitor = new PerformanceMonitor();

  constructor(private client: ApiClient) {}

  async request<T>(url: string, init?: FetcherRequestInit<T>): Promise<T> {
    const start = performance.now();
    const method = init?.method || 'GET';
    let status = 0;
    let success = false;

    try {
      const response = await this.client.get(url, init);
      status = 200; // Assuming success
      success = true;

      // Record metrics
      const duration = performance.now() - start;
      const size = JSON.stringify(response).length;

      this.monitor.recordRequest({
        url,
        method,
        duration,
        status,
        size,
        timestamp: Date.now(),
        success
      });

      return response;
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error) {
        status = error.statusCode as number;
      } else {
        status = 0; // Network error
      }

      const duration = performance.now() - start;
      this.monitor.recordRequest({
        url,
        method,
        duration,
        status,
        size: 0,
        timestamp: Date.now(),
        success: false
      });

      throw error;
    }
  }

  getPerformanceMetrics() {
    return this.monitor.getMetricsSummary();
  }

  exportMetrics() {
    return this.monitor.exportMetrics();
  }
}

// Usage
const client = new ApiClient('https://api.example.com');
const monitoredClient = new MonitoredClient(client);

// Make some requests
await monitoredClient.request('/users', { schema: z.array(UserSchema) });
await monitoredClient.request('/posts', { schema: z.array(PostSchema) });

// Get performance insights
const metrics = monitoredClient.getPerformanceMetrics();
console.log(`Average response time: ${metrics.averageResponseTime}ms`);
console.log(`Success rate: ${metrics.successRate}%`);
```

## Circuit Breaker Pattern

Implement circuit breaker for fault tolerance:

```typescript
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringWindow: number;
}

class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failures = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.options.recoveryTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 3) { // Require 3 successes to close
        this.state = CircuitState.CLOSED;
      }
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState() {
    return this.state;
  }
}

class ResilientClient {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  constructor(private client: ApiClient) {}

  private getCircuitBreaker(endpoint: string): CircuitBreaker {
    if (!this.circuitBreakers.has(endpoint)) {
      this.circuitBreakers.set(endpoint, new CircuitBreaker({
        failureThreshold: 5,
        recoveryTimeout: 30000, // 30 seconds
        monitoringWindow: 60000  // 1 minute
      }));
    }
    return this.circuitBreakers.get(endpoint)!;
  }

  async request<T>(url: string, init?: FetcherRequestInit<T>): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(url);
    
    return circuitBreaker.execute(async () => {
      return this.client.get(url, init);
    });
  }

  getCircuitBreakerStatus(endpoint: string) {
    const cb = this.circuitBreakers.get(endpoint);
    return cb ? cb.getState() : null;
  }
}

// Usage
const client = new ApiClient('https://api.example.com');
const resilientClient = new ResilientClient(client);

try {
  const user = await resilientClient.request('/users/123', { schema: UserSchema });
} catch (error) {
  if (error.message === 'Circuit breaker is OPEN') {
    console.log('Service is temporarily unavailable');
  }
}

console.log('Circuit breaker state:', resilientClient.getCircuitBreakerStatus('/users/123'));
```

These advanced patterns demonstrate the flexibility and power of `@shkumbinhsn/fetcher` for building robust, production-ready applications.

## Next Steps

- [Common Patterns](/examples/common-patterns/) - Essential patterns for daily use
- [API Reference](/api/fetcher/) - Complete API documentation
- [TypeScript Integration](/guides/typescript/) - Advanced TypeScript usage