import { provideHttpClient, withFetch } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '@env';
import { TaskFilterPriority, TaskFilterStatus, TaskPriority, TaskStatus } from '@tasks/models/task.enums';
import { Task } from '@tasks/models/task.model';
import { TaskApiService } from '@tasks/services/task-api.service';
import { TasksResponse } from '@tasks/models/tasks-response.model';
import { TaskStore } from './task.store';

const BASE_URL = `${environment.apiBaseUrl}/tasks`;

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

function makeResponse(tasks: Task[]): TasksResponse {
  return { tasks, meta: { totalCount: tasks.length, lastUpdated: '2026-01-01' } };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Drains the microtask queue (Promises, fetch callbacks, signal effect schedules).
 * Multiple rounds are needed because each microtask can enqueue more microtasks.
 */
async function drainMicrotasks(rounds = 5): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
  }
}

/**
 * Flushes the GET /tasks request that `httpResource` fires, feeds it the given
 * response, then drains microtasks + flushes signal effects so store signals
 * reflect the new data before assertions.
 *
 * Always `await` this helper to get correct signal values after the response.
 */
async function flushTaskList(httpMock: HttpTestingController, tasks: Task[] = []): Promise<void> {
  // Let httpResource's internal effect schedule the HTTP request
  TestBed.flushEffects();
  await drainMicrotasks();

  const req = httpMock.expectOne((r) => r.url === BASE_URL && r.method === 'GET');
  req.flush(makeResponse(tasks));

  // Drain microtasks so the fetch-based HttpClient resolves the response
  await drainMicrotasks();
  // Run effects so signal writes from the resource propagate
  TestBed.flushEffects();
  await drainMicrotasks();
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('TaskStore', () => {
  let store: TaskStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TaskStore,
        TaskApiService,
        provideHttpClient(withFetch()),
        provideHttpClientTesting(),
      ],
    });

    store = TestBed.inject(TaskStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ─── Initial state ────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('fires a GET request on creation and populates tasks', async () => {
      await flushTaskList(httpMock, [makeTask()]);
      expect(store.tasks()).toHaveLength(1);
      expect(store.isLoading()).toBe(false);
    });

    it('starts with an empty task list while loading', async () => {
      // Resource is loading; don't flush yet
      expect(store.tasks()).toEqual([]);
      expect(store.isLoading()).toBe(true);
      await flushTaskList(httpMock);
    });

    it('starts with default filters', async () => {
      expect(store.filters().status).toBe(TaskFilterStatus.ALL);
      expect(store.filters().priority).toBe(TaskFilterPriority.ALL);
      expect(store.filters().assigneeId).toBeNull();
      expect(store.filters().search).toBe('');
      await flushTaskList(httpMock);
    });

    it('starts with no selected task', async () => {
      expect(store.selectedTask()).toBeNull();
      expect(store.selectedTaskId()).toBeNull();
      await flushTaskList(httpMock);
    });

    it('starts with no mutation error', async () => {
      expect(store.error()).toBeNull();
      await flushTaskList(httpMock);
    });
  });

  // ─── httpResource — task list ─────────────────────────────────────────────

  describe('httpResource (task list)', () => {
    it('populates tasks and meta from the API response', async () => {
      await flushTaskList(httpMock, [makeTask()]);

      expect(store.tasks()).toHaveLength(1);
      expect(store.totalCount()).toBe(1);
      expect(store.lastUpdated()).toBe('2026-01-01');
    });

    it('re-fetches when filters change (passes only non-ALL params)', async () => {
      await flushTaskList(httpMock);

      store.setFilters({ status: TaskFilterStatus.DONE });
      TestBed.flushEffects();
      await drainMicrotasks();

      // New request must include status=done
      const req = httpMock.expectOne(
        (r) => r.url === BASE_URL && r.params.get('status') === 'done',
      );
      req.flush(makeResponse([]));
      await drainMicrotasks();
      TestBed.flushEffects();
    });

    it('does not send status/priority params when set to ALL', async () => {
      TestBed.flushEffects();
      await drainMicrotasks();

      const req = httpMock.expectOne((r) => r.url === BASE_URL);
      expect(req.request.params.has('status')).toBe(false);
      expect(req.request.params.has('priority')).toBe(false);
      req.flush(makeResponse([]));
    });

    it('surfaces the resource error message via error()', async () => {
      TestBed.flushEffects();
      await drainMicrotasks();

      const req = httpMock.expectOne((r) => r.url === BASE_URL);
      req.flush({ message: 'Internal Error' }, { status: 500, statusText: 'Server Error' });
      await drainMicrotasks();
      TestBed.flushEffects();
      await drainMicrotasks();

      expect(store.error()).toBeTruthy();
    });

    it('reload() triggers a fresh GET request', async () => {
      await flushTaskList(httpMock);

      store.reload();
      await flushTaskList(httpMock, [makeTask()]);

      expect(store.tasks()).toHaveLength(1);
    });
  });

  // ─── httpResource — selected task ─────────────────────────────────────────

  describe('httpResource (selected task)', () => {
    it('fires GET /tasks/:id when a task is selected', async () => {
      await flushTaskList(httpMock);

      store.selectTask('task-1');
      TestBed.flushEffects();
      await drainMicrotasks();

      const req = httpMock.expectOne(`${BASE_URL}/task-1`);
      expect(req.request.method).toBe('GET');
      req.flush(makeTask());
      await drainMicrotasks();
      TestBed.flushEffects();
      await drainMicrotasks();

      expect(store.selectedTask()?.id).toBe('task-1');
    });

    it('clears selectedTask when selectTask(null) is called', async () => {
      await flushTaskList(httpMock);

      store.selectTask('task-1');
      TestBed.flushEffects();
      await drainMicrotasks();
      httpMock.expectOne(`${BASE_URL}/task-1`).flush(makeTask());

      store.selectTask(null);
      TestBed.flushEffects();

      expect(store.selectedTask()).toBeNull();
      expect(store.selectedTaskId()).toBeNull();
    });
  });

  // ─── Mutations ────────────────────────────────────────────────────────────

  describe('createTask()', () => {
    it('POSTs the DTO and reloads the task list', async () => {
      await flushTaskList(httpMock);

      store.createTask({
        title: 'New', description: '', status: TaskStatus.TODO, priority: TaskPriority.LOW,
        dueDate: '2099-01-01',
        assignee: { id: 'u1', name: 'Bob', avatar: 'BO', email: 'b@test.com' },
        tags: [],
      });

      await drainMicrotasks();

      const post = httpMock.expectOne((r) => r.method === 'POST' && r.url === BASE_URL);
      post.flush(makeTask({ id: 'task-new' }));

      await drainMicrotasks();

      // Store reloads after create
      await flushTaskList(httpMock, [makeTask(), makeTask({ id: 'task-new' })]);

      expect(store.tasks()).toHaveLength(2);
      expect(store.isMutating()).toBe(false);
    });

    it('sets mutation error when POST fails', async () => {
      await flushTaskList(httpMock);

      store.createTask({
        title: 'x', description: '', status: TaskStatus.TODO, priority: TaskPriority.LOW,
        dueDate: '2099-01-01',
        assignee: { id: 'u1', name: 'Bob', avatar: 'BO', email: 'b@test.com' },
        tags: [],
      });

      await drainMicrotasks();

      httpMock
        .expectOne((r) => r.method === 'POST')
        .flush({ message: 'Validation error' }, { status: 422, statusText: 'Unprocessable' });

      await drainMicrotasks();

      expect(store.error()).toBe('Validation error');
      expect(store.isMutating()).toBe(false);
    });
  });

  describe('updateTask()', () => {
    it('PUTs to /tasks/:id and reloads', async () => {
      await flushTaskList(httpMock, [makeTask()]);

      store.updateTask('task-1', makeTask({ title: 'Updated' }) as never);

      await drainMicrotasks();

      httpMock
        .expectOne((r) => r.method === 'PUT' && r.url === `${BASE_URL}/task-1`)
        .flush(makeTask({ title: 'Updated' }));

      await drainMicrotasks();

      await flushTaskList(httpMock, [makeTask({ title: 'Updated' })]);
      expect(store.tasks()[0]?.title).toBe('Updated');
    });
  });

  describe('patchTask()', () => {
    it('PATCHes /tasks/:id and reloads', async () => {
      await flushTaskList(httpMock, [makeTask()]);

      store.patchTask('task-1', { status: TaskStatus.IN_PROGRESS });

      await drainMicrotasks();

      httpMock
        .expectOne((r) => r.method === 'PATCH' && r.url === `${BASE_URL}/task-1`)
        .flush(makeTask({ status: TaskStatus.IN_PROGRESS }));

      await drainMicrotasks();

      await flushTaskList(httpMock, [makeTask({ status: TaskStatus.IN_PROGRESS })]);
      expect(store.tasks()[0]?.status).toBe(TaskStatus.IN_PROGRESS);
    });
  });

  describe('deleteTask()', () => {
    it('DELETEs /tasks/:id, clears selection, and reloads', async () => {
      await flushTaskList(httpMock, [makeTask()]);

      store.selectTask('task-1');
      TestBed.flushEffects();
      await drainMicrotasks();
      httpMock.expectOne(`${BASE_URL}/task-1`).flush(makeTask());

      store.deleteTask('task-1');

      await drainMicrotasks();

      httpMock
        .expectOne((r) => r.method === 'DELETE' && r.url === `${BASE_URL}/task-1`)
        .flush(null);

      await drainMicrotasks();

      await flushTaskList(httpMock, []);

      expect(store.tasks()).toHaveLength(0);
      expect(store.selectedTaskId()).toBeNull();
    });
  });

  // ─── Filters ──────────────────────────────────────────────────────────────

  describe('setFilters() / resetFilters()', () => {
    it('filters the client-side list by status', async () => {
      await flushTaskList(httpMock, [
        makeTask({ id: '1', status: TaskStatus.TODO }),
        makeTask({ id: '2', status: TaskStatus.DONE }),
      ]);

      store.setFilters({ status: TaskFilterStatus.DONE });
      TestBed.flushEffects();
      await drainMicrotasks();

      // Flush the re-fetch triggered by filter change
      const req = httpMock.expectOne((r) => r.url === BASE_URL && r.params.get('status') === 'done');
      req.flush(makeResponse([makeTask({ id: '2', status: TaskStatus.DONE })]));
      await drainMicrotasks();
      TestBed.flushEffects();
      await drainMicrotasks();

      expect(store.filteredTasks()).toHaveLength(1);
      expect(store.filteredTasks()[0]?.id).toBe('2');
    });

    it('filters by search query client-side', async () => {
      await flushTaskList(httpMock, [
        makeTask({ id: '1', title: 'Fix login bug' }),
        makeTask({ id: '2', title: 'Write docs' }),
      ]);

      store.setFilters({ search: 'login' });
      TestBed.flushEffects();
      await drainMicrotasks();

      // Flush re-fetch (server also gets search param)
      const req = httpMock.expectOne((r) => r.url === BASE_URL && r.params.get('search') === 'login');
      req.flush(makeResponse([makeTask({ id: '1', title: 'Fix login bug' })]));
      await drainMicrotasks();
      TestBed.flushEffects();
      await drainMicrotasks();

      expect(store.filteredTasks()).toHaveLength(1);
    });

    it('resetFilters() clears all active filters', async () => {
      await flushTaskList(httpMock);

      store.setFilters({ status: TaskFilterStatus.DONE, search: 'test' });
      TestBed.flushEffects();
      await drainMicrotasks();

      // Flush the re-fetch after setFilters
      httpMock.expectOne((r) => r.url === BASE_URL).flush(makeResponse([]));
      await drainMicrotasks();

      store.resetFilters();
      TestBed.flushEffects();
      await drainMicrotasks();

      // Another re-fetch after reset
      httpMock.expectOne((r) => r.url === BASE_URL).flush(makeResponse([]));

      expect(store.filters().status).toBe(TaskFilterStatus.ALL);
      expect(store.filters().search).toBe('');
    });
  });

  // ─── stats ────────────────────────────────────────────────────────────────

  describe('stats computed', () => {
    it('computes correct aggregates', async () => {
      const pastDate = '2000-01-01';
      await flushTaskList(httpMock, [
        makeTask({ id: '1', status: TaskStatus.TODO, dueDate: pastDate }),
        makeTask({ id: '2', status: TaskStatus.IN_PROGRESS, dueDate: '2099-01-01' }),
        makeTask({ id: '3', status: TaskStatus.DONE, dueDate: pastDate }),
      ]);

      const s = store.stats();
      expect(s.total).toBe(3);
      expect(s.todo).toBe(1);
      expect(s.inProgress).toBe(1);
      expect(s.done).toBe(1);
      expect(s.overdue).toBe(1); // only TODO with past date; DONE is excluded
    });
  });

  // ─── clearError ───────────────────────────────────────────────────────────

  describe('clearError()', () => {
    it('resets the mutation error to null', async () => {
      await flushTaskList(httpMock);

      store.createTask({
        title: 'x', description: '', status: TaskStatus.TODO, priority: TaskPriority.LOW,
        dueDate: '2099-01-01',
        assignee: { id: 'u1', name: 'Bob', avatar: 'BO', email: 'b@test.com' },
        tags: [],
      });

      await drainMicrotasks();

      httpMock
        .expectOne((r) => r.method === 'POST')
        .flush({ message: 'oops' }, { status: 500, statusText: 'Error' });

      await drainMicrotasks();

      expect(store.error()).toBe('oops');

      store.clearError();
      expect(store.error()).toBeNull();
    });
  });
});
