---
title: Introduction
description: Learn about @shkumbinhsn/fetcher and its core concepts
---

# Introduction to @shkumbinhsn/fetcher

`@shkumbinhsn/fetcher` is a type-safe fetch wrapper designed for modern TypeScript applications. It extends the standard `fetch` API with schema validation and structured error handling, making API calls more reliable and developer-friendly.

## Why Use @shkumbinhsn/fetcher?

### Problems with Standard Fetch

- **No type safety**: Response data is untyped (`any`)
- **Manual validation**: You need to validate response data yourself
- **Error handling**: HTTP errors require manual checking and parsing
- **Repetitive code**: Common patterns need to be repeated across your app

### How @shkumbinhsn/fetcher Helps

- **Type Safety**: Full TypeScript support with inferred response types
- **Automatic Validation**: Response validation using Standard Schema libraries
- **Structured Errors**: Custom error classes with typed error data
- **Drop-in Replacement**: Works exactly like `fetch` with additional features

## Core Concepts

### Schema Validation

Uses the [Standard Schema](https://github.com/standard-schema/standard-schema) specification, which means it works with any compatible validation library:

- [Zod](https://zod.dev)
- [Valibot](https://valibot.dev)
- [ArkType](https://arktype.io)
- [Effect Schema](https://effect.website/docs/schema/introduction)

### Error Handling

Define custom error classes that match your API's error responses. Each error class includes:

- HTTP status code
- Validation schema for error data
- Type-safe access to error information

### Type Safety

Response types are automatically inferred from your schemas, providing full IntelliSense support and compile-time type checking.

## Next Steps

- [Install the library](/installation/)
- [Get started with basic usage](/quick-start/)
- [Learn about schema validation](/guides/schema-validation/)