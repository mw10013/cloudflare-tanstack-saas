## Quick Start

### Stripe

- Install the [Stripe CLI](https://stripe.com/docs/stripe-cli).
- Go to stripe and create a sandbox for testing named `tcs-int`
  - Remember secret key for `STRIPE_SECRET_KEY` environment variable.

### Local Env

- Copy `.env.example` to `.env`.
- Edit the `BETTER_AUTH_SECRET` and `STRIPE_SECRET_KEY` keys.
- Set `STRIPE_WEBHOOK_SECRET` later after you run `pnpm stripe:listen` below.

```
pnpm i
pnpm d1:reset
stripe login --project-name=tcs-int
pnpm stripe:listen
# copy webhook signing secret to STRIPE_WEBHOOK_SECRET in .env
pnpm dev

# cron
curl "http://localhost:3000/cdn-cgi/handler/scheduled?cron=0%200%20*%20*%20*"
```

## Testing

### Stripe Test Card Details

- Card Number: `4242 4242 4242 4242`
- Expiration: Any future date
- CVC: Any 3-digit number

### Unit and Integration Tests

```
pnpm test
```

### E2E Tests

```
pnpm dev
pnpm stripe:listen
pnpm test:e2e
```

## Deploy

- Create stripe webhook
  - Endpoint URL: `https://[DOMAIN]/api/auth/stripe/webhook`
  - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

- pnpm exec wrangler kv namespace create tcs-kv-production
- Update wrangler.jsonc production kv_namespaces
- pnpm d1:reset:PRODUCTION
- pnpm deploy:PRODUCTION
- pnpm exec wrangler secret put SECRET --env production
- Workers & Pages Settings: tcs
  - Git repository: connect to git repo
  - Build configuration
    - Build command: CLOUDFLARE_ENV=production pnpm build
    - Deploy command: pnpm exec wrangler deploy --env production
- Storage & databases: tcs-d1-production: Settings
  - Enable read replication

## Shadcn with Base UI

```bash
pnpm dlx shadcn@latest add --overwrite accordion alert-dialog alert aspect-ratio avatar badge breadcrumb button-group button calendar card carousel chart checkbox collapsible combobox command context-menu dialog drawer dropdown-menu empty field input-group input item label pagination popover radio-group select separator sidebar sonner spinner switch table textarea toggle tooltip
```

## Credit

Homepage / Pricing design by [dev-xo](https://github.com/dev-xo). See his [remix-saas](https://github.com/dev-xo/remix-saas) for a production-ready saas template for remix.

## License

Licensed under the [MIT License](https://github.com/mw10013/tanstack-cloudflare-saas/blob/main/LICENSE).
