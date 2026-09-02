# ConversaAI Supabase migrations

This directory is the canonical home for future versioned Supabase schema changes.

## Rules

- Never reset the production database as part of normal development.
- Every schema change should be represented by a numbered/timestamped migration.
- Migrations must be reviewed before production deployment.
- Prefer additive and reversible changes.
- Do not copy the current production schema into a fake baseline migration.
- Do not put secrets, service-role keys, or environment values in migration files.
- Include related RLS policy, index, constraint, trigger, or RPC changes in the same migration when they are part of one logical change.
- When application code and a migration must be deployed together, keep backward compatibility where practical so either side can be deployed safely first.

## Current state

The database already exists and contains the application's production tables, RLS policies, indexes, functions, and constraints. This repository currently does not contain a complete migration history for that existing schema.

Therefore, this file intentionally establishes the migration process without pretending that the existing production database can be reconstructed safely from a single unverified baseline.

## First real migrations

The first actual migrations should be introduced only after the current production schema is captured and verified. Candidate cleanup work includes:

1. Consolidating duplicate RLS policies.
2. Reviewing user ownership constraints and the absence of visible `user_id → auth.users.id` foreign keys.
3. Standardizing assistant configuration fields.
4. Adding only the indexes/constraints proven necessary by the application.
5. Improving billing idempotency and usage accounting where schema support is required.

These changes should be separate, reviewable migrations rather than one large database rewrite.
