# v310 Legacy Module Parity Audit + Merge Notes

This document replaces the lost chat context for the Print SaaS legacy-vs-new-page audit.

## Build purpose

When a new SaaS admin page or UI exists, compare it against legacy pages/components before adding more pages. If useful functionality exists only in legacy, merge it into the existing modern SaaS page. Do not create duplicates.

## Permanent architecture rules

- Admin, super admin, and hosted storefronts use internal core services only.
- `/api/v1/*` is only for external/headless storefronts and third-party integrations.
- Do not revive legacy proxy API assumptions.
- Preserve existing UI structure unless a page is only a placeholder.
- Keep navigation in `src/config/admin-navigation.ts` only.
- Tenant DB architecture must remain the source of truth for live data.
- Add loading, empty, error, and internal-core status states wherever live routes are used.

## Current modules checked

### Production Planner

Current route exists: `/production-planner`.

Observed current coverage:

- Gantt-style timeline.
- Machine capacity cards.
- Drag/drop job cards between stages.
- Drag Gantt bars between machine lanes.
- Auto-schedule action.
- Stage actions: start, advance, hold, resume, complete.
- Late-risk warnings.
- SRA3 sheet totals.
- Batch suggestions.
- Internal route usage: `/api/internal/catalog/production-planner`.

Legacy parity items to keep checking:

- Shift calendars and working hours.
- Operator assignment.
- Machine setup time and speed profiles.
- Multi-shift job splitting.
- Finishing-to-machine handoff.
- Manual re-prioritisation.
- Production notes and hold reasons.

Decision: keep this as the scheduling/capacity view. Do not merge Production Board into this page.

### Production Board

Current route exists: `/production-board`.

Observed current coverage:

- Visual board by production stage.
- Search, plant filter, risk filter.
- Edit job modal.
- Move back/advance controls.
- Dispatch readiness card.

Parity gap:

- Current page still describes itself as a front-end planning surface before API/database wiring.
- It should become the live workflow/status board and should not duplicate planner scheduling.

Required next merge:

- Artwork/preflight status badges.
- Operator notes.
- Due-date urgency and overdue badges.
- Print / finish / dispatch workflow columns.
- Link to order/job detail.
- Internal production service wiring, ideally sharing the production-planner/production core model.

Decision: Production Board = status/workflow board. Production Planner = scheduling/capacity board.

### Pricing Rules

Current route exists: `/pricing-rules`.

Observed previous state:

- Simple placeholder-style list.
- Mentioned conditional surcharges, quantity breaks, and channel rules.

Merged in v310:

- Added a richer rule-control dashboard page.
- Added legacy parity checklist for product VAT, add-on VAT, matrix pricing, area pricing, sheet/SRA logic, supplier price overrides, quantity breaks, finishing rules, conditional rules, and approval workflow.
- Added implementation pathway showing which source should feed which engine.

Required next merge:

- Persist rules to tenant DB/internal pricing core.
- Connect rule form to live pricing engine.
- Validate rule conflicts and stacking order.
- Show rule source in pricing breakdowns.

### Pricing Command

Current route exists: `/pricing-command`.

Observed current coverage:

- Scenario calculator.
- Rule library.
- Approval records.
- Promo code impact.
- Margin calculation.
- Local rule storage.

Legacy parity items to keep checking:

- Manual run of live pricing calculator.
- Product/options/quantity input.
- VAT breakdown by line item.
- Cost, sell, margin, markup, and supplier-source breakdown.
- Matrix pricing source visibility.
- Debug trail showing every rule applied/skipped.

Decision: Pricing Command should remain the diagnostic/testing console, not the rule-management master page.

### Storefront Content edge cases

Known current related routes:

- `/content`
- `/page-content`
- `/product-content`
- `/category-cms`
- `/product-storefront-content`
- `/themes`

Parity items to keep checking:

- Homepage sliders and reusable content sections.
- Product images, gallery, descriptions, FAQs, delivery text, artwork instructions.
- Category landing text and SEO fields.
- Empty-state content for unpublished/hidden products.
- Tenant-specific content blocks.
- Hosted theme content blocks using internal storefront services.

Decision: do not wire hosted themes to `/api/v1`. Only external/headless custom storefronts use public API keys.

### Config Templates

Current route exists: `/config-templates`.

Legacy parity items to keep checking:

- Master reusable product templates.
- Product-level overrides.
- Option group ordering.
- Default selections.
- Conditional visibility.
- Clone/duplicate product-template flow.

Decision: Config Templates should own the product configuration structure. Option Sets feed into templates.

### Option Sets

Current route exists: `/option-sets`.

Legacy parity items to keep checking:

- Paper/material option sets.
- Size option sets.
- Sides/colour option sets.
- Finish option sets.
- Turnaround option sets.
- Artwork/design service option sets.
- Conditional option visibility.
- Reuse across multiple products.

Decision: Option Sets should be reusable libraries, not full product templates.

## Next build recommendation

Use this as the next task name:

`v311 Production Board Live Workflow Merge`

Scope:

1. Keep `/production-board` as the workflow/status board.
2. Keep `/production-planner` as scheduling/capacity/Gantt.
3. Add missing legacy workflow fields to Production Board.
4. Connect board to internal production core route.
5. Remove any wording that says the page is only placeholder/front-end before API wiring.
6. Do not create new duplicate pages.

## Touched in v310

- `docs/v310-legacy-module-parity-audit.md`
- `app/pricing-rules/page.tsx`
