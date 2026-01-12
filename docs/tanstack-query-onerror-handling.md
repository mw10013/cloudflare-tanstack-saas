# TanStack Query: Understanding `onError` and Error Handling

## The Problem

When throwing an error from the `onError` callback in TanStack Query's `useMutation`, the error appears to be "swallowed" - it doesn't propagate as expected.

### Code Example

```typescript
const action = useMutation({
  mutationFn: async (data) => actionServerFn({ data }),
  onError: (error) => {
    console.error(`action: onError: ${JSON.stringify(error)}`, {
      error,
      message: error.message,
      name: error.name,
    });
    throw error; // This error is swallowed!
  },
});
```

## What's Happening

Throwing from `onError` callbacks is **not supported** by design. The callbacks are meant for side effects only.

### Source Code Evidence

From `packages/query-core/src/mutation.ts:271-323`:

```typescript
} catch (error) {
  try {
    await this.options.onError?.(
      error as TError,
      variables,
      this.state.context,
      mutationFnContext,
    )
  } catch (e) {
    void Promise.reject(e)  // Swallowed!
  }

  this.#dispatch({ type: 'error', error: error as TError })
  throw error  // Only the ORIGINAL error is re-thrown
}
```

### Documentation Evidence

From `docs/framework/react/reference/useMutation.md:76-79`:

> `onError: (err: TError, variables: TVariables, onMutateResult: TOnMutateResult | undefined, context: MutationFunctionContext) => Promise<unknown> | unknown`
>
> - This function will fire if the mutation encounters an error and will be passed the error.
> - If a promise is returned, it will be awaited and resolved before proceeding

From `packages/query-core/src/types.ts:1251`:

> - All the callback functions (`onSuccess`, `onError`, `onSettled`) are void functions, and the returned value will be ignored.

## Idiomatic Error Handling Patterns

### 1. Use Mutation State (Recommended)

Access the error via the mutation's returned state properties:

```typescript
const action = useMutation({
  mutationFn: async (data) => actionServerFn({ data }),
  onSuccess: (result) => {
    if (result.success) {
      form.reset();
      void router.invalidate();
    } else {
      form.setErrorMap(result.errorMap);
    }
  },
  onError: (error) => {
    console.error("Mutation error:", error);
    // Display toaster notification here
  },
});

// Render error from mutation state
{action.error && (
  <Alert variant="destructive">
    <AlertCircle className="size-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>
      {action.error.message}
    </AlertDescription>
  </Alert>
)}
```

### 2. Use `throwOnError` for Error Boundaries

Propagate errors to React Error Boundaries:

```typescript
const action = useMutation({
  mutationFn: async (data) => actionServerFn({ data }),
  throwOnError: true,
});

// Wrap in QueryErrorResetBoundary + ErrorBoundary
```

From `docs/framework/react/guides/suspense.md:15`:

> If you want mutations to propagate errors to the nearest error boundary (similar to queries), you can set the `throwOnError` option to `true` as well.

### 3. Use `mutateAsync` with Try/Catch

```typescript
const action = useMutation({
  mutationFn: async (data) => actionServerFn({ data }),
});

const handleSubmit = async () => {
  try {
    await action.mutateAsync(value);
    form.reset();
    void router.invalidate();
  } catch (error) {
    console.error("Error:", error);
    form.setErrorMap({
      onSubmit: {
        form: error instanceof Error ? error.message : "Unknown error",
        fields: {},
      },
    });
  }
};
```

### 4. Handle Errors in `onSettled`

```typescript
const action = useMutation({
  mutationFn: async (data) => actionServerFn({ data }),
  onSettled: (result, error) => {
    if (error) {
      console.error("Mutation failed:", error);
    }
    if (result && !result.success) {
      form.setErrorMap(result.errorMap);
    }
  },
});
```

## Mutation Status States

From `docs/framework/react/guides/mutations.md:48-53`:

A mutation can only be in one of the following states:

- `isIdle` or `status === 'idle'` - The mutation is currently idle or in a fresh/reset state
- `isPending` or `status === 'pending'` - The mutation is currently running
- `isError` or `status === 'error'` - The mutation encountered an error
- `isSuccess` or `status === 'success'` - The mutation was successful and mutation data is available

## Best Practices

1. **Use `onError` for side effects only** - logging, toasts, analytics
2. **Handle errors in `onSuccess`** - for server error responses (success: false)
3. **Use `onSettled`** - for cleanup that should run regardless of outcome
4. **Use `mutateAsync` with try/catch** - when you need to handle errors inline
5. **Use `throwOnError` with Error Boundaries** - for unhandled exceptions

## Related Documentation

- [useMutation Reference](../framework/react/reference/useMutation.md)
- [Mutations Guide](../framework/react/guides/mutations.md)
- [Suspense & Error Boundaries](../framework/react/guides/suspense.md)
- [QueryErrorResetBoundary](../framework/react/reference/QueryErrorResetBoundary.md)
