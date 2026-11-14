import { TaskPriority, TaskStatus } from './task.enums';
import { Assignee } from './task.model';

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
