export type TenantResolvedContext = {
  tenantId: string;
  tenantSlug: string;
  hostname: string;
  primaryDomain?: string | null;
  themeKey: string;
};

export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiError = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResult<T> = ApiSuccess<T> | ApiError;
