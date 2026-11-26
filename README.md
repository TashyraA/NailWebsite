
# InLoveNailz by Briana

InLoveNailz is a full-stack nail salon booking website with online appointment requests, secure payments, automated email notifications, and a custom administrative dashboard.

## Production Website

https://www.inlovenailz.com

## Technology Stack

| Technology | Purpose |
| --- | --- |
| React | Frontend application |
| TypeScript | Application development and type checking |
| Vite | Development server and production builds |
| Tailwind CSS | Styling and responsive layouts |
| shadcn/ui | User interface components |
| React Router | Application routing |
| TanStack Query | Data fetching and state management |
| Neon PostgreSQL | Production database |
| Stripe | Secure online payment processing |
| Resend | Transactional email delivery |
| Vercel | Hosting, serverless APIs, and scheduled jobs |
| GitHub | Source control and deployment integration |
| npm | Dependency management |

## Website Features

### Customer Experience

- Responsive website for desktop and mobile devices.
- Nail service browsing and pricing.
- Online appointment requests.
- Appointment availability based on the salon's configured schedule.
- Appointment approval and decline notifications.
- Secure Stripe deposit payments.
- Secure outstanding balance payments.
- Appointment and payment confirmation emails.
- Appointment cancellation notifications.
- Automatic deposit deadline expiration notifications.
- Customer contact form.

### Administrative Dashboard

- Secure administrator authentication.
- Appointment management.
- Appointment approval, decline, and cancellation.
- Service and pricing management.
- Custom weekly scheduling.
- Date-specific scheduling overrides.
- Blocked appointment times.
- Deposit payment tracking.
- Outstanding balance tracking.
- Deposit payment email recovery.
- Manual balance payment email delivery.
- Payment and appointment status management.

## Project Structure

```text
NailWebsite/
├── api/                 # Serverless API endpoints and server utilities
├── public/              # Public website assets
├── src/                 # React frontend application
├── package.json         # Dependencies and development scripts
├── package-lock.json    # npm dependency lockfile
├── vercel.json          # Routing, headers, and scheduled jobs
└── README.md            # Project documentation
```

## Local Development

### Prerequisites

- Node.js compatible with the configured Vercel runtime.
- npm.
- Git.
- Authorized access to any required development services.

### 1. Clone the Repository

```bash
git clone https://github.com/TashyraA/NailWebsite.git
cd NailWebsite
```

### 2. Install Dependencies

```bash
npm ci
```

npm is the project's standard package manager. Preserve and commit `package-lock.json` to maintain consistent dependency installations.

### 3. Start the Frontend Development Server

```bash
npm run dev
```

Open the local address displayed in the terminal, typically:

http://localhost:5173/

The Vite development server provides frontend development and hot reloading. Serverless API functionality requires an appropriately configured Vercel development environment.

Do not connect an unreviewed local development environment to production payment or database credentials.

## Available Commands

