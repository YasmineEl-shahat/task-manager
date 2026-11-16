import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { httpResource } from '@angular/common/http';
import { Subject } from 'rxjs';
import { exhaustMap, tap } from 'rxjs/operators';

import { environment } from '@env';
import { CreateTaskDto, UpdateTaskDto } from '@tasks/models/task.dto';
import { INITIAL_TASK_FILTERS, TaskFilters } from '@tasks/models/task-filter.model';
import { TaskFilterPriority, TaskFilterStatus } from '@tasks/models/task.enums';
import { Task } from '@tasks/models/task.model';
import { TasksResponse } from '@tasks/models/tasks-response.model';
import { TaskApiService } from '@tasks/services/task-api.service';

// ─── Store ───────────────────────────────────────────────────────────────────

/**
 * Signal-based store for the Task feature.
 *
 * **Read strategy — `httpResource`**
 * The task list and selected-task detail are fetched via `httpResource`, which
 * is reactive on signal dependencies: changing `_filters` or `_selectedTaskId`
 * automatically cancels the in-flight request and issues a new one. No manual
 * "load" trigger or `switchMap` pipe is needed.
 *
 * **Write strategy — RxJS + `HttpClient`**
 * Mutations (create / update / patch / delete) go through `exhaustMap` pipelines
 * that call `TaskApiService`. After each successful write the tasks resource is
 * reloaded so the list stays in sync with the server.
 *
 * **Cleanup**
 * `takeUntilDestroyed()` wires mutation subscriptions to the injection context's
 * destroy event, so no manual `unsubscribe` is needed.
 */
@Injectable({ providedIn: 'root' })
export class TaskStore {
  private readonly api = inject(TaskApiService);
  private readonly baseUrl = environment.apiBaseUrl + '/tasks';

  // ─── Filter state (drives the reactive resource) ─────────────────────────

  private readonly _filters = signal<TaskFilters>(INITIAL_TASK_FILTERS);
  readonly filters = this._filters.asReadonly();

  // ─── Selected task state ─────────────────────────────────────────────────

  private readonly _selectedTaskId = signal<string | null>(null);
  readonly selectedTaskId = this._selectedTaskId.asReadonly();

  // ─── Mutation state ───────────────────────────────────────────────────────

  private readonly _isMutating = signal(false);
  readonly isMutating = this._isMutating.asReadonly();

  /** Error from the last failed mutation (not from the resource). */
  private readonly _mutationError = signal<string | null>(null);

  /** Incremented each time the user manually retries a failed load. */
  private readonly _retryCount = signal(0);
  /** Number of manual retries the user has attempted for the current error. */
  readonly retryCount = this._retryCount.asReadonly();

  // ─── httpResource — task list ─────────────────────────────────────────────

  /**
   * Reactive resource for the paginated / filtered task list.
   *
   * Re-fetches automatically whenever `_filters` changes.
   * Returns `undefined` while loading or on error (use `isLoading` / `error`).
   */
  private readonly _tasksResource = httpResource<TasksResponse>(() => {
    const { status, priority, assigneeId, search } = this._filters();

    // Build only the params that deviate from "show everything"
    const params: Record<string, string> = {};
    if (status !== TaskFilterStatus.ALL) params['status'] = status;
    if (priority !== TaskFilterPriority.ALL) params['priority'] = priority;
    if (assigneeId !== null) params['assigneeId'] = assigneeId;
    if (search.trim()) params['search'] = search.trim();

    return { url: this.baseUrl, params };
  });

  // ─── httpResource — selected task detail ─────────────────────────────────

  /**
   * Reactive resource for the currently selected task's full detail.
   *
   * Returns `undefined` (and fires no request) when nothing is selected.
   * Re-fetches automatically when `_selectedTaskId` changes.
   */
  private readonly _selectedTaskResource = httpResource<Task>(() => {
    const id = this._selectedTaskId();
    return id ? { url: `${this.baseUrl}/${id}` } : undefined;
  });

  // ─── Public derived signals ───────────────────────────────────────────────

  /** Raw task list from the server (empty array while loading). */
  readonly tasks = computed(() => this._tasksResource.value()?.tasks ?? []);

  /** Total count from the server-side pagination meta. */
  readonly totalCount = computed(
    () => this._tasksResource.value()?.meta.totalCount ?? 0,
  );

  /** ISO timestamp of the last server update from meta. */
  readonly lastUpdated = computed(
    () => this._tasksResource.value()?.meta.lastUpdated ?? null,
  );

  /** `true` while the task list is being (re)fetched. */
  readonly isLoading = this._tasksResource.isLoading;

  /** `true` while the selected-task detail is being fetched. */
  readonly isSelectedTaskLoading = this._selectedTaskResource.isLoading;

  /** `true` while a mutation request is in-flight. */
  readonly isBusy = computed(
    () => this._tasksResource.isLoading() || this._isMutating(),
  );

  /**
   * Combined error signal — surfaces either a mutation error or the resource
   * fetch error, whichever is most recent. `null` when everything is healthy.
   */
  readonly error = computed<string | null>(() => {
    const mutErr = this._mutationError();
    if (mutErr) return mutErr;

    const resErr = this._tasksResource.error();
    if (!resErr) return null;
    return resErr instanceof Error ? resErr.message : 'Failed to load tasks.';
  });

  /**
   * Full detail of the currently selected task, or `null` when nothing is
   * selected or the detail request is still in flight.
   */
  readonly selectedTask = computed(
    () => this._selectedTaskResource.value() ?? null,
  );

  // ─── Derived / computed signals ───────────────────────────────────────────

