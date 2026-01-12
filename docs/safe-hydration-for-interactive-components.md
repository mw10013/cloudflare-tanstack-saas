# Fixing Playwright Race Conditions: Safe Hydration with `useHydrated`

## The Issue: The Hydration Gap

In Server-Side Rendered (SSR) applications (like TanStack Start), the server sends HTML that includes your interactive components (inputs, buttons, etc.). These elements appear visible to the user (and Playwright) immediately.

However, until the JavaScript bundle downloads and React "hydrates" the page, the event handlers (like `onClick`, `handleChange`, `handleBlur`, and `handleSubmit`) are **not attached** to the DOM elements.

If Playwright interacts during this gap:

- **Form Inputs:** Keystrokes may be lost when React re-renders during hydration.
- **Form Submissions:** Hitting "Enter" or clicking "Submit" triggers a native browser form POST (reloading the page) instead of the intended handler.
- **Other Interactive Elements:** Clicks or interactions with buttons, links, or other components may be ignored or behave unexpectedly until handlers are attached.

## The Solution: Hydration Locking for Interactive Components

We use the `useHydrated` hook to force the `disabled` state on form inputs until the application is interactive. This ensures that users (and tests) cannot interact with the form until TanStack Form is fully in control.

### Implementation

Call `useHydrated` in your component and pass the state into your `form.Field` render prop.

```tsx
import { useForm } from "@tanstack/react-form";
import { useHydrated } from "@tanstack/react-router";

export function LoginForm() {
  // 1. Get hydration state
  // Returns false on Server & during initial Hydration pass
  // Returns true only after the app is interactive
  const isHydrated = useHydrated();

  const form = useForm({
    // ... form configuration
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field
        name="email"
        children={(field) => (
          <>
            <Label htmlFor={field.name}>Email</Label>
            {/* 2. Lock the input using !isHydrated */}
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              disabled={!isHydrated}
            />
          </>
        )}
      />

      <form.Subscribe selector={(state) => state.canSubmit}>
        {(canSubmit) => (
          <Button
            type="submit"
            // 3. Lock the submit button too
            disabled={!isHydrated || !canSubmit}
          >
            Sign In
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
```

### Hydration Locking for Non-Form Interactive Components

For buttons or other interactive elements outside forms, the same hydration gap applies. Use `useHydrated` to disable them until the app is interactive:

```tsx
import { useHydrated } from "@tanstack/react-router";

export function MyComponent() {
  const isHydrated = useHydrated();

  return (
    <Button onClick={() => console.log("Clicked!")} disabled={!isHydrated}>
      Click Me
    </Button>
  );
}
```

### Why checking handler existence isn't enough

You might be tempted to check if event handlers exist to determine if the component is ready. **This does not work for SSR.**

- **Server Execution:** On the server, handlers may be defined in memory but not yet attached to the DOM.
- **The Trap:** Elements could render as enabled in server HTML, allowing premature interactions.
- **The Result:** Race conditions persist until client-side JavaScript attaches listeners.

By using `!isHydrated`, we synchronize UI state with the React lifecycle, ensuring components are disabled until fully interactive.
