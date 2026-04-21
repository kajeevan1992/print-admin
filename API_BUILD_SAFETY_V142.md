# v142 build-safe API hotfix

This build keeps DB-backed API routes from crashing deployment builds.

## What changed
- Added `export const dynamic = 'force-dynamic'`
- Added `export const revalidate = 0`
- Added a `DATABASE_URL` guard

## Why
Next.js/Coolify was touching API routes during build/export.
Without `DATABASE_URL`, Prisma-backed routes crashed the deployment.

## Result
Routes now return a safe `503 DATABASE_NOT_CONFIGURED` response until the database env is provided.
