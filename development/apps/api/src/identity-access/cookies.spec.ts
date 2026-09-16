import { clearSessionCookie, parseCookies, serializeSessionCookie } from './cookies.js';

describe('session cookies', () => {
  it('sets httpOnly same-site cookie without Secure outside production', () => {
    const header = serializeSessionCookie('tok');
    expect(header).toContain('sid=tok');
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');
    expect(header).not.toContain('Secure');
  });

  it('clears via expired cookie', () => {
    expect(clearSessionCookie()).toContain('Max-Age=0');
  });

  it('parses cookie headers manually', () => {
    expect(parseCookies('sid=abc; other=1')).toEqual({ sid: 'abc', other: '1' });
    expect(parseCookies(undefined)).toEqual({});
  });

  it('skips malformed segments instead of throwing (broken cookie reads as logged-out)', () => {
    expect(parseCookies('sid=%; other=1')).toEqual({ other: '1' });
    expect(parseCookies('sid=%')).toEqual({});
  });

  it('sets Secure in production', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(serializeSessionCookie('tok')).toContain('Secure');
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
