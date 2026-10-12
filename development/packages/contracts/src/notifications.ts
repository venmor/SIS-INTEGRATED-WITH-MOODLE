/** Phase 8 slice 1: notification views (TASK-PH8-001). Versioned
 * templates (supersede, never edit); authoritative in-system records
 * with delivery state rolled up across channels; staff signals share
 * the record view. ISO date strings. */
export interface NotificationTemplateView {
  id: string;
  event: string;
  version: number;
  status: string;
  title: string;
  office: string;
  category: string;
  mandatory: boolean;
}
export interface NotificationRecordView {
  id: string;
  event: string;
  title: string;
  category: string;
  mandatory: boolean;
  status: string;
  version: number;
  state: string;
  createdAt: string;
}
export interface NotificationDeliveryView {
  id: string;
  recordId: string;
  channel: string;
  state: string;
  attempts: number;
}
export interface NotificationRecordDetailView extends NotificationRecordView {
  deliveries: NotificationDeliveryView[];
}
