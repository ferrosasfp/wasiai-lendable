// src/lib/uuid-validator.ts — fix-pack BLQ-MED-1.
// Strict shape check for path/header-provided UUIDs to:
//   (a) keep the in-memory audit buffer keyspace from being polluted by junk
//   (b) defend against header injection (CR/LF) — the regex rejects anything
//       outside [0-9a-f-] so a payload like "poison\r\nSet-Cookie:..." fails.
//
// We don't enforce RFC4122 version bits because the demo issues plain v4-style
// IDs but doesn't strictly need version validation; the shape match is enough.
const UUID_V4_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuidV4(str: string | null | undefined): str is string {
  if (typeof str !== "string") return false;
  if (str.length !== 36) return false;
  return UUID_V4_LIKE.test(str);
}
