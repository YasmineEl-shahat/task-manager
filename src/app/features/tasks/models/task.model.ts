import { TaskPriority, TaskStatus } from '@tasks/models/task.enums';

export interface Assignee {
  id: string;
  name: string;
  avatar: string;
  email: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignee: Assignee;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