  /**
   * Client-side filtered + searched slice of the task list.
   *
   * Because filters are also sent to the API, this computed is primarily useful
   * for the `search` field (instant feedback before the round-trip completes)
   * and as a safety net for any stale data.
   */
  readonly filteredTasks = computed(() => {
    const tasks = this._tasksResource.value()?.tasks ?? [];
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

  /** Aggregate statistics derived from the full task list. */
  readonly stats = computed(() => {
    const tasks = this._tasksResource.value()?.tasks ?? [];
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

  // ─── Action subjects (mutation pipelines) ────────────────────────────────

  private readonly createTask$ = new Subject<CreateTaskDto>();
  private readonly updateTask$ = new Subject<{ id: string; dto: CreateTaskDto }>();
  private readonly patchTask$ = new Subject<{ id: string; dto: UpdateTaskDto }>();
  private readonly deleteTask$ = new Subject<string>();

  // ─── Constructor — wire up mutation pipelines ─────────────────────────────

  constructor() {
    this.registerCreatePipeline();
    this.registerUpdatePipeline();
    this.registerPatchPipeline();
    this.registerDeletePipeline();
  }

  // ─── Public command API ───────────────────────────────────────────────────

  /**
   * Manually triggers a fresh reload of the task list from the server.
   * Useful after external changes (e.g. another user's edits).
   */
  reload(): void {
    this._tasksResource.reload();
  }

  /**
   * Retries the last failed resource load.
   * Increments `retryCount` so the template can show retry progress
   * and clears any stale mutation error before reloading.
   */
  retryLoad(): void {
    this._retryCount.update((n) => n + 1);
    this._mutationError.set(null);
    this._tasksResource.reload();
  }

  /** Dispatches a create-task mutation. */
  createTask(dto: CreateTaskDto): void {
    this.createTask$.next(dto);
  }

  /** Dispatches a full-replace (PUT) mutation. */
  updateTask(id: string, dto: CreateTaskDto): void {
    this.updateTask$.next({ id, dto });
  }

  /** Dispatches a partial-update (PATCH) mutation. */
  patchTask(id: string, dto: UpdateTaskDto): void {
    this.patchTask$.next({ id, dto });
  }

  /** Dispatches a delete mutation. */
  deleteTask(id: string): void {
    this.deleteTask$.next(id);
  }

  /** Selects a task by ID; pass `null` to clear the selection. */
  selectTask(id: string | null): void {
    this._selectedTaskId.set(id);
  }

  /** Merges `partial` into the current filter state. */
  setFilters(partial: Partial<TaskFilters>): void {
    this._filters.update((current) => ({ ...current, ...partial }));
  }

  /** Resets all filters to their initial (show-everything) values. */
  resetFilters(): void {
    this._filters.set(INITIAL_TASK_FILTERS);
  }

  /**
   * Clears any mutation error.
   * Resource errors clear automatically on the next successful load.
   */
  clearError(): void {
    this._mutationError.set(null);
  }

  // ─── Private mutation pipelines ───────────────────────────────────────────

  /**
   * `exhaustMap` — ignores duplicate create triggers while a request is in-flight.
   * Reloads the task list from the server on success.
   */
  private registerCreatePipeline(): void {
    this.createTask$
      .pipe(
        tap(() => {
          this._isMutating.set(true);
          this._mutationError.set(null);
        }),
        exhaustMap((dto) => this.api.createTask(dto)),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: () => {
          this._tasksResource.reload();
          this._isMutating.set(false);
        },
        error: (err: Error) => {
          this._mutationError.set(err.message);
          this._isMutating.set(false);
        },
      });
  }

  /**
   * `exhaustMap` — ignores duplicate update triggers while a request is in-flight.
   * Reloads the task list and refreshes the selected-task detail on success.
   */
  private registerUpdatePipeline(): void {
    this.updateTask$
      .pipe(
        tap(() => {
          this._isMutating.set(true);
          this._mutationError.set(null);
        }),
        exhaustMap(({ id, dto }) => this.api.updateTask(id, dto)),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: () => {
          this._tasksResource.reload();
          this._selectedTaskResource.reload();
          this._isMutating.set(false);
        },
        error: (err: Error) => {
          this._mutationError.set(err.message);
          this._isMutating.set(false);
        },
      });
  }

  /**
   * `exhaustMap` — ignores duplicate patch triggers while a request is in-flight.
   * Reloads the task list and refreshes the selected-task detail on success.
   */
  private registerPatchPipeline(): void {
    this.patchTask$
      .pipe(
        tap(() => {
          this._isMutating.set(true);
          this._mutationError.set(null);
        }),
        exhaustMap(({ id, dto }) => this.api.patchTask(id, dto)),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: () => {
          this._tasksResource.reload();
          this._selectedTaskResource.reload();
          this._isMutating.set(false);
        },
        error: (err: Error) => {
          this._mutationError.set(err.message);
          this._isMutating.set(false);
        },
      });
  }

  /**
   * `exhaustMap` — ignores duplicate delete triggers while a request is in-flight.
   * Clears the selection if the deleted task was selected, then reloads the list.
   */
  private registerDeletePipeline(): void {
    this.deleteTask$
      .pipe(
        tap(() => {
          this._isMutating.set(true);
          this._mutationError.set(null);
        }),
        exhaustMap((id) =>
          this.api.deleteTask(id).pipe(
            tap(() => {
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
          this._tasksResource.reload();
          this._isMutating.set(false);
        },
        error: (err: Error) => {
          this._mutationError.set(err.message);
          this._isMutating.set(false);
        },
      });
  }
}
