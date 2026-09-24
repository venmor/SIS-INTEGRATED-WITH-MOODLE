/** Phase 6 slice 0: teaching views (TASK-PH6-000). Tutorial groups and
 * teaching assignments are SIS-authoritative; quiz authority derives
 * from explicit capability + scope + dates. */
export interface TutorialGroupView {
  id: string;
  name: string;
  capacity: number;
  status: string;
  version: number;
  programme: string;
  intake: string;
  allocated: number;
}
export interface GroupDetailView extends TutorialGroupView {
  members: Array<{ studentNumber: string }>;
}
export interface QuizAuthorityView {
  allowed: boolean;
  scope: string | null;
  groupIds?: string[];
  reason: string;
}
