import importlib.util
import unittest
from pathlib import Path
spec = importlib.util.spec_from_file_location('provision', Path(__file__).with_name('provision.py'))
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)

class Validation(unittest.TestCase):
    def test_origin_rejects_other_tenant_and_credentials(self):
        for origin in ['https://evil.example', 'https://user@sis-moodle.moodlecloud.com', 'https://sis-moodle.moodlecloud.com/?token=x']:
            with self.assertRaises(ValueError): p.validate_origin(origin)
    def test_requires_generated_people_and_bounded_manifest(self):
        manifest = {'namespace':'sis-demo-2026', 'peopleProvenance':'GENERATED', 'users':[], 'courses':[], 'enrolments':[]}
        self.assertEqual(p.validate_manifest(manifest), manifest)
        manifest['peopleProvenance'] = 'REAL'
        with self.assertRaises(ValueError): p.validate_manifest(manifest)
    def test_manifest_user_bound_precedes_remote_work(self):
        manifest = {'namespace':'sis-demo-2026','peopleProvenance':'GENERATED','users':[{}] * 101,'courses':[],'enrolments':[]}
        with self.assertRaises(ValueError): p.validate_manifest(manifest)
    def test_refuses_unowned_enrolment(self):
        with self.assertRaises(ValueError): p.validate_manifest({'namespace':'sis-demo-2026','peopleProvenance':'GENERATED','users':[],'courses':[],'enrolments':[{'user':'other','course':'other','role':'student'}]})


class Execution(unittest.TestCase):
    def test_resume_reconciles_created_object_without_duplicate_write(self):
        import tempfile
        from unittest.mock import patch
        manifest = {'namespace':'sis-demo-2026','peopleProvenance':'GENERATED','users':[{'idnumber':'sis-demo-2026:person:a','username':'sis.demo.a','firstname':'A','lastname':'B','email':'a@example.invalid'}],'courses':[],'enrolments':[]}
        config = {'origin':p.ORIGIN,'roleIdsVerifiedByOwner':True,'siteId':1,'release':'5.2.2','categoryId':20,'categoryName':'SIS Demonstration','studentRoleId':5,'teacherRoleId':3}
        state = {'user':None,'writes':0,'loseReply':True}
        class Fake:
            def __init__(self, token): pass
            def call(self, function, parameters=None):
                if function == 'core_webservice_get_site_info': return {'siteid':1,'release':'5.2.2','functions':[{'name':f} for f in p.FUNCTIONS]}
                if function == 'core_course_get_categories': return [{'id':20,'name':'SIS Demonstration'}]
                if function == 'core_user_get_users_by_field': return [state['user']] if state['user'] else []
                if function == 'core_user_create_users':
                    state['writes'] += 1
                    state['user'] = {**manifest['users'][0], 'id':21}
                    if state['loseReply']:
                        state['loseReply'] = False
                        raise ValueError('Response unconfirmed.')
                    return [{'id':21}]
                raise AssertionError(function)
        with tempfile.TemporaryDirectory() as directory, patch.object(p, 'Client', Fake):
            path = Path(directory)
            with self.assertRaises(ValueError): p.execute(manifest, config, path)
            self.assertEqual(p.execute(manifest, config, path)['users'], 1)
            self.assertEqual(state['writes'], 1)
            changed = dict(config, categoryId=21)
            with self.assertRaises(ValueError): p.execute(manifest, changed, path)
    def test_uncertain_missing_object_does_not_blindly_create_again(self):
        import tempfile
        from unittest.mock import patch
        manifest = {'namespace':'sis-demo-2026','peopleProvenance':'GENERATED','users':[{'idnumber':'sis-demo-2026:person:a','username':'sis.demo.a','firstname':'A','lastname':'B','email':'a@example.invalid'}],'courses':[],'enrolments':[]}
        config = {'origin':p.ORIGIN,'roleIdsVerifiedByOwner':True,'siteId':1,'release':'5.2.2','categoryId':20,'categoryName':'SIS Demonstration','studentRoleId':5,'teacherRoleId':3}
        writes = []
        class Fake:
            def __init__(self, token): pass
            def call(self, function, parameters=None):
                if function == 'core_webservice_get_site_info': return {'siteid':1,'release':'5.2.2','functions':[{'name':f} for f in p.FUNCTIONS]}
                if function == 'core_course_get_categories': return [{'id':20,'name':'SIS Demonstration'}]
                if function == 'core_user_get_users_by_field': return []
                if function == 'core_user_create_users':
                    writes.append(function)
                    raise ValueError('Response unconfirmed.')
                raise AssertionError(function)
        with tempfile.TemporaryDirectory() as directory, patch.object(p, 'Client', Fake):
            for _ in range(2):
                with self.assertRaises(ValueError): p.execute(manifest, config, Path(directory))
            self.assertEqual(len(writes), 1)



