export enum ActivityAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  STATUS_CHANGED = 'status_changed',
  ASSIGNED = 'assigned',
}

export interface TaskActivity {
  id: string;
  taskId: string;
  taskTitle: string;
  action: ActivityAction;
  performedBy: string;
  description: string;
  createdAt: string;
}
