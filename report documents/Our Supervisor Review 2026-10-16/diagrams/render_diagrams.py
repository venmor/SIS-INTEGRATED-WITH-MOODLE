"""Regenerate report diagrams with local Graphviz; no application build or network."""
from pathlib import Path
from html import escape
import subprocess
import re

ROOT = Path(__file__).resolve().parent
BLUE, INK, MUTED, GREEN, AMBER = '#2563eb', '#142b49', '#64748b', '#13755b', '#a46612'
BASE = '''graph [bgcolor="#ffffff", fontname="DejaVu Sans", fontsize=19, fontcolor="#142b49", labelloc=t, labeljust=l, pad=0.28, nodesep=0.38, ranksep=0.60, splines=polyline];
node [shape=box, style="rounded,filled", fillcolor="#f0f5fc", color="#b6c7df", fontname="DejaVu Sans", fontsize=11, fontcolor="#142b49", penwidth=1.2, margin="0.16,0.12"];
edge [color="#617894", fontname="DejaVu Sans", fontsize=9, fontcolor="#334e70", penwidth=1.15, arrowsize=0.7];'''

def write(name, mermaid, dot, engine='dot'):
    mermaid = re.sub(r'(?m)^(\s*class\s+\w+)\s+\{\s*(.*?)\s*\}$',
                     lambda match: match.group(1) + ' {\n    ' + '\n    '.join(part.strip() for part in match.group(2).split(';') if part.strip()) + '\n  }', mermaid)
    (ROOT / f'{name}.mmd').write_text(mermaid.strip() + '\n')
    path = ROOT / f'{name}.dot'
    path.write_text(dot.strip() + '\n')
    for fmt in ('svg', 'png'):
        fixed = ['-n2'] if engine == 'neato' else []
        subprocess.run([engine, *fixed, f'-T{fmt}', '-Gdpi=130', str(path), '-o', str(ROOT / f'{name}.{fmt}')], check=True)
    print(f'Rendered {name}: Mermaid + Graphviz sources; SVG + PNG')

def cls(title, fields, methods=(), color='#eaf2ff'):
    header = f'<TR><TD BGCOLOR="{color}"><B>{escape(title)}</B></TD></TR>'
    body = ''.join(f'<TR><TD ALIGN="LEFT">{escape(line)}</TD></TR>' for line in fields)
    operations = ''
    if methods:
        operations = '<TR><TD BGCOLOR="#f0f4f9" ALIGN="LEFT">' + '<BR ALIGN="LEFT"/>'.join(escape(x) for x in methods) + '</TD></TR>'
    return f'<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="7" COLOR="#b6c7df">{header}{body}{operations}</TABLE>>'

