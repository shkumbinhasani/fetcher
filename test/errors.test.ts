import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ApiError, defineError } from '../src';

describe('defineError', () => {
  it('should create custom error class with correct properties', () => {
    const schema = z.object({
      message: z.string(),
      code: z.string()
    });

    const CustomError = defineError(400, schema, 'CustomError');
    
    expect(CustomError.statusCode).toBe(400);
    expect(CustomError.schema).toBe(schema);
  });

  it('should create error instances with correct data', () => {
    const schema = z.object({
      message: z.string(),
      code: z.string()
    });

    const CustomError = defineError(400, schema, 'CustomError');
    const response = new Response('', { status: 400 });
    const errorData = { message: 'Bad request', code: 'INVALID_INPUT' };
    
    const error = new CustomError('Bad request', errorData, response);
    
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(CustomError);
    expect(error.statusCode).toBe(400);
    expect(error.data).toEqual(errorData);
    expect(error.response).toBe(response);
    expect(error.name).toBe('CustomError');
    expect(error.message).toBe('Bad request');
  });

  it('should use constructor name when no custom name provided', () => {
    const schema = z.object({ message: z.string() });
    const CustomError = defineError(404, schema);
    const response = new Response('', { status: 404 });
    
    const error = new CustomError('Not found', { message: 'Resource not found' }, response);
    
    // The name should be the constructor name
    expect(error.name).toBe(error.constructor.name);
  });
});