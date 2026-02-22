export function nowIsoUtc(): string {
  return new Date().toISOString();
}

export function isIsoUtc(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString() === value;
}