# 1. Context and components: deployed process boundaries, not microservices.
write('01-system-context-components', r'''
flowchart LR
  Users[Students, applicants and appointed staff] -->|HTTPS; own session| Web
  subgraph Web[Next.js web application]
    UI[Public, applicant, student and staff routes]
    Proxy[Server loaders and API proxies]
    UI --> Proxy
  end
  Proxy -->|JSON HTTP; server-side authorization| IAM
  subgraph API[NestJS modular monolith - one API application]
    IAM[IdentityAccess: session, role/scope, CSRF and audit]
    Academic[Catalogue, Admissions, Records, Registration, Teaching, Assessment]
    Other[Finance, InstitutionSetup, AcademicSupport]
    Time[Timetabling: draft, validate, independently publish]
    Integration[IntegrationService and DeliveryWorker]
    Notices[Notifications and Ops]
    DBAccess[PrismaService]
    IAM --> Academic & Other & Time & Integration & Notices
    Academic --> DBAccess
    Other --> DBAccess
    Time --> DBAccess
    Integration --> DBAccess
    Notices --> DBAccess
  end
  DBAccess --> DB[(PostgreSQL: SIS records, outbox, audit, simulator mirrors)]
  Integration -->|current simulator operations| DB
  Integration -.->|guarded read-only connection checks| Moodle[External Moodle test instance]
  Gate[Automatic live enrolment is NOT_PROVISIONED; queued sources retained]
  Integration -.-> Gate
''', 'digraph architecture {\n' + BASE + r'''
rankdir=TB;
label="System context and component architecture\nCurrent repository structure · modular monolith · 16 October 2026";
users [label="Students and applicants\nAppointed academic / support staff", fillcolor="#e8f7f1", color="#83bda8"];
subgraph cluster_web { label="Next.js web application"; style="rounded"; color="#b6c7df"; fontsize=15;
web [label="Role-specific pages\nPublic / applicant / student / staff"];
proxy [label="Server loaders and API proxies\nSession-aware route handling"];
web -> proxy;
}
subgraph cluster_api { label="NestJS modular monolith · one API application"; style="rounded"; color="#8fa8cc"; fontsize=15;
iam [label="IdentityAccess\nSession + selected role/scope\nCSRF / policy / audit"];
academic [label="Academic modules\nCatalogue · Admissions · Records\nRegistration · Teaching · Assessment"];
other [label="Other domain modules\nFinance · InstitutionSetup\nAcademicSupport"];
time [label="Timetabling\nDraft + source validation\nIndependent fictional publication"];
integration [label="IntegrationService\nDeliveryWorker\nMapping + reconciliation"];
notices [label="Notifications + Ops\nIn-system notices / operations\nSeparate owner workers"];
prisma [label="PrismaService\nShared database access", fillcolor="#e8f0ff", color="#7296ca"];
iam -> academic; iam -> other; iam -> time; iam -> integration; iam -> notices;
academic -> prisma; other -> prisma; time -> prisma; integration -> prisma; notices -> prisma;
{rank=same; academic; other; time;}
{rank=same; integration; notices;}
academic -> integration [style=invis]; other -> notices [style=invis];
}
db [shape=cylinder, label="PostgreSQL\nOfficial SIS records\nOutbox + audit + simulator mirrors", fillcolor="#e8f7f1", color="#83bda8"];
moodle [label="External Moodle test instance\nGuarded read-only connection checks", fillcolor="#fff7e8", color="#d6b47a"];
gate [label="LIVE AUTOMATIC DELIVERY: DEFERRED\nNOT_PROVISIONED\nQueued sources and registration retained", fillcolor="#fff7e8", color="#d6b47a"];
users -> web [label="HTTPS / own session"];
proxy -> iam [label="JSON HTTP\nAPI rechecks authority"];
prisma -> db;
integration -> db [style=dashed, label="local simulator\nactual-state rows", constraint=false];
integration -> moodle [style=dashed, label="read-only validation", color="#a46612"];
integration -> gate [style=dashed, color="#a46612"];
}
''')

# 2. A real UML-style sequence: fixed participant columns and message rows.
sequence_mermaid = r'''
sequenceDiagram
  actor Student
  participant API as RegistrationController
  participant Reg as RegistrationService
  participant DB as PostgreSQL
  participant Int as IntegrationService / DeliveryWorker
  participant Sim as SimulatorAdapter
  Student->>API: POST /registration/submit (version, declarations, request key)
  API->>Reg: submitRegistration(auth, key, input)
  Reg->>DB: Resolve own attempt / plan; check rules and clearance
  Reg->>DB: Transaction: locks, replay lookup, live preconditions
  Reg->>DB: Snapshot + roster + receipt + outbox + audit + command result
  DB-->>Reg: COMMIT; failures roll back authoritative writes
  Reg-->>API: Registration receipt
  API-->>Student: Registration complete; Moodle access being prepared
  Note over Int,Sim: Separate worker; timer does not start when VERCEL is set
  Int->>DB: runWorker(): read due Moodle outbox sources
  alt Simulator selected (current runnable automatic path)
    Int->>Sim: ensureShell / applyEnrolment using programme offering + period
    Sim->>DB: SimShell, SimEnrolment and group mirrors
    Int->>DB: Delivery attempt + deliveredAt, or retry / manual review
  else Live-test requested
    Note over Int,Sim: liveDeliveryDeferral() returns NOT_PROVISIONED before claims
    Int-->>DB: Retain queued sources; no live enrolment or false deliveredAt
  end
  Student->>API: GET /registration/status
  API->>Reg: registrationStatus(auth, attempt, period)
  Reg-->>API: Own receipt + actual pending / simulator / live-deferral status
  API-->>Student: Authoritative status response
  Note over Reg,Sim: Current simulator shell mapping is programme-offering-based, not one Moodle course per SIS Course
'''
lanes = [('student','Student'), ('api','Registration\nController'), ('reg','Registration\nService'), ('db','PostgreSQL'), ('int','IntegrationService\n+ DeliveryWorker'), ('sim','SimulatorAdapter')]
xs = [95, 350, 615, 885, 1180, 1490]
dot = ['digraph sequence {', BASE, 'graph [layout=neato, overlap=true, splines=line, outputorder=edgesfirst];',
       'label="Registration and the Moodle handoff\nSIS registration commits first; simulator delivery is separate; automatic live delivery stays deferred";']
