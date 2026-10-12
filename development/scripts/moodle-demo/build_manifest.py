"""Create a deterministic offline preview from the public reference catalogue."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
catalogue = json.loads((root / 'docs/demo/catalogues/unza-public-catalogue-2026-10-12.json').read_text())
namespace = 'sis-demo-2026'
# Generated identity examples; not extracted from UNZA student or staff records.
people = [('chanda','mulenga'), ('bwalya','mwansa'), ('mutale','banda'), ('nasilele','tembo')]
users = [{'idnumber':f'{namespace}:person:{first}.{last}', 'username':f'sis.demo.{first}.{last}', 'firstname':first.title(), 'lastname':last.title(), 'email':f'{first}.{last}@example.invalid'} for first,last in people]
courses = [{'idnumber':f'{namespace}:course:{course["key"]}:2026', 'shortname':f'SIS-{course["key"].upper()}-2026', 'fullname':course['name']} for course in catalogue['courses']]
enrolments = [{'user':user['idnumber'], 'course':course['idnumber'], 'role':'teacher' if index == 3 else 'student'} for index,user in enumerate(users) for course in courses]
print(json.dumps({'namespace':namespace,'peopleProvenance':'GENERATED','catalogueVersion':catalogue['version'],'users':users,'courses':courses,'enrolments':enrolments},indent=2))
