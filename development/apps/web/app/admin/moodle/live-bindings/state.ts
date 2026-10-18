export interface Binding {
  id: string;
  kind: string;
  sisType: string;
  sisId: string;
  moodleId: string;
  status: string;
  version: number;
  checks: Array<{ result: string }>;
}
export interface Source {
  courseRegistrationId: string;
  courseCode: string;
  courseTitle: string;
  periodId: string;
  studentId: string;
  studentName: string;
  shellKey: string;
}
export interface BindingInventory {
  state: string;
  sources: Source[];
  mappings: Binding[];
}
export function bindingActions(role: string, binding: Pick<Binding, 'kind' | 'status' | 'checks'>) {
  const draft = binding.status === 'DRAFT';
  const approved = binding.checks.some((check) => check.result === 'ACADEMIC_APPROVED');
  return {
    attest: draft && binding.kind === 'SHELL' && !approved && role === 'COORDINATOR',
    activate: draft && role === 'MOODLE_ADMIN' && (binding.kind === 'USER' || approved),
  };
}
/** Call only with non-secret action identity. Passwords never enter this map. */
export function requestReference(
  references: Map<string, string>,
  path: string,
  identity: Record<string, unknown>,
  generate: () => string,
) {
  const fingerprint = JSON.stringify([path, identity]);
  const existing = references.get(fingerprint);
  if (existing) return existing;
  const key = generate();
  references.set(fingerprint, key);
  return key;
}

const defaultFailure = 'We could not confirm this action. Refresh the list, then retry with the same selection.';
export function bindingFailure(value: string): string {
  const messages: Record<string, string> = {
    INDEPENDENT_BINDING_DECISION_REQUIRED: 'A different officer must review this connection. Switch to an independently appointed account.',
    INDEPENDENT_ACADEMIC_APPROVAL_REQUIRED: 'An independent academic coordinator must approve this course before activation.',
    LIVE_BINDING_VERSION_CHANGED: 'This connection changed. Refresh the list before reviewing it again.',
    BINDING_SOURCE_CHANGED: 'The registered course or connection configuration changed. Refresh before retrying.',
    FRESH_PASSWORD_REQUIRED: 'Enter your current SIS password to activate the connection.',
    PUBLISHED_CURRICULUM_COURSE_REQUIRED: 'This course needs a published curriculum before it can be connected.',
    EXISTING_USER_ID_REQUIRED: 'Enter the existing Moodle user ID for this learner.',
    LIVE_BINDING_SCOPE_REQUIRED: 'Choose an appointed workspace whose scope includes this registered course and active run.',
    LIVE_BINDING_AUTHORITY_REQUIRED: 'This action needs an appointed Moodle administrator or academic coordinator.',
    LIVE_BINDING_NOT_FOUND: 'This connection is no longer available. Refresh the list.',
    LIVE_SCOPE_PREREQUISITES_MISSING: 'The live connection needs an approved active run and matching course and learner records.',
    ACADEMIC_ATTESTATION_NOT_REQUIRED: 'Learner accounts are reviewed by a different Moodle administrator.',
  };
  if (messages[value]) return messages[value];
  return /^[A-Z][A-Z0-9_]+$/.test(value) ? defaultFailure : value;
}
