import { Task } from '@tasks/models/task.model';

export interface TasksMeta {
  totalCount?: number;
  lastUpdated?: string;
}

export interface TasksEnvelopeResponse {
  tasks: Task[];
  meta?: TasksMeta;
}

/**
 * TasksResponse supports both:
 * 1. Direct array response: `Task[]`
 * 2. Envelope response: `{ tasks: Task[], meta?: TasksMeta }`
 */
export type TasksResponse = Task[] | TasksEnvelopeResponse;
