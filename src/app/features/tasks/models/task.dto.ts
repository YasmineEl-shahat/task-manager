import { TaskPriority, TaskStatus } from '@tasks/models/task.enums';
import { Assignee } from '@tasks/models/task.model';

export interface CreateTaskDto {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignee: Assignee;
  tags: string[];
}

export type UpdateTaskDto = Partial<CreateTaskDto>;
