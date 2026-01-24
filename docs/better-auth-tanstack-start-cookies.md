# Better Auth cookies without tanstackStartCookies

## Summary

We currently do not use the `tanstackStartCookies` plugin, but session cookies still work because we explicitly forward `Set-Cookie` headers returned by Better Auth.

## Better Auth guidance

The TanStack Start integration docs call out the cookie plugin for calls like `auth.api.signInEmail`, because TanStack Start needs help bridging `Set-Cookie` response headers into its cookie API.

```ts
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export const auth = betterAuth({
  plugins: [tanstackStartCookies()],
});
```

The general Better Auth API also supports returning raw headers so callers can set cookies manually:

```ts
const { headers } = await auth.api.signUpEmail({
  returnHeaders: true,
  body: {
    email: "john@doe.com",
    password: "password",
    name: "John Doe",
  },
});
```

## Better Auth plugin behavior

The `tanstackStartCookies` plugin listens to response headers after an auth call, parses the `set-cookie` header, and then uses TanStack Start's `setCookie` helper to write the cookies. This is the "magic" part: `setCookie` writes into TanStack Start's internal response cookie store so the framework can merge cookies into whatever response it ultimately sends (including redirects).

```ts
const returned = ctx.context.responseHeaders;
const setCookies = returned?.get("set-cookie");
const { setCookie } = await import("@tanstack/react-start/server");
parsed.forEach((value, key) => {
  setCookie(key, decodeURIComponent(value.value), {
    sameSite: value.samesite,
    secure: value.secure,
    maxAge: value["max-age"],
    httpOnly: value.httponly,
    domain: value.domain,
    path: value.path,
  });
});
```

## What our code does instead

We call Better Auth and forward the returned headers through a TanStack Start redirect. That means `Set-Cookie` reaches the client without needing the plugin.

```ts
export const signOutServerFn = createServerFn({ method: "POST" }).handler(
  async ({ context: { authService } }) => {
    const request = getRequest();
    const { headers } = await authService.api.signOut({
      headers: request.headers,
      returnHeaders: true,
    });
    throw redirect({
      to: "/",
      headers,
    });
  },
);
```

If we enabled `tanstackStartCookies`, we could drop the explicit `headers` in the redirect and rely on `setCookie` to populate the internal response cookie store:

```ts
const { response } = await authService.api.signOut({
  headers: request.headers,
  returnHeaders: true,
});
throw redirect({ to: "/" });
```

## Return headers are required for the plugin

The plugin reads cookies from `ctx.context.responseHeaders`, which is populated when Better Auth executes the endpoint and stores the response headers for after hooks:

```ts
internalContext.context.responseHeaders = result.headers;
const after = await runAfterHooks(internalContext, afterHooks);
```

The `tanstackStartCookies` hook then pulls `set-cookie` from that `responseHeaders` field:

```ts
const returned = ctx.context.responseHeaders;
const setCookies = returned?.get("set-cookie");
```

In practice, this means you must allow Better Auth to return headers. For `auth.api.*` calls, that requires `returnHeaders: true`; otherwise the caller never receives headers and the plugin won't see any `set-cookie` values to bridge.

## Trade-offs

Manual header forwarding keeps cookie handling explicit and avoids relying on TanStack Start's cookie API, but it is easy to miss a `returnHeaders` + passthrough when adding new `auth.api.*` calls. The plugin automates cookie writes in server functions and loaders but adds hidden behavior and depends on TanStack Start's cookie bridge.

## Recommendation

Keep the current approach while auth calls stay limited and headers are consistently forwarded. If more server-side `auth.api.*` usage is planned or the team wants safer defaults, add `tanstackStartCookies` to reduce the risk of missing cookie propagation.
