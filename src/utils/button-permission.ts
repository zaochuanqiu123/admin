export function normalizeButtonPermissionToken(
  value: unknown,
): string | undefined {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim().toLowerCase();
  return normalized || undefined;
}

export function extractButtonPermissionTokens(value: unknown): string[] {
  if (Array.isArray(value)) {
    const tokenSet = new Set<string>();
    value.forEach((item) => {
      extractButtonPermissionTokens(item).forEach((token) => {
        tokenSet.add(token);
      });
    });
    return Array.from(tokenSet);
  }

  const token = normalizeButtonPermissionToken(value);
  return token ? [token] : [];
}

export function hasButtonPermission(
  buttonPermissions: API.ButtonPermissionMap | undefined,
  required: string | string[],
): boolean {
  if (!buttonPermissions?.length) {
    return false;
  }

  const requiredTokens = (Array.isArray(required) ? required : [required])
    .map((item) => normalizeButtonPermissionToken(item))
    .filter((item): item is string => Boolean(item));

  if (!requiredTokens.length) {
    return true;
  }

  const permissionSet = new Set(
    buttonPermissions
      .map((item) => normalizeButtonPermissionToken(item))
      .filter((item): item is string => Boolean(item)),
  );

  return requiredTokens.some((token) => permissionSet.has(token));
}
