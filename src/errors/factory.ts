import { StandardSchemaV1 } from "@standard-schema/spec";
import { ApiError, ApiErrorStatic } from "./base";

export function defineError<TSchema extends StandardSchemaV1>(
  statusCode: number,
  schema: TSchema,
  name?: string
): ApiErrorStatic<TSchema> {
  return class extends ApiError<StandardSchemaV1.InferOutput<TSchema>> {
    readonly statusCode = statusCode;
    static readonly statusCode = statusCode;
    static readonly schema = schema;
    
    constructor(
      message: string, 
      data: StandardSchemaV1.InferOutput<TSchema>, 
      response: Response
    ) {
      super(message, data, response);
      if (name) this.name = name;
    }
  };
}