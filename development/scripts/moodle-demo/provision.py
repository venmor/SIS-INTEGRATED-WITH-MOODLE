"""Bounded administrative demonstration provisioning; not the SIS delivery worker.
Dry-run is offline. Credentials and mutation receipts stay in a private directory.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import urllib.parse
import urllib.request

ORIGIN = 'https://sis-moodle.moodlecloud.com'
MAX_BYTES = 1024 * 1024
FUNCTIONS = {'core_webservice_get_site_info', 'core_user_get_users_by_field',
             'core_user_create_users', 'core_course_get_courses_by_field',
             'core_course_create_courses', 'core_course_get_categories',
             'core_enrol_get_course_enrolment_methods', 'core_enrol_get_enrolled_users',
             'enrol_manual_enrol_users'}


def validate_origin(value):
    if value != ORIGIN:
        raise ValueError('Only the owner-selected MoodleCloud origin is allowed.')
    return value


def validate_manifest(data):
    if not isinstance(data, dict) or data.get('peopleProvenance') != 'GENERATED':
        raise ValueError('Only generated demonstration identities are accepted.')
    namespace = data.get('namespace', '')
    if not re.fullmatch(r'sis-demo-[a-z0-9-]{1,40}', namespace):
        raise ValueError('Invalid reserved namespace.')
    users, courses, enrolments = (data.get(k) for k in ('users', 'courses', 'enrolments'))
    if not all(isinstance(items, list) for items in (users, courses, enrolments)):
        raise ValueError('Manifest collections are required.')
    if len(users) > 100 or len(courses) > 50 or len(enrolments) > 500:
        raise ValueError('Manifest exceeds 100 users, 50 courses or 500 enrolments.')
    for items in (users, courses):
        ids = [item.get('idnumber', '') for item in items]
        if len(set(ids)) != len(ids) or any(not re.fullmatch(re.escape(namespace) + r':[a-zA-Z0-9_.:-]{1,80}', key) for key in ids):
            raise ValueError('Duplicate or unowned stable identifiers.')
    usernames = set()
    for user in users:
        username = user.get('username', '')
        if not re.fullmatch(r'sis\.demo\.[a-z0-9._-]{1,60}', username) or username in usernames:
            raise ValueError('Invalid or duplicate reserved username.')
        usernames.add(username)
        if not all(isinstance(user.get(k), str) and 0 < len(user[k]) <= 100 for k in ('firstname', 'lastname')):
            raise ValueError('Bounded generated names are required.')
        if not re.fullmatch(r'[a-z0-9._+-]+@example\.invalid', user.get('email', '')):
            raise ValueError('Use generated example.invalid addresses; notifications are disabled.')
    for course in courses:
        if not isinstance(course.get('fullname'), str) or not 0 < len(course['fullname']) <= 254:
            raise ValueError('Invalid course name.')
        if not re.fullmatch(r'SIS-[A-Z0-9-]{1,80}', course.get('shortname', '')):
            raise ValueError('Use a reserved SIS shortname.')
    user_ids, course_ids = {u['idnumber'] for u in users}, {c['idnumber'] for c in courses}
    keys = set()
    for enrolment in enrolments:
        key = (enrolment.get('user'), enrolment.get('course'), enrolment.get('role'))
        if key in keys or key[0] not in user_ids or key[1] not in course_ids or key[2] not in ('student', 'teacher'):
            raise ValueError('Enrolment must identify manifested users, courses and a verified role.')
        keys.add(key)
    return data


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def form_fields(value, prefix=''):
    fields = []
    if isinstance(value, dict):
        for key, item in value.items():
            fields += form_fields(item, f'{prefix}[{key}]' if prefix else key)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            fields += form_fields(item, f'{prefix}[{index}]')
    elif isinstance(value, (str, int)):
        fields.append((prefix, str(value)))
    else:
        raise ValueError('Unsupported request parameter.')
    return fields


class Client:
    def __init__(self, token):
        if not re.fullmatch(r'[a-zA-Z0-9]{32,128}', token):
            raise ValueError('A current dedicated token must be set locally.')
        self.token = token

    def call(self, function, parameters=None):
        if function not in FUNCTIONS:
            raise ValueError('Function is outside this administrative manifest.')
        fields = form_fields(parameters or {})
        fields += [('wstoken', self.token), ('wsfunction', function), ('moodlewsrestformat', 'json')]
        request = urllib.request.Request(ORIGIN + '/webservice/rest/server.php', data=urllib.parse.urlencode(fields).encode(), headers={'Content-Type':'application/x-www-form-urlencoded'})
        try:
            with urllib.request.build_opener(NoRedirect).open(request, timeout=25) as response:
                body = response.read(MAX_BYTES + 1)
            if len(body) > MAX_BYTES:
                raise ValueError('Response too large.')
            data = json.loads(body)
            if isinstance(data, dict) and ('exception' in data or data.get('warnings')):
                raise ValueError('Remote operation refused or warned.')
            return data
        except Exception:
            raise ValueError('Moodle response unconfirmed. Retain receipt and reconcile before retry.') from None


def private_json(path, data):
    temporary = path.with_suffix('.pending')
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as handle:
        json.dump(data, handle, indent=2)
    temporary.replace(path)


def execute(data, config, state_dir):
    if config.get('origin') != ORIGIN or config.get('roleIdsVerifiedByOwner') is not True:
        raise ValueError('Exact origin and owner-verified role IDs are required.')
    for key in ('siteId', 'categoryId', 'studentRoleId', 'teacherRoleId'):
        if type(config.get(key)) is not int or config[key] < 1:
            raise ValueError('Positive verified site, category and role IDs are required.')
    if not isinstance(config.get('release'), str) or not config['release'] or not config.get('categoryName'):
        raise ValueError('Verified release and reserved category name are required.')
    state_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    if state_dir.stat().st_mode & 0o077:
        raise ValueError('State directory must have mode 0700.')
    # Exclusive local lease prevents two CLI processes from creating duplicates.
    lock = state_dir / 'running.lock'
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.close(fd)
    try:
        digest = hashlib.sha256(json.dumps({'manifest': data, 'target': config}, sort_keys=True).encode()).hexdigest()
        receipt_path = state_dir / 'receipt.json'
        receipt = json.loads(receipt_path.read_text()) if receipt_path.exists() else {'manifestSha256':digest, 'objects':{}, 'enrolments':{}, 'pending':None}
        if receipt.get('manifestSha256') != digest:
            raise ValueError('Receipt belongs to a different manifest; use a separate private state directory.')
        client = Client(os.environ.get('SIS_MOODLE_DEMO_TOKEN', ''))
        site = client.call('core_webservice_get_site_info')
        available = {f.get('name') for f in site.get('functions', [])}
        if site.get('siteid') != config['siteId'] or site.get('release') != config['release'] or not FUNCTIONS.issubset(available):
            raise ValueError('Site identity or required service functions do not match.')
        categories = client.call('core_course_get_categories', {'criteria':[{'key':'id','value':config['categoryId']}], 'addsubcategories':0})
        if len(categories) != 1 or categories[0].get('name') != config['categoryName']:
            raise ValueError('Reserved category does not match.')
        credentials_path = state_dir / 'credentials.json'
        credentials = json.loads(credentials_path.read_text()) if credentials_path.exists() else {}
        def mutate(key, function, parameters):
            if receipt['pending'] is not None:
                raise ValueError('An earlier mutation is unresolved; reconcile its stable identifier first.')
            receipt['pending'] = key
            private_json(receipt_path, receipt)
            result = client.call(function, parameters)
            return result
        for kind in ('users', 'courses'):
            for item in data[kind]:
                key = item['idnumber']
                if kind == 'users':
                    found = client.call('core_user_get_users_by_field', {'field':'idnumber', 'values':[key]})
                else:
                    found = client.call('core_course_get_courses_by_field', {'field':'idnumber', 'value':key}).get('courses', [])
                if len(found) > 1:
                    raise ValueError('Duplicate remote stable identifier; manual review required.')
                if found:
                    actual = found[0]
                    fields = ('username','firstname','lastname','email') if kind == 'users' else ('shortname','fullname')
                    if any(actual.get(field) != item[field] for field in fields) or (kind == 'courses' and actual.get('categoryid') != config['categoryId']):
                        raise ValueError('Existing remote object differs; no update or takeover performed.')
                    if receipt['pending'] == key:
                        receipt['pending'] = None
                else:
                    if key in receipt['objects'] or receipt['pending'] is not None:
                        raise ValueError('Remote object missing or uncertain mutation unresolved; manual review required.')
                    if kind == 'users':
                        credentials.setdefault(item['username'], secrets.token_urlsafe(24) + 'aA1!')
                        private_json(credentials_path, credentials)
                        actual = mutate(key, 'core_user_create_users', {'users':[{**{k:item[k] for k in ('idnumber','username','firstname','lastname','email')},'auth':'manual','password':credentials[item['username']],'createpassword':0}]})[0]
                    else:
                        actual = mutate(key, 'core_course_create_courses', {'courses':[{**item,'categoryid':config['categoryId'],'visible':0}]})[0]
                if type(actual.get('id')) is not int or actual['id'] < 1:
                    raise ValueError('Remote object ID unconfirmed.')
                if receipt['pending'] == key: receipt['pending'] = None
                receipt['objects'][key] = actual['id']
                private_json(receipt_path, receipt)
        for entry in data['enrolments']:
            key = '|'.join((entry['user'], entry['course'], entry['role']))
            user_id, course_id = receipt['objects'][entry['user']], receipt['objects'][entry['course']]
            role_id = config[entry['role'] + 'RoleId']
            # get_course_enrolment_methods is a self-enrolment information
            # projection: the manual plugin does not expose get_enrol_info().
            # The manual write endpoint validates the enabled instance and role
            # authority atomically; the read below confirms the actual outcome.
            actual = client.call('core_enrol_get_enrolled_users', {'courseid':course_id})
            matched = any(u.get('id') == user_id and any(r.get('roleid') == role_id for r in u.get('roles', [])) for u in actual)
            if matched:
                if receipt['pending'] == key: receipt['pending'] = None
            else:
                mutate(key, 'enrol_manual_enrol_users', {'enrolments':[{'roleid':role_id,'userid':user_id,'courseid':course_id,'suspend':0}]})
                actual = client.call('core_enrol_get_enrolled_users', {'courseid':course_id})
                if not any(u.get('id') == user_id and any(r.get('roleid') == role_id for r in u.get('roles', [])) for u in actual):
                    receipt['pending'] = key
                    private_json(receipt_path, receipt)
                    raise ValueError('Enrolment not confirmed; no blind retry.')
            if receipt['pending'] == key: receipt['pending'] = None
            receipt['enrolments'][key] = 'CONFIRMED'
            private_json(receipt_path, receipt)
        return {'outcome':'ADMINISTRATIVE_DEMO_PROVISIONED','users':len(data['users']),'courses':len(data['courses']),'enrolments':len(data['enrolments']),'coursesVisible':False,'sisDeliveryPipeline':'NOT_PROVISIONED'}
    finally:
        lock.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--config', type=Path)
    parser.add_argument('--state-dir', type=Path)
    args = parser.parse_args()
    try:
        raw = args.manifest.read_bytes()
        if len(raw) > MAX_BYTES: raise ValueError('Manifest too large.')
        data = validate_manifest(json.loads(raw))
        if not args.execute:
            print(json.dumps({'outcome':'OFFLINE_PLAN','networkRequests':0, 'users':len(data['users']),'courses':len(data['courses']),'enrolments':len(data['enrolments']),'manifestSha256':hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()}))
        else:
            if not args.config or not args.state_dir: raise ValueError('Execution requires local verified config and private state directory.')
            print(json.dumps(execute(data, json.loads(args.config.read_text()), args.state_dir)))
        return 0
    except Exception as error:
        # Never print HTTP responses, URLs containing credentials, or raw transport errors.
        print(json.dumps({'outcome':'STOPPED','reason':str(error) if isinstance(error, ValueError) else 'Local configuration, receipt or transport operation refused.'}))
        return 1

if __name__ == '__main__':
    raise SystemExit(main())
