# ConversaAI — Architecture Baseline

## Purpose

This document defines the current target architecture for ConversaAI. It is a baseline for incremental refactoring; it does not authorize destructive database changes or a full rewrite.

## Principles

1. Preserve working functionality before replacing it.
2. Prefer small, reversible changes over large migrations.
3. Keep authentication and authorization server-side.
4. Keep secrets out of the browser and repository.
5. Treat Supabase as the source of truth for application data.
6. Keep billing providers behind a provider-oriented service boundary.
7. Keep the web widget independent from dashboard presentation.
8. Use regular CSS/Bootstrap for new UI work rather than expanding the Tailwind dependency.

## Target structure

```text
CONVERSAAI
├── FRONTEND
│   ├── public site
│   ├── dashboard
│   └── admin
├── API
│   ├── authentication / authorization
│   ├── assistants
│   ├── conversations
│   ├── leads
│   ├── usage
│   └── webhooks
├── WIDGET
│   └── public/widget.js
├── AI
│   ├── assistant configuration
│   ├── prompt construction
│   └── model / plan routing
├── SUPABASE
│   ├── application data
│   ├── RLS policies
│   ├── RPCs
│   └── migrations
└── BILLING
    ├── provider abstraction
    └── Flow (current)
        └── additional providers later
```

## Core domain model

The current database contains the following main domains:

- `profiles`: account/business profile.
- `subscriptions`: current plan, status, limits and usage period.
- `assistants`: assistant configuration and business knowledge.
- `assistant_channels`: channel-specific configuration.
- `assistant_domains`: widget/domain authorization and installation telemetry.
- `conversations`: visitor conversations.
- `messages`: conversation messages.
- `leads`: captured prospects.
- `assistant_test_messages`: dashboard assistant testing.
- `billing_payments`: payment attempts and provider responses.
- `notifications`: user-facing notifications.
- `audit_logs` / `security_events`: operational and security auditing.

## Request flow

### Dashboard

```text
Browser
  → Supabase session
  → authenticated Next.js route
  → authorization helper
  → application/service logic
  → Supabase
```

### Widget

```text
Visitor browser
  → public/widget.js
  → widget API
  → domain + assistant validation
  → rate limit / usage check
  → AI service
  → conversation + message persistence
```

### Billing

```text
Dashboard
  → billing service
  → Flow
  → Flow webhook
  → verify provider status
  → idempotent payment update
  → subscription update
```

## Planned application boundaries

### Authentication

Centralize common checks into reusable server helpers such as:

- `requireUser()`
- `requireAdmin()`
- `requireAssistantOwner()`

Routes should not independently reinvent authorization rules.

### Assistant configuration

Move toward one canonical assistant configuration model. Legacy field names should be normalized at the boundary and should not spread through the application.

### AI

Prompt construction and model selection should remain server-side. Business knowledge must be treated as data, not as trusted system instructions.

### Usage

Message usage should be handled as an explicit operation. A future implementation should support reservation/commit/refund semantics so an AI provider failure does not unnecessarily consume a user's allowance.

### Billing

Billing logic should not depend directly on a single provider's implementation. Flow remains the first provider for the Chilean launch. Additional providers can be added behind the same service boundary later.

## Database policy

The existing production schema must be preserved while the architecture is cleaned up.

Future schema changes must:

1. be committed as versioned migrations under `supabase/migrations/`;
2. be reviewed before applying to production;
3. avoid destructive changes unless explicitly planned;
4. include RLS/policy changes in the same migration when applicable;
5. preserve compatibility during transitions when application code is deployed incrementally.

The current database has RLS enabled on all audited public tables. Existing duplicate policies and schema drift should be cleaned up incrementally rather than through an uncontrolled reset.

## Launch scope

The initial product should focus on:

- webchat assistant;
- assistant configuration and knowledge;
- conversations and leads;
- widget publication/domain control;
- usage and plan limits;
- Flow billing for Chile;
- dashboard and admin observability.

Other channels and payment providers remain extensibility points rather than launch blockers.

## Refactoring order

1. Establish migration history and architecture documentation.
2. Introduce centralized authentication/authorization helpers.
3. Normalize the assistant configuration model.
4. Consolidate billing/provider logic and make webhooks idempotent.
5. Improve usage accounting around AI failures.
6. Clean duplicate RLS policies and review authorization boundaries.
7. Migrate new UI surfaces away from Tailwind toward regular CSS/Bootstrap.
8. Remove obsolete legacy code only after the replacement is verified.

## Non-goals for the baseline

- No production database reset.
- No deletion of existing user/business data.
- No immediate rewrite of the widget.
- No forced migration of all providers/channels.
- No large UI rewrite before the backend boundaries are stable.
