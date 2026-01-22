# TanStack Start + D1: Robust Mutation Pattern

When building with **TanStack Start** and **Cloudflare D1**, calling Server Functions directly from your components is often too primitive. It forces you to manually manage loading states, error handling, and—most importantly—it doesn't automatically handle server-side redirects in a Single Page Application (SPA) context.

The most robust architecture is to wrap your **Server Function** in `useServerFn` (for routing logic) and then wrap that in TanStack Query's `useMutation` (for UI state).

---

### 1. The Core Implementation: `useServerFn`

The `useServerFn` hook is a specialized utility provided by TanStack Start. Its primary job is to act as a **routing bridge**. If your server-side code throws a `redirect()` or `notFound()`, this hook intercepts that response and tells the client-side router to navigate accordingly.

**Source Code Reference:** [`packages/react-start/src/useServerFn.ts`](https://github.com/TanStack/router/blob/main/packages/react-start/src/useServerFn.ts)

---

### 2. The Recommended Pattern

This pattern combines three layers:
1.  **Server Function:** Executes the D1 SQL logic on the server.
2.  **`useServerFn`:** Handles server-side redirects and specialized responses.
3.  **`useMutation`:** Provides `isPending`, `error` states, and `onSuccess` callbacks.

#### A. Define the Server Function
```tsx
// server-functions.ts
import { createServerFn } from '@tanstack/start'
import { redirect } from '@tanstack/react-router'

export const updateTask = createServerFn({ method: 'POST' })
  .validator((data: { id: string; title: string }) => data)
  .handler(async ({ data }) => {
    // 1. Run the D1 mutation (via Drizzle or raw SQL)
    await db.update(tasks).set({ title: data.title }).where(eq(tasks.id, data.id))

    // 2. Optional: Redirect the user from the server
    // useServerFn ensures this works in the browser
    throw redirect({ to: '/tasks' })
  })
```

#### B. Implement in the Component
```tsx
import { useServerFn } from '@tanstack/start'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { updateTask } from './server-functions'

export function EditTaskForm({ task }) {
  const router = useRouter()
  
  // 1. Wrap the server fn to handle redirects/not-found
  const serverAction = useServerFn(updateTask)

  // 2. Wrap the server action in a mutation for UI state
  const mutation = useMutation({
    mutationFn: serverAction,
    onSuccess: () => {
      // Re-run all active loaders to sync the UI with D1
      router.invalidate()
    },
  })

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      mutation.mutate({ id: task.id, title: formData.get('title') })
    }}>
      <input name="title" defaultValue={task.title} />
      
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving to D1...' : 'Save Changes'}
      </button>

      {mutation.isError && <p>Error: {mutation.error.message}</p>}
    </form>
  )
}
```

---

### 3. Why This Works Better

| Layer | Responsibility | Without It... |
| :--- | :--- | :--- |
| **Server Function** | Secure D1 execution. | You'd need to set up a separate API route. |
| **`useServerFn`** | SPA Routing/Redirects. | `throw redirect()` would result in a fetch error instead of navigation. |
| **`useMutation`** | UI State Machine. | You would need manual `useState` for `isPending` and `isError`. |

### Summary of Workflow
1.  **UI:** User clicks "Save."
2.  **Mutation:** `useMutation` enters `isPending: true`.
3.  **Transport:** `useServerFn` calls the Server Function via a specialized fetch.
4.  **Server:** Your code updates **Cloudflare D1**.
5.  **Redirect:** Server throws a `redirect`.
6.  **Bridge:** `useServerFn` catches the redirect and tells **TanStack Router** to move.
7.  **Sync:** `router.invalidate()` ensures all loaders refresh their data from D1.