| Command | Description |
| --- | --- |
| `npm ci` | Install dependencies using the committed lockfile |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Compile TypeScript and build the production frontend |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run preview` | Preview the compiled frontend |

## Production Architecture

The website is deployed through Vercel using the GitHub repository.

The production application consists of:

- A React and TypeScript frontend.
- Vercel serverless API endpoints.
- A Neon PostgreSQL database.
- Stripe LIVE payment processing.
- Resend transactional email delivery.
- A custom administrative dashboard.
- Vercel scheduled background jobs.

The production domain is:

https://www.inlovenailz.com

The non-www domain redirects to the primary www domain.

The complete application requires server-side API functionality and cannot be deployed as a standalone static website without providing equivalent backend infrastructure.

## Appointment Workflow

1. A customer selects a service and submits an appointment request.
2. The administrator reviews the request.
3. An approved appointment enters the deposit payment workflow.
4. A secure Stripe Checkout link is delivered to the customer.
5. Stripe processes the deposit payment.
6. The server verifies and records the payment.
7. Appointment confirmation emails are delivered.
8. Any remaining balance can be paid through a secure balance payment link.
9. Verified balance payments update the appointment's payment records.
10. Payment confirmation emails are delivered.

Appointments with unpaid deposits may automatically expire when their configured payment deadline passes.

## Payment Processing

Stripe is used for secure online payment processing.

The production payment integration operates in LIVE mode.

### Payment Features

- Secure Stripe-hosted Checkout.
- Appointment deposit payments.
- Outstanding balance payments.
- Server-side payment amount validation.
- Stripe webhook signature verification.
- Payment event deduplication.
- Verified payment status tracking.
- Duplicate payment prevention safeguards.
- Expiration of eligible unpaid checkout sessions.
- Customer and business payment notifications.

### Production Webhook

```text
https://www.inlovenailz.com/api/stripe-webhook
```

The webhook processes supported Stripe payment events and updates the corresponding database records.

Payment status must be determined from verified server-side payment records, not solely from browser redirects or customer-facing confirmation pages.

Do not switch the production Stripe integration to test mode as a rollback procedure.

Do not delete, manually modify, or refund production payment records without explicit authorization and appropriate verification.

## Database

Neon PostgreSQL is the production database.

The database supports:

- Appointment records.
- Customer booking information.
- Salon services and pricing.
- Administrative scheduling.
- Appointment availability.
- Deposit and balance payment tracking.
- Stripe payment event processing.
- Payment notification processing.
- Administrative login rate limiting.

Database schema changes must be reviewed before execution.

Before applying production database changes:

1. Confirm the correct database and branch.
2. Review the existing schema.
3. Verify that the change is compatible with current application code.
4. Confirm an appropriate backup or recovery strategy.
5. Apply only the intended migration.
6. Verify the affected functionality.

Never execute destructive database reset scripts against production.

## Email Notifications

Resend provides transactional email delivery.

Supported email workflows include:

- New appointment requests.
- Appointment approval and deposit payment instructions.
- Appointment decline notifications.
- Deposit payment confirmations.
- Balance payment links.
- Balance payment confirmations.
- Appointment cancellation confirmations.
- Deposit deadline expiration notifications.
- Customer contact messages.

The production email integration uses a verified sending domain and a restricted sending API key.

Email credentials must remain server-side.

## Scheduling

Appointment availability is managed through the custom administrative dashboard.

The scheduling system supports:

- Weekly availability.
- Date-specific schedule overrides.
- Blocked appointment times.
- Existing appointment reservations.
- Service duration and scheduling constraints.

The website displays availability based on the current scheduling configuration.

Scheduling is managed internally through the website and its database.

## Scheduled Background Jobs

Vercel runs scheduled jobs configured in `vercel.json`.

| Endpoint | Cron Schedule | Purpose |
| --- | --- | --- |
| `/api/expire-deposit-appointments` | `*/5 * * * *` | Process eligible expired deposit deadlines |
| `/api/process-payment-notifications` | `2-59/5 * * * *` | Process queued payment and expiration notifications |

Both jobs are scheduled every five minutes, with staggered execution times.

Scheduled endpoints are protected using server-side authorization.

Monitor scheduled job execution and runtime logs for failures.

## Environment Variables

Production environment variables are managed securely through Vercel.

The application uses server-side configuration for:

- Neon database connectivity.
- Stripe LIVE credentials.
- Stripe webhook signature verification.
- Resend email delivery.
- Business email configuration.
- Administrator authentication.
- Administrator session signing.
- Secure balance payment links.
- Scheduled job authorization.
- Production application URLs.

Never commit actual credentials to GitHub.

Never expose private credentials through frontend environment variables.

Variables prefixed with `VITE_` may be included in the client-side application and must not contain private server credentials.

Use the current API implementation and authorized Vercel project configuration as the authoritative sources for required environment variables.

## Security

The application includes security controls for administrative access, payment processing, and sensitive server-side operations.

These include:

- Server-side administrator authentication.
- Signed administrator session cookies.
- HttpOnly session cookies.
- Secure cookies in production.
- SameSite cookie restrictions.
- Same-origin validation for protected operations.
- Database-backed administrator login rate limiting.
- Stripe webhook signature verification.
- Server-side payment verification.
- Signed balance payment links.
- Protected scheduled endpoints.
- Server-side environment variables.

Security controls must be maintained when modifying the application.

Do not commit:

- Environment files containing credentials.
- Stripe secret keys.
- Stripe webhook signing secrets.
- Database connection strings.
- Resend API keys.
- Administrator passwords or password hashes.
- Session signing secrets.
- Balance link signing secrets.
- Scheduled job authorization secrets.
- Customer information or private payment links.

## Production Deployment

The production website is deployed through Vercel using the GitHub `main` branch.

### Before Deployment

1. Review all intended changes.
2. Verify dependency consistency.
3. Run the production build.
4. Review Git changes.
5. Confirm that no credentials are included.
6. Commit and push the approved changes.

```bash
npm ci
npm run build
git status
git diff --check
```

### After Deployment

1. Confirm that the Vercel deployment is Ready.
2. Verify that the deployed commit matches the intended Git commit.
3. Open the production website.
4. Verify the affected website functionality.
5. Review Vercel runtime logs.
6. Confirm that scheduled jobs continue operating.
7. Verify payment and email functionality when affected by the deployment.

Avoid unnecessary live payment transactions during routine deployments.

## Production Maintenance

Regular maintenance should include:

- Reviewing Vercel deployment and runtime logs.
- Monitoring Vercel resource usage and billing.
- Reviewing Stripe payment and webhook activity.
- Monitoring Neon database usage and performance.
- Reviewing Resend email delivery and usage.
- Reviewing dependency security advisories.
- Verifying scheduled background jobs.
- Reviewing administrative authentication activity.
- Removing confirmed unused dependencies and integrations.
- Maintaining accurate project documentation.

Apply dependency updates individually or in controlled groups and verify application functionality before deploying.

## Rollback and Recovery

If a deployment introduces a production issue:

1. Identify the affected functionality.
2. Review deployment and runtime logs.
3. Determine whether a code rollback is appropriate.
4. Confirm compatibility with the current database schema.
5. Confirm compatibility with current production credentials.
6. Restore or redeploy an appropriate known-good code version.
7. Verify production functionality.

Older deployments may contain outdated environment configuration or revoked credentials.

Do not restore obsolete credentials or switch production payments to test mode to resolve a deployment issue.

Database recovery and payment reconciliation require separate review.

## Project Ownership

This application is maintained for InLoveNailz by Briana.

Production website access, administrative access, customer information, payment records, database credentials, and service credentials must be handled only by authorized individuals.