class Lifecycle(unittest.TestCase):
    def setUp(self):
        import tempfile
        from unittest.mock import patch
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name)
        user = {'idnumber':'sis-demo-2026:person:a','username':'sis.demo.a','firstname':'A','lastname':'B','email':'a@example.invalid'}
        course = {'idnumber':'sis-demo-2026:course:a','shortname':'SIS-ENG-2026','fullname':'Engineering Communication'}
        self.manifest = {'namespace':'sis-demo-2026','peopleProvenance':'GENERATED','users':[user],'courses':[course],'enrolments':[{'user':user['idnumber'],'course':course['idnumber'],'role':'student'}]}
        self.config = {'origin':p.ORIGIN,'roleIdsVerifiedByOwner':True,'siteId':1,'release':'5.2.2','categoryId':20,'categoryName':'SIS Demonstration','studentRoleId':5,'teacherRoleId':3}
        self.state = {'user':None,'course':None,'enrolled':False,'writes':[],'siteid':1,'functions':set(p.FUNCTIONS),'loseEnrolReply':False,'applyEnrol':True}
        owner = self
        class Fake:
            def __init__(self, token): pass
            def call(self, function, parameters=None):
                state = owner.state
                if function == 'core_webservice_get_site_info': return {'siteid':state['siteid'],'release':'5.2.2','functions':[{'name':f} for f in state['functions']]}
                if function == 'core_course_get_categories': return [{'id':20,'name':'SIS Demonstration'}]
                if function == 'core_user_get_users_by_field': return [state['user']] if state['user'] else []
                if function == 'core_course_get_courses_by_field': return {'courses':[state['course']] if state['course'] else []}
                if function == 'core_user_create_users':
                    state['writes'].append(function)
                    state['user'] = {**user,'id':21}
                    return [{'id':21}]
                if function == 'core_course_create_courses':
                    state['writes'].append(function)
                    owner.assertEqual(parameters['courses'][0]['visible'], 0)
                    state['course'] = {**course,'id':31,'categoryid':20}
                    return [{'id':31}]
                if function == 'core_enrol_get_course_enrolment_methods': return [{'type':'manual','status':0}]
                if function == 'core_enrol_get_enrolled_users': return [{'id':21,'roles':[{'roleid':5}]}] if state['enrolled'] else []
                if function == 'enrol_manual_enrol_users':
                    state['writes'].append(function)
                    owner.assertEqual(parameters, {'enrolments':[{'roleid':5,'userid':21,'courseid':31,'suspend':0}]})
                    state['enrolled'] = state['applyEnrol']
                    if state['loseEnrolReply']: raise ValueError('Response unconfirmed.')
                    return None
                raise AssertionError(function)
        patcher = patch.object(p, 'Client', Fake)
        patcher.start()
        self.addCleanup(patcher.stop)

    def run_tool(self): return p.execute(self.manifest, self.config, self.path)

    def test_complete_lifecycle_repeat_has_no_extra_writes(self):
        self.assertEqual(self.run_tool()['enrolments'], 1)
        self.assertEqual(self.run_tool()['enrolments'], 1)
        self.assertEqual(self.state['writes'], ['core_user_create_users','core_course_create_courses','enrol_manual_enrol_users'])
        receipt = p.json.loads((self.path/'receipt.json').read_text())
        self.assertIsNone(receipt['pending'])
        self.assertEqual(len(receipt['enrolments']), 1)
        self.assertEqual((self.path/'credentials.json').stat().st_mode & 0o777, 0o600)

    def test_lost_enrol_reply_confirmed_read_resolves_without_duplicate(self):
        self.state['loseEnrolReply'] = True
        with self.assertRaises(ValueError): self.run_tool()
        self.assertEqual(self.run_tool()['enrolments'], 1)
        self.assertEqual(self.state['writes'].count('enrol_manual_enrol_users'), 1)
        self.assertIsNone(p.json.loads((self.path/'receipt.json').read_text())['pending'])

    def test_absent_pending_enrolment_blocks_retry(self):
        self.state.update(loseEnrolReply=True, applyEnrol=False)
        for _ in range(2):
            with self.assertRaises(ValueError): self.run_tool()
        self.assertEqual(self.state['writes'].count('enrol_manual_enrol_users'), 1)
        self.assertIsNotNone(p.json.loads((self.path/'receipt.json').read_text())['pending'])

    def test_existing_course_wrong_category_stops(self):
        self.state['user'] = {**self.manifest['users'][0],'id':21}
        self.state['course'] = {**self.manifest['courses'][0],'id':31,'categoryid':99}
        with self.assertRaises(ValueError): self.run_tool()
        self.assertEqual(self.state['writes'], [])

    def test_existing_course_wrong_name_stops(self):
        self.state['user'] = {**self.manifest['users'][0],'id':21}
        self.state['course'] = {**self.manifest['courses'][0],'id':31,'categoryid':20,'fullname':'Unrelated course'}
        with self.assertRaises(ValueError): self.run_tool()
        self.assertEqual(self.state['writes'], [])

    def test_wrong_site_performs_zero_mutations(self):
        self.state['siteid'] = 99
        with self.assertRaises(ValueError): self.run_tool()
        self.assertEqual(self.state['writes'], [])

    def test_missing_service_function_performs_zero_mutations(self):
        self.state['functions'].remove('enrol_manual_enrol_users')
        with self.assertRaises(ValueError): self.run_tool()
        self.assertEqual(self.state['writes'], [])

    def test_offline_cli_performs_no_network(self):
        from unittest.mock import patch
        from contextlib import redirect_stdout
        import io
        path = self.path/'manifest.json'
        path.write_text(p.json.dumps(self.manifest))
        output = io.StringIO()
        with patch.object(p.urllib.request, 'build_opener', side_effect=AssertionError('Unexpected network call')), patch.object(p.os, 'environ', {}), patch('sys.argv', ['provision.py',str(path)]), redirect_stdout(output):
            self.assertEqual(p.main(), 0)
        result = p.json.loads(output.getvalue())
        self.assertEqual(result['outcome'], 'OFFLINE_PLAN')
        self.assertEqual(result['networkRequests'], 0)

if __name__ == '__main__': unittest.main()
