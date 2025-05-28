import { vi } from 'vitest';

// Mock fetch for testing
global.fetch = vi.fn();

// Mock console for cleaner test output
global.console.error = vi.fn();