top, bottom = 1110, -20
for (key,title), x in zip(lanes,xs):
    title = title.replace('\n','\\n')
    dot.append(f'{key}_head [label="{title}", pos="{x},{top}!", width=2.45, height=0.65, pin=true];')
    dot.append(f'{key}_end [shape=point,width=0.01,label="",pos="{x},{bottom}!",pin=true];')
    dot.append(f'{key}_head -> {key}_end [style=dashed,color="#ccd7e6",arrowhead=none];')
def msg(n, sender, receiver, y, label, dashed=False):
    a, b = f'm{n}a', f'm{n}b'
    xa, xb = xs[[x[0] for x in lanes].index(sender)], xs[[x[0] for x in lanes].index(receiver)]
    for ident,x in [(a,xa),(b,xb)]:
        dot.append(f'{ident} [shape=point,width=0.01,label="",pos="{x},{y}!",pin=true];')
    style = ',style=dashed' if dashed else ''
    dot.append(f'{a} -> {b} [color="#334e70"{style}];')
    label = label.replace('\n','\\n')
    dot.append(f'm{n}label [shape=plaintext,fontsize=10,label="{label}",pos="{(xa+xb)/2},{y+17}!",pin=true];')
def band(key,y,label,amber=False):
    fill, border = ('#fff7e8','#d6b47a') if amber else ('#e8f7f1','#83bda8')
    dot.append(f'{key} [label="{label}",pos="795,{y}!",width=20.3,height=0.48,pin=true,fillcolor="{fill}",color="{border}",fontsize=11];')
msg(1,'student','api',1035,'1  Submit version, declarations and request key')
msg(2,'api','reg',975,'2  submitRegistration(auth, key, input)')
msg(3,'reg','db',915,'3  Resolve own attempt / plan; validate rules')
msg(4,'reg','db',855,'4  BEGIN · lock + replay lookup + live checks')
msg(5,'reg','db',795,'5  Snapshot + roster + receipt\noutbox + audit + command result')
msg(6,'db','reg',725,'6  COMMIT; failure rolls back all success writes',True)
msg(7,'reg','api',665,'7  Registration receipt',True)
msg(8,'api','student',605,'8  Registration complete; Moodle preparing',True)
band('async',548,'SEPARATE WORKER · timer disabled on Vercel · registration is already authoritative')
msg(9,'int','db',485,'9  runWorker(): read queued Moodle sources')
band('simband',435,'SIMULATOR SELECTED · current runnable automatic path')
msg(10,'int','sim',375,'10  ensureShell / applyEnrolment\nProgrammeOffering + academic period')
msg(11,'sim','db',305,'11  SimShell + SimEnrolment + group mirrors')
msg(12,'int','db',245,'12  Delivery result or retry / manual review')
band('liveband',187,'ALTERNATIVE: LIVE-TEST REQUESTED · NOT_PROVISIONED before claims · no live enrolment',True)
msg(13,'int','db',125,'13  Retain queued work; do not record false delivery',True)
msg(14,'reg','api',65,'Own status read: receipt + truthful pending / simulator / live deferral',True)
msg(15,'api','student',5,'Return authoritative own registration / access status',True)
dot.append('}')
write('02-registration-moodle-sequence', sequence_mermaid, '\n'.join(dot), engine='neato')

