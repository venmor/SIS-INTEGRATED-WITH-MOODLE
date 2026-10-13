
/** Navigation only: destination loaders still enforce live role and ownership. */
export function safeSignInTarget(value: string | undefined): string | undefined {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value) || /%0[ad]|%5c/i.test(value)) return;
  const url = new URL(value, 'https://sis.invalid');
  if (url.origin !== 'https://sis.invalid' || url.hash) return;
  if (/^\/(applicant|discover|admin)(\/|\?|$)/.test(value)) return value;
  if (!['/student', '/student/courses', '/student/register', '/student/readiness', '/student/timetable', '/student/changes', '/student/results'].includes(url.pathname)) return;
  for (const key of url.searchParams.keys()) {
    if (!['attemptId', 'period'].includes(key) || url.searchParams.getAll(key).length !== 1) return;
  }
  const attemptId = url.searchParams.get('attemptId');
  const period = url.searchParams.get('period');
  if (attemptId !== null && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(attemptId)) return;
  if (period !== null && (!period.trim() || period.length > 64 || /[\u0000-\u001f\u007f]/.test(period))) return;
  return value;
}
