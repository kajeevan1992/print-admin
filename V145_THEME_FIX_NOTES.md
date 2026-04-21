# v145 admin restore + external API theme fix

## Fixes
- Restored admin/superadmin global styling from pre-theme build (v143)
- Moved Atlantis storefront CSS into route-scoped `app/theme/atlantis/theme.css`
- Atlantis theme now uses external API base URL:
  - `NEXT_PUBLIC_API_BASE_URL`
  - fallback: the currently deployed Coolify API URL
- Replaced internal preview-mode messaging with external API connection messaging

## Result
- Admin and superadmin colors/styles are restored
- Uploaded storefront theme only affects `/theme/atlantis`
- Storefront reads from the existing external API service