# 3. Selected domain classes; dashed lines explicitly are not Prisma FKs.
domain_mmd = r'''
classDiagram
  Person "1" -- "0..*" Account : personId
  Person "1" -- "0..1" Student : unique personId
  Account "1" -- "0..*" RoleAssignment : grantee accountId
  Student "1" -- "0..*" ProgrammeAttempt : studentId
  ProgrammeOffering "1" -- "0..*" ProgrammeAttempt : offeringId
  CurriculumVersion "0..1" -- "0..*" ProgrammeAttempt : pinned curriculum
  ProgrammeAttempt ..> InstitutionalRegistration : scalar attemptId; service-resolved
  AcademicPeriod ..> InstitutionalRegistration : scalar periodId; service-resolved
  InstitutionalRegistration "1" -- "0..*" CourseRegistration : registrationId
  Course "1" -- "0..*" CourseRegistration : courseId
  Course "1" -- "0..*" CourseVersion : courseId
  CourseVersion "1" -- "0..*" CourseDeliveryOffering : courseVersionId
  AcademicPeriod "1" -- "0..*" CourseDeliveryOffering : periodId
  CourseDeliveryOffering "1" -- "0..*" TeachingSection : offeringId
  CourseRegistration "1" -- "0..*" TimetableStudentSession : courseRegistrationId
  TeachingSection "1" -- "0..*" TimetableStudentSession : sectionId
  ProgrammeAttempt "1" -- "0..*" TimetableStudentSession : attemptId
  ProgrammeOffering ..> MoodleMapping : SHELL sisId = offeringId + periodCode; no FK
  Account ..> MoodleMapping : USER sisId; no FK
  class Person { id; displayName; status }
  class Account { id; personId; username; status }
  class RoleAssignment { id; accountId; role; scopeType; scopeRef; startsAt; endsAt; capabilities }
  class Student { id; personId; studentNumber; status }
  class ProgrammeAttempt { id; studentId; offeringId; curriculumVersionId; status }
  class ProgrammeOffering { id; programmeId; intake; studyMode; campus }
  class CurriculumVersion { id; programmeId; version; status }
  class AcademicPeriod { id; code; registrationOpen; registrationClose; status }
  class InstitutionalRegistration { id; attemptId; periodId; version; snapshot; receipt }
  class CourseRegistration { id; registrationId; courseId; status }
  class Course { id; code; credits; capacity }
  class CourseVersion { id; courseId; version; status }
  class CourseDeliveryOffering { id; courseVersionId; periodId; campusUnitId; capacity }
  class TeachingSection { id; offeringId; code; capacity }
  class TimetableStudentSession { id; publicationId; courseRegistrationId; attemptId; sectionId; offeringId }
  class MoodleMapping { id; kind; sisType; sisId; moodleId; version; status }
  note for InstitutionalRegistration "attemptId and periodId are scalar keys, not declared Prisma relations"
  note for MoodleMapping "Polymorphic lookup. No direct FK to Account or either offering model."
'''
nodes = {
'Person':['id : UUID','displayName; status'], 'Account':['id; personId','username; status'],
'RoleAssignment':['id; accountId','role; scopeType; scopeRef','startsAt; endsAt; revokedAt','capabilities[]'],
'Student':['id; personId UNIQUE','studentNumber; status'],
'ProgrammeOffering':['id; programmeId','intake; studyMode; campus','Admissions offering'],
'CurriculumVersion':['id; programmeId (scalar)','version; status'],
'ProgrammeAttempt':['id; studentId; offeringId','curriculumVersionId?','status; applicationId (scalar)'],
'AcademicPeriod':['id; code','registrationOpen / Close','status'],
'InstitutionalRegistration':['id; attemptId; periodId','UNIQUE(attemptId, periodId)','version; snapshot; receipt'],
'CourseRegistration':['id; registrationId; courseId','status = ENROLLED / DROPPED'],
'Course':['id; code; title','credits; capacity'],
'CourseVersion':['id; courseId; version','title; credits; status'],
'CourseDeliveryOffering':['id; courseVersionId; periodId','deliveryUnitId; campusUnitId','deliveryMode; capacity; status'],
'TeachingSection':['id; offeringId; code','capacity; deliveryMode'],
'TimetableStudentSession':['id; publicationId','courseRegistrationId; attemptId','sectionId; offeringId; periodId','Additional source FKs omitted'],
'MoodleMapping':['id; kind; sisType; sisId','moodleId; version; status','Polymorphic, not an offering FK'],
}
d = ['graph domain {', BASE, 'rankdir=TB; nodesep=0.45; ranksep=0.72;', 'label="Selected domain classes\nSolid = declared Prisma relationship · dashed = scalar / polymorphic service reference";', 'node [shape=plain, margin=0];']
for name,fields in nodes.items(): d.append(f'{name} [label={cls(name,fields)}];')
relations = [('Person','Account','1','0..*','personId'),('Person','Student','1','0..1','unique personId'),('Account','RoleAssignment','1','0..*','grantee'),('Student','ProgrammeAttempt','1','0..*','studentId'),('ProgrammeOffering','ProgrammeAttempt','1','0..*','offeringId'),('CurriculumVersion','ProgrammeAttempt','0..1','0..*','curriculum pin'),('InstitutionalRegistration','CourseRegistration','1','0..*','registrationId'),('Course','CourseRegistration','1','0..*','courseId'),('Course','CourseVersion','1','0..*','courseId'),('CourseVersion','CourseDeliveryOffering','1','0..*','courseVersionId'),('AcademicPeriod','CourseDeliveryOffering','1','0..*','periodId'),('CourseDeliveryOffering','TeachingSection','1','0..*','offeringId'),('CourseRegistration','TimetableStudentSession','1','0..*','registration lineage'),('TeachingSection','TimetableStudentSession','1','0..*','section allocation'),('ProgrammeAttempt','TimetableStudentSession','1','0..*','own attempt')]
for a,b,left,right,label in relations:
    d.append(f'{a} -- {b} [taillabel="{left}",headlabel="{right}",label="{label}",labeldistance=1.7];')
