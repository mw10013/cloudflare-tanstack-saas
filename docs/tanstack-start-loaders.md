# TanStack Start Loaders Explained

**Source:** https://www.anchortags.dev/posts/tanstack-start-loaders-explained

TanStack Start provides two functions for loading data in routes: `beforeLoad` and `loader`. Both are isomorphic, running on server and client depending on how users enter the app.

## Two Loaders, Two Purposes

### beforeLoad: Sequential and Contextual

- Runs sequentially from outermost parent to deepest child route
- Ideal for route guards (authentication, authorization)
- Returns merge into router context
- Available to child routes and other route functions

```tsx
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const user = await getUser();
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
});
```

### loader: Parallel Execution

- Runs in parallel across all active routes after `beforeLoad` completes
- Faster page loads through concurrent data fetching
- Data is route-specific, not merged into context

```tsx
export const Route = createFileRoute("/posts")({
  loader: async () => ({ posts: await fetchPosts() }),
});
```

## When and Where Code Runs

### First Load: Server-Side

- Both functions run on the server by default
- Data serialized and sent with rendered HTML

### Subsequent Navigation: Client-Side

- After initial load, behaves like a traditional SPA
- Loader functions run in browser, server not involved
- Both functions must be isomorphic

### Data Loading Strategies

```tsx
export const Route = createFileRoute("/client-only")({
  ssr: false, // Client-only rendering
  loader: () => fetchData(),
});
```

Also available: `"data-only"` mode for server-side data fetching without full SSR.

## Caching Considerations

Both `beforeLoad` and `loader` invoke for **all active routes** in the current route tree on:

- Route reloads via `router.invalidate()` or stale time expiration
- Prerendering
- Any navigation within the route tree

Use TanStack Query for caching to prevent redundant fetches:

```tsx
loader: async ({ context }) => {
  const posts = await context.queryClient.ensureQueryData({
    queryKey: ["posts"],
    queryFn: fetchPosts,
  });
  return { posts };
};
```

## The Serialization Requirement

Return values must be serializable (server to client transfer):

- Cannot return: functions, class instances, symbols, `unknown` typed values
- Promises are serializable and support streaming
- TanStack Router supports custom serialization for special cases

### Deferred Data Loading

```tsx
loader: () => ({
  posts: await fetchPosts(),           // Critical - awaited
  recommendations: fetchRecommendations(), // Non-critical - streams
}),
```

## Accessing Data

### Route Context

```tsx
// In components
const { user } = Route.useRouteContext();

// In child routes
beforeLoad: ({ context }) => console.log(context.user.id);
```

### Loader Data

```tsx
const { posts } = Route.useLoaderData();
```

## Type Safety Tips

### Property Order Matters

Define properties in this order for correct type inference:

1. `params`
2. `validateSearch`
3. `loaderDeps`
4. `beforeLoad`
5. `loader`
6. `component`

### ESLint Plugin

```bash
npm install -D @tanstack/eslint-plugin-router
```

## Summary

| Feature    | beforeLoad                   | loader                       |
| ---------- | ---------------------------- | ---------------------------- |
| Execution  | Sequential (parent to child) | Parallel (all active routes) |
| Use Case   | Route guards, auth checks    | Data fetching                |
| Data Scope | Router context               | Route-specific               |
