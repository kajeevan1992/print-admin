# Build 68 — Test Data Cleanup + Launch Order Lab

## Rule followed
Build 68 reuses the Build 67 test data markers and existing order/collection/email storage.

No production order flow was changed.
No checkout flow was changed.
No duplicate cleanup/order system was created.
No database migration was added.

## Changed files

- `src/core/launch/launch-test-data-cleanup.service.ts`
- `app/api/internal/launch/test-data-cleanup/route.ts`
- `src/modules/launch/pages/launch-test-data-cleanup-page.tsx`
- `app/launch-test-data-cleanup/page.tsx`
- `src/modules/launch/pages/launch-operations-page.tsx`
- `BUILD_68.md`

## What Build 68 adds

### Test data cleanup service

Added:

- `src/core/launch/launch-test-data-cleanup.service.ts`

The service previews and cleans only Build 67 launch test artefacts.

Targeted order markers:

- order number starts with `TEST-HOLO-`
- payload contains `BUILD_67_SAFE_TEST_ORDER`
- notes contain `BUILD 67 TEST DATA`

Related artefacts detected:

- matching test orders
- order items through existing order cascade
- collection passes in `CoreCatalogRecord` where `resource = collection-handover-passes`
- related `TenantEmailOutboxEmail` rows linked to test orders or Build 67 metadata

### Safety confirmation

Cleanup requires exact confirmation:

```txt
DELETE_TEST_DATA
```

If confirmation is missing, the service returns preview/blocked response and does not clean anything.

### API

Added:

```txt
GET /api/internal/launch/test-data-cleanup
POST /api/internal/launch/test-data-cleanup
```

GET is preview-only.

POST supports:

```json
{
  "confirm": "DELETE_TEST_DATA",
  "includeOrders": true,
  "includePasses": true,
  "includeEmails": true
}
```

### Admin page

Added:

```txt
/launch-test-data-cleanup
```

The page supports:

- preview test data counts
- show matching test orders
- include/exclude orders
- include/exclude collection passes
- include/exclude outbox emails
- exact confirmation gate
- run cleanup
- show before/after result JSON

### Launch Operations hub

Updated:

```txt
/launch-operations
```

Added card link:

- `Test Data Cleanup` → `/launch-test-data-cleanup`

## Important cleanup behaviour

Order deletion uses Prisma order deletion for matching test orders only.

Based on the existing schema:

- `OrderItem` cascades from `Order`
- `OrderStatusHistory` cascades from `Order`
- `Artwork.orderId` is set null by schema relation

Collection passes and outbox emails are cleaned separately because they are not child relations of order.

## What was intentionally not changed

- Real customer orders are not targeted.
- There is no broad date-based cleanup.
- There is no status-based cleanup.
- There is no customer email based cleanup.
- No hosted theme changes.
- No sidebar direct link was added; the tool is reachable from `/launch-operations` and direct route.

## Next recommended build
Build 69 — Launch Smoke Test Checklist + Customer Journey Runner

This should add a manual checklist/test runner for the actual hosted theme journey:

1. homepage loads
2. product page loads
3. product-location page loads
4. add to cart
5. checkout collection selector
6. save order/quote with payment pending
7. customer account order detail
8. collection pass view
9. admin handover verification
