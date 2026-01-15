## Quick Start

### Stripe

- Install the [Stripe CLI](https://stripe.com/docs/stripe-cli).
- Go to stripe and create a sandbox for testing named `ctss-int`
  - Remember secret key for `STRIPE_SECRET_KEY` environment variable.
- Create a stripe webhook
  - Endpoint URL: `https://dummy.com/api/auth/stripe/webhook` (This is dummy placeholder for local dev)
  - Events: `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`

### Local Env

- Copy `.env.example` to `.env`.
- Edit the `BETTER_AUTH_SECRET` and `STRIPE_SECRET_KEY` keys.
- Set `STRIPE_WEBHOOK_SECRET` later after you run `pnpm stripe:listent` below.
- Leave the aws ses email keys empty since we are running in demo mode.

```
pnpm i
pnpm d1:reset
stripe login --project-name=ctss-int
pnpm stripe:listen
# copy webhook signing secret to STRIPE_WEBHOOK_SECRET in .env
pnpm dev

# cron
curl "http://localhost:5173/cdn-cgi/handler/scheduled?cron=0%200%20*%20*%20*"
```

## Testing

### Stripe Test Card Details

- Card Number: `4242 4242 4242 4242`
- Expiration: Any future date
- CVC: Any 3-digit number

### Unit and Integration Tests

```
pnpm test
pnpm vitest --config test/integration/vitest.config.ts run test/integration/auth.test.ts
pnpm vitest --config test/integration/vitest.config.ts run --include test/integration/auth.test.ts
pnpm vitest --config test/integration/vitest.config.ts run test/integration/auth.test.ts -t "sends magic link and writes it to KV"
pnpm vitest --config test/integration/vitest.config.ts run test/integration/auth.test.ts -t "verifies magic link and creates a session"
pnpm vitest --config test/integration/vitest.config.ts run test/integration/auth.test.ts -t "redirects /magic-link based on user role"
pnpm vitest --config test/integration/vitest.config.ts run test/integration/auth.test.ts -t "signs out (endpoint reachable)"

pnpm test:e2e e2e/stripe1.spec.ts --project=chromium --workers=1 --reporter=line
pnpm test:e2e e2e/stripe1.spec.ts --project=chromium --workers=1 --repeat-each=3 --reporter=line
pnpm -s test:e2e e2e/stripe1.spec.ts --project=chromium --workers=1
```

### E2E Tests

```
pnpm dev
pnpm stripe:listen
pnpm test:e2e
```

## Deploy

- pnpm exec wrangler kv namespace create ctss-kv-production
- Update wrangler.jsonc production kv_namespaces
- pnpm d1:reset:PRODUCTION
- pnpm deploy:PRODUCTION
- pnpm exec wrangler secret put SECRET --env production
- Workers & Pages Settings: ctss
  - Git repository: connect to git repo
  - Build configuration
    - Build command: CLOUDFLARE_ENV=production pnpm build
    - Deploy command: pnpm exec wrangler deploy --env production
- Storage & databases: ctss-d1-production: Settings
  - Enable read replication

## Shadcn with Base UI

```bash
pnpm dlx shadcn@latest add --overwrite accordion alert-dialog alert aspect-ratio avatar badge breadcrumb button-group button calendar card carousel chart checkbox collapsible combobox command context-menu dialog drawer dropdown-menu empty field input-group input item label pagination popover radio-group select separator sidebar sonner spinner switch table textarea toggle tooltip
```

## Credit

Homepage / Pricing design by [dev-xo](https://github.com/dev-xo). See his [remix-saas](https://github.com/dev-xo/remix-saas) for a production-ready saas template for remix.

## License

Licensed under the [MIT License](https://github.com/mw10013/cloudflare-tanstack-saas/blob/main/LICENSE).