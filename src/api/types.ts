import { StandardSchemaV1 } from "@standard-schema/spec";
import { ApiErrorStatic } from "../errors/base";

export interface FetcherRequestInit<TResponse extends StandardSchemaV1 | undefined = undefined> extends RequestInit {
  schema?: TResponse;
  errors?: ApiErrorStatic<any>[];
}

export type InferResponse<T extends StandardSchemaV1 | undefined> = 
  T extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<T> : unknown;