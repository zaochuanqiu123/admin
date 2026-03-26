function toMessageText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const text = value.trim();
    return text || undefined;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return undefined;
}

export function getApiMessage(source: any, fallback: string): string {
  return (
    toMessageText(source?.message) ||
    toMessageText(source?.msg) ||
    toMessageText(source?.errorMessage) ||
    toMessageText(source?.data?.message) ||
    toMessageText(source?.data?.msg) ||
    toMessageText(source?.data) ||
    fallback
  );
}

export function getErrorMessage(error: any, fallback: string): string {
  return (
    toMessageText(error?.info?.errorMessage) ||
    toMessageText(error?.info?.message) ||
    toMessageText(error?.response?.data?.message) ||
    toMessageText(error?.response?.data?.msg) ||
    toMessageText(error?.data?.message) ||
    toMessageText(error?.data?.msg) ||
    toMessageText(error?.message) ||
    fallback
  );
}
