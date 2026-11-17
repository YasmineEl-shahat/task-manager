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

export const INITIAL_ACTIVITIES: readonly TaskActivity[] = [
  {
    id: 'act-001',
    taskId: 'task-001',
    taskTitle: 'Design new homepage layout',
    action: ActivityAction.CREATED,
    performedBy: 'John Doe',
    description: 'Created task "Design new homepage layout"',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 'act-002',
    taskId: 'task-004',
    taskTitle: 'Fix navigation bar bug',
    action: ActivityAction.STATUS_CHANGED,
    performedBy: 'Sarah Smith',
    description: 'Moved "Fix navigation bar bug" to In Progress',
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: 'act-003',
    taskId: 'task-007',
    taskTitle: 'Deploy to staging',
    action: ActivityAction.STATUS_CHANGED,
    performedBy: 'Mike Johnson',
    description: 'Completed "Deploy to staging"',
    createdAt: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
  },
  {
    id: 'act-004',
    taskId: 'task-002',
    taskTitle: 'Update documentation',
    action: ActivityAction.ASSIGNED,
    performedBy: 'Emily Davis',
    description: 'Assigned "Update documentation" to Sarah Smith',
    createdAt: new Date(Date.now() - 1000 * 60 * 190).toISOString(),
  },
  {
    id: 'act-005',
    taskId: 'task-005',
    taskTitle: 'Setup CI/CD pipeline',
    action: ActivityAction.UPDATED,
    performedBy: 'John Doe',
    description: 'Updated priority to High for "Setup CI/CD pipeline"',
    createdAt: new Date(Date.now() - 1000 * 60 * 320).toISOString(),
  },
  {
    id: 'act-006',
    taskId: 'task-015',
    taskTitle: 'Prepare Q4 budget report',
    action: ActivityAction.CREATED,
    performedBy: 'Sarah Smith',
    description: 'Created task "Prepare Q4 budget report"',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];
