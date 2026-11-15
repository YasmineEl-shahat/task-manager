import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { TaskPriority, TaskStatus, TaskFilterStatus, TaskFilterPriority } from '@tasks/models/task.enums';
import { Task } from '@tasks/models/task.model';
import { TaskApiService } from '@tasks/services/task-api.service';
import { TaskStore } from './task.store';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Fix bug',
    description: 'Reproduce and fix the login bug',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    dueDate: '2099-12-01',
    assignee: { id: 'user-1', name: 'Alice', avatar: 'AL', email: 'alice@test.com' },
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeApiMock() {
  return {
    getTasks: vi.fn(),
    getTaskById: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    patchTask: vi.fn(),
    deleteTask: vi.fn(),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Flush the micro-task queue so signal updates propagate. */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('TaskStore', () => {
  let store: TaskStore;
  let apiMock: ReturnType<typeof makeApiMock>;

  beforeEach(() => {
    apiMock = makeApiMock();

    TestBed.configureTestingModule({
      providers: [
        TaskStore,
        { provide: TaskApiService, useValue: apiMock },
      ],
    });

    store = TestBed.inject(TaskStore);
  });

  // ─── Initial state ─────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with an empty task list', () => {
      expect(store.tasks()).toEqual([]);
    });

    it('starts with no loading or mutation flags set', () => {
      expect(store.isLoading()).toBe(false);
      expect(store.isMutating()).toBe(false);
      expect(store.isBusy()).toBe(false);
    });

    it('starts with no error', () => {
      expect(store.error()).toBeNull();
    });

    it('starts with default filters', () => {
      expect(store.filters().status).toBe(TaskFilterStatus.ALL);
      expect(store.filters().priority).toBe(TaskFilterPriority.ALL);
      expect(store.filters().assigneeId).toBeNull();
      expect(store.filters().search).toBe('');
    });

    it('starts with no selected task', () => {
      expect(store.selectedTask()).toBeNull();
      expect(store.selectedTaskId()).toBeNull();
    });
  });

  // ─── loadTasks ─────────────────────────────────────────────────────────

  describe('loadTasks()', () => {
    it('populates tasks from the API response', async () => {
      const task = makeTask();
      apiMock.getTasks.mockReturnValue(
        of({ tasks: [task], meta: { totalCount: 1, lastUpdated: '2026-01-01' } }),
      );

      store.loadTasks();
      await flushMicrotasks();

      expect(store.tasks()).toEqual([task]);
      expect(store.totalCount()).toBe(1);
      expect(store.lastUpdated()).toBe('2026-01-01');
      expect(store.isLoading()).toBe(false);
    });

    it('sets an error message when the API fails', async () => {
      apiMock.getTasks.mockReturnValue(throwError(() => new Error('Network failure')));

      store.loadTasks();
      await flushMicrotasks();

      expect(store.error()).toBe('Network failure');
      expect(store.isLoading()).toBe(false);
      expect(store.tasks()).toEqual([]);
    });
  });

  // ─── createTask ────────────────────────────────────────────────────────

  describe('createTask()', () => {
    it('appends the new task returned by the API', async () => {
      const created = makeTask({ id: 'task-new' });
      apiMock.createTask.mockReturnValue(of(created));
      apiMock.getTasks.mockReturnValue(
        of({ tasks: [makeTask()], meta: { totalCount: 1, lastUpdated: '' } }),
      );

      store.loadTasks();
      await flushMicrotasks();

      store.createTask({
        title: created.title,
        description: created.description,
        status: created.status,
        priority: created.priority,
        dueDate: created.dueDate,
        assignee: created.assignee,
        tags: created.tags,
      });
      await flushMicrotasks();

      expect(store.tasks().find((t) => t.id === 'task-new')).toBeDefined();
      expect(store.totalCount()).toBe(2);
      expect(store.isMutating()).toBe(false);
    });

    it('sets an error when creation fails', async () => {
      apiMock.createTask.mockReturnValue(throwError(() => new Error('Create failed')));

      store.createTask({
        title: 'x',
        description: '',
        status: TaskStatus.TODO,
        priority: TaskPriority.LOW,
        dueDate: '2099-01-01',
        assignee: { id: 'u1', name: 'Bob', avatar: 'BO', email: 'bob@test.com' },
        tags: [],
      });
      await flushMicrotasks();

      expect(store.error()).toBe('Create failed');
      expect(store.isMutating()).toBe(false);
    });
  });

  // ─── updateTask ────────────────────────────────────────────────────────

  describe('updateTask()', () => {
    it('replaces the task in the list with the API response', async () => {
      const original = makeTask();
      const updated = makeTask({ title: 'Updated title', status: TaskStatus.DONE });

      apiMock.getTasks.mockReturnValue(
        of({ tasks: [original], meta: { totalCount: 1, lastUpdated: '' } }),
      );
      apiMock.updateTask.mockReturnValue(of(updated));

      store.loadTasks();
      await flushMicrotasks();

      store.updateTask(original.id, updated as never);
      await flushMicrotasks();

      expect(store.tasks()[0]?.title).toBe('Updated title');
      expect(store.tasks()[0]?.status).toBe(TaskStatus.DONE);
    });
  });

  // ─── patchTask ─────────────────────────────────────────────────────────

  describe('patchTask()', () => {
    it('merges the patched task into the list', async () => {
      const original = makeTask();
      const patched = makeTask({ status: TaskStatus.IN_PROGRESS });

      apiMock.getTasks.mockReturnValue(
        of({ tasks: [original], meta: { totalCount: 1, lastUpdated: '' } }),
      );
      apiMock.patchTask.mockReturnValue(of(patched));

      store.loadTasks();
      await flushMicrotasks();

      store.patchTask(original.id, { status: TaskStatus.IN_PROGRESS });
      await flushMicrotasks();

      expect(store.tasks()[0]?.status).toBe(TaskStatus.IN_PROGRESS);
    });
  });

  // ─── deleteTask ────────────────────────────────────────────────────────

  describe('deleteTask()', () => {
    it('removes the task from the list', async () => {
      const task = makeTask();
      apiMock.getTasks.mockReturnValue(
        of({ tasks: [task], meta: { totalCount: 1, lastUpdated: '' } }),
      );
      apiMock.deleteTask.mockReturnValue(of(void 0));

      store.loadTasks();
      await flushMicrotasks();

      store.deleteTask(task.id);
      await flushMicrotasks();

      expect(store.tasks()).toHaveLength(0);
      expect(store.totalCount()).toBe(0);
    });

    it('clears the selection when the selected task is deleted', async () => {
      const task = makeTask();
      apiMock.getTasks.mockReturnValue(
        of({ tasks: [task], meta: { totalCount: 1, lastUpdated: '' } }),
      );
      apiMock.deleteTask.mockReturnValue(of(void 0));

      store.loadTasks();
      await flushMicrotasks();

      store.selectTask(task.id);
      expect(store.selectedTask()).toEqual(task);

      store.deleteTask(task.id);
      await flushMicrotasks();

      expect(store.selectedTask()).toBeNull();
    });
  });

  // ─── selectTask ────────────────────────────────────────────────────────

  describe('selectTask()', () => {
    it('sets selectedTask to the matching task', async () => {
      const task = makeTask();
      apiMock.getTasks.mockReturnValue(
        of({ tasks: [task], meta: { totalCount: 1, lastUpdated: '' } }),
      );

      store.loadTasks();
      await flushMicrotasks();

      store.selectTask(task.id);
      expect(store.selectedTask()).toEqual(task);
    });

    it('clears the selection when called with null', async () => {
      const task = makeTask();
      apiMock.getTasks.mockReturnValue(
        of({ tasks: [task], meta: { totalCount: 1, lastUpdated: '' } }),
      );

      store.loadTasks();
      await flushMicrotasks();

      store.selectTask(task.id);
      store.selectTask(null);
      expect(store.selectedTask()).toBeNull();
    });
  });

  // ─── Filters ───────────────────────────────────────────────────────────

  describe('setFilters() / resetFilters()', () => {
    it('filters tasks by status', async () => {
      const todo = makeTask({ id: '1', status: TaskStatus.TODO });
      const done = makeTask({ id: '2', status: TaskStatus.DONE });
      apiMock.getTasks.mockReturnValue(
        of({ tasks: [todo, done], meta: { totalCount: 2, lastUpdated: '' } }),
      );

      store.loadTasks();
      await flushMicrotasks();

      store.setFilters({ status: TaskFilterStatus.DONE });
      expect(store.filteredTasks()).toHaveLength(1);
      expect(store.filteredTasks()[0]?.id).toBe('2');
    });

    it('filters tasks by priority', async () => {
      const high = makeTask({ id: '1', priority: TaskPriority.HIGH });
      const low = makeTask({ id: '2', priority: TaskPriority.LOW });
      apiMock.getTasks.mockReturnValue(
        of({ tasks: [high, low], meta: { totalCount: 2, lastUpdated: '' } }),
      );

      store.loadTasks();
      await flushMicrotasks();

      store.setFilters({ priority: TaskFilterPriority.HIGH });
      expect(store.filteredTasks()).toHaveLength(1);
      expect(store.filteredTasks()[0]?.id).toBe('1');
    });

    it('filters tasks by search query (title and description)', async () => {
      const a = makeTask({ id: '1', title: 'Fix login bug', description: '' });
      const b = makeTask({ id: '2', title: 'Write tests', description: 'cover login logic' });
      const c = makeTask({ id: '3', title: 'Deploy to staging', description: '' });

      apiMock.getTasks.mockReturnValue(
        of({ tasks: [a, b, c], meta: { totalCount: 3, lastUpdated: '' } }),
      );

      store.loadTasks();
      await flushMicrotasks();

      store.setFilters({ search: 'login' });
      expect(store.filteredTasks()).toHaveLength(2);
    });

    it('resets all filters', async () => {
      store.setFilters({ status: TaskFilterStatus.DONE, search: 'test' });
      store.resetFilters();

      expect(store.filters().status).toBe(TaskFilterStatus.ALL);
      expect(store.filters().search).toBe('');
    });
  });

  // ─── stats ─────────────────────────────────────────────────────────────

  describe('stats computed', () => {
    it('computes correct aggregates', async () => {
      const pastDate = '2000-01-01';
      apiMock.getTasks.mockReturnValue(
        of({
          tasks: [
            makeTask({ id: '1', status: TaskStatus.TODO, dueDate: pastDate }),
            makeTask({ id: '2', status: TaskStatus.IN_PROGRESS, dueDate: '2099-01-01' }),
            makeTask({ id: '3', status: TaskStatus.DONE, dueDate: pastDate }),
          ],
          meta: { totalCount: 3, lastUpdated: '' },
        }),
      );

      store.loadTasks();
      await flushMicrotasks();

      const s = store.stats();
      expect(s.total).toBe(3);
      expect(s.todo).toBe(1);
      expect(s.inProgress).toBe(1);
      expect(s.done).toBe(1);
      // only the TODO task with past date is overdue (DONE is excluded)
      expect(s.overdue).toBe(1);
    });
  });

  // ─── clearError ────────────────────────────────────────────────────────

  describe('clearError()', () => {
    it('resets the error signal to null', async () => {
      apiMock.getTasks.mockReturnValue(throwError(() => new Error('oops')));
      store.loadTasks();
      await flushMicrotasks();

      expect(store.error()).toBe('oops');
      store.clearError();
      expect(store.error()).toBeNull();
    });
  });
});
