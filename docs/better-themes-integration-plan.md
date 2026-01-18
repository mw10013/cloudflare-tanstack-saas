# Better Themes Integration Plan

## TanStack Start Guidance (Official Docs)

- Wrap the app with `ThemeProvider` in `routes/__root.tsx` using the default export (`better-themes`).
- Add `suppressHydrationWarning` to the `<html>` element.
- Use `attribute="class"` and `disableTransitionOnChange` for Tailwind class-based themes.
- Theme switcher examples use `useHydrated` from `@tanstack/react-router` to avoid mismatches before hydration.

## Current Codebase State

- `src/routes/__root.tsx` renders the root document and currently hard-codes `className="dark"` on `<body>`.
- Tailwind styles use the `.dark` class and `@custom-variant dark`, so a class-based provider is required.
- No global theme provider is set up at the app root.

## Integration Goals

- Ensure SSR-safe theme initialization (no flash on load).
- Preserve Tailwind dark mode behavior using class attributes.
- Keep unused theme tooling (Sonner/next-themes) untouched as requested.

## Step-by-Step Plan

1. **Root document integration**
   - Update `src/routes/__root.tsx` to wrap the document body with `ThemeProvider`.
   - Add `suppressHydrationWarning` to `<html>`.
   - Remove the hard-coded `dark` class from `<body>` so the provider controls it.

2. **Theme switcher component (shadcn-based)**
   - Follow the `refs/better-themes/examples/theme-switchers/src/shadcn/radio-switcher.tsx` pattern.
   - Implement the switcher with shadcn `RadioGroup`, `RadioGroupItem`, and `Label` components plus Lucide icons.
   - Use `useTheme` and a hydrated guard (`useHydrated` or a mounted flag) before reading theme state.
   - Place it in the marketing header (`src/routes/_mkt.tsx`) next to auth buttons.

3. **Optional configuration**
   - If additional themes are needed, configure `themes` and `value` props in `ThemeProvider` and add matching CSS variables in `src/styles.css`.
   - If CSP is enforced, pass `nonce` into `ThemeProvider` so the inline script is allowed.

## Suggested Default Configuration

- `attribute`: `"class"`
- `enableSystem`: `true`
- `disableTransitionOnChange`: `true`
- `storageKey`: `"theme"` (default)

## Validation Checklist

- Initial load does not flash incorrect theme.
- Theme changes update the `class` on `<html>` correctly.
- Hydration runs without warnings after adding `suppressHydrationWarning`.
