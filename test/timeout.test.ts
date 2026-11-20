import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetcher, RequestFailedError, RequestTimeoutError } from '../src';

const mockFetch = vi.mocked(fetch);

function untilAborted(signal?: AbortSignal | null) {
  return new Promise<never>((_, reject) => {
    signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
  });
}

describe('timeout', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws RequestTimeoutError when no response arrives in time', async () => {
    mockFetch.mockImplementationOnce((_, init) => untilAborted(init?.signal));

    const result = fetcher('/api/slow', { timeout: 1000 }).catch((error) => error);
    await vi.advanceTimersByTimeAsync(1000);
    const error = await result;

    expect(error).toBeInstanceOf(RequestTimeoutError);
    expect(error).toBeInstanceOf(RequestFailedError);
    expect(error.timeout).toBe(1000);
    expect(error.message).toBe('Request timed out after 1000 ms');
  });

  it('times out while the body is still being read', async () => {
    mockFetch.mockImplementationOnce(async (_, init) => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () => untilAborted(init?.signal),
    }) as unknown as Response);

    const result = fetcher('/api/slow-body', { timeout: 500 }).catch((error) => error);
    await vi.advanceTimersByTimeAsync(500);

    expect(await result).toBeInstanceOf(RequestTimeoutError);
  });

  it('returns the response and clears the timer when it arrives in time', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));

    await expect(fetcher('/api/fast', { timeout: 1000 })).resolves.toEqual({ ok: 1 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('passes the signal to fetch only when a timeout is set', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await fetcher('/api/plain');
    expect(mockFetch).toHaveBeenLastCalledWith('/api/plain', {});

    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await fetcher('/api/limited', { timeout: 1000 });
    expect(mockFetch.mock.lastCall?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("keeps the caller's abort apart from the timeout", async () => {
    mockFetch.mockImplementationOnce((_, init) => untilAborted(init?.signal));
    const controller = new AbortController();

    const result = fetcher('/api/slow', { timeout: 1000, signal: controller.signal }).catch((error) => error);
    controller.abort();
    const error = await result;

    expect(error).toBeInstanceOf(RequestFailedError);
    expect(error).not.toBeInstanceOf(RequestTimeoutError);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts at once when the caller signal is already aborted', async () => {
    mockFetch.mockImplementationOnce((_, init) =>
      init?.signal?.aborted ? Promise.reject(new DOMException('aborted', 'AbortError')) : untilAborted(init?.signal)
    );
    const controller = new AbortController();
    controller.abort();

    const error = await fetcher('/api/slow', { timeout: 1000, signal: controller.signal }).catch((e) => e);

    expect(error).not.toBeInstanceOf(RequestTimeoutError);
    expect(vi.getTimerCount()).toBe(0);
  });
});
