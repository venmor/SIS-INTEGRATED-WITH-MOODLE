import { describe, expect, it } from 'vitest';
import {
  assertTargetIdentity,
  normalizeHost,
  parseSiteInfo,
} from './moodle-target.js';

/**
 * Every host, site id and release string below is a RESERVED EXAMPLE-ZONE
 * FIXTURE, not a target. `moodle.example.edu` is an IANA-reserved
 * documentation name, `xn--moodle-3ya.example.edu` is its verified IDN
 * pair, site id 2 and `4.5.6 (Build: 20250413)` are arbitrary shape
 * samples. The real MoodleCloud test target is deliberately unconfirmed
 * and is injected only through the live-test environment contract, so
 * nothing in this file may be read as a real hostname, site id or
 * release.
 */
describe('Moodle canonical target identity', () => {
  it('normalizes case, a trailing dot, and punycode to one host', () => {
    expect(normalizeHost('MOODLE.Example.EDU.')).toBe('moodle.example.edu');
    expect(normalizeHost('moodle.example.edu')).toBe('moodle.example.edu');
    expect(normalizeHost('moodle.example.edu.')).toBe('moodle.example.edu');
    // Verified pair: 'müoodle' is the IDN form of 'xn--moodle-3ya'. An
    // all-ASCII host is already its own punycode form, so a test that
    // claims otherwise is asserting something false.
    expect(normalizeHost('müoodle.example.edu')).toBe(
      'xn--moodle-3ya.example.edu',
    );
    expect(normalizeHost('xn--moodle-3ya.example.edu')).toBe(
      'xn--moodle-3ya.example.edu',
    );
    expect(normalizeHost('xn--moodle-3ya.example.edu')).toBe(
      normalizeHost('müoodle.example.edu'),
    );
  });

  it('rejects an empty or whitespace host', () => {
    expect(() => normalizeHost('   ')).toThrow(/host/);
  });

  it('rejects a URL-shaped value instead of resolving part of it', () => {
    // `new URL('https://' + value)` does not fail on a value carrying a
    // path: it silently resolves the leading segment and discards the
    // rest. A host allowlist that accepted that would compare a prefix.
    expect(() =>
      normalizeHost('moodle.example.edu/webservice/rest/server.php'),
    ).toThrow(/host/);
    expect(() => normalizeHost('.')).toThrow(/host/);
  });

  it('strips exactly one trailing dot and refuses a second', () => {
    // Exactly one: a fully-qualified name carries one optional root dot.
    // Stripping them all would quietly accept a malformed spelling, so
    // the second dot has to survive into the per-label check and be
    // refused as the empty label it is. `URL` keeps the trailing dot in
    // `hostname` rather than dropping it, so the refusal is real.
    expect(normalizeHost('moodle.example.edu.')).toBe('moodle.example.edu');
    expect(() => normalizeHost('moodle.example.edu..')).toThrow(/host/);
  });

  it('rejects a backslash separator instead of truncating at it', () => {
    // WHATWG URL treats `\` as a path separator for a special scheme, so
    // `new URL('https://moodle.example.edu\evil.example.edu')` resolves
    // to the host `moodle.example.edu` and silently discards everything
    // after the separator. Verified, not assumed. Refusing a value that
    // parses to a prefix is what keeps the refusal-by-name invariant
    // true, and a hostname fallback rule of any kind is banned.
    expect(() =>
      normalizeHost('moodle.example.edu\\evil.example.edu'),
    ).toThrow(/host/);
  });

  it('refuses a label the URL parser accepts but a reg-name does not', () => {
    // Each value below survives `new URL('https://' + value)` unchanged,
    // so none of them can be caught by resolution: they reach the
    // per-label check, and that check is the only thing refusing them.
    // A leading or trailing hyphen, an empty label, and a bare `xn--`
    // are all outside a reg-name.
    expect(() => normalizeHost('-a.example.edu')).toThrow(/host/);
    expect(() => normalizeHost('a-.example.edu')).toThrow(/host/);
    expect(() => normalizeHost('a..b')).toThrow(/host/);
    expect(() => normalizeHost('xn--.example.edu')).toThrow(/host/);
    // The same check must not refuse a legitimate punycode label: a
    // hyphen pair inside a label is what the `xn--` prefix is. An
    // over-strict guard that rejected it would make the IDN round-trip
    // above impossible.
    expect(normalizeHost('xn--moodle-3ya.example.edu')).toBe(
      'xn--moodle-3ya.example.edu',
    );
  });

  it('parses the canonical triple from a site-info response', () => {
    const identity = parseSiteInfo({
      siteid: 2,
      release: '4.5.6 (Build: 20250413)',
      version: '2024100700',
    });
    expect(identity).toEqual({
      siteId: 2,
      release: '4.5.6 (Build: 20250413)',
      numericVersion: '2024100700',
    });
  });

  it('records an empty numeric version when the body reports none', () => {
    // The one field that is defaulted, stated here so the docblock and
    // the behaviour cannot drift apart. A body without `version` is
    // still a valid site-info body; only the evidence is empty.
    const identity = parseSiteInfo({ siteid: 2, release: '4.5.6' });
    expect(identity.numericVersion).toBe('');
    expect(identity.siteId).toBe(2);
    expect(identity.release).toBe('4.5.6');
  });

  it('never lets a wrong-typed numeric version change the verdict', () => {
    // A number where a build string was expected is coerced to no
    // evidence rather than refused, and it still cannot move the
    // verdict: the exact `release` string is the version gate, so the
    // evidence field can never turn a match into a mismatch.
    const identity = parseSiteInfo({
      siteid: 2,
      release: '4.5.6 (Build: 20250413)',
      version: 12345,
    });
    expect(identity.numericVersion).toBe('');
    expect(
      assertTargetIdentity(
        {
          host: 'moodle.example.edu',
          siteId: 2,
          release: '4.5.6 (Build: 20250413)',
        },
        { ...identity, host: 'moodle.example.edu' },
      ),
    ).toStrictEqual({ ok: true });
  });

  it('fails closed when siteid is missing or not a positive integer', () => {
    // Review Focus item 4 names the input classes a misconfigured
    // `MOODLE_EXPECTED_SITE_ID` arrives in: a tenant identifier, a
    // string, zero, a negative number and a fraction. Accepting any of
    // them would compare the wrong identity and could silently pass a
    // production-looking site, so each one is refused.
    expect(() => parseSiteInfo({ release: '4.5.6' })).toThrow(/siteid/);
    expect(() => parseSiteInfo({ siteid: 'tenant-2', release: '4.5.6' })).toThrow(
      /siteid/,
    );
    expect(() => parseSiteInfo({ siteid: 0, release: '4.5.6' })).toThrow(
      /siteid/,
    );
    expect(() => parseSiteInfo({ siteid: -1, release: '4.5.6' })).toThrow(
      /siteid/,
    );
    expect(() => parseSiteInfo({ siteid: 2.5, release: '4.5.6' })).toThrow(
      /siteid/,
    );
  });

  it('fails closed when the release string is missing', () => {
    expect(() => parseSiteInfo({ siteid: 2 })).toThrow(/release/);
  });

  it('fails closed on a body that is not a site-info object', () => {
    // The body arrives as `unknown` from a network response, so a null,
    // an array or a scalar must be refused by name rather than escaping
    // as an incidental TypeError from a property read. The wording is
    // therefore matched, not a loose field name: a leaked
    // `Cannot destructure property 'siteid' of 'record' as it is null`
    // also contains "siteid" and would sail past a /siteid/ assertion.
    expect(() => parseSiteInfo(null)).toThrow(/not an object/);
    expect(() => parseSiteInfo(undefined)).toThrow(/not an object/);
    expect(() => parseSiteInfo([])).toThrow(/not an object/);
    expect(() => parseSiteInfo('core_webservice_get_site_info')).toThrow(
      /not an object/,
    );
    expect(() => parseSiteInfo(2)).toThrow(/not an object/);
  });

  it('accepts a matching triple', () => {
    const expected = {
      host: 'moodle.example.edu',
      siteId: 2,
      release: '4.5.6 (Build: 20250413)',
    };
    const actual = {
      ...parseSiteInfo({ siteid: 2, release: '4.5.6 (Build: 20250413)' }),
      host: 'moodle.example.edu',
    };
    // `toStrictEqual`, not `toEqual`: the no-leak property is that the
    // verdict carries the field names and nothing else. `toEqual` also
    // passes an object holding extra `undefined`-valued keys, so a
    // verdict that started echoing compared values could slip through
    // it when those values happened to be undefined.
    expect(assertTargetIdentity(expected, actual)).toStrictEqual({ ok: true });
  });

  it('reports every mismatched field rather than the first', () => {
    const expected = {
      host: 'moodle.example.edu',
      siteId: 2,
      release: '4.5.6 (Build: 20250413)',
    };
    const actual = {
      host: 'www.moodle.example.edu',
      siteId: 9,
      release: '4.4.0 (Build: 20240101)',
    };
    const result = assertTargetIdentity(expected, actual);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.mismatches).toEqual(['host', 'siteId', 'release']);
  });

  it('refuses a host that differs by a label, naming only the field', () => {
    // Cosmetic differences (case, one trailing dot, IDN spelling) are
    // normalized away before comparison, so what remains must be an
    // exact label-for-label match. A subdomain is a different target,
    // never a loose match. The verdict carries the field name only, so
    // no target identifier can reach a log or an audit row.
    const expected = {
      host: 'moodle.example.edu',
      siteId: 2,
      release: '4.5.6 (Build: 20250413)',
    };
    const actual = {
      host: 'www.moodle.example.edu',
      siteId: 2,
      release: '4.5.6 (Build: 20250413)',
    };
    expect(assertTargetIdentity(expected, actual)).toStrictEqual({
      ok: false,
      mismatches: ['host'],
    });
  });

  it('never lets the numeric version stand in for the release string', () => {
    const expected = {
      host: 'moodle.example.edu',
      siteId: 2,
      release: '4.5.6 (Build: 20250413)',
    };
    const actual = {
      host: 'moodle.example.edu',
      siteId: 2,
      release: '4.5.6 (Build: 20250413)',
      numericVersion: '9999999999',
    };
    expect(assertTargetIdentity(expected, actual).ok).toBe(true);
  });
});
