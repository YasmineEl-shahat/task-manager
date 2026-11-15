import {
  computed,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { exhaustMap, switchMap, tap } from 'rxjs/operators';

import { CreateTaskDto, UpdateTaskDto } from '@tasks/models/task.dto';
import { INITIAL_TASK_FILTERS, TaskFilters } from '@tasks/models/task-filter.model';
import { TaskFilterPriority, TaskFilterStatus } from '@tasks/models/task.enums';
import { Task } from '@tasks/models/task.model';
import { TaskApiService, TaskQueryParams } from '@tasks/services/task-api.service';

// ─── State shape ─────────────────────────────────────────────────────────────

export interface TaskState {
  tasks: Task[];
  filters: TaskFilters;
  selectedTaskId: string | null;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  totalCount: number;
  lastUpdated: string | null;
}

const INITIAL_STATE: TaskState = {
  tasks: [],
  filters: INITIAL_TASK_FILTERS,
  selectedTaskId: null,
  isLoading: false,
  isMutating: false,
  error: null,
  totalCount: 0,
  lastUpdated: null,
};

// ─── Store ───────────────────────────────────────────────────────────────────

/**
 * Signal-based store for the Task feature.
 *
 * Responsibilities:
 * - Holds all task state as fine-grained signals
 * - Exposes derived `computed` signals (filtered list, stats, selected task)
 * - Coordinates async CRUD through RxJS pipelines that write back into signals
 * - Keeps the `TaskApiService` as the single data-access layer
 *
 * Design decisions:
 * - `switchMap` for reads (cancels in-flight requests when filters change)
 * - `exhaustMap` for mutations (ignores duplicate triggers while in flight)
 * - `takeUntilDestroyed` for automatic subscription cleanup
 */
@Injectable({ providedIn: 'root' })
export class TaskStore {
  private readonly api = inject(TaskApiService);

  // ─── Private writable state ──────────────────────────────────────────────

  private readonly _tasks = signal<Task[]>(INITIAL_STATE.tasks);
  private readonly _filters = signal<TaskFilters>(INITIAL_STATE.filters);
  private readonly _selectedTaskId = signal<string | null>(INITIAL_STATE.selectedTaskId);
  private readonly _isLoading = signal(INITIAL_STATE.isLoading);
  private readonly _isMutating = signal(INITIAL_STATE.isMutating);
  private readonly _error = signal<string | null>(INITIAL_STATE.error);
  private readonly _totalCount = signal(INITIAL_STATE.totalCount);
  private readonly _lastUpdated = signal<string | null>(INITIAL_STATE.lastUpdated);

  // ─── Public read-only signals ────────────────────────────────────────────

  readonly tasks = this._tasks.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly selectedTaskId = this._selectedTaskId.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isMutating = this._isMutating.asReadonly();
  readonly error = this._error.asReadonly();
  readonly totalCount = this._totalCount.asReadonly();
  readonly lastUpdated = this._lastUpdated.asReadonly();

  // ─── Derived / computed signals ──────────────────────────────────────────

  /**
   * Client-side filtered + searched slice of the task list.
   * Used when the API returns a full list and filtering is done locally.
   */
  readonly filteredTasks = computed(() => {
    const tasks = this._tasks();
    const { status, priority, assigneeId, search } = this._filters();
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesStatus =
        status === TaskFilterStatus.ALL ||
        (task.status as unknown as TaskFilterStatus) === status;

      const matchesPriority =
        priority === TaskFilterPriority.ALL ||
        (task.priority as unknown as TaskFilterPriority) === priority;

      const matchesAssignee =
        assigneeId === null || task.assignee.id === assigneeId;

      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query);

      return matchesStatus && matchesPriority && matchesAssignee && matchesSearch;
    });
  });

  /** Currently selected task entity, or `null` when nothing is selected. */
  readonly selectedTask = computed(() => {
    const id = this._selectedTaskId();
    return id ? (this._tasks().find((t) => t.id === id) ?? null) : null;
  });

  /** Aggregate statistics derived from the full task list. */
  readonly stats = computed(() => {
    const tasks = this._tasks();
    const now = new Date();

    return {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      done: tasks.filter((t) => t.status === 'done').length,
      overdue: tasks.filter((t) => {
        if (t.status === 'done') return false;
        const due = new Date(`${t.dueDate}T00:00:00`);
        return !Number.isNaN(due.getTime()) && due < now;
      }).length,
    };
  });

  /** `true` while either a load or a mutation is in progress. */
  readonly isBusy = computed(() => this._isLoading() || this._isMutating());

  // ─── Action subjects (RxJS pipelines) ────────────────────────────────────

  private readonly loadTasks$ = new Subject<TaskQueryParams | undefined>();
  private readonly createTask$ = new Subject<CreateTaskDto>();
  private readonly updateTask$ = new Subject<{ id: string; dto: CreateTaskDto }>();
  private readonly patchTask$ = new Subject<{ id: string; dto: UpdateTaskDto }>();
  private readonly deleteTask$ = new Subject<string>();

  // ─── Constructor — wire up pipelines ─────────────────────────────────────

  constructor() {
    this.registerLoadPipeline();
    this.registerCreatePipeline();
    this.registerUpdatePipeline();
    this.registerPatchPipeline();
    this.registerDeletePipeline();
  }

  // ─── Public command API ──────────────────────────────────────────────────

  /** Triggers a (re)load of tasks from the API. */
  loadTasks(params?: TaskQueryParams): void {
    this.loadTasks$.next(params);
  }

  /** Creates a new task; optimistically adds it after the API confirms. */
  createTask(dto: CreateTaskDto): void {
    this.createTask$.next(dto);
  }

  /** Fully replaces an existing task. */
  updateTask(id: string, dto: CreateTaskDto): void {
    this.updateTask$.next({ id, dto });
  }

  /** Partially updates an existing task. */
  patchTask(id: string, dto: UpdateTaskDto): void {
    this.patchTask$.next({ id, dto });
  }

  /** Deletes a task by ID. */
  deleteTask(id: string): void {
    this.deleteTask$.next(id);
  }

  /** Selects a task by ID (or clears selection when `null`). */
  selectTask(id: string | null): void {
    this._selectedTaskId.set(id);
  }

  /** Updates one or more filter fields. */
  setFilters(partial: Partial<TaskFilters>): void {
    this._filters.update((current) => ({ ...current, ...partial }));
  }

  /** Resets all filters to their initial values. */
  resetFilters(): void {
    this._filters.set(INITIAL_TASK_FILTERS);
  }

  /** Clears the current error state. */
  clearError(): void {
    this._error.set(null);
  }

  // ─── Private pipeline registrations ──────────────────────────────────────

  /**
   * Load pipeline — uses `switchMap` so a new trigger cancels any in-flight request.
   */
  private registerLoadPipeline(): void {
    this.loadTasks$
      .pipe(
        tap(() => {
          this._isLoading.set(true);
          this._error.set(null);
        }),
        switchMap((params) => this.api.getTasks(params)),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (response) => {
          this._tasks.set(response.tasks);
          this._totalCount.set(response.meta.totalCount);
          this._lastUpdated.set(response.meta.lastUpdated);
          this._isLoading.set(false);
        },
        error: (err: Error) => {
          this._error.set(err.message);
          this._isLoading.set(false);
        },
      });
  }

  /**
   * Create pipeline — uses `exhaustMap` to prevent duplicate submissions
   * while a request is already in flight.
   */
  private registerCreatePipeline(): void {
    this.createTask$
      .pipe(
        tap(() => {
          this._isMutating.set(true);
          this._error.set(null);
        }),
        exhaustMap((dto) => this.api.createTask(dto)),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (task) => {
          this._tasks.update((tasks) => [...tasks, task]);
          this._totalCount.update((n) => n + 1);
          this._isMutating.set(false);
        },
        error: (err: Error) => {
          this._error.set(err.message);
          this._isMutating.set(false);
        },
      });
  }

  /**
   * Full-update (PUT) pipeline.
   */
  private registerUpdatePipeline(): void {
    this.updateTask$
      .pipe(
        tap(() => {
          this._isMutating.set(true);
          this._error.set(null);
        }),
        exhaustMap(({ id, dto }) => this.api.updateTask(id, dto)),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (updated) => {
          this._tasks.update((tasks) =>
            tasks.map((t) => (t.id === updated.id ? updated : t)),
          );
          this._isMutating.set(false);
        },
        error: (err: Error) => {
          this._error.set(err.message);
          this._isMutating.set(false);
        },
      });
  }

  /**
   * Partial-update (PATCH) pipeline.
   */
  private registerPatchPipeline(): void {
    this.patchTask$
      .pipe(
        tap(() => {
          this._isMutating.set(true);
          this._error.set(null);
        }),
        exhaustMap(({ id, dto }) => this.api.patchTask(id, dto)),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (updated) => {
          this._tasks.update((tasks) =>
            tasks.map((t) => (t.id === updated.id ? updated : t)),
          );
          this._isMutating.set(false);
        },
        error: (err: Error) => {
          this._error.set(err.message);
          this._isMutating.set(false);
        },
      });
  }

  /**
   * Delete pipeline — optimistically removes the task from local state
   * after the API confirms deletion.
   */
  private registerDeletePipeline(): void {
    this.deleteTask$
      .pipe(
        tap(() => {
          this._isMutating.set(true);
          this._error.set(null);
        }),
        exhaustMap((id) =>
          this.api.deleteTask(id).pipe(
            // Carry the id forward so we know which task to remove
            tap(() => {
              this._tasks.update((tasks) => tasks.filter((t) => t.id !== id));
              this._totalCount.update((n) => Math.max(0, n - 1));
              // Deselect if the deleted task was selected
              if (this._selectedTaskId() === id) {
                this._selectedTaskId.set(null);
              }
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: () => {
          this._isMutating.set(false);
        },
        error: (err: Error) => {
          this._error.set(err.message);
          this._isMutating.set(false);
        },
      });
  }
}
