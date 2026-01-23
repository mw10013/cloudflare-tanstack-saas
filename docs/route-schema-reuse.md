# Route Schema Reuse Pattern

## Purpose

When a Zod schema is referenced by multiple parts of a route module (server fn input validation, form validators, and mutation typing), extract it into a top-level constant. This keeps the shape consistent and prevents drift.

## Pattern

```tsx
const loginSchema = z.object({
  email: z.email(),
});

export const login = createServerFn({ method: "POST" })
  .inputValidator(loginSchema)
  .handler(async ({ data }) => {
    return data;
  });

const loginMutation = useMutation({
  mutationFn: (data: z.input<typeof loginSchema>) => login({ data }),
});

const form = useForm({
  validators: {
    onSubmit: loginSchema,
  },
});
```

## validateSearch Shortcut

`validateSearch` accepts any object with a `parse` method, so a Zod schema can be passed directly instead of wrapping with `(search) => schema.parse(search)`.

```tsx
const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  filter: z.string().trim().optional(),
});

export const Route = createFileRoute("/admin/subscriptions")({
  validateSearch: searchSchema,
});
```

## Existing Examples

- `src/routes/login.tsx:35` extracts `loginSchema` for input validation, mutation typing, and form validation.
- `src/routes/app.$organizationId.invitations.tsx:115` extracts `inviteSchema` for input validation, mutation typing, and form validation.
- `src/routes/admin.users.tsx:347` extracts `banUserSchema` for input validation, mutation typing, and form validation.

## Candidates For Extraction

- `src/routes/app.$organizationId.members.tsx:77` and `src/routes/app.$organizationId.members.tsx:113` repeat the `{ organizationId, memberId, role }` schema used by `removeMember` and `updateMemberRole`.
- `src/routes/app.$organizationId.invitations.tsx:49` and `src/routes/app.$organizationId.invitations.tsx:306` inline small `z.object(...)` schemas that could be shared if they need to be referenced in multiple places.
- `src/routes/_mkt.pricing.tsx:32` includes a small `{ intent }` schema that could be extracted if reused by future form validators.
