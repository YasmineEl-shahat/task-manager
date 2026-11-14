import { describe, expect, it } from 'vitest';
import { TaskPriority, TaskStatus } from '../models/task.enums';
import { Task } from '../models/task.model';
import { getDaysUntilDue, isTaskOverdue } from './task.utils';

const today = new Date(2026, 10, 14);

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-001',
    title: 'Design new homepage layout',
    description: 'Create wireframes and mockups',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    dueDate: '2026-11-12',
    assignee: {
      id: 'user-001',
      name: 'John Doe',
      avatar: 'JD',
      email: 'john.doe@company.com',
    },
    tags: ['Design'],
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-12T00:00:00.000Z',
    ...overrides,
  };
}

describe('isTaskOverdue', () => {
  it('returns true when an open task is due before today', () => {
    expect(isTaskOverdue(createTask({ dueDate: '2026-11-12' }), today)).toBe(true);
  });

  it('returns false when the task is due today or later', () => {
    expect(isTaskOverdue(createTask({ dueDate: '2026-11-14' }), today)).toBe(false);
    expect(isTaskOverdue(createTask({ dueDate: '2026-11-16' }), today)).toBe(false);
  });

  it('returns false for a completed task even when the due date has passed', () => {
    expect(
      isTaskOverdue(createTask({ status: TaskStatus.DONE, dueDate: '2026-11-10' }), today),
    ).toBe(false);
  });

  it('returns false when the due date cannot be parsed', () => {
    expect(isTaskOverdue(createTask({ dueDate: 'not-a-date' }), today)).toBe(false);
  });
});

describe('getDaysUntilDue', () => {
  it('returns the signed day difference from today', () => {
    expect(getDaysUntilDue('2026-11-16', today)).toBe(2);
    expect(getDaysUntilDue('2026-11-14', today)).toBe(0);
    expect(getDaysUntilDue('2026-11-12', today)).toBe(-2);
  });

  it('returns 0 when the due date cannot be parsed', () => {
    expect(getDaysUntilDue('not-a-date', today)).toBe(0);
  });
});
