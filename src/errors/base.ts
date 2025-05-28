import { StandardSchemaV1 } from "@standard-schema/spec";

export abstract class ApiError<T = unknown> extends Error {
  abstract readonly statusCode: number;
  
  constructor(
    message: string,
    public readonly data: T,
    public readonly response: Response
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export interface ApiErrorStatic<TSchema extends StandardSchemaV1> {
  new (
    message: string, 
    data: StandardSchemaV1.InferOutput<TSchema>, 
    response: Response
  ): ApiError<StandardSchemaV1.InferOutput<TSchema>>;
  statusCode: number;
  schema: TSchema;
}