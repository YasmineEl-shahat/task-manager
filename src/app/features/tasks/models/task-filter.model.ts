import { TaskFilterPriority, TaskFilterStatus } from './task.enums';

export interface TaskFilters {
  status: TaskFilterStatus;
  priority: TaskFilterPriority;
  assigneeId: string | null;
  search: string;
}

export const INITIAL_TASK_FILTERS: TaskFilters = {
  status: TaskFilterStatus.ALL,
  priority: TaskFilterPriority.ALL,
  assigneeId: null,
  search: '',
};
