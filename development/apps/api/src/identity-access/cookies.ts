import { SECURITY_V1 } from '@sis/config';

// Manual cookie handling (no cookie-parser dep — 10 auditable lines).
// Tokens live in httpOnly cookies only; never localStorage (07/02).

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    // Malformed segments (bad escaping) are skipped, never thrown: a broken
    // cookie must read as unauthenticated (401), never a 500.
    try {
      out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      continue;
    }
  }
  return out;
}

function baseParts(token: string, maxAgeSeconds: number): string[] {
  const parts = [
    `${SECURITY_V1.session.cookieName}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'SameSite=Lax',
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts;
}

export function serializeSessionCookie(token: string): string {
  return baseParts(token, SECURITY_V1.session.absoluteSeconds).join('; ');
}

export function clearSessionCookie(): string {
  return baseParts('', 0).join('; ');
}
