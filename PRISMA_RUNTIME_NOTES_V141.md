# v141 Prisma runtime fix

This build ensures Prisma Client is generated during deployment.

## Changes
- Added `postinstall: prisma generate`
- Updated `build` script to run `prisma generate` before `next build`

## Why
Deployments were failing with:
`Cannot find module '.prisma/client/default'`

That happens when Prisma Client has not been generated in the build environment.
