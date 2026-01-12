# TanStack Start Server Functions - Serialization and Error Handling

## Serialization Library: Seroval

TanStack Start uses **seroval** (not servoval) for serializing data between server and client.

### Import Statement

```typescript
import { fromCrossJSON, toJSONAsync } from "seroval";
```

Location: `refs/tan-start/packages/start-client-core/src/client-rpc/serverFnFetcher.ts:7`

### Serialization Configuration

Server functions use seroval plugins configured in `getDefaultSerovalPlugins()`:

```typescript
export function getDefaultSerovalPlugins() {
  const start = getStartOptions();
  const adapters = start?.serializationAdapters as
    | Array<AnySerializationAdapter>
    | undefined;
  return [
    ...(adapters?.map(makeSerovalPlugin) ?? []),
    ...routerDefaultSerovalPlugins,
  ];
}
```

Location: `refs/tan-start/packages/start-client-core/src/getDefaultSerovalPlugins.ts:8-16`

### Default Plugins

The default seroval plugins include:

```typescript
export const defaultSerovalPlugins = [
  ShallowErrorPlugin as Plugin<Error, any>,
  RawStreamSSRPlugin,
  ReadableStreamPlugin as Plugin<ReadableStream, any>,
];
```

Location: `refs/tan-start/packages/router-core/src/ssr/serializer/seroval-plugins.ts:6-12`

## Error Serialization

### How Errors Are Serialized

TanStack Start uses the `ShallowErrorPlugin` to serialize errors. This plugin is specifically designed to handle errors that have functions attached (like ZodError) which cannot be serialized.

```typescript
export const ShallowErrorPlugin = createPlugin<Error, ErrorNode>({
  tag: "$TSR/Error",
  test(value) {
    return value instanceof Error;
  },
  parse: {
    sync(value, ctx) {
      return {
        message: ctx.parse(value.message),
      };
    },
    async async(value, ctx) {
      return {
        message: await ctx.parse(value.message),
      };
    },
    stream(value, ctx) {
      return {
        message: ctx.parse(value.message),
      };
    },
  },
  serialize(node, ctx) {
    return "new Error(" + ctx.serialize(node.message) + ")";
  },
  deserialize(node, ctx) {
    return new Error(ctx.deserialize(node.message));
  },
});
```

Location: `refs/tan-start/packages/router-core/src/ssr/serializer/ShallowErrorPlugin.ts:12-43`

### Key Points About Error Serialization

1. **Only the `message` property is serialized** - The plugin explicitly only preserves the error message, ignoring all other properties like `name`, `stack`, cause, or custom properties.

2. **All Error types match the test** - The `test` function checks `value instanceof Error`, which means it will match `Error` and all its subclasses.

3. **Deserialization always creates plain `Error`** - When deserializing, it always creates a new `Error` instance, regardless of the original error type.

4. **Purpose** - The plugin is designed to handle errors like ZodError which have functions that cannot be serialized.

### Server Function Error Handling

When a server function throws an error, it's serialized before being sent to the client:

```typescript
console.info("Server Fn Error!");
console.error(error);

const serializedError = JSON.stringify(
  await Promise.resolve(
    toCrossJSONAsync(error, {
      refs: new Map(),
      plugins: serovalPlugins,
    }),
  ),
);
const response = getResponse();
return new Response(serializedError, {
  status: response.status ?? 500,
  statusText: response.statusText,
  headers: {
    "Content-Type": "application/json",
    [X_TSS_SERIALIZED]: "true",
  },
});
```

Location: `refs/tan-start/packages/start-server-core/src/server-functions-handler.ts:329-351`

On the client side, deserialized errors are thrown:

```typescript
invariant(result, "expected result to be resolved");
if (result instanceof Error) {
  throw result;
}
```

Location: `refs/tan-start/packages/start-client-core/src/client-rpc/serverFnFetcher.ts:238-241`

## Does Error Serialize Correctly?

### Standard `Error` Class

**Yes**, standard `Error` instances serialize correctly:

```typescript
export const throwBasicError = createServerFn().handler(async () => {
  throw new Error("Something went wrong!");
});

// On client:
try {
  await throwBasicError();
} catch (error) {
  console.log(error.message); // "Something went wrong!"
  console.log(error instanceof Error); // true
}
```

Location: `refs/tan-start/docs/start/framework/react/guide/server-functions.md:136-152`

