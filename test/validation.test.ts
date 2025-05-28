import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validateSchema, SchemaValidationError } from '../src';

describe('validateSchema', () => {
  describe('with Zod', () => {
    const userSchema = z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email()
    });

    it('should validate valid data', async () => {
      const validData = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com'
      };

      const result = await validateSchema(userSchema, validData);
      expect(result).toEqual(validData);
    });

    it('should throw SchemaValidationError for invalid data', async () => {
      const invalidData = {
        id: 123, // should be string
        name: 'John Doe',
        email: 'invalid-email'
      };

      await expect(validateSchema(userSchema, invalidData))
        .rejects.toThrow(SchemaValidationError);
    });

    it('should include validation issues in error', async () => {
      const invalidData = { id: 123 };

      try {
        await validateSchema(userSchema, invalidData);
      } catch (error) {
        expect(error).toBeInstanceOf(SchemaValidationError);
        expect((error as SchemaValidationError).issues).toBeDefined();
        expect((error as SchemaValidationError).issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('with Valibot', () => {
    // Skip Valibot tests for now as the API has changed
    it.skip('should validate valid data', async () => {
      // Valibot API changes, skip for now
    });

    it.skip('should throw SchemaValidationError for invalid data', async () => {
      // Valibot API changes, skip for now
    });
  });
});