# TanStack Form: Validators and Value Transformation

## Validators Cannot Transform Values

Validators in TanStack Form only validate - they do not transform values. This is a key design principle.

> "Validation will not provide you with transformed values."

**Source:** `refs/tan-form/docs/framework/react/guides/validation.md:461`

## Documentation Excerpts

### Validation Guide

From `refs/tan-form/docs/framework/react/guides/validation.md:461`:

> Validation will not provide you with transformed values. See [submission handling](./submission-handling.md) for more information.

### Submission Handling Guide

From `refs/tan-form/docs/framework/react/guides/submission-handling.md:67-69`:

> While Tanstack Form provides Standard Schema support for validation, it does not preserve the Schema's output data.
>
> The value passed to the `onSubmit` function will always be the input data. To receive the output data of a Standard Schema, parse it in the `onSubmit` function.

## Code Pattern

```tsx
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

const schema = z.object({
  age: z.string().transform((age) => Number(age)),
});

const form = useForm({
  defaultValues: { age: "13" },
  validators: {
    onChange: schema, // Only validates - no transform applied
  },
  onSubmit: ({ value }) => {
    const inputAge: string = value.age;
    // Transform happens HERE - parse through schema again
    const result = schema.parse(value);
    const outputAge: number = result.age; // Now a number
  },
});
```

## Key Points

1. **Validators receive raw input values** - The `value` passed to validators is always the original form data
2. **`parseValuesWithSchema()` returns issues only** - It validates but does not transform or return transformed data
3. **Transform in `onSubmit`** - Call `schema.parse(value)` again in the `onSubmit` handler to get transformed output

## Example from Project

From `src/routes/app.$organizationId.invitations.tsx:228-246`:

```tsx
const form = useForm({
  defaultValues: {
    emails: "",
    role: "member" as Extract<Domain.MemberRole, "member" | "admin">,
  },
  validators: {
    onSubmit: ({ value, formApi }) => {
      // Only returns validation issues, no transformation
      const issues = formApi.parseValuesWithSchema(inviteFormSchema);
      if (issues) {
        return { form: "", fields: issues.fields };
      }
    },
  },
  onSubmit: ({ value }) => {
    // value is raw input - transform here if needed
    action.mutate({ organizationId, ...value });
  },
});
```

## Summary

| Stage      | Value Type | Can Transform?           |
| ---------- | ---------- | ------------------------ |
| Validator  | Raw input  | No                       |
| `onSubmit` | Raw input  | Yes (parse schema again) |
