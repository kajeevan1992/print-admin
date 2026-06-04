# Build 43

Production hardening pass.

Changed:
- owner persistence status banner
- owner persistence route banner
- owner records service
- Prisma schema
- owner control record migration

Fixes:
- added client marker to interactive banner
- made route banner loading safer
- removed reset logic that depended on this binding
- added missing OwnerControlRecord model
- added migration for the owner control record table

No product, checkout, payment, VAT or public API changes were made.
