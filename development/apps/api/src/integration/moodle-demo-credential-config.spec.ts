import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialDemoCredential } from './moodle-demo-credential-config.js';
const username='sis.demo.student', host='example.moodlecloud.com', password='Initial-demo-only-2026!';
describe('initial demonstration Moodle credential configuration',()=>{
  beforeEach(()=>{
    vi.stubEnv('DEMO_MODE','true');vi.stubEnv('DATABASE_URL','postgresql://fixture:fixture@localhost/sis_ci_review');vi.stubEnv('SIS_ENABLE_MOODLE_DEMO_CREDENTIALS','true');
    vi.stubEnv('MOODLE_DEMO_CREDENTIALS_JSON',JSON.stringify({[username]:{host,moodleUserId:6,password}}));
  });
  afterEach(()=>vi.unstubAllEnvs());
  it('resolves only the exact generated username and instance',()=>{
    expect(initialDemoCredential(username,host)).toEqual({password,moodleUserId:6});
    expect(initialDemoCredential('admin',host)).toBeNull();expect(initialDemoCredential(username,'other.moodlecloud.com')).toBeNull();
  });
  it('requires both explicit demonstration configuration and a permitted database',()=>{
    vi.stubEnv('SIS_ENABLE_MOODLE_DEMO_CREDENTIALS','false');expect(initialDemoCredential(username,host)).toBeNull();
    vi.stubEnv('SIS_ENABLE_MOODLE_DEMO_CREDENTIALS','true');vi.stubEnv('DATABASE_URL','postgresql://fixture:fixture@unrelated.example/production');expect(initialDemoCredential(username,host)).toBeNull();
  });
  it('never exposes the API token or a shared bootstrap secret as a student password',()=>{
    vi.stubEnv('MOODLE_API_TOKEN',password);expect(initialDemoCredential(username,host)).toBeNull();
    vi.stubEnv('MOODLE_API_TOKEN','different-token');vi.stubEnv('MOODLE_DEMO_INITIAL_PASSWORD',password);expect(initialDemoCredential(username,host)).toBeNull();
  });
  it('refuses malformed maps and never inherits a prototype entry',()=>{
    for (const value of ['broken','[]','null','{}']) {vi.stubEnv('MOODLE_DEMO_CREDENTIALS_JSON',value);expect(initialDemoCredential(username,host)).toBeNull();}
  });
});
