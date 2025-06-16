---
title: Installation
description: How to install and set up @shkumbinhsn/fetcher
---

# Installation

## Package Manager

Install `@shkumbinhsn/fetcher` using your preferred package manager:

```bash
# npm
npm install @shkumbinhsn/fetcher

# yarn  
yarn add @shkumbinhsn/fetcher

# pnpm
pnpm add @shkumbinhsn/fetcher

# bun
bun add @shkumbinhsn/fetcher
```

## Schema Library

You'll also need a Standard Schema compatible validation library. Here are the most popular options:

### Zod (Recommended)

```bash
npm install zod
```

### Valibot

```bash
npm install valibot
```

### ArkType

```bash
npm install arktype
```

### Effect Schema

```bash
npm install @effect/schema
```

## TypeScript Configuration

Ensure your `tsconfig.json` has strict mode enabled for the best experience:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

## Verify Installation

Create a test file to verify everything works:

```typescript
// test.ts
import { fetcher } from '@shkumbinhsn/fetcher';

// Basic usage without schema
const response = await fetcher('https://jsonplaceholder.typicode.com/posts/1');
console.log(response);
```

## Next Steps

- [Quick Start Guide](/quick-start/)
- [Basic Usage](/guides/basic-usage/)
- [Schema Validation](/guides/schema-validation/)