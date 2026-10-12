"""Read-only MoodleCloud identity check; credentials enter a hidden TTY only."""
import getpass
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import warnings


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def validate_origin(origin, allowed):
    parsed = urllib.parse.urlsplit(origin)
    host = (parsed.hostname or '').lower()
    try:
        valid = (parsed.scheme == 'https' and not parsed.username and not parsed.password
                 and not parsed.query and not parsed.fragment and parsed.path in ('', '/')
                 and parsed.port in (None, 443) and host == allowed.strip().lower()
                 and re.fullmatch(r'[a-z0-9][a-z0-9-]*\.moodlecloud\.com', host))
    except ValueError:
        valid = False
    if not valid:
        raise ValueError('Origin and exact hostname refused; no request sent.')
    return 'https://' + host


def safe_identity(data, origin):
    if not isinstance(data, dict) or 'exception' in data:
        raise ValueError('Moodle refused the identity check; review service permissions locally.')
    siteid, release, version = data.get('siteid'), data.get('release'), data.get('version')
    if (type(siteid) is not int or siteid <= 0 or not isinstance(release, str)
        or not re.fullmatch(r'[a-zA-Z0-9 .():+_-]{1,100}', release)
        or not re.fullmatch(r'[0-9.]{1,30}', str(version))
        or not isinstance(data.get('functions'), list)):
        raise ValueError('Required site identity missing or malformed; live writes remain disabled.')
    functions = sorted({f['name'] for f in data['functions'] if isinstance(f, dict)
                        and isinstance(f.get('name'), str)
                        and re.fullmatch(r'[a-z][a-z0-9_]{1,120}', f['name'])})
    if 'core_webservice_get_site_info' not in functions:
        raise ValueError('Service function evidence incomplete; review the custom service.')
    return {'outcome': 'READ_ONLY_IDENTITY_CONFIRMED', 'host': urllib.parse.urlsplit(origin).hostname,
            'siteid': siteid, 'release': release, 'numericVersion': str(version),
            'authorisedFunctions': functions,
            'serviceScope': 'IDENTITY_ONLY' if functions == ['core_webservice_get_site_info'] else 'REVIEW_SERVICE_FUNCTIONS'}


def main():
    if len(sys.argv) not in (1, 3):
        print('Usage: python3 scripts/moodle-connection-check.py [HTTPS-origin exact-hostname]', file=sys.stderr)
        return 2
    if not sys.stdin.isatty():
        print('Use a private interactive terminal; no request sent.', file=sys.stderr)
        return 2
    try:
        origin = validate_origin(sys.argv[1] if len(sys.argv) == 3 else input('MoodleCloud HTTPS origin: ').strip(),
                                 sys.argv[2] if len(sys.argv) == 3 else input('Exact allowed hostname: ').strip())
        with warnings.catch_warnings():
            warnings.simplefilter('error', getpass.GetPassWarning)
            token = getpass.getpass('Dedicated service token (hidden): ')
        if not re.fullmatch(r'[a-zA-Z0-9]{32,128}', token):
            raise ValueError('Token format invalid; no request sent.')
    except (ValueError, EOFError, getpass.GetPassWarning):
        print('Check origin, exact hostname and private terminal input; no request sent.', file=sys.stderr)
        return 2
    request = urllib.request.Request(origin + '/webservice/rest/server.php',
        data=urllib.parse.urlencode({'wstoken': token, 'wsfunction': 'core_webservice_get_site_info', 'moodlewsrestformat': 'json'}).encode(),
        headers={'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'SIS-read-only-preflight/1.0'})
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=15) as response:
            body = response.read(1048577)
            if len(body) > 1048576:
                raise ValueError('Response exceeds the limit.')
            evidence = safe_identity(json.loads(body), origin)
    except urllib.error.HTTPError as error:
        print(json.dumps({'outcome': 'REFUSED', 'httpStatus': error.code}))
        return 1
    except (urllib.error.URLError, TimeoutError, ValueError):
        print(json.dumps({'outcome': 'UNCONFIRMED', 'reason': 'Transport, service or response check failed'}))
        return 1
    print(json.dumps(evidence, indent=2).replace(token, '[redacted]'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
