import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { fetcher, defineError, ApiError, SchemaValidationError } from '../src';

const mockFetch = vi.mocked(fetch);

describe('fetcher', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should make a basic request without schema', async () => {
    const responseData = { id: '123', name: 'John' };
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(responseData), { status: 200 })
    );

    const result = await fetcher('/api/users/123');
    
    expect(result).toEqual(responseData);
    expect(mockFetch).toHaveBeenCalledWith('/api/users/123', {});
  });

  it('should validate response with schema', async () => {
    const userSchema = z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email()
    });

    const responseData = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com'
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(responseData), { status: 200 })
    );

    const result = await fetcher('/api/users/123', { schema: userSchema });
    
    expect(result).toEqual(responseData);
  });

  it('should throw error for invalid response schema', async () => {
    const userSchema = z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email()
    });

    const invalidResponseData = {
      id: 123, // should be string
      name: 'John Doe',
      email: 'invalid-email'
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(invalidResponseData), { status: 200 })
    );

    await expect(
      fetcher('/api/users/123', { schema: userSchema })
    ).rejects.toThrow('Validation failed');
  });

  it('should pass through fetch init options', async () => {
    const responseData = { success: true };
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(responseData), { status: 200 })
    );

    await fetcher('/api/users', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer token' },
      body: JSON.stringify({ name: 'John' })
    });
    
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/users');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ 'Authorization': 'Bearer token' });
    expect(init?.body).toBe(JSON.stringify({ name: 'John' }));
  });

  it('should handle custom errors', async () => {
    const errorSchema = z.object({
      message: z.string(),
      code: z.string()
    });

    const CustomError = defineError(400, errorSchema, 'CustomError');
    
    const errorData = { message: 'Validation failed', code: 'INVALID_INPUT' };
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(errorData), { status: 400 })
    );

    await expect(
      fetcher('/api/users', { errors: [CustomError] })
    ).rejects.toThrow(CustomError);
  });

  it('should handle non-matching error status codes', async () => {
    const errorSchema = z.object({ message: z.string() });
    const CustomError = defineError(400, errorSchema);
    
    mockFetch.mockResolvedValueOnce(
      new Response('Server Error', { status: 500 })
    );

    await expect(
      fetcher('/api/users', { errors: [CustomError] })
    ).rejects.toThrow('Request failed: 500');
  });

  it('should handle fetch errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      fetcher('/api/users')
    ).rejects.toThrow('Request failed: Network error');
  });

  it('should work with different HTTP methods via init', async () => {
    const responseData = { id: '123' };
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(responseData), { status: 201 })
    );

    await fetcher('/api/users', { method: 'POST' });
    
    const [, init] = mockFetch.mock.calls[0];
    expect(init?.method).toBe('POST');
  });

  it('should combine schema and errors with other fetch options', async () => {
    const userSchema = z.object({
      id: z.string(),
      name: z.string()
    });

    const CustomError = defineError(400, z.object({ message: z.string() }));

    const responseData = { id: '123', name: 'John' };
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(responseData), { status: 200 })
    );

    const result = await fetcher('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John' }),
      schema: userSchema,
      errors: [CustomError]
    });

    expect(result).toEqual(responseData);
    
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/users');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init?.body).toBe(JSON.stringify({ name: 'John' }));
    // schema and errors should not be passed to fetch
    expect('schema' in (init || {})).toBe(false);
    expect('errors' in (init || {})).toBe(false);
  });

  it('should handle 204 No Content response', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(null, { status: 204 })
    );

    const result = await fetcher('/api/users/123', { method: 'DELETE' });
    expect(result).toBeNull();
  });

  it('should handle empty response with content-length 0', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('', { 
        status: 200,
        headers: { 'content-length': '0' }
      })
    );

    const result = await fetcher('/api/ping');
    expect(result).toBeNull();
  });
});