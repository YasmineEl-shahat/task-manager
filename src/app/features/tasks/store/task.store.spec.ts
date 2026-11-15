import { provideHttpClient, withFetch } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '@env';
import { TaskPriority, TaskStatus, TaskFilterStatus, TaskFilterPriority } from '@tasks/models/task.enums';
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
 * Flushes the initial GET /tasks request that `httpResource` fires as soon as
 * the store is created, then processes any pending signal effects.
 */
function flushTaskList(httpMock: HttpTestingController, tasks: Task[] = []): void {
  TestBed.flushEffects(); // let httpResource schedule the request
  const req = httpMock.expectOne((r) => r.url === BASE_URL && r.method === 'GET');
  req.flush(makeResponse(tasks));
  TestBed.flushEffects(); // propagate the response into signals
}

/** Waits one microtask tick so RxJS pipelines and signal writes settle. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
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
    it('fires a GET request on creation and populates tasks', () => {
      flushTaskList(httpMock, [makeTask()]);
      expect(store.tasks()).toHaveLength(1);
      expect(store.isLoading()).toBe(false);
    });

    it('starts with an empty task list while loading', () => {
      // Resource is loading; don't flush yet
      expect(store.tasks()).toEqual([]);
      expect(store.isLoading()).toBe(true);
      flushTaskList(httpMock);
    });

    it('starts with default filters', () => {
      expect(store.filters().status).toBe(TaskFilterStatus.ALL);
      expect(store.filters().priority).toBe(TaskFilterPriority.ALL);
      expect(store.filters().assigneeId).toBeNull();
      expect(store.filters().search).toBe('');
      flushTaskList(httpMock);
    });

    it('starts with no selected task', () => {
      expect(store.selectedTask()).toBeNull();
      expect(store.selectedTaskId()).toBeNull();
      flushTaskList(httpMock);
    });

    it('starts with no mutation error', () => {
      expect(store.error()).toBeNull();
      flushTaskList(httpMock);
    });
  });

  // ─── httpResource — task list ─────────────────────────────────────────────

  describe('httpResource (task list)', () => {
    it('populates tasks and meta from the API response', () => {
      flushTaskList(httpMock, [makeTask()]);

      expect(store.tasks()).toHaveLength(1);
      expect(store.totalCount()).toBe(1);
      expect(store.lastUpdated()).toBe('2026-01-01');
    });

    it('re-fetches when filters change (passes only non-ALL params)', () => {
      flushTaskList(httpMock);

      store.setFilters({ status: TaskFilterStatus.DONE });
      TestBed.flushEffects(); // let httpResource react to the signal change

      // New request must include status=done
      const req = httpMock.expectOne(
        (r) => r.url === BASE_URL && r.params.get('status') === 'done',
      );
      req.flush(makeResponse([]));
      TestBed.flushEffects();
    });

    it('does not send status/priority params when set to ALL', () => {
      const req = httpMock.expectOne((r) => r.url === BASE_URL);
      expect(req.request.params.has('status')).toBe(false);
      expect(req.request.params.has('priority')).toBe(false);
      req.flush(makeResponse([]));
    });

    it('surfaces the resource error message via error()', () => {
      const req = httpMock.expectOne((r) => r.url === BASE_URL);
      req.flush({ message: 'Internal Error' }, { status: 500, statusText: 'Server Error' });
      TestBed.flushEffects();

      expect(store.error()).toBeTruthy();
    });

    it('reload() triggers a fresh GET request', () => {
      flushTaskList(httpMock);

      store.reload();
      flushTaskList(httpMock, [makeTask()]);

      expect(store.tasks()).toHaveLength(1);
    });
  });

  // ─── httpResource — selected task ─────────────────────────────────────────

  describe('httpResource (selected task)', () => {
    it('fires GET /tasks/:id when a task is selected', () => {
      flushTaskList(httpMock);

      store.selectTask('task-1');
      TestBed.flushEffects();

      const req = httpMock.expectOne(`${BASE_URL}/task-1`);
      expect(req.request.method).toBe('GET');
      req.flush(makeTask());
      TestBed.flushEffects();

      expect(store.selectedTask()?.id).toBe('task-1');
    });

    it('clears selectedTask when selectTask(null) is called', () => {
      flushTaskList(httpMock);

      store.selectTask('task-1');
      TestBed.flushEffects();
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
      flushTaskList(httpMock);

      store.createTask({
        title: 'New', description: '', status: TaskStatus.TODO, priority: TaskPriority.LOW,
        dueDate: '2099-01-01',
        assignee: { id: 'u1', name: 'Bob', avatar: 'BO', email: 'b@test.com' },
        tags: [],
      });

      await flush();

      const post = httpMock.expectOne((r) => r.method === 'POST' && r.url === BASE_URL);
      post.flush(makeTask({ id: 'task-new' }));

      await flush();

      // Store reloads after create
      flushTaskList(httpMock, [makeTask(), makeTask({ id: 'task-new' })]);

      expect(store.tasks()).toHaveLength(2);
      expect(store.isMutating()).toBe(false);
    });

    it('sets mutation error when POST fails', async () => {
      flushTaskList(httpMock);

      store.createTask({
        title: 'x', description: '', status: TaskStatus.TODO, priority: TaskPriority.LOW,
        dueDate: '2099-01-01',
        assignee: { id: 'u1', name: 'Bob', avatar: 'BO', email: 'b@test.com' },
        tags: [],
      });

      await flush();

      httpMock
        .expectOne((r) => r.method === 'POST')
        .flush({ message: 'Validation error' }, { status: 422, statusText: 'Unprocessable' });

      await flush();

      expect(store.error()).toBe('Validation error');
      expect(store.isMutating()).toBe(false);
    });
  });

  describe('updateTask()', () => {
    it('PUTs to /tasks/:id and reloads', async () => {
      flushTaskList(httpMock, [makeTask()]);

      store.updateTask('task-1', makeTask({ title: 'Updated' }) as never);

      await flush();

      httpMock
        .expectOne((r) => r.method === 'PUT' && r.url === `${BASE_URL}/task-1`)
        .flush(makeTask({ title: 'Updated' }));

      await flush();

      flushTaskList(httpMock, [makeTask({ title: 'Updated' })]);
      expect(store.tasks()[0]?.title).toBe('Updated');
    });
  });

  describe('patchTask()', () => {
    it('PATCHes /tasks/:id and reloads', async () => {
      flushTaskList(httpMock, [makeTask()]);

      store.patchTask('task-1', { status: TaskStatus.IN_PROGRESS });

      await flush();

      httpMock
        .expectOne((r) => r.method === 'PATCH' && r.url === `${BASE_URL}/task-1`)
        .flush(makeTask({ status: TaskStatus.IN_PROGRESS }));

      await flush();

      flushTaskList(httpMock, [makeTask({ status: TaskStatus.IN_PROGRESS })]);
      expect(store.tasks()[0]?.status).toBe(TaskStatus.IN_PROGRESS);
    });
  });

  describe('deleteTask()', () => {
    it('DELETEs /tasks/:id, clears selection, and reloads', async () => {
      flushTaskList(httpMock, [makeTask()]);

      store.selectTask('task-1');
      TestBed.flushEffects();
      httpMock.expectOne(`${BASE_URL}/task-1`).flush(makeTask());

      store.deleteTask('task-1');

      await flush();

      httpMock
        .expectOne((r) => r.method === 'DELETE' && r.url === `${BASE_URL}/task-1`)
        .flush(null);

      await flush();

      flushTaskList(httpMock, []);

      expect(store.tasks()).toHaveLength(0);
      expect(store.selectedTaskId()).toBeNull();
    });
  });

  // ─── Filters ──────────────────────────────────────────────────────────────

  describe('setFilters() / resetFilters()', () => {
    it('filters the client-side list by status', () => {
      flushTaskList(httpMock, [
        makeTask({ id: '1', status: TaskStatus.TODO }),
        makeTask({ id: '2', status: TaskStatus.DONE }),
      ]);
      TestBed.flushEffects();

      store.setFilters({ status: TaskFilterStatus.DONE });
      TestBed.flushEffects();

      // Flush the re-fetch triggered by filter change
      httpMock
        .expectOne((r) => r.url === BASE_URL && r.params.get('status') === 'done')
        .flush(makeResponse([makeTask({ id: '2', status: TaskStatus.DONE })]));
      TestBed.flushEffects();

      expect(store.filteredTasks()).toHaveLength(1);
      expect(store.filteredTasks()[0]?.id).toBe('2');
    });

    it('filters by search query client-side', () => {
      flushTaskList(httpMock, [
        makeTask({ id: '1', title: 'Fix login bug' }),
        makeTask({ id: '2', title: 'Write docs' }),
      ]);

      store.setFilters({ search: 'login' });
      TestBed.flushEffects();

      // Flush re-fetch (server also gets search param)
      httpMock
        .expectOne((r) => r.url === BASE_URL && r.params.get('search') === 'login')
        .flush(makeResponse([makeTask({ id: '1', title: 'Fix login bug' })]));
      TestBed.flushEffects();

      expect(store.filteredTasks()).toHaveLength(1);
    });

    it('resetFilters() clears all active filters', () => {
      flushTaskList(httpMock);

      store.setFilters({ status: TaskFilterStatus.DONE, search: 'test' });
      TestBed.flushEffects();

      // Flush the re-fetch after setFilters
      httpMock.expectOne((r) => r.url === BASE_URL).flush(makeResponse([]));

      store.resetFilters();
      TestBed.flushEffects();

      // Another re-fetch after reset
      httpMock.expectOne((r) => r.url === BASE_URL).flush(makeResponse([]));

      expect(store.filters().status).toBe(TaskFilterStatus.ALL);
      expect(store.filters().search).toBe('');
    });
  });

  // ─── stats ────────────────────────────────────────────────────────────────

  describe('stats computed', () => {
    it('computes correct aggregates', () => {
      const pastDate = '2000-01-01';
      flushTaskList(httpMock, [
        makeTask({ id: '1', status: TaskStatus.TODO, dueDate: pastDate }),
        makeTask({ id: '2', status: TaskStatus.IN_PROGRESS, dueDate: '2099-01-01' }),
        makeTask({ id: '3', status: TaskStatus.DONE, dueDate: pastDate }),
      ]);
      TestBed.flushEffects();

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
      flushTaskList(httpMock);

      store.createTask({
        title: 'x', description: '', status: TaskStatus.TODO, priority: TaskPriority.LOW,
        dueDate: '2099-01-01',
        assignee: { id: 'u1', name: 'Bob', avatar: 'BO', email: 'b@test.com' },
        tags: [],
      });

      await flush();

      httpMock
        .expectOne((r) => r.method === 'POST')
        .flush({ message: 'oops' }, { status: 500, statusText: 'Error' });

      await flush();

      expect(store.error()).toBe('oops');

      store.clearError();
      expect(store.error()).toBeNull();
    });
  });
});
