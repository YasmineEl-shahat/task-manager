import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '@env';
import { TaskPriority, TaskStatus } from '@tasks/models/task.enums';
import { Task } from '@tasks/models/task.model';
import { CreateTaskDto, UpdateTaskDto } from '@tasks/models/task.dto';
import { TasksResponse } from '@tasks/models/tasks-response.model';
import { TaskApiService } from './task-api.service';

const BASE_URL = `${environment.apiBaseUrl}/tasks`;

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    description: 'A task for testing',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: '2026-12-01',
    assignee: { id: 'user-1', name: 'Alice', avatar: 'AL', email: 'alice@example.com' },
    tags: [],
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeTasksResponse(tasks: Task[] = [makeTask()]): TasksResponse {
  return { tasks, meta: { totalCount: tasks.length, lastUpdated: '2026-11-01T00:00:00.000Z' } };
}

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('TaskApiService', () => {
  let service: TaskApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TaskApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(TaskApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ─── getTasks ─────────────────────────────────────────────────────────────

  describe('getTasks()', () => {
    it('sends GET to base URL and returns the envelope', () => {
      const response = makeTasksResponse();

      service.getTasks().subscribe((result) => {
        expect(result).toEqual(response);
      });

      const req = httpMock.expectOne(BASE_URL);
      expect(req.request.method).toBe('GET');
      req.flush(response);
    });

    it('appends provided query params to the request', () => {
      const response = makeTasksResponse();

      service.getTasks({ status: 'todo', priority: 'high' }).subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === BASE_URL && r.params.get('status') === 'todo' && r.params.get('priority') === 'high',
      );
      req.flush(response);
    });

    it('omits undefined / empty query params', () => {
      service.getTasks({ status: undefined, search: '' }).subscribe();

      const req = httpMock.expectOne(BASE_URL);
      expect(req.request.params.keys()).toHaveLength(0);
      req.flush(makeTasksResponse());
    });
  });

  // ─── getTaskById ──────────────────────────────────────────────────────────

  describe('getTaskById()', () => {
    it('sends GET to the correct URL and returns the task', () => {
      const task = makeTask();

      service.getTaskById('task-1').subscribe((result) => {
        expect(result).toEqual(task);
      });

      const req = httpMock.expectOne(`${BASE_URL}/task-1`);
      expect(req.request.method).toBe('GET');
      req.flush(task);
    });
  });

  // ─── createTask ───────────────────────────────────────────────────────────

  describe('createTask()', () => {
    it('sends POST with the DTO body and returns the created task', () => {
      const dto: CreateTaskDto = {
        title: 'New Task',
        description: 'desc',
        status: TaskStatus.TODO,
        priority: TaskPriority.LOW,
        dueDate: '2026-12-15',
        assignee: { id: 'user-2', name: 'Bob', avatar: 'BO', email: 'bob@example.com' },
        tags: ['feature'],
      };
      const created = makeTask({ ...dto, id: 'task-2' });

      service.createTask(dto).subscribe((result) => {
        expect(result).toEqual(created);
      });

      const req = httpMock.expectOne(BASE_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(created);
    });
  });

  // ─── updateTask ───────────────────────────────────────────────────────────

  describe('updateTask()', () => {
    it('sends PUT to the correct URL with the full payload', () => {
      const task = makeTask();
      const dto = task as unknown as CreateTaskDto;

      service.updateTask('task-1', dto).subscribe((result) => {
        expect(result).toEqual(task);
      });

      const req = httpMock.expectOne(`${BASE_URL}/task-1`);
      expect(req.request.method).toBe('PUT');
      req.flush(task);
    });
  });

  // ─── patchTask ────────────────────────────────────────────────────────────

  describe('patchTask()', () => {
    it('sends PATCH with partial payload and returns the updated task', () => {
      const patch: UpdateTaskDto = { status: TaskStatus.DONE };
      const updated = makeTask({ status: TaskStatus.DONE });

      service.patchTask('task-1', patch).subscribe((result) => {
        expect(result).toEqual(updated);
      });

      const req = httpMock.expectOne(`${BASE_URL}/task-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(patch);
      req.flush(updated);
    });
  });

  // ─── deleteTask ───────────────────────────────────────────────────────────

  describe('deleteTask()', () => {
    it('sends DELETE to the correct URL', () => {
      service.deleteTask('task-1').subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/task-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  // ─── Error handling ───────────────────────────────────────────────────────

  describe('error handling', () => {
    it('emits an Error with a connectivity message on network failure (status 0)', () => {
      service.getTasks().subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('Unable to reach the server');
        },
      });

      // Exhaust the retry(1) attempt
      httpMock.expectOne(BASE_URL).error(new ProgressEvent('error'));
      httpMock.expectOne(BASE_URL).error(new ProgressEvent('error'));
    });

    it('emits an Error with the server message on a 4xx / 5xx response', () => {
      service.getTaskById('missing').subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Task not found');
        },
      });

      const req = httpMock.expectOne(`${BASE_URL}/missing`);
      req.flush({ message: 'Task not found' }, { status: 404, statusText: 'Not Found' });
    });
  });
});
