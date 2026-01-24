# Better Auth cookies without tanstackStartCookies

## Summary

We currently do not use the `tanstackStartCookies` plugin, but session cookies still work because we explicitly forward `Set-Cookie` headers returned by Better Auth.

## Better Auth guidance

The TanStack Start integration docs call out the cookie plugin for server-side calls like `auth.api.signInEmail`, because TanStack Start needs help bridging `Set-Cookie` response headers into its cookie API. That example is intended to run in a server function or loader, not in the browser.

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

## Where the plugin gets headers

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

`returnHeaders: true` is only required when you want the caller to receive the headers (for manual forwarding). The plugin sees `responseHeaders` regardless because Better Auth always captures headers during endpoint execution and passes them into after hooks.

## Codebase scan: where cookies are actually set

Only two app-layer call sites request `returnHeaders: true`, and they both match operations that set or clear session cookies:

```ts
const { headers } = await authService.api.signOut({
  headers: request.headers,
  returnHeaders: true,
});
```

```ts
const { headers } = await authService.api.impersonateUser({
  returnHeaders: true,
  headers: request.headers,
  body: { userId: data.userId },
});
```

Most other `authService.api.*` usages are reads or mutations that do not set cookies (for example `getSession`, `listInvitations`, `hasPermission`), so they do not need to return headers.

## Why cookies do not need to be set on every response

Session cookies are not refreshed on every request. Browsers automatically send existing cookies on each request, and servers only need to set cookies when they are creating, refreshing, or clearing a cookie. Better Auth follows this pattern:

```ts
if (shouldBeUpdated && !ctx.query?.disableRefresh) {
  await setSessionCookie(
    ctx,
    { session: updatedSession, user: session.user },
    false,
    {
      maxAge,
    },
  );
}
```

Outside of those refresh points, Better Auth returns data without writing new cookies, which is why most routes do not need `returnHeaders` or cookie bridging.

## Trade-offs

Manual header forwarding keeps cookie handling explicit and avoids relying on TanStack Start's cookie API, but it is easy to miss a `returnHeaders` + passthrough when adding new `auth.api.*` calls. The plugin automates cookie writes in server functions and loaders but adds hidden behavior and depends on TanStack Start's cookie bridge.

## Cookie 101

- Browsers send existing cookies automatically on every request to the same origin; servers do not need to re-issue them on every response.
- Servers only need to set cookies when creating a session, refreshing it, changing it, or clearing it. These set operations appear as `Set-Cookie` headers in specific responses.
- A session cookie can expire without being re-set if the server never refreshes it. Better Auth only refreshes when `updateAge` thresholds are reached or when a session is created or destroyed.

Better Auth sets cookies during auth routes like `signInEmail` by writing to the response headers:

```ts
await setSessionCookie(
  ctx,
  { session, user: user.user },
  ctx.body.rememberMe === false,
);
```

## Recommendation

Keep the current approach while auth calls stay limited and headers are consistently forwarded. If more server-side `auth.api.*` usage is planned or the team wants safer defaults, add `tanstackStartCookies` to reduce the risk of missing cookie propagation.
