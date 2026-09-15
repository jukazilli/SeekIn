const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export async function sha256Text(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function sha256StableJson(value: unknown): Promise<string> {
  return sha256Text(stableJson(value));
}

export type IdempotencyContext = { keyHash: string; requestHash: string };

export async function createIdempotencyContext(
  key: string | null,
  request: unknown,
): Promise<IdempotencyContext | null> {
  if (!key || !UUID_PATTERN.test(key)) return null;
  return {
    keyHash: await sha256Text(key.toLowerCase()),
    requestHash: await sha256StableJson(request),
  };
}
