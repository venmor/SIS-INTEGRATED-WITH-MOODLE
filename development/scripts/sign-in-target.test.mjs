import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safeSignInTarget} from '../apps/web/lib/sign-in-target.ts';
test('sign-in preserves exact local student academic context',()=>{
  for(const path of ['/student','/student/register','/student/timetable?attemptId=e57bba21-8af6-4798-a4e7-e9bc431cca1e&period=DEMO-2026-PUBLICATION','/admin/timetabling/master','/applicant']) assert.equal(safeSignInTarget(path),path);
});
test('sign-in refuses external, ambiguous and malformed destinations',()=>{
  for(const path of ['https://evil.example','//evil.example','/student\\evil','/student%0d%0aevil','/student/timetable?attemptId=foreign','/student/timetable?period=2026&period=2027','/student/timetable?returnTo=https://evil.example','/student/unknown','/student#evil','/student/../admin']) assert.equal(safeSignInTarget(path),undefined);
});
