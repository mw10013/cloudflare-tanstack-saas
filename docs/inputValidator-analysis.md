# inputValidator in createServerFn: Analysis

## What Problem Does It Solve?

`inputValidator` solves the **network boundary type safety problem**. When server functions are called from the client, data crosses the network boundary where TypeScript types don't exist at runtime. Without validation, your server could receive:

- Missing required fields
- Wrong data types (strings instead of numbers)
- Malformed data (invalid emails, negative ages, etc.)
- Extra fields you don't expect

## Documentation References

From `refs/tan-start/docs/start/framework/react/guide/server-functions.md`:

> "Server functions accept a single `data` parameter. Since they cross the network boundary, validation ensures type safety and runtime correctness."

From `refs/tan-start/docs/start/framework/react/guide/middleware.md`:

> "The `inputValidator` method is used to modify the data object before it is passed to this middleware, nested middleware, and ultimately the server function. This method should receive a function that takes the data object and returns a validated (and optionally modified) data object."

## Idiomatic Usage Patterns

### 1. With Zod Schema (Most Common)

```typescript
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const UserSchema = z.object({
  name: z.string().min(1),
  age: z.number().min(0),
});

export const createUser = createServerFn({ method: "POST" })
  .inputValidator(UserSchema)
  .handler(async ({ data }) => {
    // data is fully typed and validated
    return `Created user: ${data.name}, age ${data.age}`;
  });
```

Reference: `refs/tan-start/docs/start/framework/react/guide/server-functions.md:95-106`

### 2. With Zod Adapter (For Middleware)

```typescript
import { createMiddleware } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const mySchema = z.object({
  workspaceId: z.string(),
});

const workspaceMiddleware = createMiddleware({ type: "function" })
  .inputValidator(zodValidator(mySchema))
  .server(({ next, data }) => {
    console.log("Workspace ID:", data.workspaceId);
    return next();
  });
```

Reference: `refs/tan-start/docs/start/framework/react/guide/middleware.md:237-252`

### 3. With Inline Function (Simple Validation)

```typescript
export const greetUser = createServerFn({ method: "GET" })
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    return `Hello, ${data.name}!`;
  });
```

Reference: `refs/tan-start/docs/start/framework/react/guide/server-functions.md:78-85`

### 4. Pass-Through for Type Inference (Identity Function Pattern)

This pattern is useful when you want to:

- Document expected input shape
- Maintain type inference in handlers
- Add validation later without breaking changes
- Handle partial validation scenarios

```typescript
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Define the schema for type inference (but don't validate yet)
const CreatePostInput = z.object({
  title: z.string().min(1).max(200),
  content: z.string(),
  draft: z.boolean().optional(),
});

type CreatePostInput = z.infer<typeof CreatePostInput>;

// Pass-through validator: validates structure but passes data through
export const createPost = createServerFn({ method: "POST" })
  .inputValidator((data: CreatePostInput) => CreatePostInput.parse(data))
  .handler(async ({ data }) => {
    // data is typed as CreatePostInput
    // Additional validation/logic can be added here
    return db.posts.create(data);
  });
```

Reference: `refs/saas-kit/apps/user-application/src/core/functions/example-functions.ts:10-24`

### 5. Data Transformation (Modifying Input)

```typescript
export const submitForm = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error("Expected FormData");
    }
    return {
      name: data.get("name")?.toString() || "",
      email: data.get("email")?.toString() || "",
    };
  })
  .handler(async ({ data }) => {
    // Process form data
    return { success: true };
  });
```

Reference: `refs/tan-start/docs/start/framework/react/guide/server-functions.md:112-128`

### 6. Simple String Validation Example

From `refs/saas-kit/apps/user-application/src/core/functions/payments.ts:40-57`:

```typescript
export const validPayment = baseFunction
  .inputValidator((data: string) => {
    console.log("validatePayment", data);
    if (typeof data !== "string") {
      throw new Error("Invalid data type");
    }
    return data;
  })
  .handler(async (ctx) => {
    const payment = await ctx.context.polar.checkouts.get({
      id: ctx.data,
    });
    if (payment.status === "succeeded") {
      return true;
    }
    return false;
  });
```

## How It Works Internally

From `refs/tan-start/packages/start-plugin-core/src/start-compiler-plugin/handleCreateServerFn.ts:252-266`:

```typescript
// Handle input validator - remove on client
if (inputValidator) {
  const innerInputExpression = inputValidator.callPath.node.arguments[0];

  if (!innerInputExpression) {
    throw new Error(
      "createServerFn().inputValidator() must be called with a validator!",
    );
  }

  // If we're on the client, remove the validator call expression
  if (context.env === "client") {
    stripMethodCall(inputValidator.callPath);
  }
}
```

### Key Implementation Details

**The validator is stripped from the client bundle at compile time.** This provides several benefits:

1. **Reduced bundle size** - Validation code only exists on the server
2. **Security** - Prevents leaking validation logic to clients
3. **Consistency** - Ensures validation always runs on the server

### Compilation Process

From `refs/tan-start/packages/start-plugin-core/src/start-compiler-plugin/types.ts:57-63`:

```typescript
export interface MethodChainPaths {
  middleware: MethodCallInfo | null;
  inputValidator: MethodCallInfo | null;
  handler: MethodCallInfo | null;
  server: MethodCallInfo | null;
  client: MethodCallInfo | null;
}
```

The compiler extracts method chain information and handles each method appropriately based on the environment (client vs server).

## Summary Table

| Use Case                     | Example                                            |
| ---------------------------- | -------------------------------------------------- |
| **Schema validation**        | `.inputValidator(UserSchema)`                      |
| **Type-only (pass-through)** | `.inputValidator((data: T) => schema.parse(data))` |
| **Data transformation**      | `.inputValidator((data) => transform(data))`       |
| **Form handling**            | `.inputValidator((data) => parseFormData(data))`   |
| **Middleware validation**    | `.inputValidator(zodValidator(schema))`            |

## When to Use Each Pattern

- **Zod Schema** - Full runtime validation with type inference
- **Inline Function** - Simple validation or custom logic
- **Zod Adapter** - When using middleware chains
- **Pass-Through Pattern** - When you want type documentation but will handle validation elsewhere or want to add it incrementally

The pass-through pattern (identity function with schema) is idiomatic when:

- You want to document expected input shape in the type system
- You're incrementally adding validation
- Validation is handled by middleware or another layer
- You want to defer full validation for performance reasons