d += [
'ProgrammeAttempt -- InstitutionalRegistration [style=dashed,label="scalar attemptId",color="#a46612"];',
'AcademicPeriod -- InstitutionalRegistration [style=dashed,label="scalar periodId",color="#a46612"];',
'ProgrammeOffering -- MoodleMapping [style=dashed,label="SHELL: offering + period\npolymorphic, no FK",color="#a46612"];',
'Account -- MoodleMapping [style=dashed,label="USER: account key\nno FK",color="#a46612",constraint=false];',
'{rank=same; Account; Student; ProgrammeOffering; CurriculumVersion; Course;}',
'{rank=same; RoleAssignment; ProgrammeAttempt; AcademicPeriod; CourseVersion;}',
'{rank=same; InstitutionalRegistration; CourseDeliveryOffering; MoodleMapping;}',
'{rank=same; CourseRegistration; TeachingSection;}',
'}']
write('03-domain-class-model', domain_mmd, '\n'.join(d))

# 4. Activity with persisted and derived state labels kept distinct.
activity_mmd = r'''
flowchart TD
  A[Coordinator prepares explicit course-registration to section manifest] --> B[Validate current rule, calendar, teacher, venue, roster and conflicts]
  B --> C[Append immutable TimetableDemoMasterDraft version]
  C --> D{Blocking findings?}
  D -->|yes: stored BLOCKED| E[Retain findings; coordinator saves a corrected new version]
  E --> B
  D -->|no: CONFLICT_FREE_FOR_REVIEW| F[Independent DOMAIN_ADMIN reviews exact sources and replacement impact]
  F --> G[Reason + declarations + fresh password + UUID + expected predecessor]
  G --> H{Current authority, independence, credential, digest and source checks pass?}
  H -->|no| X[Deny or roll back; prior publication remains authoritative]
  H -->|yes| I[Atomic append: publication, student sessions, audit and owner outbox event]
  I --> J{Final source and natural-expiry checks pass?}
  J -->|no| X
  J -->|yes| K[Commit FICTIONAL_PUBLISHED receipt]
  K --> L[Student read intersects latest publication with own current registration and attempt]
  K --> N[Separate notification owner creates deduplicated in-system notices]
  K -.-> R[Matching UUID + exact command recovers receipt; changed payload is refused]
  L --> P[Replacement appends a new version; older rows remain history]
  N --> Q[External delivery NONE; no email, SMS or Moodle calendar claim]
  note[Demo opt-in + loopback review/test database + SYSTEM:DEMO-UNIVERSITY required] -.-> A
'''
write('04-timetable-publication-activity', activity_mmd, 'digraph publication {\n' + BASE + r'''
rankdir=TB; ranksep=0.48;
label="Governed fictional timetable publication\nActivity and state labels · no in-place promotion of an immutable blocked draft";
boundary [label="FICTIONAL REHEARSAL ONLY\nDemo opt-in + loopback review/test DB\nExact SYSTEM:DEMO-UNIVERSITY appointments", fillcolor="#fff7e8",color="#d6b47a"];
a [label="Coordinator proposes explicit registration-to-section manifest"];
b [label="Validate current rules, calendar, delivery, teachers,\nvenue, roster, access, capacity and conflicts"];
c [label="Append immutable TimetableDemoMasterDraft version"];
d [shape=diamond,label="Blocking\nfindings?",fillcolor="#ffffff"];
e [label="Stored BLOCKED\nRetain findings; save corrected NEW version",fillcolor="#fff7e8",color="#d6b47a"];
f [label="Stored CONFLICT_FREE_FOR_REVIEW\nIndependent DOMAIN_ADMIN reviews exact\nsource package + predecessor + replacement impact",fillcolor="#e8f7f1",color="#83bda8"];
g [label="Unticked declarations + bounded reason + fresh password\nUUID + digest + expected predecessor"];
h [shape=diamond,label="Authority, independence,\ncredential and fresh\nsource checks pass?",fillcolor="#ffffff"];
i [label="ATOMIC TRANSACTION\nAppend publication + entitled student sessions\n+ audit + DemoTimetablePublished outbox",fillcolor="#e8f0ff",color="#7296ca"];
j [shape=diamond,label="Final sources and\nnatural expiry\nstill valid?",fillcolor="#ffffff"];
x [label="DENY / ROLLBACK\nPrior publication preserved; no partial success",fillcolor="#fff7e8",color="#d6b47a"];
k [label="COMMIT · FICTIONAL_PUBLISHED receipt\nNewest period version is current (derived)",fillcolor="#e8f7f1",color="#83bda8"];
l [label="Student reads only latest published manifest\nintersected with own active attempt / enrolled courses"];
n [label="Separate NotificationsService owner processing\nDeduplicated own-account in-system notices"];
p [label="Replacement appends a new publication\nOld master, publication and projections remain auditable"];
q [label="External delivery: NONE\nNo email / SMS / Moodle-calendar delivery claim",fillcolor="#fff7e8",color="#d6b47a"];
r [label="Recovery: matching UUID + complete command\nreturns exact receipt; altered reuse is refused\nHistorical receipt may be superseded",fillcolor="#f5f1ff",color="#b7a5dd"];
boundary -> a [style=dashed]; a -> b -> c -> d;
d -> e [label="yes"]; e -> b [label="new version",constraint=false];
d -> f [label="no"]; f -> g -> h;
h -> x [label="no"]; h -> i [label="yes"]; i -> j;
j -> x [label="no",constraint=false]; j -> k [label="yes"];
k -> l; k -> n; k -> r [style=dashed,label="same-reference recovery"];
l -> p; n -> q;
{rank=same; e; f;} {rank=same; x; i;} {rank=same; l; n; r;}
}
''')

