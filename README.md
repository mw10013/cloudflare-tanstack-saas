<h1 align="center">
<code>TanStack Cloudflare SaaS</code>
</h1>

<div align="center">
  <p>
  Lightweight saas template packed with essential functionality for TanStack and Cloudflare
  </p>
  <p>
  TanStack • Cloudflare • Better Auth • Stripe • Shadcn on Base UI
  </p>
  <p>
    <a href="https://tcs.devxo.workers.dev/">Demo</a>
  </p>

</div>

## Stack

- TanStack: Start, Router, Query, Form
- Cloudflare: D1 with read replication, KV, Cron, Rate Limiting, Web Analytics
- Better Auth: Magic Link, Admin, Organization, Stripe, D1 Database Adapter
- UI: Shadcn on Base UI 
- Testing: Vitest, Playwright

## Template Functionality

- **Authentication & Organizations:**
  - Magic link authentication using Better Auth
  - Multi-tenant organization management with automatic organization creation
  - Role-based access control (user/admin/organization member roles)
  - Organization invitations and membership management

- **Payments & Subscriptions:**
  - Stripe integration with subscription processing
  - Monthly and annual pricing plans with configurable trial periods
  - Stripe Checkout and Customer Portal integration
  - Webhook handling for subscription lifecycle events
  - Subscription management (cancel, reactivate, billing portal access)

- **Database & Data Management:**
  - Cloudflare D1 (SQLite) database with read replication and schema migrations
  - Type-safe database operations with Zod schema validation
  - Session management with automatic cleanup of expired sessions
  - Database seeding utilities for development and testing

- **Admin Panel:**
  - Admin interface for user management
  - Session monitoring and administration
  - Customer and subscription oversight

- **UI/UX Components:**
  - Shadcn with Base UI and TanStack Form integration
  - Theme switching (light/dark/system) with persistence

- **Testing Infrastructure:**
  - Unit and integration tests using Vitest
  - End-to-end testing with Playwright

- **Email Integration:**
  - AWS SES for transactional email delivery
  - Demo mode support for development without external email services

- **Security & Performance:**
  - IP-based rate limiting for authentication endpoints using Cloudflare Rate Limiting
  - Server-side route protection and authorization
  - Secure session handling with database storage
  
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

- Cloudflare Web Analytics | Add a site
  - Remember token from script for ANALYTICS_TOKEN secret below.

- pnpm exec wrangler kv namespace create tcs-kv-production
- Update wrangler.jsonc production kv_namespaces
- pnpm d1:reset:PRODUCTION
- pnpm deploy:PRODUCTION
- pnpm exec wrangler secret put SECRET --env production
  - BETTER_AUTH_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, ANALYTICS_TOKEN
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

