import { provideHttpClient, withFetch } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '@env';
import { TaskPriority, TaskStatus } from '@tasks/models/task.enums';
import { Task } from '@tasks/models/task.model';
import { CreateTaskDto, UpdateTaskDto } from '@tasks/models/task.dto';
import { ActivityAction, TaskActivity } from '@tasks/models/task-activity.model';
import { TaskApiService } from './task-api.service';

const BASE_URL = `${environment.apiBaseUrl}/tasks`;
const ACTIVITIES_URL = `${environment.apiBaseUrl}/activities`;

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

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('TaskApiService — mutations', () => {
  let service: TaskApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TaskApiService, provideHttpClient(withFetch()), provideHttpClientTesting()],
    });

    service = TestBed.inject(TaskApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

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

  // ─── Activities ──────────────────────────────────────────────────────────

  describe('getActivities()', () => {
    it('sends GET to activitiesUrl and returns the list of activities', () => {
      const mockActivities: TaskActivity[] = [
        {
          id: 'act-1',
          taskId: 'task-1',
          taskTitle: 'Test Task',
          action: ActivityAction.CREATED,
          performedBy: 'Alice',
          description: 'Created task "Test Task"',
          createdAt: '2026-11-17T00:00:00.000Z',
        },
      ];

      service.getActivities().subscribe((result) => {
        expect(result).toEqual(mockActivities);
      });

      const req = httpMock.expectOne(ACTIVITIES_URL);
      expect(req.request.method).toBe('GET');
      req.flush(mockActivities);
    });
  });

  describe('logActivity()', () => {
    it('sends POST to activitiesUrl with payload and returns created activity', () => {
      const payload: Partial<TaskActivity> = {
        taskId: 'task-1',
        taskTitle: 'Test Task',
        action: ActivityAction.UPDATED,
        performedBy: 'Alice',
        description: 'Updated task',
      };
      const created: TaskActivity = {
        id: 'act-new',
        taskId: 'task-1',
        taskTitle: 'Test Task',
        action: ActivityAction.UPDATED,
        performedBy: 'Alice',
        description: 'Updated task',
        createdAt: '2026-11-17T00:00:00.000Z',
      };

      service.logActivity(payload).subscribe((result) => {
        expect(result).toEqual(created);
      });

      const req = httpMock.expectOne(ACTIVITIES_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(created);
    });
  });

  // ─── Error handling ───────────────────────────────────────────────────────

  describe('error handling', () => {
    it('emits an Error with a connectivity message on network failure (status 0)', () => {
      service
        .createTask({
          title: 'x',
          description: '',
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          dueDate: '2099-01-01',
          assignee: { id: 'u1', name: 'Bob', avatar: 'BO', email: 'bob@test.com' },
          tags: [],
        })
        .subscribe({
          error: (err: Error) => {
            expect(err.message).toContain('Unable to reach the server');
          },
        });

      httpMock.expectOne(BASE_URL).error(new ProgressEvent('error'));
    });

    it('emits an Error with the server message on a 4xx / 5xx response', () => {
      service.deleteTask('missing').subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Task not found');
        },
      });

      const req = httpMock.expectOne(`${BASE_URL}/missing`);
      req.flush({ message: 'Task not found' }, { status: 404, statusText: 'Not Found' });
    });
  });
});
