import unittest
import importlib.util
from pathlib import Path
from urllib.request import Request

spec = importlib.util.spec_from_file_location('moodle_check', Path(__file__).with_name('moodle-connection-check.py'))
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)


class IdentityCheckTests(unittest.TestCase):
    def test_exact_secure_origin(self):
        self.assertEqual(check.validate_origin('https://sis-moodle.moodlecloud.com/', 'sis-moodle.moodlecloud.com'), 'https://sis-moodle.moodlecloud.com')
        for origin in ['http://sis-moodle.moodlecloud.com', 'https://sis-moodle.moodlecloud.com.evil.test',
                       'https://other.moodlecloud.com', 'https://secret@sis-moodle.moodlecloud.com',
                       'https://sis-moodle.moodlecloud.com/admin', 'https://sis-moodle.moodlecloud.com?token=synthetic',
                       'https://sis-moodle.moodlecloud.com:8443']:
            with self.assertRaises(ValueError):
                check.validate_origin(origin, 'sis-moodle.moodlecloud.com')

    def test_minimum_selected_metadata(self):
        data = {'siteid': 1, 'release': '5.2.2 (Build: 20260810)', 'version': '2026042002',
                'sitename': 'Private value must be excluded', 'username': 'Excluded',
                'functions': [{'name': 'core_webservice_get_site_info'}]}
        result = check.safe_identity(data, 'https://sis-moodle.moodlecloud.com')
        self.assertEqual(result['serviceScope'], 'IDENTITY_ONLY')
        self.assertNotIn('username', result)
        self.assertNotIn('sitename', result)
        self.assertEqual(result['release'], data['release'])

    def test_malformed_and_exception_are_not_connected(self):
        for data in [[], {'exception': 'moodle_exception'}, {'siteid': True, 'release': '5.2', 'version': '2026'},
                     {'siteid': 1, 'release': '5.2', 'version': '2026', 'functions': []}]:
            with self.assertRaises(ValueError):
                check.safe_identity(data, 'https://sis-moodle.moodlecloud.com')

    def test_redirect_is_never_followed(self):
        self.assertIsNone(check.NoRedirect().redirect_request(Request('https://sis-moodle.moodlecloud.com'), None, 302, '', {}, 'https://other.test'))


if __name__ == '__main__':
    unittest.main()
