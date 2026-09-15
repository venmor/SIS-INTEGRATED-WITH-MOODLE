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
});
