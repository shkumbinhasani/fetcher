import { StandardSchemaV1 } from "@standard-schema/spec";

export class SchemaValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: ReadonlyArray<StandardSchemaV1.Issue>
  ) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

export async function validateSchema<T extends StandardSchemaV1>(
  schema: T,
  data: unknown
): Promise<StandardSchemaV1.InferOutput<T>> {
  const result = await schema['~standard'].validate(data);
  
  if (result.issues) {
    const message = `Validation failed: ${result.issues[0]?.message || 'Unknown error'}`;
    throw new SchemaValidationError(message, result.issues);
  }
  
  return result.value;
}