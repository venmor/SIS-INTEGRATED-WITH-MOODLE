// Read-only, allowlisted generated account and registration export. No secrets.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const output = process.argv[2];
if (!output || !process.env.DATABASE_URL) throw new Error('Provide DATABASE_URL privately and an ignored private output path.');
const url = new URL(process.env.DATABASE_URL);
if (url.hostname !== '127.0.0.1' || url.port !== '55437' || url.pathname !== '/sis_time003_review_20261004') throw new Error('Only the retained owned review database is allowed.');
const seed = readFileSync(resolve('prisma/seed/seed.ts'), 'utf8');
const allowed = new Set([...seed.matchAll(/username:\s*["']([a-z0-9._-]+)["']/g)].map(m => m[1]));
// These exact accounts are created only by reviewed synthetic preparation scripts.
for (const value of ['nalumino.setup','chileshe.policy','chanda.time','tembo.timetable']) allowed.add(value);
const namespace = 'sis-demo-2026';
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
try {
 const manifest = await db.$transaction(async tx => {
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
  const accounts = await tx.account.findMany({ where:{username:{in:[...allowed]},status:'ACTIVE',person:{status:'ACTIVE'}}, select:{id:true,username:true,person:{select:{displayName:true,email:true,student:{select:{id:true,status:true}}}}}, orderBy:{username:'asc'}, take:101 });
  if(accounts.length > 100 || accounts.some(a => !a.person.email?.endsWith('@demo.invalid'))) throw new Error('Generated account provenance or bound failed.');
  const users = accounts.map(a => {const name=a.person.displayName.replace(/\s*\(fictional\)\s*/gi,' ').trim().split(/\s+/); return {idnumber:`${namespace}:account:${a.id}`,username:`sis.demo.${a.username}`,firstname:name[0],lastname:name.slice(1).join(' ') || name[0],email:`${a.username}@example.invalid`};});
  const byStudent = new Map(accounts.filter(a=>a.person.student?.status==='ACTIVE').map(a=>[a.person.student.id, `${namespace}:account:${a.id}`]));
  const attempts = await tx.programmeAttempt.findMany({where:{studentId:{in:[...byStudent.keys()]},status:{in:['ACTIVE','ADMITTED']}},select:{id:true,studentId:true},take:101});
  if(attempts.length>100) throw new Error('Attempt bound exceeded.');
  const byAttempt = new Map(attempts.map(a=>[a.id,byStudent.get(a.studentId)]));
  const registrations = await tx.institutionalRegistration.findMany({where:{attemptId:{in:[...byAttempt.keys()]},status:'REGISTERED'}, select:{attemptId:true,periodId:true,roster:{where:{status:'ENROLLED'},select:{course:{select:{id:true,code:true,title:true}}}}},take:101});
  if(registrations.length>100) throw new Error('Registration bound exceeded.');
  const periodIds=[...new Set(registrations.map(r=>r.periodId))];
  const periods=await tx.academicPeriod.findMany({where:{id:{in:periodIds},status:{not:'CANCELLED'}},select:{id:true,code:true}});
  const byPeriod=new Map(periods.map(p=>[p.id,p.code]));
  const courses=new Map(), enrolments=new Map();
  for(const r of registrations){if(!byPeriod.has(r.periodId)) continue; for(const item of r.roster){const c=item.course; const idnumber=`${namespace}:course:${c.id}:${r.periodId}`; courses.set(idnumber,{idnumber,shortname:`SIS-${c.code}-${byPeriod.get(r.periodId)}`.toUpperCase().replace(/[^A-Z0-9-]/g,'-'),fullname:`${c.title} — ${byPeriod.get(r.periodId)}`}); const user=byAttempt.get(r.attemptId); enrolments.set(`${user}|${idnumber}`,{user,course:idnumber,role:'student'});}}
  if(courses.size>50 || enrolments.size>500) throw new Error('Course or membership bound exceeded.');
  return {namespace,peopleProvenance:'GENERATED',source:'OWNED_REVIEW_DB_ALLOWLIST',catalogueRelationship:'Existing SIS courses retained; not relabelled as official UNZA curriculum',users,courses:[...courses.values()],enrolments:[...enrolments.values()]};
 });
 writeFileSync(output,JSON.stringify(manifest,null,2),{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({outcome:'READ_ONLY_MANIFEST_EXPORTED',users:manifest.users.length,courses:manifest.courses.length,enrolments:manifest.enrolments.length,teacherEnrolments:0}));
} finally {await db.$disconnect();}
