# Better Themes Integration Plan

## Reference Findings

- `better-themes` provides `ThemeProvider` and `useTheme` for React apps, with SSR-safe inline script to prevent flash and support for system theme detection, storage sync, and configurable attributes.
- For TanStack Start or Vite, usage is via `import { ThemeProvider } from "better-themes"` (not the RSC entry), and the HTML root should include `suppressHydrationWarning`.
- The provider can control `class` or `data-*` attributes; `class` matches the existing Tailwind dark mode strategy.

## Current Codebase State

- `src/routes/__root.tsx` renders the root document and currently hard-codes `className="dark"` on `<body>`.
- Tailwind styles use the `.dark` class and `@custom-variant dark`, so a class-based theme switcher is appropriate.
- `next-themes` is still installed and used in `src/components/ui/sonner.tsx`.
- No global theme provider is set up at the app root.

## Integration Approach

- Use `ThemeProvider` at the root document level so the inline theme script runs before hydration and the hook is available throughout the app.
- Configure the provider with `attribute="class"` to keep Tailwind dark mode behavior intact.
- Remove the hard-coded `dark` class on `<body>` so themes can be set dynamically.
- Replace `next-themes` usage with `better-themes` and remove the dependency once all usage is migrated.
- Add a theme switcher component in the marketing or app shell as needed, using the `useTheme` hook.

## Step-by-Step Plan

1. **Root document setup**
   - Update `src/routes/__root.tsx` to wrap the document body in `ThemeProvider` with `attribute="class"` and `disableTransitionOnChange` (optional).
   - Add `suppressHydrationWarning` to the `<html>` element.
   - Remove the `dark` class from `<body>` and keep the remaining base classes.

2. **Replace theme hook usage**
   - Swap `useTheme` import in `src/components/ui/sonner.tsx` from `next-themes` to `better-themes`.
   - Ensure the Sonner `theme` prop still receives `"light" | "dark" | "system"`.
   - Remove the `next-themes` dependency from `package.json` once no longer referenced.

3. **Add a theme switcher component**
   - Create a new UI component (likely under `src/components`) that uses `useTheme` to toggle `light`, `dark`, and `system`.
   - Reuse patterns from `refs/better-themes/examples/theme-switchers/src/shadcn` to align with the existing shadcn UI stack.
   - Insert the switcher into the marketing header (`src/routes/_mkt.tsx`) or app shell depending on product requirements.

4. **Optional customization**
   - If supporting more than light/dark, set `themes` and `value` props on `ThemeProvider` and define matching CSS variables in `src/styles.css`.
   - If CSP headers are enforced, supply a `nonce` to `ThemeProvider` and allow the inline script.

## Suggested Default Configuration

- `attribute`: `"class"`
- `enableSystem`: `true`
- `disableTransitionOnChange`: `true`
- `storageKey`: `"theme"` (default)

## Validation

- Verify hydration with no theme flash on first load.
- Toggle theme and ensure the `dark` class updates on the `<html>` element.
- Confirm the Sonner toaster theme matches the current theme.
