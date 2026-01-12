# TanStack Form error display: `isTouched` edge cases

## Problem

In `src/routes/app.$organizationId.invitations.tsx`, the email validation is executed on the client via a form-level submit validator:

- `validators.onSubmit` calls `formApi.parseValuesWithSchema(inviteFormSchema)`.
- For invalid input like `"asd"`, the schema produces field issues (e.g. `"emails.0"`) and TanStack Form populates field meta errors.

However, the UI originally only displayed field errors when the field had been touched:

- Errors were rendered only when `field.state.meta.isTouched && !field.state.meta.isValid`.

This creates a reproducible “pristine submit” failure mode:

- Refresh page
- Click Invite

The submit validator correctly finds errors, but the UI intentionally hides them because the field was never touched.

This is an expected interaction between:

- submit-time validation (which can produce errors even for pristine fields), and
- a display policy that hides all errors until a field is touched.

## Key observation

This issue is about **error display policy**, not about whether validation is happening.

The console output showing schema issues is proof that client-side validation ran successfully.

## Recommendation (Pattern 1): show errors when errors exist

The most robust and simplest TanStack Form pattern is to treat `field.state.meta.errors` as the source of truth and render errors when they exist.

Pattern:

- Compute `hasErrors = field.state.meta.errors.length > 0`
- Render `<FieldError />` when `hasErrors` is true
- Style invalid state based on `hasErrors` (instead of `isTouched`)

This handles:

- pristine submit (refresh → submit)
- submit-time schema validation via `parseValuesWithSchema`
- errors set by `form.setErrorMap(...)` (including server responses)

Conceptual example:

```tsx
const hasErrors = field.state.meta.errors.length > 0

<Field data-invalid={hasErrors}>
  {/* ... */}
  {hasErrors ? <FieldError errors={field.state.meta.errors} /> : null}
</Field>
```

Why this is idiomatic:

- TanStack Form’s meta state already centralizes all error sources.
- Displaying errors based on “whether there are errors” avoids coupling error visibility to interaction state.
- It eliminates the class of edge cases where validation runs but errors are hidden.

## Notes for this project

- `emails` is a single input that transforms to an array in the schema.
- Sub-errors like `"emails.0"` may be produced by the schema pipeline.
- Even with a single input field named `"emails"`, it’s still useful to render `field.state.meta.errors` because TanStack Form will aggregate relevant messages there for the field being rendered.

If later you want per-email messages (still in a single input UI), you can additionally render `form.state.errorMap.onSubmit.fields` entries for keys like `"emails.0"`, `"emails.1"`, etc, but that is optional and not required to fix the pristine submit visibility issue.
