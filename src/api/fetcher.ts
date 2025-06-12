import { StandardSchemaV1 } from "@standard-schema/spec";
import { ApiError, ApiErrorStatic } from "../errors/base";
import { FetcherRequestInit, InferResponse } from "./types";
import { validateSchema, SchemaValidationError } from "./validation";

/**
 * Type-safe fetch wrapper with Standard Schema validation and error handling
 */
export async function fetcher<TResponse extends StandardSchemaV1 | undefined = undefined>(
  input: RequestInfo | URL,
  init?: FetcherRequestInit<TResponse>
): Promise<InferResponse<TResponse>> {
  try {
    // Extract our custom properties
    const { schema, errors, ...requestInit } = init || {};
    
    // Make request
    const response = await fetch(input, requestInit);
    
    // Handle errors
    if (!response.ok) {
      await handleErrorResponse(response, errors);
    }
    
    // Parse successful response
    return parseResponse(response, schema);
    
  } catch (error) {
    // Re-throw API errors as-is
    if (error instanceof ApiError) throw error;
    
    // Handle validation errors
    if (error instanceof SchemaValidationError) {
      throw new Error(`Response validation failed: ${error.message}`);
    }
    
    // Handle other errors
    throw new Error(
      `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function handleErrorResponse(
  response: Response,
  errorTypes?: ApiErrorStatic<any>[]
): Promise<never> {
  // Default error if no custom errors provided
  if (!errorTypes?.length) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  // Find matching error types for this status code
  const matchingErrors = errorTypes.filter(E => E.statusCode === response.status);
  if (!matchingErrors.length) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  // Try to parse response body
  let responseData: unknown;
  try {
    responseData = await response.json();
  } catch {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  // Try each matching error schema
  for (const ErrorClass of matchingErrors) {
    try {
      const validatedData = await validateSchema(ErrorClass.schema, responseData);
      throw new ErrorClass(response.statusText, validatedData, response);
    } catch (error) {
      // If it's not a validation error, re-throw
      if (!(error instanceof SchemaValidationError)) {
        throw error;
      }
      // Otherwise, continue to next error type
    }
  }

  // No schema matched
  throw new Error(
    `Request failed: ${response.status} ${response.statusText} - No matching error schema`
  );
}

async function parseResponse<T extends StandardSchemaV1 | undefined>(
  response: Response,
  schema?: T
): Promise<InferResponse<T>> {
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null as InferResponse<T>;
  }
  
  const data = await response.json();
  
  if (!schema) {
    return data as InferResponse<T>;
  }
  
  try {
    const validatedData = await validateSchema(schema, data);
    return validatedData as InferResponse<T>;
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      console.error('Response validation failed:', {
        issues: error.issues,
        received: data
      });
    }
    throw error;
  }
}