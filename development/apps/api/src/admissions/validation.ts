import { APPLICATION_DEMO_V1 as policy } from '@sis/config';
import type { ApplicationSection } from '@sis/contracts';
export type Fields = Record<string, unknown>;
const required: Record<ApplicationSection, string[]> = {
  personal: ['givenName', 'familyName', 'dateOfBirth'],
  contact: ['preferredChannel'],
  qualifications: [
    'routeCode',
    'institution',
    'awardTitle',
    'completionYear',
    'status',
  ],
};
const optional: Record<ApplicationSection, string[]> = {
  personal: ['otherNames', 'preferredName'],
  contact: ['alternateEmail', 'address'],
  qualifications: ['subjects'],
};
export function validateSection(
  section: ApplicationSection,
  input: Fields,
  previous: Fields = {},
  complete = true,
  now = new Date(),
) {
  const errors: Record<string, string> = {};
  const data = { ...previous };
  for (const [key, value] of Object.entries(input)) {
    if (![...required[section], ...optional[section]].includes(key)) {
      errors[key] = 'This field is not permitted in this section.';
      continue;
    }
    let valid = true;
    let normalized = value;
    if (key === 'subjects') {
      valid =
        Array.isArray(value) &&
        value.length <= policy.qualifications.subjects.length &&
        value.every(
          (r) =>
            r &&
            typeof r === 'object' &&
            Object.keys(r).every((k) => ['subject', 'grade'].includes(k)) &&
            policy.qualifications.subjects.includes(r.subject) &&
            policy.qualifications.grades.includes(r.grade),
        ) &&
        new Set(value.map((r) => r.subject)).size === value.length;
    } else if (key === 'completionYear')
      valid =
        Number.isInteger(value) &&
        Number(value) >= policy.qualifications.minimumYear &&
        Number(value) <= now.getUTCFullYear();
    else {
      valid =
        typeof value === 'string' &&
        value.length <= (key === 'address' ? 500 : 150) &&
        !/[\u0000-\u001f\u007f]/.test(value);
      if (typeof value === 'string') normalized = value.trim();
      if (valid && key === 'dateOfBirth')
        valid =
          typeof normalized === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(normalized) &&
          Number.isFinite(Date.parse(normalized)) &&
          new Date(normalized).toISOString().slice(0, 10) === normalized &&
          new Date(normalized) <= now;
      if (valid && key === 'preferredChannel')
        valid = ['PORTAL', 'EMAIL'].includes(String(normalized));
      if (valid && key === 'alternateEmail' && normalized)
        valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(normalized));
      if (valid && key === 'routeCode')
        valid = policy.routes.some((r) => r.code === normalized);
      if (valid && key === 'status')
        valid =
          normalized === 'COMPLETED' ||
          (policy.qualifications.allowAwaiting && normalized === 'AWAITING');
    }
    if (!valid)
      errors[key] =
        `Check ${key.replace(/([A-Z])/g, ' $1').toLowerCase()} using the displayed format or options.`;
    else data[key] = normalized;
  }
  if (complete)
    for (const key of required[section])
      if (data[key] === undefined || data[key] === '')
        errors[key] = `${key.replace(/([A-Z])/g, ' $1')} is required.`;
  return { data, errors };
}