### Error Subclasses

**No**, Error subclasses do **NOT** serialize correctly. While they will be serialized (since they pass the `instanceof Error` test), they will be deserialized as plain `Error` instances:

```typescript
class CustomError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "CustomError";
  }
}

export const throwCustomError = createServerFn().handler(async () => {
  throw new CustomError("Custom error occurred", "CUSTOM_001");
});

// On client:
try {
  await throwCustomError();
} catch (error) {
  console.log(error.message); // "Custom error occurred" ✓
  console.log(error instanceof CustomError); // false ✗
  console.log(error instanceof Error); // true ✓
  console.log(error.name); // "Error" ✗ (not "CustomError")
  console.log((error as any).code); // undefined ✗
}
```

### Why Subclasses Don't Work

The `ShallowErrorPlugin` uses a single tag (`'$TSR/Error'`) for all error types and always deserializes to a plain `Error`:

```typescript
deserialize(node, ctx) {
  return new Error(ctx.deserialize(node.message)) // Always plain Error
}
```

This means:

- The `name` property is lost (e.g., "ValidationError", "DatabaseError")
- Custom properties are lost
- The instance check `error instanceof CustomError` fails
- Only the `message` is preserved

## Workarounds

### 1. Use Error Codes in Message

```typescript
class CustomError extends Error {
  constructor(message: string, code: string) {
    super(`[${code}] ${message}`);
    this.name = "CustomError";
  }
}
```

### 2. Include Error Type in Message

```typescript
export const throwCustomError = createServerFn().handler(async () => {
  throw new Error("CustomError: Something went wrong");
});

// On client:
try {
  await throwCustomError();
} catch (error) {
  const prefix = "CustomError:";
  if (error.message.startsWith(prefix)) {
    console.log("This is a custom error");
  }
}
```

### 3. Return Error Objects (Not Thrown)

```typescript
interface ServerError {
  type: "ValidationError" | "DatabaseError" | "AuthError";
  message: string;
  code?: string;
}

export const operationWithCustomError = createServerFn().handler(async () => {
  // Instead of throwing, return an error object
  return {
    success: false,
    error: {
      type: "ValidationError",
      message: "Invalid input",
      code: "VALIDATION_001",
    } satisfies ServerError,
  };
});
```

### 4. Custom Seroval Plugin (Advanced)

You could create a custom seroval plugin to handle specific error types, though this would need to be registered in the TanStack Start configuration via `serializationAdapters`.

```typescript
import { createPlugin } from "seroval";

const CustomErrorPlugin = createPlugin<
  CustomError,
  { message: string; code: string }
>({
  tag: "$App/CustomError",
  test(value) {
    return value instanceof CustomError;
  },
  parse: {
    sync(value, ctx) {
      return {
        message: ctx.parse(value.message),
        code: ctx.parse(value.code),
      };
    },
  },
  serialize(node, ctx) {
    return `new CustomError(${ctx.serialize(node.message)}, ${ctx.serialize(node.code)})`;
  },
  deserialize(node, ctx) {
    return new CustomError(
      ctx.deserialize(node.message),
      ctx.deserialize(node.code),
    );
  },
});
```

## Summary

| Question                                 | Answer                                                    |
| ---------------------------------------- | --------------------------------------------------------- |
| Does TanStack Start use seroval?         | **Yes**, version ^1.4.1                                   |
| Does `Error` serialize correctly?        | **Yes**, message is preserved                             |
| Do Error subclasses serialize correctly? | **No**, deserialized as plain `Error`                     |
| What properties are preserved?           | Only `message`                                            |
| What properties are lost?                | `name`, `stack`, `cause`, custom properties               |
| Does `instanceof CustomError` work?      | **No**, after serialization it becomes `instanceof Error` |

## References

- Server Functions Guide: `refs/tan-start/docs/start/framework/react/guide/server-functions.md`
- ShallowErrorPlugin: `refs/tan-start/packages/router-core/src/ssr/serializer/ShallowErrorPlugin.ts`
- Server Function Fetcher: `refs/tan-start/packages/start-client-core/src/client-rpc/serverFnFetcher.ts`
- Server Function Handler: `refs/tan-start/packages/start-server-core/src/server-functions-handler.ts`
- Seroval Plugins: `refs/tan-start/packages/router-core/src/ssr/serializer/seroval-plugins.ts`
