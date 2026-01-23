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

## Existing Examples

- `src/routes/login.tsx:35` extracts `loginSchema` for input validation, mutation typing, and form validation.
- `src/routes/app.$organizationId.invitations.tsx:115` extracts `inviteSchema` for input validation, mutation typing, and form validation.
- `src/routes/admin.users.tsx:347` extracts `banUserSchema` for input validation, mutation typing, and form validation.

## Candidates For Extraction

- `src/routes/admin.users.tsx:66` and `src/routes/admin.users.tsx:91` duplicate the search schema used by `getUsers` and `Route.validateSearch`.
- `src/routes/admin.users.tsx:113` and `src/routes/admin.users.tsx:124` duplicate the `{ userId }` schema used by `unbanUser` and `impersonateUser`.
- `src/routes/admin.subscriptions.tsx:30` and `src/routes/admin.subscriptions.tsx:55` duplicate the search schema used by `getSubscriptions` and `Route.validateSearch`.
- `src/routes/admin.customers.tsx:30` and `src/routes/admin.customers.tsx:55` duplicate the search schema used by `getCustomers` and `Route.validateSearch`.
- `src/routes/admin.sessions.tsx:30` and `src/routes/admin.sessions.tsx:55` duplicate the search schema used by `getSessions` and `Route.validateSearch`.
- `src/routes/app.$organizationId.billing.tsx:28` and `src/routes/app.$organizationId.billing.tsx:244` duplicate the `{ organizationId }` schema used by the loader and `manageBilling`.
- `src/routes/app.$organizationId.billing.tsx:262` and `src/routes/app.$organizationId.billing.tsx:289` duplicate the `{ organizationId, subscriptionId }` schema used by `cancelSubscription` and `restoreSubscription`.
- `src/routes/app.$organizationId.members.tsx:36` and `src/routes/app.$organizationId.members.tsx:100` duplicate the `{ organizationId }` schema used by the loader and `leaveOrganization`.
- `src/routes/app.$organizationId.index.tsx:51` and `src/routes/app.$organizationId.index.tsx:61` duplicate the `{ invitationId }` schema used by `acceptInvitation` and `rejectInvitation`.