# 5. Selected implementation classes and the real constructor dependencies.
design_mmd = r'''
classDiagram
  RegistrationController --> RegistrationService : injects
  RegistrationController --> RegistrationContextsService : injects
  RegistrationService --> PrismaService : injects
  RegistrationService --> FinanceService : injects
  RegistrationService --> IntegrationService : injects
  RegistrationContextsService --> PrismaService : injects
  IntegrationController --> IntegrationService : injects
  DeliveryWorker --> IntegrationService : runWorker
  IntegrationService --> PrismaService : injects
  IntegrationService --> OpsService : injects
  IntegrationService ..> MoodleAdapter : selects adapter
  SimulatorAdapter ..|> MoodleAdapter
  LiveMoodleAdapter ..|> MoodleAdapter
  MasterPreviewController --> MasterPreviewService : injects
  MasterPreviewController --> TimetablePublicationService : injects
  MasterPreviewController --> PrismaService : injects
  MasterPreviewService --> PrismaService : injects
  TimetablePublicationService --> PrismaService : injects
  class RegistrationController { readiness(); submit(); timetable() }
  class RegistrationService { readiness(); submitRegistration(); registrationStatus(); timetable() }
  class RegistrationContextsService { list() }
  class IntegrationController { health(); runWorker() }
  class IntegrationService { runWorker(); deliverOutbox(); liveDeliveryDeferral(); adapter() }
  class DeliveryWorker { tick(); onModuleInit() }
  class MasterPreviewController { create(); publicationReview(); publish() }
  class MasterPreviewService { create(); catalogue(); course() }
  class TimetablePublicationService { review(); publish() }
  class MoodleAdapter { <<interface>>; ensureShell(); applyEnrolment(); validateConnection() }
  note for LiveMoodleAdapter "Connection validation exists; write/scope operations currently refuseScope"
  note for PrismaService "Shared persistence boundary. Solid arrows are actual selected constructor injections."
'''
design_nodes = {
'RegistrationController':(['«controller» /registration'],['readiness()','submit() / timetable()']),
'RegistrationService':(['«service» registration owner'],['readiness()','submitRegistration()','registrationStatus() / timetable()']),
'RegistrationContextsService':(['«service» own contexts'],['list()']),
'IntegrationController':(['«controller» /integration'],['health() / runWorker()']),
'IntegrationService':(['«service» integration owner'],['runWorker() / deliverOutbox()','liveDeliveryDeferral() / adapter()']),
'DeliveryWorker':(['«worker» in API process'],['onModuleInit() / tick()']),
'MasterPreviewController':(['«controller» /timetabling/demo-master'],['create() / publicationReview()','publish()']),
'MasterPreviewService':(['«service» immutable drafts'],['create() / catalogue() / course()']),
'TimetablePublicationService':(['«service» independent decision'],['review() / publish()']),
'PrismaService':(['«shared persistence»'],['Prisma client / $transaction()']),
'FinanceService':(['«service» finance owner'],['Registration charge integration']),
'OpsService':(['«service» operations owner'],['Incident / recovery integration']),
'MoodleAdapter':(['«interface»'],['ensureShell() / applyEnrolment()','validateConnection()']),
'SimulatorAdapter':(['«adapter» local mirror rows'],['Runnable simulator operations']),
'LiveMoodleAdapter':(['«adapter» exact test target'],['validateConnection()','Write/scope operations refuseScope()']),
}
z=['digraph classes {',BASE,'rankdir=TB; nodesep=0.45; ranksep=0.7;', 'label="Selected design classes and actual boundaries\nSolid arrows = constructor dependency · dashed = selection / interface realization";','node [shape=plain,margin=0];']
for name,(fields,methods) in design_nodes.items(): z.append(f'{name} [label={cls(name,fields,methods)}];')
links=[('RegistrationController','RegistrationService'),('RegistrationController','RegistrationContextsService'),('RegistrationService','PrismaService'),('RegistrationService','FinanceService'),('RegistrationService','IntegrationService'),('RegistrationContextsService','PrismaService'),('IntegrationController','IntegrationService'),('DeliveryWorker','IntegrationService'),('IntegrationService','PrismaService'),('IntegrationService','OpsService'),('MasterPreviewController','MasterPreviewService'),('MasterPreviewController','TimetablePublicationService'),('MasterPreviewController','PrismaService'),('MasterPreviewService','PrismaService'),('TimetablePublicationService','PrismaService')]
for a,b in links: z.append(f'{a} -> {b};')
z += ['IntegrationService -> MoodleAdapter [style=dashed,label="adapter() selects"];',
'SimulatorAdapter -> MoodleAdapter [style=dashed,arrowhead=empty,label="implements"];',
'LiveMoodleAdapter -> MoodleAdapter [style=dashed,arrowhead=empty,label="implements"];',
'{rank=same; RegistrationController; MasterPreviewController; IntegrationController; DeliveryWorker;}',
'{rank=same; RegistrationService; RegistrationContextsService; MasterPreviewService; TimetablePublicationService;}',
'{rank=same; FinanceService; PrismaService; IntegrationService;}',
'{rank=same; OpsService; MoodleAdapter;}',
'{rank=same; SimulatorAdapter; LiveMoodleAdapter;}',
'}']
write('05-design-class-boundaries', design_mmd, '\n'.join(z))

print('All five diagrams rendered with local Graphviz; no download or application build.')
