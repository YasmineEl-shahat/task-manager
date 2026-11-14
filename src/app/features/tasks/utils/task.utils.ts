import { TaskStatus } from '../models/task.enums';
import { Task } from '../models/task.model';

/**
 * Determines whether a task is overdue.
 *
 * A task is overdue when its due date is before today and it has not been completed.
 */
export function isTaskOverdue(task: Task, today: Date = new Date()): boolean {
  if (task.status === TaskStatus.DONE) {
    return false;
  }

  const dueDate = new Date(`${task.dueDate}T00:00:00`);
  const currentDate = new Date(today);

  currentDate.setHours(0, 0, 0, 0);

  return !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < currentDate.getTime();
}

/**
 * Returns the number of days remaining until the task deadline.
 * A negative result means the deadline has passed.
 */
export function getDaysUntilDue(dueDate: string, today: Date = new Date()): number {
  const due = new Date(`${dueDate}T00:00:00`);
  const current = new Date(today);

  due.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);

  if (Number.isNaN(due.getTime())) {
    return 0;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.ceil((due.getTime() - current.getTime()) / millisecondsPerDay);
}
